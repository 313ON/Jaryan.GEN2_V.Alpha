import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDurableCalculationSnapshot,
  deserializeDurableCalculationSnapshot,
  engineeringArtifactIdentity,
  reconstructDurableCalculationSnapshot,
  serializeDurableCalculationSnapshot,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

const packageFor = (volumeM3 = 1, version = '1') =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3, densityKgM3: 2000 }),
    { version },
  );
const governedPackage = packageFor();
const calculationIdentity = governedPackage.definition.calculationIdentity;

const rawGraph = (edges) => {
  const nodes = [...new Set(edges.flatMap(({ fromId, toId }) => [fromId, toId]))].sort();
  return {
    nodes,
    edges: [...edges].sort(
      (a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
    ),
    version: '1',
  };
};

function input(overrides = {}) {
  const provenance = governedPackage.provenance;
  const provenanceGraph = rawGraph([
    { fromId: provenance.result.id, toId: provenance.calculation.id },
    { fromId: provenance.calculation.id, toId: provenance.primitive.id },
    ...provenance.sources.map((source) => ({
      fromId: provenance.primitive.id,
      toId: source.id,
    })),
  ]);
  return {
    snapshotId: 'snapshot-1',
    calculationIdentity,
    executionReference: 'execution-1',
    outcome: 'COMPLETED',
    algorithmVersion: 'model-2026.1',
    method: governedPackage.definition.method,
    formula: governedPackage.definition.formula,
    inputs: governedPackage.inputs,
    effectiveAssumptions: governedPackage.definition.assumptions,
    knowledgeBindings: [{
      reference: calculationIdentity.id,
      resultAffecting: true,
      resolution: 'RESOLVED',
      identity: calculationIdentity,
    }],
    provenanceBindings: {
      sources: provenance.sources,
      primitive: provenance.primitive,
      calculation: provenance.calculation,
      result: provenance.result,
    },
    provenanceGraph,
    completedOutputs: { value: 45.3, unit: 'kN' },
    projectContext: { projectId: 'project-1', label: 'context-only' },
    ...overrides,
  };
}

test('completed snapshots preserve mandatory fields, outputs, and explicit provenance chain', () => {
  const snapshot = createDurableCalculationSnapshot(input());
  assert.equal(snapshot.outcome, 'COMPLETED');
  assert.deepEqual(snapshot.completedOutputs, { value: 45.3, unit: 'kN' });
  assert.equal(snapshot.provenanceBindings.result.type, 'RESULT');
  assert.equal(snapshot.provenanceBindings.calculation.type, 'CALCULATION');
  assert.equal(snapshot.provenanceBindings.primitive.type, 'PRIMITIVE');
  assert.equal(snapshot.provenanceBindings.sources[0].type, 'SOURCE');
  assert.ok(snapshot.provenanceGraph.edges.some(
    (edge) =>
      edge.fromId === snapshot.provenanceBindings.result.id &&
      edge.toId === snapshot.provenanceBindings.calculation.id,
  ));
});

test('failed snapshots preserve diagnostics and no authoritative outputs', () => {
  const snapshot = createDurableCalculationSnapshot(input({
    snapshotId: 'snapshot-failed',
    executionReference: 'execution-failed',
    outcome: 'FAILED',
    completedOutputs: null,
    failedDiagnostics: [{ code: 'INVALID_INPUT', field: 'volume' }],
  }));
  assert.equal(snapshot.outcome, 'FAILED');
  assert.equal(snapshot.completedOutputs, null);
  assert.deepEqual(snapshot.failedDiagnostics, [{ code: 'INVALID_INPUT', field: 'volume' }]);
});

test('runtime outcome and identity validation reject malformed snapshots', () => {
  assert.throws(
    () => createDurableCalculationSnapshot(input({ outcome: 'PENDING' })),
    /outcome must be COMPLETED or FAILED/,
  );
  assert.throws(
    () => createDurableCalculationSnapshot(input({ completedOutputs: null })),
    /require non-null outputs/,
  );
  assert.throws(
    () => createDurableCalculationSnapshot(input({
      calculationIdentity: {
        ...calculationIdentity,
        id: 'forged',
      },
    })),
    /Calculation identity is invalid/,
  );
});

test('serialization round trip preserves provenance, special numbers, and resolution states', () => {
  const snapshot = createDurableCalculationSnapshot(input({
    inputs: { nan: Number.NaN, negativeZero: -0 },
    knowledgeBindings: [{
      reference: 'CALC-SA-MISSING-001-v1',
      resultAffecting: false,
      resolution: 'NOT_FOUND',
      diagnostic: 'not found at execution time',
    }],
  }));
  const serialized = serializeDurableCalculationSnapshot(snapshot);
  assert.equal(serializeDurableCalculationSnapshot(snapshot), serialized);
  const restored = deserializeDurableCalculationSnapshot(serialized);
  assert.ok(Number.isNaN(restored.inputs.nan));
  assert.ok(Object.is(restored.inputs.negativeZero, -0));
  assert.equal(restored.knowledgeBindings[0].resolution, 'NOT_FOUND');
  assert.equal(restored.fingerprint, snapshot.fingerprint);
});

test('reconstruction uses pinned original bindings, no latest fallback, and blocks only relevant unresolved bindings', () => {
  const registry = createEngineeringKnowledgeRegistry().register(governedPackage);
  const snapshot = createDurableCalculationSnapshot(input());
  const reconstructed = reconstructDurableCalculationSnapshot(snapshot, { registry });
  assert.deepEqual(reconstructed.outputs, snapshot.completedOutputs);

  const unresolvedContext = createDurableCalculationSnapshot(input({
    snapshotId: 'snapshot-unresolved-context',
    knowledgeBindings: [{
      reference: 'CALC-SA-MISSING-001-v1',
      resultAffecting: false,
      resolution: 'NOT_FOUND',
    }],
  }));
  assert.doesNotThrow(() =>
    reconstructDurableCalculationSnapshot(unresolvedContext, { registry }),
  );

  const unresolvedRelevant = createDurableCalculationSnapshot(input({
    snapshotId: 'snapshot-unresolved-relevant',
    knowledgeBindings: [{
      reference: 'CALC-SA-MISSING-001-v1',
      resultAffecting: true,
      resolution: 'NOT_FOUND',
    }],
  }));
  assert.throws(
    () => reconstructDurableCalculationSnapshot(unresolvedRelevant, { registry }),
    /unresolved calculation-relevant binding/,
  );

  const noLatest = createEngineeringKnowledgeRegistry()
    .register(packageFor(1))
    .register(packageFor(2, '2'));
  assert.doesNotThrow(() =>
    reconstructDurableCalculationSnapshot(snapshot, { registry: noLatest }),
  );
});

test('project context is not part of the engineering fingerprint and identities remain separate', () => {
  const a = createDurableCalculationSnapshot(input());
  const b = createDurableCalculationSnapshot(input({
    snapshotId: 'snapshot-2',
    executionReference: 'execution-2',
    projectContext: { projectId: 'different-project' },
  }));
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.snapshotId, a.executionReference);
  assert.notEqual(a.snapshotId, a.calculationIdentity.id);
  assert.notEqual(a.calculationIdentity.id, 'storage-1');
});
