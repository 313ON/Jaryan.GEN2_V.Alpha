import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  engineeringArtifactIdentity,
  engineeringKnowledgeGraphFingerprint,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  reconstructEngineeringRelationship,
  relationshipDeclaration,
  relationshipFact,
  relationshipFactFingerprint,
  resolveEngineeringKnowledgeGraph,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

const artifact = (type, slug, sequence = 1, version = '1') =>
  engineeringArtifactIdentity({
    type,
    systemCode: 'REL',
    slug,
    sequence,
    name: `${slug} artifact`,
    version,
  });

const rowSource = artifact('SOURCE', 'REL-EVIDENCE', 1);
const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 2 },
    { weightKn: 20, elevationM: 4 },
  ]),
);
const rowResult = packageFixture.identity.id;
const rowCalculation = packageFixture.provenance.calculation.id;
const registry = createEngineeringKnowledgeRegistry().register(packageFixture);

const fact = (subject = rowResult, object = rowCalculation) =>
  relationshipFact({
    subject: { kind: 'identityId', identityId: subject },
    predicate: 'DEPENDENCY',
    object: { kind: 'identityId', identityId: object },
  });

const declaration = (overrides = {}) =>
  relationshipDeclaration({
    fact: fact(),
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:REL',
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T10:00:00Z',
    },
    origin: 'HUMAN',
    actor: 'engineer-001',
    evidenceReferences: [rowSource],
    supersedes: [],
    ...overrides,
  });

const resolvedEvidence = {
  resolve: () => ({ status: 'RESOLVED', complete: true }),
};

test('fact identity is ordered and predicate-sensitive', () => {
  const forward = fact(rowResult, rowCalculation);
  const reverse = fact(rowCalculation, rowResult);
  assert.notEqual(forward.fingerprint, reverse.fingerprint);
  assert.notEqual(
    relationshipFactFingerprint({
      ...forward,
      predicate: 'DEPENDENCY',
    }),
    relationshipFactFingerprint({
      ...forward,
      predicate: 'PART_OF',
    }),
  );
});

test('declaration fingerprints are deterministic and derived state is excluded', () => {
  const first = declaration();
  const second = declaration({
    evidenceReferences: [rowSource],
  });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.notEqual(
    first.fingerprint,
    declaration({ origin: 'IMPORTED', actor: null }).fingerprint,
  );
  assert.notEqual(
    first.fingerprint,
    declaration({
      temporalValidity: {
        ...first.temporalValidity,
        recordedAt: '2026-08-22T11:00:00Z',
      },
    }).fingerprint,
  );
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.evidenceReferences), true);
});

test('graph canonicalizes duplicate declarations without replacing dependency behavior', () => {
  const first = declaration();
  const duplicate = declaration();
  const graph = resolveEngineeringKnowledgeGraph(registry, [duplicate, first]);
  assert.equal(graph.declarations.length, 1);
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.fromId === rowResult &&
        edge.toId === rowCalculation &&
        edge.predicate === 'DEPENDENCY',
    ),
  );
  assert.equal(
    graph.fingerprint,
    engineeringKnowledgeGraphFingerprint(
      resolveEngineeringKnowledgeGraph(registry, [first]),
    ),
  );
});

test('same fact with different evidence and origin remains historically distinct', () => {
  const first = declaration();
  const second = declaration({
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [artifact('SOURCE', 'REL-EVIDENCE-OTHER', 2)],
  });
  const graph = resolveEngineeringKnowledgeGraph(registry, [second, first]);
  assert.equal(graph.declarations.length, 2);
  assert.notEqual(first.fingerprint, second.fingerprint);
});

test('affirm and deny declarations reconstruct as conflict', () => {
  const affirm = declaration();
  const deny = declaration({ assertionDisposition: 'DENY', origin: 'IMPORTED', actor: null });
  const result = reconstructEngineeringRelationship(
    registry,
    affirm.fact,
    [affirm, deny],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'CONFLICTING');
  assert.equal(result.declarations.length, 2);
});

test('explicit supersession removes only the referenced predecessor', () => {
  const oldDeclaration = declaration({
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T10:00:00Z',
    },
  });
  const replacement = declaration({
    origin: 'IMPORTED',
    actor: null,
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T11:00:00Z',
    },
    supersedes: [oldDeclaration.fingerprint],
  });
  const result = reconstructEngineeringRelationship(
    registry,
    oldDeclaration.fact,
    [replacement, oldDeclaration],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'RESOLVED');
  assert.deepEqual(
    result.declarations.map((item) => item.fingerprint),
    [replacement.fingerprint],
  );
});

test('timestamp order alone does not supersede an earlier declaration', () => {
  const first = declaration();
  const later = declaration({
    origin: 'IMPORTED',
    actor: null,
    temporalValidity: {
      ...first.temporalValidity,
      recordedAt: '2026-08-23T10:00:00Z',
    },
  });
  const result = reconstructEngineeringRelationship(
    registry,
    first.fact,
    [later, first],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'RESOLVED');
  assert.equal(result.declarations.length, 2);
});

test('missing declarations, historical declarations, and missing evidence stay explicit', () => {
  const current = declaration();
  const unknown = reconstructEngineeringRelationship(
    registry,
    current.fact,
    [],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(unknown.status, 'UNKNOWN');

  const historical = declaration({
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2025-01-01T00:00:00Z',
    },
  });
  const historicalResult = reconstructEngineeringRelationship(
    registry,
    historical.fact,
    [historical],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(historicalResult.status, 'HISTORICAL');

  const withoutEvidence = reconstructEngineeringRelationship(
    registry,
    current.fact,
    [declaration({ evidenceReferences: [] })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
  );
  assert.equal(withoutEvidence.status, 'INSUFFICIENT_EVIDENCE');

  const unknownBoundary = reconstructEngineeringRelationship(
    registry,
    current.fact,
    [
      declaration({
        temporalValidity: {
          recordedAt: '2026-08-22T10:00:00Z',
        },
      }),
    ],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(unknownBoundary.status, 'UNKNOWN');
});

test('ambiguous and invalid endpoints do not fall back', () => {
  const rowPackage = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const ambiguousRegistry = createEngineeringKnowledgeRegistry()
    .register(packageFixture)
    .register(rowPackage);
  const sharedSource = packageFixture.provenance.sources[0].id;
  const ambiguous = reconstructEngineeringRelationship(
    ambiguousRegistry,
    fact(sharedSource, rowResult),
    [declaration({ fact: fact(sharedSource, rowResult) })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.notEqual(ambiguous.status, 'RESOLVED');

  const invalidFact = fact('not-an-artifact-id', rowResult);
  const invalid = reconstructEngineeringRelationship(
    registry,
    invalidFact,
    [declaration({ fact: invalidFact })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(invalid.status, 'INVALID');
});

test('AI proposals remain unverified without governed evidence', () => {
  const candidate = declaration({
    origin: 'AI_PROPOSAL',
    actor: null,
  });
  const result = reconstructEngineeringRelationship(
    registry,
    candidate.fact,
    [candidate],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
  );
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(candidate.origin, 'AI_PROPOSAL');
});
