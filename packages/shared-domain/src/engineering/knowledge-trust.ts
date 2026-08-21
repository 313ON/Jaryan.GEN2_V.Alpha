import type {
  EngineeringKnowledgePackage,
} from './engineering-knowledge-package.ts';
import {
  validateEngineeringKnowledgePackage,
} from './engineering-knowledge-package.ts';
import type {
  EngineeringResultStatus,
} from './engineering-result.ts';
import type {
  AuthorityEvidence,
  AuthorityEvidenceProvider,
  AuthoritySourceStatus,
  RevisionTrustContextStatus,
} from './authority-evidence.ts';
export type {
  AuthorityEvidence,
  AuthorityEvidenceProvider,
  AuthorityEvidenceRequest,
  RevisionTrustContext,
} from './authority-evidence.ts';
export type {
  AuthoritySourceStatus,
  RevisionTrustContextStatus,
} from './authority-evidence.ts';

export type StructuralStatus =
  | 'STRUCTURALLY_INVALID'
  | 'STRUCTURALLY_VALID';

export type AuthorityStatus =
  | 'UNASSESSED'
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'AMBIGUOUS'
  | 'INVALID_FACTS'
  | 'STALE'
  | 'CONFLICTING';

export type TrustStatus =
  | 'NOT_ELIGIBLE'
  | 'TRUSTED'
  | 'REJECTED'
  | 'STALE'
  | 'REVOKED';

export type RevisionContextStatus = RevisionTrustContextStatus;

export type TrustReasonCode =
  | 'STRUCTURAL_INVALID'
  | 'AUTHORITY_UNASSESSED'
  | 'AUTHORITY_FACTS_INVALID'
  | 'AUTHORITY_REVISION_INVALID'
  | 'AUTHORITY_REVISION_INCOMPATIBLE'
  | 'AUTHORITY_NOT_FOUND'
  | 'AUTHORITY_INVALID'
  | 'AUTHORITY_AMBIGUOUS'
  | 'AUTHORITY_STALE'
  | 'AUTHORITY_CONFLICTING'
  | 'SOURCE_STATUS_DISALLOWED'
  | 'APPLICABILITY_FAILED'
  | 'CLAIM_SUPPORT_FAILED'
  | 'EVIDENCE_INCOMPLETE'
  | 'POLICY_PREDICATE_FAILED'
  | 'POLICY_REVISION_INVALID'
  | 'POLICY_REVISION_INCOMPATIBLE'
  | 'REVOKED'
  | 'TRUST_GRANTED';

export const TRUST_REASON_CODES: readonly TrustReasonCode[] = [
  'STRUCTURAL_INVALID',
  'AUTHORITY_UNASSESSED',
  'AUTHORITY_FACTS_INVALID',
  'AUTHORITY_REVISION_INVALID',
  'AUTHORITY_REVISION_INCOMPATIBLE',
  'AUTHORITY_NOT_FOUND',
  'AUTHORITY_INVALID',
  'AUTHORITY_AMBIGUOUS',
  'AUTHORITY_STALE',
  'AUTHORITY_CONFLICTING',
  'SOURCE_STATUS_DISALLOWED',
  'APPLICABILITY_FAILED',
  'CLAIM_SUPPORT_FAILED',
  'EVIDENCE_INCOMPLETE',
  'POLICY_PREDICATE_FAILED',
  'POLICY_REVISION_INVALID',
  'POLICY_REVISION_INCOMPATIBLE',
  'REVOKED',
  'TRUST_GRANTED',
];

export type AuthorityFacts = AuthorityEvidence;

export interface TrustPolicy {
  readonly policyId: string;
  readonly policyRevision: string;
  readonly revisionContext: RevisionContextStatus;
  readonly allowedSourceStatuses: readonly AuthoritySourceStatus[];
  readonly allowedResultStatuses: readonly EngineeringResultStatus[];
  readonly requireApplicability: boolean;
  readonly requireClaimSupport: boolean;
  readonly allowReviewerRequired: boolean;
}

export interface TrustEvaluationInput {
  readonly package: EngineeringKnowledgePackage;
  readonly authorityEvidenceProvider: AuthorityEvidenceProvider | null;
  readonly evidenceComplete: boolean;
  readonly policy: TrustPolicy;
  readonly revoked?: boolean;
}

export interface TrustEvaluationResult {
  readonly structuralStatus: StructuralStatus;
  readonly authorityStatus: AuthorityStatus;
  readonly trustStatus: TrustStatus;
  readonly authorityId: string | null;
  readonly authorityRevision: string | null;
  readonly policyId: string;
  readonly policyRevision: string;
  readonly reasons: readonly TrustReasonCode[];
}

export function evaluateEngineeringKnowledgeTrust(
  input: TrustEvaluationInput,
): TrustEvaluationResult {
  const legacyProvider = (
    input as TrustEvaluationInput & {
      readonly authorityFacts?: AuthorityEvidenceProvider | null;
    }
  ).authorityFacts;
  const provider = input.authorityEvidenceProvider ?? legacyProvider;
  const authority =
    isAuthorityEvidenceProvider(provider)
      ? provider.resolve({ subjectFingerprint: input.package.fingerprint })
      : null;
  const policy = input.policy;
  const structuralErrors = validateEngineeringKnowledgePackage(input.package);
  const structuralStatus: StructuralStatus =
    structuralErrors.length === 0
      ? 'STRUCTURALLY_VALID'
      : 'STRUCTURALLY_INVALID';
  const authorityStatus = deriveAuthorityStatus(authority);
  const identity = {
    authorityId: authority?.authorityId ?? null,
    authorityRevision: authority?.authorityRevision ?? null,
    policyId: policy.policyId,
    policyRevision: policy.policyRevision,
  };

  if (structuralStatus === 'STRUCTURALLY_INVALID') {
    return freezeResult({
      ...identity,
      structuralStatus,
      authorityStatus,
      trustStatus: 'REJECTED',
      reasons: ['STRUCTURAL_INVALID'],
    });
  }

  const revisionReason = revisionContextReason(
    authority,
    policy,
    input.package.fingerprint,
  );
  if (revisionReason !== null) {
    return freezeResult({
      ...identity,
      structuralStatus,
      authorityStatus,
      trustStatus: revisionTrustStatus(revisionReason),
      reasons: [revisionReason],
    });
  }

  if (input.revoked === true) {
    return freezeResult({
      ...identity,
      structuralStatus,
      authorityStatus,
      trustStatus: 'REVOKED',
      reasons: ['REVOKED'],
    });
  }

  const authorityReason = authorityReasonCode(authority, authorityStatus);
  if (authorityReason !== null) {
    return freezeResult({
      ...identity,
      structuralStatus,
      authorityStatus,
      trustStatus: authorityTrustStatus(authorityStatus),
      reasons: [authorityReason],
    });
  }

  const reasons: TrustReasonCode[] = [];
  const sourceStatus = authority?.sourceStatus;
  if (
    sourceStatus === null ||
    sourceStatus === undefined ||
    !policy.allowedSourceStatuses.includes(sourceStatus)
  ) {
    reasons.push('SOURCE_STATUS_DISALLOWED');
  }
  if (
    policy.requireApplicability &&
    authority?.applicabilitySatisfied !== true
  ) {
    reasons.push('APPLICABILITY_FAILED');
  }
  if (
    policy.requireClaimSupport &&
    authority?.claimSupportSatisfied !== true
  ) {
    reasons.push('CLAIM_SUPPORT_FAILED');
  }
  if (
    input.evidenceComplete !== true
  ) {
    reasons.push('EVIDENCE_INCOMPLETE');
  }
  if (
    !isPolicyValid(policy) ||
    !policy.allowedResultStatuses.includes(input.package.result.status) ||
    (!policy.allowReviewerRequired && input.package.result.reviewerRequired)
  ) {
    reasons.push('POLICY_PREDICATE_FAILED');
  }

  if (reasons.length > 0) {
    return freezeResult({
      ...identity,
      structuralStatus,
      authorityStatus,
      trustStatus: 'NOT_ELIGIBLE',
      reasons,
    });
  }

  return freezeResult({
    ...identity,
    structuralStatus,
    authorityStatus,
    trustStatus: 'TRUSTED',
    reasons: ['TRUST_GRANTED'],
  });
}

function deriveAuthorityStatus(
  authority: AuthorityEvidence | null,
): AuthorityStatus {
  if (authority === null) {
    return 'UNASSESSED';
  }
  if (
    !authority.factsValid ||
    !hasAuthorityIdentity(authority) ||
    !hasValidRevisionTrustContext(authority)
  ) {
    return 'INVALID_FACTS';
  }
  if (authority.stale) {
    return 'STALE';
  }
  if (authority.conflicting) {
    return 'CONFLICTING';
  }
  return authority.resolutionStatus;
}

function revisionContextReason(
  authority: AuthorityEvidence | null,
  policy: TrustPolicy,
  subjectFingerprint: string,
): TrustReasonCode | null {
  if (authority !== null) {
    if (!hasText(authority.authorityId)) {
      return null;
    }
    if (!hasText(authority.authorityRevision)) {
      return 'AUTHORITY_REVISION_INVALID';
    }
    if (!hasValidRevisionTrustContext(authority)) {
      return 'AUTHORITY_REVISION_INVALID';
    }
    if (
      authority.revisionTrustContext.status === 'INCOMPATIBLE' ||
      authority.revisionTrustContext.subjectFingerprint !== subjectFingerprint ||
      authority.revisionTrustContext.authorityId !== authority.authorityId ||
      authority.revisionTrustContext.authorityRevision !==
        authority.authorityRevision
    ) {
      return 'AUTHORITY_REVISION_INCOMPATIBLE';
    }
  }
  if (!hasText(policy.policyRevision) || policy.revisionContext === 'INVALID') {
    return 'POLICY_REVISION_INVALID';
  }
  if (policy.revisionContext === 'INCOMPATIBLE') {
    return 'POLICY_REVISION_INCOMPATIBLE';
  }
  return null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function authorityReasonCode(
  authority: AuthorityEvidence | null,
  status: AuthorityStatus,
): TrustReasonCode | null {
  if (authority === null) {
    return 'AUTHORITY_UNASSESSED';
  }
  if (status === 'INVALID_FACTS') {
    return 'AUTHORITY_FACTS_INVALID';
  }
  if (status === 'STALE') {
    return 'AUTHORITY_STALE';
  }
  if (status === 'CONFLICTING') {
    return 'AUTHORITY_CONFLICTING';
  }
  if (status === 'NOT_FOUND') {
    return 'AUTHORITY_NOT_FOUND';
  }
  if (status === 'INVALID') {
    return 'AUTHORITY_INVALID';
  }
  if (status === 'AMBIGUOUS') {
    return 'AUTHORITY_AMBIGUOUS';
  }
  if (status !== 'RESOLVED') {
    return 'AUTHORITY_FACTS_INVALID';
  }
  return null;
}

function hasAuthorityIdentity(authority: AuthorityEvidence): boolean {
  return (
    typeof authority.authorityId === 'string' &&
    authority.authorityId.trim().length > 0 &&
    typeof authority.authorityRevision === 'string' &&
    authority.authorityRevision.trim().length > 0
  );
}

function hasValidRevisionTrustContext(
  authority: AuthorityEvidence,
): boolean {
  const context = authority.revisionTrustContext;
  return (
    context !== null &&
    typeof context === 'object' &&
    hasText(context.evidenceId) &&
    context.status !== 'INVALID' &&
    hasText(context.authorityId) &&
    hasText(context.authorityRevision) &&
    hasText(context.subjectFingerprint)
  );
}

function isAuthorityEvidenceProvider(
  value: unknown,
): value is AuthorityEvidenceProvider {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as AuthorityEvidenceProvider).resolve === 'function'
  );
}

function authorityTrustStatus(status: AuthorityStatus): TrustStatus {
  if (status === 'UNASSESSED') {
    return 'NOT_ELIGIBLE';
  }
  if (status === 'STALE') {
    return 'STALE';
  }
  return 'REJECTED';
}

function revisionTrustStatus(reason: TrustReasonCode): TrustStatus {
  if (reason.endsWith('INCOMPATIBLE')) {
    return 'STALE';
  }
  if (reason === 'AUTHORITY_REVISION_INVALID') {
    return 'REJECTED';
  }
  return 'NOT_ELIGIBLE';
}

function isPolicyValid(policy: TrustPolicy): boolean {
  return (
    typeof policy.policyId === 'string' &&
    policy.policyId.trim().length > 0 &&
    typeof policy.policyRevision === 'string' &&
    policy.policyRevision.trim().length > 0
  );
}

function freezeResult(result: TrustEvaluationResult): TrustEvaluationResult {
  return Object.freeze({
    ...result,
    reasons: Object.freeze([...result.reasons]),
  });
}
