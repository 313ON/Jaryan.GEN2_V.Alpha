import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GovernedSuperAdobeRuntime,
} from '@jaryan/shared-application';
import {
  InMemoryDurableCalculationSnapshotStore,
} from '@jaryan/shared-infrastructure';
import {
  createDurableCalculationSnapshot,
} from '@jaryan/shared-domain';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

const context = (projectId) => ({
  projectId,
  principal: { userId: 'user-1' },
  membershipRole: 'EDITOR',
});

test('authorized execution derives project scope and returns exact snapshot bindings', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const runtime = new GovernedSuperAdobeRuntime(store);
  const result = await runtime.execute(context('project-a'), inputs);

  assert.equal(result.status, 'COMPLETED');
  assert.ok(result.execution.id);
  assert.ok(result.snapshotBindings.length > 0);
  const first = result.snapshotBindings[0];
  assert.equal(
    (await store.get('project-a', first.snapshotId)).calculationIdentity.id,
    first.calculationIdentity.id,
  );
  assert.equal(await store.get('project-b', first.snapshotId), null);
});

test('exact historical read reconstructs the selected snapshot without fallback', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const runtime = new GovernedSuperAdobeRuntime(store);
  const execution = await runtime.execute(context('project-a'), inputs);
  const binding = execution.snapshotBindings[0];

  const result = await runtime.readHistoricalEvidence(context('project-a'), binding);
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.snapshot.snapshotId, binding.snapshotId);
  assert.equal(result.reconstruction.snapshotId, binding.snapshotId);

  const wrongProject = await runtime.readHistoricalEvidence(
    context('project-b'),
    binding,
  );
  assert.equal(wrongProject.status, 'NOT_FOUND');
});

test('wrong calculation or invalid historical evidence is explicit', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const runtime = new GovernedSuperAdobeRuntime(store);
  const execution = await runtime.execute(context('project-a'), inputs);
  const binding = execution.snapshotBindings[0];

  const wrongCalculation = await runtime.readHistoricalEvidenceByCalculationId(
    context('project-a'),
    'CALC-SA-NOT-FOUND-001-v1',
    binding.snapshotId,
  );
  assert.equal(wrongCalculation.status, 'NOT_FOUND');

  const restartedRuntime = new GovernedSuperAdobeRuntime(store);
  const restarted = await restartedRuntime.readHistoricalEvidence(
    context('project-a'),
    binding,
  );
  assert.equal(restarted.status, 'RESOLVED');
});

test('result-affecting missing historical evidence remains an explicit NOT_FOUND outcome', async () => {
  const store = new InMemoryDurableCalculationSnapshotStore();
  const runtime = new GovernedSuperAdobeRuntime(store);
  const execution = await runtime.execute(context('project-a'), inputs);
  const binding = execution.snapshotBindings[0];
  const original = await store.get('project-a', binding.snapshotId);
  const unresolved = createDurableCalculationSnapshot({
    ...original,
    snapshotId: 'unresolved-evidence',
    executionReference: 'unresolved-execution',
    knowledgeBindings: [{
      ...original.knowledgeBindings[0],
      resolution: 'NOT_FOUND',
      identity: undefined,
    }],
  });
  await store.append('project-a', unresolved);
  const result = await runtime.readHistoricalEvidenceByCalculationId(
    context('project-a'),
    binding.calculationIdentity.id,
    unresolved.snapshotId,
  );
  assert.equal(result.status, 'NOT_FOUND');
});

test('invalid input is rejected before governed execution', async () => {
  const runtime = new GovernedSuperAdobeRuntime(
    new InMemoryDurableCalculationSnapshotStore(),
  );
  const result = await runtime.execute(context('project-a'), {
    ...inputs,
    domeHeightM: 0,
  });
  assert.equal(result.status, 'INVALID_INPUT');
});
