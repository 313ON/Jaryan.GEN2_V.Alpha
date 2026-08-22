import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringSourceIdentityFromSourceId,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  relationshipDeclaration,
  relationshipFact,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';
import {
  createEngineeringRelationshipQuery,
  createRelationshipAuthorityEvaluationAdapter,
  relationshipAuthoritySubjectReference,
} from '@jaryan/shared-application';

const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 2 },
    { weightKn: 20, elevationM: 4 },
  ]),
);
const registry = createEngineeringKnowledgeRegistry().register(packageFixture);
const sourceReference = packageFixture.provenance.sources[0];
const secondSourceReference = engineeringSourceIdentityFromSourceId(
  'REL-SECOND-SOURCE',
  '1',
);
const artifactEndpoint = knowledgeGraphEndpoint({
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
const fact = relationshipFact({
  subject: physicalEndpoint,
  predicate: 'DESCRIBED_BY',
  object: artifactEndpoint,
});
const validTemporalValidity = {
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  recordedAt: '2026-01-01T00:00:00Z',
};
const queryContext = {
  queryTime: '2026-08-22T12:00:00Z',
  applicabilityContext: 'PROJECT:REL',
};

const declaration = (overrides = {}) =>
  relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:REL',
    temporalValidity: validTemporalValidity,
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [sourceReference],
    supersedes: [],
    ...overrides,
  });

const policy = (overrides = {}) => ({
  policyId: 'relationship-authority-policy',
  policyRevision: '2026-08-22.r1',
  revisionContext: 'VALID',
  allowedSourceStatuses: ['ACTIVE'],
  allowedResultStatuses: [packageFixture.result.status],
  requireApplicability: true,
  requireClaimSupport: true,
  allowReviewerRequired: false,
  ...overrides,
});

const authorityProvider = {
  resolve(request) {
    return {
      authorityId: 'relationship-authority',
      authorityRevision: '2026-08-22.r1',
      resolutionStatus: 'RESOLVED',
      factsValid: true,
      stale: false,
      conflicting: false,
      sourceStatus: 'ACTIVE',
      applicabilitySatisfied: true,
      claimSupportSatisfied: true,
      revisionTrustContext: {
        evidenceId: 'relationship-authority-evidence',
        authorityId: 'relationship-authority',
        authorityRevision: '2026-08-22.r1',
        subjectFingerprint: request.subjectFingerprint,
        status: 'VALID',
      },
    };
  },
};

const sourceAuthority = {
  resolve(reference) {
    return reference.id === sourceReference.id ||
      reference.id === secondSourceReference.id
      ? { reference, status: 'RESOLVED', sourceId: sourceReference.id }
      : { reference, status: 'NOT_FOUND', sourceId: null };
  },
};

const subject = relationshipAuthoritySubjectReference({
  authoritySubjectId: 'provider-subject:REL-001',
  authoritySubjectRevision: 'r1',
  package: packageFixture,
});

const adapter = (overrides = {}) =>
  createRelationshipAuthorityEvaluationAdapter({
    sourceAuthority,
    authorityEvidenceProvider: authorityProvider,
    policy: policy(),
    ...overrides,
  });

test('provider-owned authority subject references are explicit and deterministic', () => {
  const first = relationshipAuthoritySubjectReference({
    authoritySubjectId: 'provider-subject:REL-001',
    authoritySubjectRevision: 'r1',
    package: packageFixture,
  });
  const second = relationshipAuthoritySubjectReference({
    authoritySubjectId: 'provider-subject:REL-001',
    authoritySubjectRevision: 'r1',
    package: packageFixture,
  });

  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.throws(
    () =>
      relationshipAuthoritySubjectReference({
        authoritySubjectId: '',
        authoritySubjectRevision: 'r1',
        package: packageFixture,
      }),
    /Authority subject id must be non-empty/,
  );
});

test('evidence resolution remains separate from authority and trust', () => {
  const noEvidence = declaration({ evidenceReferences: [] });
  const query = createEngineeringRelationshipQuery(registry, [noEvidence]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(result.reconstruction.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.evaluations[0].evidenceResolution.status, 'NOT_FOUND');
  assert.equal(result.evaluations[0].authorityStatus, 'RESOLVED');
  assert.equal(result.evaluations[0].trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.evaluations[0].reasonCodes, ['EVIDENCE_INCOMPLETE']);
});

test('resolvable evidence can delegate to the existing authority and trust boundary', () => {
  const query = createEngineeringRelationshipQuery(registry, [declaration()]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(result.reconstruction.status, 'UNVERIFIED');
  assert.equal(result.evaluations[0].evidenceResolution.status, 'RESOLVED');
  assert.equal(result.evaluations[0].authorityStatus, 'RESOLVED');
  assert.equal(result.evaluations[0].trustStatus, 'TRUSTED');
  assert.deepEqual(result.evaluations[0].reasonCodes, ['TRUST_GRANTED']);
});

test('query evidence resolution is passed through without changing artifact identity', () => {
  let resolveCalls = 0;
  const evidenceAdapter = {
    resolve(references) {
      resolveCalls += 1;
      assert.deepEqual(references.map((reference) => reference.id), [
        sourceReference.id,
      ]);
      return { status: 'UNVERIFIED', complete: false };
    },
  };
  const result = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
    evidenceAdapter,
  );

  assert.equal(resolveCalls, 1);
  assert.equal(result.evaluations[0].evidenceResolution.status, 'UNVERIFIED');
  assert.equal(result.evaluations[0].evidenceResolution.complete, false);
  assert.deepEqual(
    result.evaluations[0].evidenceReferences.map((reference) => ({
      id: reference.id,
      baseId: reference.baseId,
      version: reference.version,
    })),
    [{
      id: sourceReference.id,
      baseId: sourceReference.baseId,
      version: sourceReference.version,
    }],
  );
  assert.equal(
    result.evaluations[0].evidenceReferences[0].id,
    sourceReference.id,
  );
});

test('unresolved evidence blocks trust without changing structural reconstruction', () => {
  const unresolved = declaration({
    evidenceReferences: [
      {
        ...sourceReference,
        version: '999',
        id: `${sourceReference.baseId}-v999`,
      },
    ],
  });
  const query = createEngineeringRelationshipQuery(registry, [unresolved]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(result.reconstruction.status, 'UNVERIFIED');
  assert.equal(result.evaluations[0].evidenceResolution.status, 'NOT_FOUND');
  assert.equal(result.evaluations[0].authorityStatus, 'RESOLVED');
  assert.equal(result.evaluations[0].trustStatus, 'NOT_ELIGIBLE');
});

test('policy binding remains external and trust remains separate from authority', () => {
  const query = createEngineeringRelationshipQuery(registry, [declaration()]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter({
      policy: policy({ allowedSourceStatuses: ['DRAFT'] }),
    }),
    subject,
  );

  assert.equal(result.evaluations[0].authorityStatus, 'RESOLVED');
  assert.equal(result.evaluations[0].trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.evaluations[0].reasonCodes, [
    'SOURCE_STATUS_DISALLOWED',
  ]);
});

test('actor attribution does not imply authority and AI proposals remain non-authoritative', () => {
  const human = declaration({
    origin: 'HUMAN',
    actor: 'engineer-001',
  });
  const ai = declaration({
    origin: 'AI_PROPOSAL',
    actor: null,
  });
  const query = createEngineeringRelationshipQuery(registry, [human, ai]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
  );

  const humanEvaluation = result.evaluations.find(
    (item) => item.declarationFingerprint === human.fingerprint,
  );
  const aiEvaluation = result.evaluations.find(
    (item) => item.declarationFingerprint === ai.fingerprint,
  );
  assert.equal(humanEvaluation.authorityStatus, 'RESOLVED');
  assert.equal(aiEvaluation.authorityStatus, 'UNASSESSED');
  assert.equal(aiEvaluation.trustStatus, 'NOT_ELIGIBLE');
});

test('historical and conflicting declarations retain independent projections', () => {
  const current = declaration();
  const deny = declaration({
    assertionDisposition: 'DENY',
    origin: 'HUMAN',
    actor: 'engineer-002',
  });
  const historical = declaration({
    origin: 'IMPORTED',
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2025-01-01T00:00:00Z',
    },
  });
  const query = createEngineeringRelationshipQuery(registry, [
    historical,
    deny,
    current,
  ]);
  const result = query.evaluateAuthority(
    fact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(result.reconstruction.status, 'CONFLICTING');
  assert.equal(result.evaluations.length, 2);
  assert.equal(result.historicalEvaluations.length, 1);
  assert.deepEqual(
    result.evaluations.map((item) => item.declarationFingerprint),
    [current.fingerprint, deny.fingerprint].sort(),
  );
  assert.equal(
    result.historicalEvaluations[0].declarationFingerprint,
    historical.fingerprint,
  );
  assert.equal(result.historicalEvaluations[0].structuralStatus, 'HISTORICAL');
});

test('authority projection ordering is deterministic', () => {
  const first = declaration();
  const second = declaration({
    origin: 'HUMAN',
    actor: 'engineer-003',
  });
  const forward = createEngineeringRelationshipQuery(registry, [second, first])
    .evaluateAuthority(fact, queryContext, adapter(), subject);
  const reverse = createEngineeringRelationshipQuery(registry, [first, second])
    .evaluateAuthority(fact, queryContext, adapter(), subject);

  assert.deepEqual(forward, reverse);
  assert.equal(Object.isFrozen(forward.evaluations), true);
});

test('query-facing evidence state distinguishes absent, unresolved, and resolved evidence', () => {
  const absent = createEngineeringRelationshipQuery(registry, [
    declaration({ evidenceReferences: [] }),
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);
  const unresolved = createEngineeringRelationshipQuery(registry, [
    declaration({
      evidenceReferences: [{
        ...sourceReference,
        version: '999',
        id: `${sourceReference.baseId}-v999`,
      }],
    }),
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);
  const resolved = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);

  assert.deepEqual(absent.evidence, {
    presence: 'ABSENT',
    resolution: 'UNKNOWN',
    complete: false,
  });
  assert.deepEqual(unresolved.evidence, {
    presence: 'PRESENT',
    resolution: 'UNRESOLVED',
    complete: false,
  });
  assert.deepEqual(resolved.evidence, {
    presence: 'PRESENT',
    resolution: 'RESOLVED',
    complete: true,
  });
});

test('authority and trust projections remain separate', () => {
  const noAuthority = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(
    fact,
    queryContext,
    adapter({ authorityEvidenceProvider: null }),
    subject,
  );
  const policyBlocked = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(
    fact,
    queryContext,
    adapter({ policy: policy({ allowedSourceStatuses: ['DRAFT'] }) }),
    subject,
  );

  assert.deepEqual(noAuthority.authority, {
    statuses: ['UNASSESSED'],
    assessed: false,
    established: false,
  });
  assert.deepEqual(noAuthority.trust, {
    statuses: ['NOT_ELIGIBLE'],
    established: false,
  });
  assert.deepEqual(policyBlocked.authority, {
    statuses: ['RESOLVED'],
    assessed: true,
    established: true,
  });
  assert.deepEqual(policyBlocked.trust, {
    statuses: ['NOT_ELIGIBLE'],
    established: false,
  });
});

test('conflict and historical state remain independent from evidence differences', () => {
  const affirm = declaration();
  const secondAffirm = declaration({
    origin: 'HUMAN',
    actor: 'engineer-004',
    evidenceReferences: [secondSourceReference],
  });
  const deny = declaration({
    assertionDisposition: 'DENY',
    origin: 'HUMAN',
    actor: 'engineer-005',
  });
  const historical = declaration({
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2025-01-01T00:00:00Z',
    },
  });
  const differentEvidence = createEngineeringRelationshipQuery(registry, [
    affirm,
    secondAffirm,
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);
  const conflicting = createEngineeringRelationshipQuery(registry, [
    affirm,
    deny,
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);
  const historicalProjection = createEngineeringRelationshipQuery(registry, [
    affirm,
    historical,
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);

  assert.equal(differentEvidence.conflict, false);
  assert.equal(differentEvidence.reconstruction.status, 'UNVERIFIED');
  assert.equal(conflicting.conflict, true);
  assert.equal(conflicting.reconstruction.status, 'CONFLICTING');
  assert.equal(historicalProjection.conflict, false);
  assert.equal(historicalProjection.historical, true);
  assert.equal(historicalProjection.historicalEvaluations.length, 1);
});

test('invalid query state keeps projection dimensions unknown without fallback', () => {
  const projection = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(
    fact,
    { queryTime: 'invalid-query-time', applicabilityContext: 'PROJECT:REL' },
    adapter(),
    subject,
  );

  assert.equal(projection.reconstruction.status, 'INVALID');
  assert.deepEqual(projection.evidence, {
    presence: 'UNKNOWN',
    resolution: 'UNKNOWN',
    complete: false,
  });
  assert.deepEqual(projection.authority.statuses, []);
  assert.deepEqual(projection.trust.statuses, []);
  assert.equal(projection.conflict, false);
});

test('ambiguous endpoint query keeps all projection dimensions unknown', () => {
  const secondPackage = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const ambiguousRegistry = registry.register(secondPackage);
  const ambiguousFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: knowledgeGraphEndpoint({
      kind: 'ARTIFACT',
      status: 'RESOLVED',
      identity: sourceReference,
    }),
  });
  const projection = createEngineeringRelationshipQuery(
    ambiguousRegistry,
    [declaration({ fact: ambiguousFact })],
  ).evaluateAuthority(
    ambiguousFact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(projection.reconstruction.status, 'AMBIGUOUS');
  assert.deepEqual(projection.evidence, {
    presence: 'UNKNOWN',
    resolution: 'UNKNOWN',
    complete: false,
  });
  assert.deepEqual(projection.authority.statuses, []);
  assert.deepEqual(projection.trust.statuses, []);
});

test('projection ordering and diagnostics are independent of insertion order', () => {
  const first = declaration({
    origin: 'HUMAN',
    actor: 'engineer-z',
    evidenceReferences: [secondSourceReference, sourceReference],
  });
  const second = declaration({
    origin: 'HUMAN',
    actor: 'engineer-a',
    evidenceReferences: [sourceReference],
  });
  const forward = createEngineeringRelationshipQuery(registry, [
    second,
    first,
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);
  const reverse = createEngineeringRelationshipQuery(registry, [
    first,
    second,
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);

  assert.deepEqual(forward, reverse);
  assert.deepEqual(
    forward.evaluations.map((evaluation) => evaluation.declarationFingerprint),
    [...forward.evaluations]
      .map((evaluation) => evaluation.declarationFingerprint)
      .sort(),
  );
  assert.deepEqual(
    forward.evaluations[0].diagnostics,
    [...forward.evaluations[0].diagnostics].sort(),
  );
  assert.deepEqual(
    forward.reasonCodes,
    [...forward.reasonCodes].sort(),
  );
  assert.deepEqual(
    forward.diagnostics,
    [...forward.diagnostics].sort(),
  );
});

test('projection preserves uncertainty dimensions without fallback selection', () => {
  const invalid = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(
    fact,
    { queryTime: 'invalid', applicabilityContext: 'PROJECT:REL' },
    adapter(),
    subject,
  );
  const ambiguousRegistry = registry.register(
    createEngineeringKnowledgePackageFromPrimitive(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    ),
  );
  const ambiguousFact = relationshipFact({
    subject: physicalEndpoint,
    predicate: 'DESCRIBED_BY',
    object: knowledgeGraphEndpoint({
      kind: 'ARTIFACT',
      status: 'RESOLVED',
      identity: packageFixture.provenance.sources[0],
    }),
  });
  const ambiguous = createEngineeringRelationshipQuery(ambiguousRegistry, [
    declaration({ fact: ambiguousFact }),
  ]).evaluateAuthority(
    ambiguousFact,
    queryContext,
    adapter(),
    subject,
  );

  assert.equal(invalid.reconstruction.status, 'INVALID');
  assert.equal(ambiguous.reconstruction.status, 'AMBIGUOUS');
  for (const projection of [invalid, ambiguous]) {
    assert.deepEqual(projection.evidence, {
      presence: 'UNKNOWN',
      resolution: 'UNKNOWN',
      complete: false,
    });
    assert.deepEqual(projection.authority.statuses, []);
    assert.deepEqual(projection.trust.statuses, []);
    assert.deepEqual(projection.evaluations, []);
    assert.deepEqual(projection.historicalEvaluations, []);
  }
});

test('query projections and nested state are immutable', () => {
  const projection = createEngineeringRelationshipQuery(registry, [
    declaration(),
  ]).evaluateAuthority(fact, queryContext, adapter(), subject);

  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.evaluations), true);
  assert.equal(Object.isFrozen(projection.evaluations[0]), true);
  assert.equal(Object.isFrozen(projection.evaluations[0].evidenceResolution), true);
  assert.equal(Object.isFrozen(projection.evidence), true);
  assert.equal(Object.isFrozen(projection.authority), true);
  assert.equal(Object.isFrozen(projection.trust), true);
  assert.equal(Object.isFrozen(projection.reasonCodes), true);
  assert.equal(Object.isFrozen(projection.diagnostics), true);
  assert.throws(() => {
    projection.evaluations.push(projection.evaluations[0]);
  }, TypeError);
  assert.throws(() => {
    projection.evaluations[0].evidenceResolution.status = 'NOT_FOUND';
  }, TypeError);
});
