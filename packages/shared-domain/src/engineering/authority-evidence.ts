import type { EngineeringSourceResolutionStatus } from './source-authority.ts';

export type RevisionTrustContextStatus =
  | 'VALID'
  | 'INVALID'
  | 'INCOMPATIBLE';

export type AuthoritySourceStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'DRAFT'
  | 'REFERENCE_ONLY'
  | 'EXPERIMENTAL'
  | 'SITE_SPECIFIC'
  | 'UNKNOWN';

export interface RevisionTrustContext {
  readonly evidenceId: string;
  readonly authorityId: string;
  readonly authorityRevision: string;
  readonly subjectFingerprint: string;
  readonly status: RevisionTrustContextStatus;
}

export interface AuthorityEvidence {
  readonly authorityId: string;
  readonly authorityRevision: string;
  readonly resolutionStatus: EngineeringSourceResolutionStatus;
  readonly factsValid: boolean;
  readonly stale: boolean;
  readonly conflicting: boolean;
  readonly sourceStatus: AuthoritySourceStatus | null;
  readonly applicabilitySatisfied: boolean;
  readonly claimSupportSatisfied: boolean;
  readonly revisionTrustContext: RevisionTrustContext;
}

export interface AuthorityEvidenceRequest {
  readonly subjectFingerprint: string;
}

/**
 * Domain port for obtaining authority-owned evidence. Implementations may
 * resolve from any authority source, but the evaluator only consumes the
 * returned evidence and never accepts a compatibility predicate directly.
 */
export interface AuthorityEvidenceProvider {
  resolve(request: AuthorityEvidenceRequest): AuthorityEvidence | null;
}
