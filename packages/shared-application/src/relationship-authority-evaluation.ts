import {
  evaluateEngineeringKnowledgeTrust,
  validateEngineeringKnowledgePackage,
  type AuthorityEvidenceProvider,
  type AuthorityStatus,
  type EngineeringArtifactIdentity,
  type EngineeringKnowledgePackage,
  type RelationshipDeclaration,
  type RelationshipEvidenceResolution,
  type RelationshipReconstruction,
  type RelationshipReconstructionStatus,
  type TrustPolicy,
  type TrustReasonCode,
  type TrustStatus,
  type EngineeringSourceAuthority,
} from '@jaryan/shared-domain';

export interface RelationshipAuthoritySubjectReference {
  readonly authoritySubjectId: string;
  readonly authoritySubjectRevision: string;
  readonly package: EngineeringKnowledgePackage;
}

export interface RelationshipAuthoritySubjectReferenceInput {
  readonly authoritySubjectId: string;
  readonly authoritySubjectRevision: string;
  readonly package: EngineeringKnowledgePackage;
}

export function relationshipAuthoritySubjectReference(
  input: RelationshipAuthoritySubjectReferenceInput,
): RelationshipAuthoritySubjectReference {
  const errors: string[] = [];
  if (!hasText(input?.authoritySubjectId)) {
    errors.push('Authority subject id must be non-empty.');
  }
  if (!hasText(input?.authoritySubjectRevision)) {
    errors.push('Authority subject revision must be non-empty.');
  }
  errors.push(...validateEngineeringKnowledgePackage(input?.package));
  if (errors.length > 0) {
    throw new Error(
      `Invalid relationship authority subject reference: ${errors.join('; ')}`,
    );
  }
  return Object.freeze({
    authoritySubjectId: input.authoritySubjectId,
    authoritySubjectRevision: input.authoritySubjectRevision,
    package: input.package,
  });
}

export interface RelationshipAuthorityEvaluation {
  readonly declarationFingerprint: string;
  readonly relationshipFingerprint: string;
  readonly structuralStatus: RelationshipReconstructionStatus;
  readonly evidenceReferenceCount: number;
  readonly evidenceResolution: RelationshipEvidenceResolution;
  readonly authorityStatus: AuthorityStatus;
  readonly trustStatus: TrustStatus;
  readonly reasonCodes: readonly TrustReasonCode[];
  readonly diagnostics: readonly string[];
  readonly authoritySubjectId: string | null;
  readonly authoritySubjectRevision: string | null;
}

export interface RelationshipAuthorityEvaluationInput {
  readonly declaration: RelationshipDeclaration;
  readonly structuralStatus: RelationshipReconstructionStatus;
  readonly authoritySubject: RelationshipAuthoritySubjectReference | null;
}

export interface RelationshipAuthorityEvaluationAdapter {
  evaluate(
    input: RelationshipAuthorityEvaluationInput,
  ): RelationshipAuthorityEvaluation;
}

export interface RelationshipAuthorityEvaluationAdapterOptions {
  readonly sourceAuthority: EngineeringSourceAuthority;
  readonly authorityEvidenceProvider: AuthorityEvidenceProvider | null;
  readonly policy: TrustPolicy;
}

export function createRelationshipAuthorityEvaluationAdapter(
  options: RelationshipAuthorityEvaluationAdapterOptions,
): RelationshipAuthorityEvaluationAdapter {
  return Object.freeze({
    evaluate(
      input: RelationshipAuthorityEvaluationInput,
    ): RelationshipAuthorityEvaluation {
      const evidenceResolution = resolveRelationshipEvidence(
        input.declaration.evidenceReferences,
        options.sourceAuthority,
      );
      const base = {
        declarationFingerprint: input.declaration.fingerprint,
        relationshipFingerprint: input.declaration.fact.fingerprint,
        structuralStatus: input.structuralStatus,
        evidenceReferenceCount: input.declaration.evidenceReferences.length,
        evidenceResolution: Object.freeze({ ...evidenceResolution }),
        authoritySubjectId: input.authoritySubject?.authoritySubjectId ?? null,
        authoritySubjectRevision:
          input.authoritySubject?.authoritySubjectRevision ?? null,
      };

      if (input.declaration.origin === 'AI_PROPOSAL') {
        return Object.freeze({
          ...base,
          authorityStatus: 'UNASSESSED',
          trustStatus: 'NOT_ELIGIBLE',
          reasonCodes: Object.freeze(['AUTHORITY_UNASSESSED'] as const),
          diagnostics: Object.freeze([
            'AI_PROPOSAL declarations remain non-authoritative.',
          ]),
        });
      }

      if (input.authoritySubject === null) {
        return Object.freeze({
          ...base,
          authorityStatus: 'UNASSESSED',
          trustStatus: 'NOT_ELIGIBLE',
          reasonCodes: Object.freeze(['AUTHORITY_UNASSESSED'] as const),
          diagnostics: Object.freeze([
            'No provider-owned authority subject was supplied.',
          ]),
        });
      }

      const trust = evaluateEngineeringKnowledgeTrust({
        package: input.authoritySubject.package,
        authorityEvidenceProvider: options.authorityEvidenceProvider,
        evidenceComplete: evidenceResolution.complete,
        policy: options.policy,
      });
      const diagnostics = [
        ...evidenceDiagnostics(input.declaration.evidenceReferences, options.sourceAuthority),
      ];
      if (trust.structuralStatus === 'STRUCTURALLY_INVALID') {
        diagnostics.push(
          'The explicitly bound authority subject failed package structural validation.',
        );
      }
      return Object.freeze({
        ...base,
        authorityStatus: trust.authorityStatus,
        trustStatus: trust.trustStatus,
        reasonCodes: Object.freeze(uniqueSorted(trust.reasons)),
        diagnostics: Object.freeze(uniqueSorted(diagnostics)),
      });
    },
  });
}

function resolveRelationshipEvidence(
  references: readonly EngineeringArtifactIdentity[],
  sourceAuthority: EngineeringSourceAuthority,
): RelationshipEvidenceResolution {
  if (references.length === 0) {
    return { status: 'NOT_FOUND', complete: false };
  }
  const resolutions = references.map((reference) =>
    sourceAuthority.resolve(reference),
  );
  if (resolutions.some((resolution) => resolution.status === 'INVALID')) {
    return { status: 'INVALID', complete: false };
  }
  if (resolutions.some((resolution) => resolution.status === 'AMBIGUOUS')) {
    return { status: 'AMBIGUOUS', complete: false };
  }
  if (resolutions.some((resolution) => resolution.status === 'NOT_FOUND')) {
    return { status: 'NOT_FOUND', complete: false };
  }
  return { status: 'RESOLVED', complete: true };
}

function evidenceDiagnostics(
  references: readonly EngineeringArtifactIdentity[],
  sourceAuthority: EngineeringSourceAuthority,
): readonly string[] {
  return references.map((reference) => {
    const resolution = sourceAuthority.resolve(reference);
    return `Evidence ${reference.id}: ${resolution.status}.`;
  });
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export interface RelationshipAuthorityProjection {
  readonly reconstruction: RelationshipReconstruction;
  readonly evaluations: readonly RelationshipAuthorityEvaluation[];
  readonly historicalEvaluations: readonly RelationshipAuthorityEvaluation[];
  readonly evidence: RelationshipEvidenceProjection;
  readonly historicalEvidence: RelationshipEvidenceProjection;
  readonly authority: RelationshipAuthorityProjectionState;
  readonly historicalAuthority: RelationshipAuthorityProjectionState;
  readonly trust: RelationshipTrustProjectionState;
  readonly historicalTrust: RelationshipTrustProjectionState;
  readonly conflict: boolean;
  readonly historical: boolean;
  readonly reasonCodes: readonly TrustReasonCode[];
  readonly diagnostics: readonly string[];
}

export type RelationshipEvidenceProjectionPresence =
  | 'UNKNOWN'
  | 'ABSENT'
  | 'PRESENT';

export type RelationshipEvidenceProjectionResolution =
  | 'UNKNOWN'
  | 'UNRESOLVED'
  | 'RESOLVED'
  | 'MIXED';

export interface RelationshipEvidenceProjection {
  readonly presence: RelationshipEvidenceProjectionPresence;
  readonly resolution: RelationshipEvidenceProjectionResolution;
  readonly complete: boolean;
}

export interface RelationshipAuthorityProjectionState {
  readonly statuses: readonly AuthorityStatus[];
  readonly assessed: boolean;
  readonly established: boolean;
}

export interface RelationshipTrustProjectionState {
  readonly statuses: readonly TrustStatus[];
  readonly established: boolean;
}

export function projectRelationshipAuthorityState(
  reconstruction: RelationshipReconstruction,
  evaluations: readonly RelationshipAuthorityEvaluation[],
  historicalEvaluations: readonly RelationshipAuthorityEvaluation[],
): RelationshipAuthorityProjection {
  const orderedEvaluations = orderEvaluations(evaluations);
  const orderedHistoricalEvaluations = orderEvaluations(historicalEvaluations);
  return Object.freeze({
    reconstruction,
    evaluations: Object.freeze(orderedEvaluations),
    historicalEvaluations: Object.freeze(orderedHistoricalEvaluations),
    evidence: projectEvidence(orderedEvaluations),
    historicalEvidence: projectEvidence(orderedHistoricalEvaluations),
    authority: projectAuthority(orderedEvaluations),
    historicalAuthority: projectAuthority(orderedHistoricalEvaluations),
    trust: projectTrust(orderedEvaluations),
    historicalTrust: projectTrust(orderedHistoricalEvaluations),
    conflict: reconstruction.status === 'CONFLICTING',
    historical: reconstruction.historicalDeclarations.length > 0,
    reasonCodes: Object.freeze(uniqueSorted(
      [...orderedEvaluations, ...orderedHistoricalEvaluations].flatMap(
        (evaluation) => evaluation.reasonCodes,
      ),
    )),
    diagnostics: Object.freeze(uniqueSorted(
      [...orderedEvaluations, ...orderedHistoricalEvaluations].flatMap(
        (evaluation) => evaluation.diagnostics,
      ),
    )),
  });
}

function orderEvaluations(
  evaluations: readonly RelationshipAuthorityEvaluation[],
): RelationshipAuthorityEvaluation[] {
  return [...evaluations].sort((left, right) =>
    left.declarationFingerprint.localeCompare(right.declarationFingerprint),
  );
}

function projectEvidence(
  evaluations: readonly RelationshipAuthorityEvaluation[],
): RelationshipEvidenceProjection {
  if (evaluations.length === 0) {
    return Object.freeze({
      presence: 'UNKNOWN',
      resolution: 'UNKNOWN',
      complete: false,
    });
  }
  const presence = evaluations.every(
    (evaluation) => evaluation.evidenceReferenceCount === 0,
  )
    ? 'ABSENT'
    : 'PRESENT';
  if (presence === 'ABSENT') {
    return Object.freeze({ presence, resolution: 'UNKNOWN', complete: false });
  }
  const resolutions = new Set(
    evaluations.map((evaluation) => evaluation.evidenceResolution.status),
  );
  if (resolutions.size === 1 && resolutions.has('RESOLVED')) {
    return Object.freeze({ presence, resolution: 'RESOLVED', complete: true });
  }
  return Object.freeze({
    presence,
    resolution: resolutions.size === 1 ? 'UNRESOLVED' : 'MIXED',
    complete: false,
  });
}

function projectAuthority(
  evaluations: readonly RelationshipAuthorityEvaluation[],
): RelationshipAuthorityProjectionState {
  const statuses = uniqueSorted(
    evaluations.map((evaluation) => evaluation.authorityStatus),
  );
  return Object.freeze({
    statuses,
    assessed: statuses.some((status) => status !== 'UNASSESSED'),
    established:
      statuses.length > 0 &&
      statuses.every((status) => status === 'RESOLVED'),
  });
}

function projectTrust(
  evaluations: readonly RelationshipAuthorityEvaluation[],
): RelationshipTrustProjectionState {
  const statuses = uniqueSorted(
    evaluations.map((evaluation) => evaluation.trustStatus),
  );
  return Object.freeze({
    statuses,
    established:
      statuses.length > 0 && statuses.every((status) => status === 'TRUSTED'),
  });
}

function uniqueSorted<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort() as T[];
}
