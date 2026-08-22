import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  relationshipDeclaration,
  relationshipFact,
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
    return reference.id === sourceReference.id
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
