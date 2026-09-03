import assert from 'node:assert/strict';
import test from 'node:test';
import {
  durableCalculationSnapshotFingerprint,
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringArtifactIdentity,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';
import {
  createDurableSnapshotFromPrimitiveExecution,
  resolveHistoricalCalculationEvidence,
} from '@jaryan/shared-application';
import { InMemoryDurableCalculationSnapshotStore } from '@jaryan/shared-infrastructure';

const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
const pkg = createEngineeringKnowledgePackageFromPrimitive(primitive);
const identity = pkg.definition.calculationIdentity;
const registry = createEngineeringKnowledgeRegistry().register(pkg);

function snapshot(snapshotId, chronology = {}) {
  return createDurableSnapshotFromPrimitiveExecution(primitive, {
    snapshotId,
    executionReference: `execution-${snapshotId}`,
    chronology,
  });
}

function storeReturning(...snapshots) {
  return {
    async findByCalculationIdentity() {
      return snapshots;
    },
  };
}

test('A: no snapshots resolves to NOT_FOUND', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    store: new InMemoryDurableCalculationSnapshotStore(),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'NOT_FOUND');
});

test('B: one valid snapshot resolves deterministically without a selector', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    store: storeReturning(snapshot('only')),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.snapshot.snapshotId, 'only');
  assert.equal(result.reconstruction.snapshotId, 'only');
});

test('C: multiple snapshots without a selector are AMBIGUOUS', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    store: storeReturning(snapshot('b'), snapshot('a')),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.snapshot, null);
});

test('D: an explicit valid snapshotId resolves the exact historical snapshot', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'b',
    store: storeReturning(snapshot('b'), snapshot('a')),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.snapshot.snapshotId, 'b');
  assert.equal(result.reconstruction.outputs, result.snapshot.completedOutputs);
});

test('E: a selector outside the candidate membership is NOT_FOUND', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'other-calculation',
    store: storeReturning(snapshot('a')),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'NOT_FOUND');
});

test('F: invalid calculation identity is INVALID', async () => {
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: { ...identity, type: 'RESULT' },
    store: storeReturning(snapshot('a')),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'INVALID');
});

test('G/H: invalid snapshot payload or provenance is INVALID', async () => {
  const valid = snapshot('invalid');
  const invalidPayload = { ...valid, fingerprint: 'not-the-content' };
  const invalidProvenance = {
    ...valid,
    provenanceBindings: {
      ...valid.provenanceBindings,
      calculation: { ...valid.provenanceBindings.calculation, id: 'CALC-SA-OTHER-001-v1' },
    },
  };
  invalidProvenance.fingerprint = durableCalculationSnapshotFingerprint(invalidProvenance);

  for (const candidate of [invalidPayload, invalidProvenance]) {
    const result = await resolveHistoricalCalculationEvidence({
      calculationIdentity: identity,
      snapshotId: 'invalid',
      store: storeReturning(candidate),
      projectId: 'project-a',
      registry,
    });
    assert.equal(result.status, 'INVALID');
  }
});

test('I/K: no fallback to latest or chronology when candidates are plural', async () => {
  const oldSnapshot = snapshot('old', { recordedAt: '2020-01-01' });
  const latestSnapshot = snapshot('latest', { recordedAt: '2030-01-01' });
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    store: storeReturning(latestSnapshot, oldSnapshot),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.snapshot, null);
});

test('J: identical fingerprints do not select a historical snapshot', async () => {
  const first = snapshot('first');
  const second = snapshot('second');
  assert.equal(first.fingerprint, second.fingerprint);
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    store: storeReturning(first, second),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'AMBIGUOUS');
});

test('L: snapshot identity remains distinct from calculation and execution identities', async () => {
  const candidate = snapshot('snapshot-identity');
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: candidate.snapshotId,
    store: storeReturning(candidate),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'RESOLVED');
  assert.notEqual(result.snapshot.snapshotId, result.snapshot.calculationIdentity.id);
  assert.notEqual(result.snapshot.snapshotId, result.snapshot.executionReference);
});

test('M: existing reconstruction remains pinned to the original package bindings', async () => {
  const candidate = snapshot('pinned');
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: candidate.snapshotId,
    store: storeReturning(candidate),
    projectId: 'project-a',
    registry,
  });
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.reconstruction.bindings[0].reference, identity.id);
  assert.deepEqual(result.reconstruction.provenance, candidate.provenanceBindings);
});

test('N: missing historical provenance remains NOT_FOUND when a newer package exists', async () => {
  const historical = snapshot('missing-historical');
  const missingHistorical = {
    ...historical,
    provenanceBindings: {
      ...historical.provenanceBindings,
      primitive: engineeringArtifactIdentity({
        type: 'PRIMITIVE',
        systemCode: 'SA',
        slug: 'MISSING-HISTORICAL',
        sequence: 1,
        name: 'Missing historical primitive',
        version: '3',
      }),
    },
    provenanceGraph: {
      ...historical.provenanceGraph,
      nodes: historical.provenanceGraph.nodes.map((node) =>
        node === historical.provenanceBindings.primitive.id
          ? 'PRIM-SA-MISSING-HISTORICAL-001-v3'
          : node,
      ),
      edges: historical.provenanceGraph.edges.map((edge) => ({
        fromId:
          edge.fromId === historical.provenanceBindings.primitive.id
            ? 'PRIM-SA-MISSING-HISTORICAL-001-v3'
            : edge.fromId,
        toId:
          edge.toId === historical.provenanceBindings.primitive.id
            ? 'PRIM-SA-MISSING-HISTORICAL-001-v3'
            : edge.toId,
      })),
    },
  };
  missingHistorical.fingerprint = durableCalculationSnapshotFingerprint(
    missingHistorical,
  );
  const newer = createEngineeringKnowledgePackageFromPrimitive(primitive, {
    version: '4',
  });
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'missing-historical',
    store: storeReturning(missingHistorical),
    projectId: 'project-a',
    registry: createEngineeringKnowledgeRegistry().register(newer),
  });

  assert.equal(result.status, 'NOT_FOUND');
  assert.equal(result.snapshot.snapshotId, 'missing-historical');
  assert.equal(result.reconstruction, null);
});

test('O: ambiguous historical provenance remains AMBIGUOUS', async () => {
  const candidate = snapshot('ambiguous-historical');
  const sharedSource = candidate.provenanceBindings.sources[0];
  const packageOne = createEngineeringKnowledgePackageFromPrimitive(primitive, {
    version: '1',
  });
  const packageTwo = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 2, densityKgM3: 2000 }),
    { version: '2' },
  );
  const packageTwoWithSharedSource = createEngineeringKnowledgePackage({
    identity: packageTwo.identity,
    definition: packageTwo.definition,
    inputs: packageTwo.inputs,
    result: {
      ...packageTwo.result,
      sources: packageOne.result.sources,
    },
    provenance: {
      ...packageTwo.provenance,
      sources: [sharedSource],
    },
    dependencies: packageTwo.dependencies,
  });
  const ambiguousRegistry = createEngineeringKnowledgeRegistry()
    .register(packageOne)
    .register(packageTwoWithSharedSource);
  const ambiguousSnapshot = {
    ...candidate,
    provenanceBindings: {
      ...candidate.provenanceBindings,
      sources: [sharedSource],
    },
  };
  ambiguousSnapshot.fingerprint = durableCalculationSnapshotFingerprint(
    ambiguousSnapshot,
  );
  const result = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'ambiguous-historical',
    store: storeReturning(ambiguousSnapshot),
    projectId: 'project-a',
    registry: ambiguousRegistry,
  });

  assert.equal(result.status, 'AMBIGUOUS');
  assert.equal(result.reconstruction, null);
});

test('P: repeated reconstruction remains identical after registering a newer current revision', async () => {
  const candidate = snapshot('mutation-stable');
  const historicalRegistry = createEngineeringKnowledgeRegistry().register(pkg);
  const first = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'mutation-stable',
    store: storeReturning(candidate),
    projectId: 'project-a',
    registry: historicalRegistry,
  });
  const newer = createEngineeringKnowledgePackageFromPrimitive(primitive, {
    version: '2',
  });
  const second = await resolveHistoricalCalculationEvidence({
    calculationIdentity: identity,
    snapshotId: 'mutation-stable',
    store: storeReturning(candidate),
    projectId: 'project-a',
    registry: historicalRegistry.register(newer),
  });

  assert.equal(first.status, 'RESOLVED');
  assert.equal(second.status, 'RESOLVED');
  assert.deepEqual(second.reconstruction, first.reconstruction);
  assert.equal(
    durableCalculationSnapshotFingerprint(candidate),
    durableCalculationSnapshotFingerprint(candidate),
  );
});
