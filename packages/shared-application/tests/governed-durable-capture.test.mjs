import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateEngineering,
  captureDurableSnapshotsFromPrimitiveExecution,
  solveSuperAdobe,
  verifySuperAdobeStructure,
} from '@jaryan/shared-application';
import {
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  reconstructDurableCalculationSnapshot,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';
import {
  InMemoryDurableCalculationSnapshotStore,
} from '@jaryan/shared-infrastructure';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

class CountingSnapshotStore {
  constructor() {
    this.inner = new InMemoryDurableCalculationSnapshotStore();
    this.appended = [];
  }

  async append(input) {
    this.appended.push(input.snapshotId);
    return this.inner.append(input);
  }

  get(snapshotId) {
    return this.inner.get(snapshotId);
  }

  update() {
    return this.inner.update();
  }

  delete() {
    return this.inner.delete();
  }
}

test('solveSuperAdobe captures each governed primitive exactly once', async () => {
  const store = new CountingSnapshotStore();
  const result = await solveSuperAdobe({
    projectId: 'project-solver',
    inputs,
    durableSnapshotStore: store,
  });

  assert.ok(result);
  assert.equal(store.appended.length, result.calculations.length);
  assert.equal(new Set(store.appended).size, result.calculations.length);

  for (const [index, primitive] of result.calculations.entries()) {
    const snapshot = await store.get(`${result.id}:${index}:${primitive.calculationId}`);
    assert.ok(snapshot);
    assert.notEqual(snapshot.snapshotId, snapshot.executionReference);
    assert.equal(snapshot.outcome, primitive.status === 'FAIL' ? 'FAILED' : 'COMPLETED');
    assert.equal(snapshot.provenanceBindings.result.type, 'RESULT');
    assert.equal(snapshot.provenanceBindings.calculation.type, 'CALCULATION');
    assert.equal(snapshot.provenanceBindings.primitive.type, 'PRIMITIVE');
    assert.ok(Array.isArray(snapshot.provenanceBindings.sources));
  }
});

test('verifySuperAdobeStructure captures each governed primitive and preserves reconstruction bindings', async () => {
  const store = new CountingSnapshotStore();
  const result = await verifySuperAdobeStructure({
    projectId: 'project-verification',
    inputs,
    durableSnapshotStore: store,
  });

  assert.ok(result);
  const applicablePrimitives = result.primitives.filter(
    (primitive) => Object.keys(primitive.inputs).length > 0,
  );
  assert.equal(store.appended.length, applicablePrimitives.length);
  assert.equal(new Set(store.appended).size, applicablePrimitives.length);

  const primitive = result.primitives[0];
  const primitiveIndex = result.primitives.indexOf(primitive);
  const snapshot = await store.get(`${result.id}:${primitiveIndex}:${primitive.calculationId}`);
  assert.ok(snapshot);

  const registry = createEngineeringKnowledgeRegistry();
  const reconstructed = reconstructDurableCalculationSnapshot(snapshot, {
    registry: registry.register(createEngineeringKnowledgePackageFromPrimitive(primitive)),
  });
  assert.deepEqual(reconstructed.outputs, snapshot.completedOutputs);
  assert.deepEqual(reconstructed.provenance, snapshot.provenanceBindings);
});

test('failed governed primitive capture preserves diagnostics without authoritative outputs', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const primitive = {
    ...rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    calculationId: 'SA-FAILED-INTEGRATION-001',
    status: 'FAIL',
  };

  await captureDurableSnapshotsFromPrimitiveExecution([primitive], {
    store,
    executionReference: 'execution-failed-integration',
    snapshotIdPrefix: 'snapshot-failed-integration',
  });

  const snapshot = await store.get('snapshot-failed-integration:0:SA-FAILED-INTEGRATION-001');
  assert.ok(snapshot);
  assert.equal(snapshot.outcome, 'FAILED');
  assert.equal(snapshot.completedOutputs, null);
  assert.equal(snapshot.failedDiagnostics.length, 1);
});

test('legacy CalculationRecord execution remains separate from durable capture', () => {
  const record = calculateEngineering({
    projectId: 'legacy-project',
    inputs: {
      structuralSystem: 'superadobe',
      innerDiameterM: 6,
      wallThicknessM: 0.4,
      domeHeightM: 3.6,
      bagWidthM: 0.45,
      rowHeightM: 0.3,
      soilType: 'sandy',
      compactedDensityKgM3: 1850,
      openingAreaM2: 0,
    },
  });

  assert.equal(record.projectId, 'legacy-project');
  assert.ok(['completed', 'failed'].includes(record.status));
  assert.equal(record.snapshotId, undefined);
});
