import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEngineeringKnowledgePackageFromPrimitive,
  engineeringKnowledgePackageFromContent,
  engineeringKnowledgePackageFingerprint,
  evaluateEngineeringKnowledgeTrust,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

const buildPackage = () =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );

const authority = (overrides = {}) => ({
  authorityId: 'test-authority',
  authorityRevision: '2026-08-21.r1',
  revisionContext: 'VALID',
  resolutionStatus: 'RESOLVED',
  factsValid: true,
  stale: false,
  conflicting: false,
  sourceStatus: 'ACTIVE',
  applicabilitySatisfied: true,
  claimSupportSatisfied: true,
  ...overrides,
});

const policy = (overrides = {}) => ({
  policyId: 'production-trust',
  policyRevision: '2026-08-21.r1',
  revisionContext: 'VALID',
  allowedSourceStatuses: ['ACTIVE'],
  allowedResultStatuses: ['SOURCE_VALIDATED'],
  requireApplicability: true,
  requireClaimSupport: true,
  allowReviewerRequired: false,
  ...overrides,
});

const evaluate = (overrides = {}) =>
  evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy(),
    ...overrides,
  });

test('valid authority, complete evidence, and valid policy produce TRUSTED', () => {
  assert.deepEqual(evaluate(), {
    structuralStatus: 'STRUCTURALLY_VALID',
    authorityStatus: 'RESOLVED',
    trustStatus: 'TRUSTED',
    authorityId: 'test-authority',
    authorityRevision: '2026-08-21.r1',
    policyId: 'production-trust',
    policyRevision: '2026-08-21.r1',
    reasons: ['TRUST_GRANTED'],
  });
});

test('structurally invalid package cannot become trusted', () => {
  const pkg = buildPackage();
  const invalid = { ...pkg, result: { ...pkg.result, identityId: 'invalid' } };
  const result = evaluateEngineeringKnowledgeTrust({
    package: invalid,
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(result.structuralStatus, 'STRUCTURALLY_INVALID');
  assert.equal(result.trustStatus, 'REJECTED');
  assert.deepEqual(result.reasons, ['STRUCTURAL_INVALID']);
});

test('authority-free, fingerprint-valid, and reconstructed packages cannot become trusted', () => {
  const pkg = buildPackage();
  const authorityFree = evaluateEngineeringKnowledgeTrust({
    package: pkg,
    authorityFacts: null,
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(authorityFree.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(authorityFree.reasons, ['AUTHORITY_UNASSESSED']);

  const reconstructed = engineeringKnowledgePackageFromContent(
    pkg,
    pkg.fingerprint,
  );
  const reconstructedResult = evaluateEngineeringKnowledgeTrust({
    package: reconstructed,
    authorityFacts: null,
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(reconstructedResult.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(reconstructedResult.reasons, ['AUTHORITY_UNASSESSED']);
  assert.equal(
    evaluateEngineeringKnowledgeTrust({
      package: pkg,
      authorityFacts: null,
      evidenceComplete: true,
      policy: policy(),
    }).structuralStatus,
    'STRUCTURALLY_VALID',
  );
});

test('RESOLVED alone and fabricated sources without valid facts cannot become trusted', () => {
  const resolvedOnly = evaluate({
    authorityFacts: authority({
      factsValid: false,
      applicabilitySatisfied: false,
      claimSupportSatisfied: false,
    }),
  });
  assert.equal(resolvedOnly.authorityStatus, 'INVALID_FACTS');
  assert.equal(resolvedOnly.trustStatus, 'REJECTED');
  assert.deepEqual(resolvedOnly.reasons, ['AUTHORITY_FACTS_INVALID']);

  const fabricated = evaluate({
    authorityFacts: authority({
      authorityId: 'fabricated',
      factsValid: false,
      sourceStatus: null,
    }),
  });
  assert.equal(fabricated.trustStatus, 'REJECTED');
  assert.deepEqual(fabricated.reasons, ['AUTHORITY_FACTS_INVALID']);
});

test('missing evidence blocks trust', () => {
  const pkg = buildPackage();
  const result = evaluateEngineeringKnowledgeTrust({
    package: pkg,
    authorityFacts: authority(),
    evidenceComplete: false,
    policy: policy(),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['EVIDENCE_INCOMPLETE']);
});

test('disallowed source status blocks trust', () => {
  const result = evaluate({
    authorityFacts: authority({ sourceStatus: 'DRAFT' }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['SOURCE_STATUS_DISALLOWED']);
});

test('failed applicability and claim support block trust', () => {
  const result = evaluate({
    authorityFacts: authority({
      applicabilitySatisfied: false,
      claimSupportSatisfied: false,
    }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, [
    'APPLICABILITY_FAILED',
    'CLAIM_SUPPORT_FAILED',
  ]);
});

test('policy failure prevents trusted promotion', () => {
  const result = evaluate({
    policy: policy({ allowedResultStatuses: ['CALCULATED'] }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['POLICY_PREDICATE_FAILED']);
});

test('authority failures are explicit and cannot promote', () => {
  for (const [resolutionStatus, reason] of [
    ['AMBIGUOUS', 'AUTHORITY_AMBIGUOUS'],
    ['NOT_FOUND', 'AUTHORITY_NOT_FOUND'],
    ['INVALID', 'AUTHORITY_INVALID'],
  ]) {
    const result = evaluate({
      authorityFacts: authority({ resolutionStatus }),
    });
    assert.equal(result.trustStatus, 'REJECTED');
    assert.deepEqual(result.reasons, [reason]);
  }
});

test('stale and revoked outcomes are explicit', () => {
  const stale = evaluate({
    authorityFacts: authority({ stale: true }),
  });
  assert.equal(stale.authorityStatus, 'STALE');
  assert.equal(stale.trustStatus, 'STALE');
  assert.deepEqual(stale.reasons, ['AUTHORITY_STALE']);

  const revoked = evaluate({ revoked: true });
  assert.equal(revoked.trustStatus, 'REVOKED');
  assert.deepEqual(revoked.reasons, ['REVOKED']);
  assert.notEqual(revoked.trustStatus, 'TRUSTED');
});

test('authority and policy identities are present in every evaluated result', () => {
  const result = evaluate();
  assert.equal(result.authorityId, 'test-authority');
  assert.equal(result.authorityRevision, '2026-08-21.r1');
  assert.equal(result.policyId, 'production-trust');
  assert.equal(result.policyRevision, '2026-08-21.r1');

  const unassessed = evaluate({ authorityFacts: null });
  assert.equal(unassessed.authorityId, null);
  assert.equal(unassessed.authorityRevision, null);
  assert.equal(unassessed.policyId, 'production-trust');
  assert.equal(unassessed.policyRevision, '2026-08-21.r1');
});

test('authority and policy revisions require explicit compatible context', () => {
  const staleRevision = evaluate({
    authorityFacts: authority({
      authorityRevision: '2026-08-21.r2',
      revisionContext: 'INCOMPATIBLE',
    }),
  });
  assert.equal(staleRevision.trustStatus, 'STALE');
  assert.deepEqual(staleRevision.reasons, [
    'AUTHORITY_REVISION_INCOMPATIBLE',
  ]);

  const policyRevision = evaluate({
    policy: policy({
      policyRevision: '2026-08-21.r2',
      revisionContext: 'INCOMPATIBLE',
    }),
  });
  assert.equal(policyRevision.trustStatus, 'STALE');
  assert.deepEqual(policyRevision.reasons, [
    'POLICY_REVISION_INCOMPATIBLE',
  ]);
});

test('identical inputs produce identical immutable results', () => {
  const input = {
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy(),
  };
  const first = evaluateEngineeringKnowledgeTrust(input);
  const second = evaluateEngineeringKnowledgeTrust(input);
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.reasons), true);
});

test('trust evaluation does not modify package state or fingerprint', () => {
  const pkg = buildPackage();
  const before = JSON.stringify(pkg);
  const fingerprint = pkg.fingerprint;
  evaluateEngineeringKnowledgeTrust({
    package: pkg,
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(pkg.fingerprint, fingerprint);
  assert.equal(engineeringKnowledgePackageFingerprint(pkg), fingerprint);
  assert.equal(JSON.stringify(pkg), before);
  assert.equal(Object.isFrozen(pkg), true);
});

test('forbidden DRAFT and SUPERSEDED promotions remain blocked by production policy', () => {
  for (const sourceStatus of ['DRAFT', 'SUPERSEDED']) {
    const result = evaluate({
      authorityFacts: authority({ sourceStatus }),
    });
    assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
    assert.deepEqual(result.reasons, ['SOURCE_STATUS_DISALLOWED']);
  }
});

test('reasons are stable machine-readable codes', () => {
  const first = evaluate({
    authorityFacts: authority({
      sourceStatus: 'DRAFT',
      applicabilitySatisfied: false,
      claimSupportSatisfied: false,
    }),
  });
  const second = evaluate({
    authorityFacts: authority({
      sourceStatus: 'DRAFT',
      applicabilitySatisfied: false,
      claimSupportSatisfied: false,
    }),
  });
  assert.deepEqual(first.reasons, second.reasons);
  for (const reason of first.reasons) {
    assert.match(reason, /^[A-Z_]+$/);
  }
});

test('different authority revisions produce distinct trust contexts', () => {
  const r1 = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityRevision: '2024-01-01.r1' }),
    evidenceComplete: true,
    policy: policy(),
  });
  const r2 = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityRevision: '2024-06-15.r3' }),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(r1.trustStatus, 'TRUSTED');
  assert.equal(r2.trustStatus, 'TRUSTED');
  assert.equal(r1.authorityRevision, '2024-01-01.r1');
  assert.equal(r2.authorityRevision, '2024-06-15.r3');
  assert.notDeepEqual(r1, r2);
});

test('different policy revisions produce distinct trust contexts', () => {
  const r1 = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyRevision: 'policy-v1' }),
  });
  const r2 = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyRevision: 'policy-v2' }),
  });
  assert.equal(r1.trustStatus, 'TRUSTED');
  assert.equal(r2.trustStatus, 'TRUSTED');
  assert.equal(r1.policyRevision, 'policy-v1');
  assert.equal(r2.policyRevision, 'policy-v2');
  assert.notDeepEqual(r1, r2);
});

test('empty authority id is rejected with INVALID_FACTS', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityId: '' }),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(result.trustStatus, 'REJECTED');
  assert.deepEqual(result.reasons, ['AUTHORITY_FACTS_INVALID']);
  assert.equal(result.authorityStatus, 'INVALID_FACTS');
});

test('whitespace-only authority id is rejected with INVALID_FACTS', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityId: '   ' }),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(result.trustStatus, 'REJECTED');
  assert.deepEqual(result.reasons, ['AUTHORITY_FACTS_INVALID']);
  assert.equal(result.authorityStatus, 'INVALID_FACTS');
});

test('empty authority revision is rejected with AUTHORITY_REVISION_INVALID', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityRevision: '' }),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(result.trustStatus, 'REJECTED');
  assert.deepEqual(result.reasons, ['AUTHORITY_REVISION_INVALID']);
  assert.equal(result.authorityStatus, 'INVALID_FACTS');
});

test('whitespace-only authority revision is rejected with AUTHORITY_REVISION_INVALID', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority({ authorityRevision: '  ' }),
    evidenceComplete: true,
    policy: policy(),
  });
  assert.equal(result.trustStatus, 'REJECTED');
  assert.deepEqual(result.reasons, ['AUTHORITY_REVISION_INVALID']);
  assert.equal(result.authorityStatus, 'INVALID_FACTS');
});

test('empty policy id is rejected with POLICY_PREDICATE_FAILED', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyId: '' }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['POLICY_PREDICATE_FAILED']);
});

test('whitespace-only policy id is rejected with POLICY_PREDICATE_FAILED', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyId: '   ' }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['POLICY_PREDICATE_FAILED']);
});

test('empty policy revision is rejected with POLICY_REVISION_INVALID', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyRevision: '' }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['POLICY_REVISION_INVALID']);
});

test('whitespace-only policy revision is rejected with POLICY_REVISION_INVALID', () => {
  const result = evaluateEngineeringKnowledgeTrust({
    package: buildPackage(),
    authorityFacts: authority(),
    evidenceComplete: true,
    policy: policy({ policyRevision: '   ' }),
  });
  assert.equal(result.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(result.reasons, ['POLICY_REVISION_INVALID']);
});

test('changing only the authority revision cannot preserve TRUSTED without compatible context', () => {
  const result = evaluate({
    authorityFacts: authority({
      authorityRevision: '2026-08-21.r2',
      revisionContext: 'INCOMPATIBLE',
    }),
  });
  assert.notEqual(result.trustStatus, 'TRUSTED');
  assert.equal(result.trustStatus, 'STALE');
  assert.deepEqual(result.reasons, [
    'AUTHORITY_REVISION_INCOMPATIBLE',
  ]);
});

test('changing only the policy revision cannot preserve TRUSTED without compatible context', () => {
  const result = evaluate({
    policy: policy({
      policyRevision: '2026-08-21.r2',
      revisionContext: 'INCOMPATIBLE',
    }),
  });
  assert.notEqual(result.trustStatus, 'TRUSTED');
  assert.equal(result.trustStatus, 'STALE');
  assert.deepEqual(result.reasons, [
    'POLICY_REVISION_INCOMPATIBLE',
  ]);
});

test('invalid revision context cannot silently preserve TRUSTED', () => {
  const authorityResult = evaluate({
    authorityFacts: authority({ revisionContext: 'INVALID' }),
  });
  assert.equal(authorityResult.trustStatus, 'REJECTED');
  assert.deepEqual(authorityResult.reasons, [
    'AUTHORITY_REVISION_INVALID',
  ]);

  const policyResult = evaluate({
    policy: policy({ revisionContext: 'INVALID' }),
  });
  assert.equal(policyResult.trustStatus, 'NOT_ELIGIBLE');
  assert.deepEqual(policyResult.reasons, [
    'POLICY_REVISION_INVALID',
  ]);
});
