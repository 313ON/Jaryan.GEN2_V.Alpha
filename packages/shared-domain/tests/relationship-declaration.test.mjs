import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  engineeringArtifactIdentity,
  engineeringKnowledgeGraphFingerprint,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  geometryReference,
  geometrySemanticMetadata,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
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
const rowResultEndpoint = knowledgeGraphEndpoint({
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: packageFixture.identity,
});
const physicalEndpoint = knowledgeGraphEndpoint({
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalReferentIdentity({
    referentKey: 'governed:REL:PHYSICAL-001',
  }),
});

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

const reconstruct = (
  registryForQuery,
  factValue,
  declarations,
  queryContext,
  evidenceAdapter,
) =>
  reconstructEngineeringRelationship(
    registryForQuery,
    resolveEngineeringKnowledgeGraph(registryForQuery, declarations),
    factValue,
    queryContext,
    evidenceAdapter,
  );

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

test('forged declaration fingerprints are rejected during canonicalization', () => {
  const valid = declaration();
  const forged = { ...valid, fingerprint: '0'.repeat(64) };
  assert.throws(
    () => resolveEngineeringKnowledgeGraph(registry, [forged]),
    /declaration fingerprint mismatch/,
  );
});

test('mutated declaration content with a stale fingerprint is rejected', () => {
  const valid = declaration();
  const stale = {
    ...valid,
    origin: 'IMPORTED',
    actor: null,
  };
  assert.throws(
    () => resolveEngineeringKnowledgeGraph(registry, [stale]),
    /declaration fingerprint mismatch/,
  );
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

test('reconstruction uses only declarations registered in KnowledgeGraph', () => {
  const candidate = declaration();
  const graphWithoutCandidate = resolveEngineeringKnowledgeGraph(registry);
  const unregistered = reconstructEngineeringRelationship(
    registry,
    graphWithoutCandidate,
    candidate.fact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(unregistered.status, 'UNKNOWN');
  assert.equal(unregistered.declarations.length, 0);

  const graphWithCandidate = resolveEngineeringKnowledgeGraph(registry, [candidate]);
  const registered = reconstructEngineeringRelationship(
    registry,
    graphWithCandidate,
    candidate.fact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(registered.status, 'UNVERIFIED');
  assert.deepEqual(
    registered.declarations.map((item) => item.fingerprint),
    [candidate.fingerprint],
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
  const result = reconstruct(
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
  const result = reconstruct(
    registry,
    oldDeclaration.fact,
    [replacement, oldDeclaration],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'UNVERIFIED');
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
  const result = reconstruct(
    registry,
    first.fact,
    [later, first],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.declarations.length, 2);
});

test('out-of-scope supersession does not suppress an eligible declaration', () => {
  const current = declaration();
  const historicalReplacement = declaration({
    origin: 'IMPORTED',
    actor: null,
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2025-01-01T00:00:00Z',
    },
    supersedes: [current.fingerprint],
  });
  const result = reconstruct(
    registry,
    current.fact,
    [historicalReplacement, current],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'UNVERIFIED');
  assert.deepEqual(
    result.declarations.map((item) => item.fingerprint),
    [current.fingerprint],
  );
  assert.deepEqual(
    result.historicalDeclarations.map((item) => item.fingerprint),
    [historicalReplacement.fingerprint],
  );
});

test('missing declarations, historical declarations, and missing evidence stay explicit', () => {
  const current = declaration();
  const unknown = reconstruct(
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
  const historicalResult = reconstruct(
    registry,
    historical.fact,
    [historical],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(historicalResult.status, 'HISTORICAL');

  const withoutEvidence = reconstruct(
    registry,
    current.fact,
    [declaration({ evidenceReferences: [] })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
  );
  assert.equal(withoutEvidence.status, 'INSUFFICIENT_EVIDENCE');

  const unknownBoundary = reconstruct(
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
  const ambiguous = reconstruct(
    ambiguousRegistry,
    fact(sharedSource, rowResult),
    [declaration({ fact: fact(sharedSource, rowResult) })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.notEqual(ambiguous.status, 'RESOLVED');

  const invalidFact = fact('not-an-artifact-id', rowResult);
  const invalid = reconstruct(
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
  const result = reconstruct(
    registry,
    candidate.fact,
    [candidate],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
  );
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(candidate.origin, 'AI_PROPOSAL');
});

test('resolved evidence references do not establish relationship truth', () => {
  const result = reconstruct(
    registry,
    declaration().fact,
    [declaration()],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.evidence[0].status, 'RESOLVED');
  assert.equal(result.evidence[0].complete, true);
});

test('AI proposals remain historical candidates without structural graph contribution', () => {
  const candidate = declaration({
    fact: fact(rowCalculation, rowSource.id),
    origin: 'AI_PROPOSAL',
    actor: null,
  });
  const graph = resolveEngineeringKnowledgeGraph(registry, [candidate]);
  assert.equal(
    graph.declarations.some((item) => item.fingerprint === candidate.fingerprint),
    true,
  );
  assert.equal(
    graph.edges.some(
      (edge) => edge.fromId === rowCalculation && edge.toId === rowSource.id,
    ),
    false,
  );
});

test('baseId-only relationship endpoints are rejected as non-canonical', () => {
  assert.throws(
    () =>
      relationshipFact({
        subject: { kind: 'baseId', baseId: 'RESULT-REL-EXAMPLE-001' },
        predicate: 'DEPENDENCY',
        object: { kind: 'identityId', identityId: rowCalculation },
      }),
    /baseId references are not canonical artifact identities/,
  );
});

test('artifact revision identities remain distinct relationship endpoints', () => {
  const versionOne = artifact('RESULT', 'REL-VERSIONED', 1, '1');
  const versionTwo = artifact('RESULT', 'REL-VERSIONED', 1, '2');
  const first = relationshipFact({
    subject: { kind: 'identity', identity: versionOne },
    predicate: 'DEPENDENCY',
    object: { kind: 'identityId', identityId: rowCalculation },
  });
  const second = relationshipFact({
    subject: { kind: 'identity', identity: versionTwo },
    predicate: 'DEPENDENCY',
    object: { kind: 'identityId', identityId: rowCalculation },
  });
  assert.notEqual(first.fingerprint, second.fingerprint);
});

test('Release B predicates enforce their exact endpoint directions', () => {
  const describedBy = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const calculatedFor = relationshipFact({
    subject: rowResultEndpoint,
    predicate: 'CALCULATED_FOR',
    object: physicalEndpoint,
  });

  assert.equal(describedBy.predicate, 'DESCRIBED_BY');
  assert.equal(calculatedFor.predicate, 'CALCULATED_FOR');
  assert.throws(
    () =>
      relationshipFact({
        subject: rowResultEndpoint,
        predicate: 'DESCRIBED_BY',
        object: physicalEndpoint,
      }),
    /DESCRIBED_BY requires subject endpoint kind PHYSICAL_REFERENT/,
  );
  assert.throws(
    () =>
      relationshipFact({
        subject: physicalEndpoint,
        predicate: 'CALCULATED_FOR',
        object: rowResultEndpoint,
      }),
    /CALCULATED_FOR requires subject endpoint kind ARTIFACT/,
  );
});

test('Phase 15 REPRESENTED_BY enforces physical-to-artifact direction', () => {
  const representedBy = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'REPRESENTED_BY',
    object: rowResultEndpoint,
  });

  assert.equal(representedBy.predicate, 'REPRESENTED_BY');
  assert.throws(
    () =>
      relationshipFact({
        subject: rowResultEndpoint,
        predicate: 'REPRESENTED_BY',
        object: physicalEndpoint,
      }),
    /REPRESENTED_BY requires subject endpoint kind PHYSICAL_REFERENT/,
  );
  assert.throws(
    () =>
      relationshipFact({
        subject: physicalEndpoint,
        predicate: 'REPRESENTED_BY',
        object: physicalEndpoint,
      }),
    /REPRESENTED_BY requires object endpoint kind ARTIFACT/,
  );
  assert.throws(
    () =>
      relationshipFact({
        subject: physicalEndpoint,
        predicate: 'VERIFIED_BY',
        object: rowResultEndpoint,
      }),
    /Unsupported relationship predicate: VERIFIED_BY/,
  );
  assert.throws(
    () =>
      declaration({
        fact: relationshipFact({
          subject: physicalEndpoint,
          predicate: 'DESCRIBED_BY',
          object: rowResultEndpoint,
        }),
        geometryMetadata: {
          representationType: 'DESIGN',
          state: 'DESIGNED',
          coordinateReference: null,
          units: null,
          uncertainty: 'UNKNOWN',
          temporalValidity: {
            validFrom: '2026-01-01T00:00:00Z',
            validTo: '2026-12-31T23:59:59Z',
            recordedAt: '2026-08-22T10:00:00Z',
          },
          evidenceReference: null,
        },
      }),
    /Geometry metadata is only valid for REPRESENTED_BY declarations/,
  );
});

test('Phase 15 geometry metadata is declaration-level and fingerprint-distinct', () => {
  const representedFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'REPRESENTED_BY',
    object: rowResultEndpoint,
  });
  const geometryMetadata = geometrySemanticMetadata({
    representationType: 'DESIGN',
    state: 'DESIGNED',
    coordinateReference: 'EPSG:4326',
    units: 'm',
    productionMethod: 'survey-adjusted-model',
    uncertainty: 'ESTIMATED',
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T10:00:00Z',
    },
    evidenceReference: rowSource,
  });
  const geometryReferenceValue = geometryReference({
    referenceKey: 'external:geometry:REL-001',
    resolution: 'UNRESOLVED',
  });
  const first = declaration({
    fact: representedFact,
    geometryReference: geometryReferenceValue,
    geometryMetadata,
  });
  const second = declaration({
    fact: representedFact,
    geometryReference: geometryReferenceValue,
    geometryMetadata: {
      ...geometryMetadata,
      uncertainty: 'UNCERTAIN',
    },
  });
  const withoutGeometry = declaration({ fact: representedFact });

  assert.equal(first.fact.fingerprint, second.fact.fingerprint);
  assert.equal(first.fact.fingerprint, withoutGeometry.fact.fingerprint);
  assert.notEqual(first.fingerprint, second.fingerprint);
  assert.notEqual(first.fingerprint, withoutGeometry.fingerprint);
  assert.equal(first.geometryReference.resolution, 'UNRESOLVED');
  assert.equal(first.geometryMetadata.representationType, 'DESIGN');
  assert.equal(Object.isFrozen(first.geometryReference), true);
  assert.equal(Object.isFrozen(first.geometryMetadata), true);
  assert.equal(Object.isFrozen(first.geometryMetadata.temporalValidity), true);
});

test('Phase 15 REPRESENTED_BY reconstructs deterministically without geometry authority', () => {
  const representedFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'REPRESENTED_BY',
    object: rowResultEndpoint,
  });
  const candidate = declaration({
    fact: representedFact,
    origin: 'AI_PROPOSAL',
    actor: null,
    geometryReference: geometryReference({
      referenceKey: 'external:geometry:REL-UNRESOLVED',
      resolution: 'UNRESOLVED',
    }),
    geometryMetadata: geometrySemanticMetadata({
      representationType: 'IMPORTED',
      state: 'UNKNOWN',
      coordinateReference: null,
      units: 'm',
      productionMethod: 'external-model-import',
      uncertainty: 'UNKNOWN',
      temporalValidity: {
        validFrom: '2026-01-01T00:00:00Z',
        validTo: '2026-12-31T23:59:59Z',
        recordedAt: '2026-08-22T10:00:00Z',
      },
      evidenceReference: null,
    }),
  });
  const result = reconstruct(
    registry,
    representedFact,
    [candidate],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.declarations.length, 1);
  assert.equal(result.declarations[0].geometryReference.resolution, 'UNRESOLVED');
  assert.equal(result.declarations[0].geometryMetadata.uncertainty, 'UNKNOWN');
  assert.equal(
    resolveEngineeringKnowledgeGraph(registry, [candidate]).edges.some(
      (edge) => edge.predicate === 'REPRESENTED_BY',
    ),
    false,
  );
});

test('Release B predicates are governed and predicate-sensitive in fact identity', () => {
  const describedBy = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const calculatedFor = relationshipFact({
    subject: rowResultEndpoint,
    predicate: 'CALCULATED_FOR',
    object: physicalEndpoint,
  });

  assert.notEqual(describedBy.fingerprint, calculatedFor.fingerprint);
  assert.throws(
    () =>
      relationshipFact({
        subject: rowResultEndpoint,
        predicate: 'VERIFIED_BY',
        object: physicalEndpoint,
      }),
    /Unsupported relationship predicate: VERIFIED_BY/,
  );
});

test('Release B declarations remain generic, historical, and evidence-separated', () => {
  const releaseBFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const makeReleaseBDeclaration = (overrides = {}) =>
    declaration({
      fact: releaseBFact,
      evidenceReferences: [rowSource],
      ...overrides,
    });
  const affirm = makeReleaseBDeclaration();
  const duplicate = makeReleaseBDeclaration();
  const deny = makeReleaseBDeclaration({
    assertionDisposition: 'DENY',
    origin: 'IMPORTED',
    actor: null,
  });
  const graph = resolveEngineeringKnowledgeGraph(registry, [
    duplicate,
    affirm,
    deny,
  ]);

  assert.equal(graph.declarations.length, 2);
  const conflicting = reconstructEngineeringRelationship(
    registry,
    graph,
    releaseBFact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(conflicting.status, 'CONFLICTING');
  assert.equal(conflicting.evidence[0].status, 'RESOLVED');
  assert.equal(conflicting.declarations.length, 2);

  const historical = makeReleaseBDeclaration({
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2025-01-01T00:00:00Z',
    },
  });
  const historicalGraph = resolveEngineeringKnowledgeGraph(registry, [
    historical,
  ]);
  const historicalResult = reconstructEngineeringRelationship(
    registry,
    historicalGraph,
    releaseBFact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(historicalResult.status, 'HISTORICAL');
});

test('Release B AI proposals remain declarations without structural authority', () => {
  const releaseBFact = relationshipFact({
    subject: rowResultEndpoint,
    predicate: 'CALCULATED_FOR',
    object: physicalEndpoint,
  });
  const candidate = declaration({
    fact: releaseBFact,
    origin: 'AI_PROPOSAL',
    actor: null,
  });
  const graph = resolveEngineeringKnowledgeGraph(registry, [candidate]);
  const result = reconstructEngineeringRelationship(
    registry,
    graph,
    releaseBFact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
  );

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.declarations[0].origin, 'AI_PROPOSAL');
  assert.equal(graph.declarations.length, 1);
  assert.equal(
    graph.edges.some((edge) => edge.predicate === 'CALCULATED_FOR'),
    false,
  );
});

test('Release B historical reconstruction filters both authorized predicates by query time', () => {
  const describedFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const calculatedFact = relationshipFact({
    subject: rowResultEndpoint,
    predicate: 'CALCULATED_FOR',
    object: physicalEndpoint,
  });
  const historicalWindow = {
    validFrom: '2025-01-01T00:00:00Z',
    validTo: '2025-12-31T23:59:59Z',
    recordedAt: '2025-01-01T00:00:00Z',
  };
  const described = declaration({
    fact: describedFact,
    temporalValidity: historicalWindow,
  });
  const calculated = declaration({
    fact: calculatedFact,
    temporalValidity: historicalWindow,
  });

  const describedResult = reconstruct(
    registry,
    describedFact,
    [described],
    { queryTime: '2025-06-01T00:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  const calculatedResult = reconstruct(
    registry,
    calculatedFact,
    [calculated],
    { queryTime: '2025-06-01T00:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  const outsideResult = reconstruct(
    registry,
    describedFact,
    [described],
    { queryTime: '2026-06-01T00:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );

  assert.equal(describedResult.status, 'UNVERIFIED');
  assert.equal(calculatedResult.status, 'UNVERIFIED');
  assert.equal(outsideResult.status, 'HISTORICAL');
});

test('Release B temporal boundaries and unknown intervals remain explicit', () => {
  const factValue = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const bounded = declaration({
    fact: factValue,
    temporalValidity: {
      validFrom: '2026-06-01T00:00:00Z',
      validTo: '2026-06-30T23:59:59Z',
      recordedAt: '2026-06-01T00:00:00Z',
    },
  });
  const missingStart = declaration({
    fact: factValue,
    temporalValidity: {
      validTo: '2026-06-30T23:59:59Z',
      recordedAt: '2026-06-01T00:00:00Z',
    },
  });

  const beforeStart = reconstruct(
    registry,
    factValue,
    [bounded],
    { queryTime: '2026-05-31T23:59:59Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  const afterEnd = reconstruct(
    registry,
    factValue,
    [bounded],
    { queryTime: '2026-07-01T00:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  const unknownBoundary = reconstruct(
    registry,
    factValue,
    [missingStart],
    { queryTime: '2026-06-15T00:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );

  assert.equal(beforeStart.status, 'HISTORICAL');
  assert.equal(afterEnd.status, 'HISTORICAL');
  assert.equal(unknownBoundary.status, 'UNKNOWN');
});

test('Release B supersession is explicit and never inferred from newest record time', () => {
  const factValue = relationshipFact({
    subject: rowResultEndpoint,
    predicate: 'CALCULATED_FOR',
    object: physicalEndpoint,
  });
  const first = declaration({
    fact: factValue,
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-01-01T00:00:00Z',
    },
  });
  const laterWithoutSupersession = declaration({
    fact: factValue,
    origin: 'IMPORTED',
    actor: null,
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T00:00:00Z',
    },
  });
  const withoutSupersession = reconstruct(
    registry,
    factValue,
    [laterWithoutSupersession, first],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );
  assert.equal(withoutSupersession.status, 'UNVERIFIED');
  assert.deepEqual(
    withoutSupersession.declarations.map((item) => item.fingerprint),
    [first.fingerprint, laterWithoutSupersession.fingerprint].sort(),
  );

  const replacement = declaration({
    fact: factValue,
    origin: 'IMPORTED',
    actor: null,
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T00:00:00Z',
    },
    supersedes: [first.fingerprint],
  });
  const withSupersession = reconstruct(
    registry,
    factValue,
    [replacement, first],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:REL' },
    resolvedEvidence,
  );

  assert.deepEqual(
    withSupersession.declarations.map((item) => item.fingerprint),
    [replacement.fingerprint],
  );
  assert.deepEqual(
    withSupersession.historicalDeclarations.map((item) => item.fingerprint),
    [first.fingerprint],
  );
});

test('invalid Release B query context remains an explicit INVALID result', () => {
  const factValue = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: rowResultEndpoint,
  });
  const result = reconstruct(
    registry,
    factValue,
    [declaration({ fact: factValue })],
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: '   ' },
    resolvedEvidence,
  );

  assert.equal(result.status, 'INVALID');
});
