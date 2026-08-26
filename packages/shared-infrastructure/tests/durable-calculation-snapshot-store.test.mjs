import assert from 'node:assert/strict';
import test from 'node:test';
import {
  InMemoryDurableCalculationSnapshotStore,
  assertPersistedSnapshotFingerprint,
} from '@jaryan/shared-infrastructure';
import {
  createEngineeringKnowledgePackageFromPrimitive,
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
  const first = await store.append('project-a', input('snapshot-a'));
  const second = await store.append('project-a', input('snapshot-b'));
  assert.notEqual(first.storageId, second.storageId);
  assert.deepEqual(await store.get('project-a', 'snapshot-a'), first.snapshot);
  assert.deepEqual(await store.get('project-a', 'snapshot-b'), second.snapshot);
  assert.equal((await store.get('project-a', 'snapshot-a')).projectContext, undefined);
});

test('retrieval is immutable and updates/deletes are rejected', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append('project-a', input('snapshot-a'));
  const retrieved = await store.get('project-a', 'snapshot-a');
  assert.throws(() => { retrieved.completedOutputs.x = 2; }, TypeError);
  assert.throws(() => store.update(), /immutable/);
  assert.throws(() => store.delete(), /immutable/);
  assert.equal((await store.get('project-a', 'snapshot-a')).completedOutputs.x, 1);
});

test('persisted fingerprint mismatch is rejected by the storage integrity check', () => {
  assert.throws(
    () => assertPersistedSnapshotFingerprint('stored', 'payload'),
    /fingerprint mismatch/,
  );
});

test('findByCalculationIdentity returns every exact calculation match deterministically', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append('project-a', input('snapshot-z'));
  await store.append('project-a', input('snapshot-a'));

  assert.deepEqual(
    (await store.findByCalculationIdentity('project-a', identity)).map((snapshot) => snapshot.snapshotId),
    ['snapshot-a', 'snapshot-z'],
  );
  assert.deepEqual(await store.findByCalculationIdentity('project-a', {
    ...identity,
    name: 'same canonical calculation',
  }), await store.findByCalculationIdentity('project-a', identity));
});

test('findByCalculationIdentity validates the type and identity shape', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  await assert.rejects(
    store.findByCalculationIdentity('project-a', { ...identity, type: 'RESULT' }),
    /Invalid calculation identity|CALCULATION/,
  );
  await assert.rejects(
    store.findByCalculationIdentity('project-a', { ...identity, id: 'not-a-calculation' }),
    /Invalid calculation identity/,
  );
});

test('snapshot reads and identity queries are project-scoped', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  await store.append('project-a', input('snapshot-project-a'));

  assert.ok(await store.get('project-a', 'snapshot-project-a'));
  assert.equal(await store.get('project-b', 'snapshot-project-a'), null);
  assert.equal(
    (await store.findByCalculationIdentity('project-b', identity)).length,
    0,
  );
});
