import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDurableSnapshotFromPrimitiveExecution,
} from '@jaryan/shared-application';
import {
  InMemoryDurableCalculationSnapshotStore,
} from '@jaryan/shared-infrastructure';
import {
  createEngineeringKnowledgeRegistry,
  createEngineeringKnowledgePackageFromPrimitive,
  reconstructDurableCalculationSnapshot,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

function failedPrimitive() {
  return {
    ...rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    calculationId: 'SA-FAILED-001',
    status: 'FAIL',
  };
}

test('governed primitive execution captures and persists a completed snapshot', async () => {
  const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const snapshot = createDurableSnapshotFromPrimitiveExecution(primitive, {
    snapshotId: 'snapshot-success',
    executionReference: 'execution-success',
    projectContext: { projectId: 'project-a' },
  });
  const store = new InMemoryDurableCalculationSnapshotStore();
  const persisted = await store.append({
    ...snapshot,
    fingerprint: undefined,
  });

  assert.equal(persisted.snapshot.outcome, 'COMPLETED');
  assert.notEqual(persisted.snapshot.snapshotId, persisted.storageId);
  assert.equal(persisted.snapshot.provenanceBindings.calculation.type, 'CALCULATION');
  assert.equal(persisted.snapshot.provenanceBindings.primitive.type, 'PRIMITIVE');
  assert.equal(persisted.snapshot.provenanceBindings.result.type, 'RESULT');
  assert.equal((await store.get('snapshot-success')).projectContext.projectId, 'project-a');
});

test('governed primitive failure captures a failed snapshot without authoritative output', async () => {
  const snapshot = createDurableSnapshotFromPrimitiveExecution(failedPrimitive(), {
    snapshotId: 'snapshot-failure',
    executionReference: 'execution-failure',
  });
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append({
    ...snapshot,
    fingerprint: undefined,
  });

  const restored = await store.get('snapshot-failure');
  assert.equal(restored.outcome, 'FAILED');
  assert.equal(restored.completedOutputs, null);
  assert.equal(restored.failedDiagnostics[0].code, 'GOVERNED_PRIMITIVE_FAILED');
});

test('historical view and reconstruction use the original package bindings only', async () => {
  const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const snapshot = createDurableSnapshotFromPrimitiveExecution(primitive, {
    snapshotId: 'snapshot-history',
    executionReference: 'execution-history',
  });
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append({
    ...snapshot,
    fingerprint: undefined,
  });

  const viewed = await store.get('snapshot-history');
  assert.deepEqual(viewed.provenanceBindings, snapshot.provenanceBindings);
  const registry = createEngineeringKnowledgeRegistry();
  const pkg = createEngineeringKnowledgePackageFromPrimitive(primitive);
  const reconstructed = reconstructDurableCalculationSnapshot(viewed, {
    registry: registry.register(pkg),
  });
  assert.deepEqual(reconstructed.outputs, viewed.completedOutputs);
  assert.equal(reconstructed.bindings[0].reference, viewed.knowledgeBindings[0].reference);
});

test('recalculation creates an independent execution and snapshot', () => {
  const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const first = createDurableSnapshotFromPrimitiveExecution(primitive, {
    snapshotId: 'snapshot-one',
    executionReference: 'execution-one',
  });
  const second = createDurableSnapshotFromPrimitiveExecution(primitive, {
    snapshotId: 'snapshot-two',
    executionReference: 'execution-two',
  });
  assert.notEqual(first.snapshotId, second.snapshotId);
  assert.notEqual(first.executionReference, second.executionReference);
  assert.equal(first.fingerprint, second.fingerprint);
});
