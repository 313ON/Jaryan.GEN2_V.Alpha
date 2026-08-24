import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InMemoryDurableCalculationSnapshotStore,
  assertPersistedSnapshotFingerprint,
} from '@jaryan/shared-infrastructure';
import {
  createEngineeringKnowledgePackageFromPrimitive,
  engineeringArtifactIdentity,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

const governedPackage = createEngineeringKnowledgePackageFromPrimitive(
  rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
);
const identity = governedPackage.definition.calculationIdentity;
const provenance = governedPackage.provenance;
const provenanceGraph = governedPackage.dependencies;

const input = (snapshotId) => ({
  snapshotId,
  calculationIdentity: identity,
  executionReference: `execution-${snapshotId}`,
  outcome: 'COMPLETED',
  algorithmVersion: '1',
  method: 'method',
  formula: 'x = y',
  inputs: { y: 1 },
  effectiveAssumptions: [],
  knowledgeBindings: [],
  provenanceBindings: provenance,
  provenanceGraph,
  completedOutputs: { x: 1 },
});

test('append-only storage keeps duplicate snapshots independent and round-trips losslessly', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const first = await store.append(input('snapshot-a'));
  const second = await store.append(input('snapshot-b'));
  assert.notEqual(first.storageId, second.storageId);
  assert.deepEqual(await store.get('snapshot-a'), first.snapshot);
  assert.deepEqual(await store.get('snapshot-b'), second.snapshot);
  assert.equal((await store.get('snapshot-a')).projectContext, undefined);
});

test('retrieval is immutable and updates/deletes are rejected', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append(input('snapshot-a'));
  const retrieved = await store.get('snapshot-a');
  assert.throws(() => { retrieved.completedOutputs.x = 2; }, TypeError);
  assert.throws(() => store.update(), /immutable/);
  assert.throws(() => store.delete(), /immutable/);
  assert.equal((await store.get('snapshot-a')).completedOutputs.x, 1);
});

test('persisted fingerprint mismatch is rejected by the storage integrity check', () => {
  assert.throws(
    () => assertPersistedSnapshotFingerprint('stored', 'payload'),
    /fingerprint mismatch/,
  );
});
