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
        evidenceResolution,
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
        reasonCodes: Object.freeze([...trust.reasons]),
        diagnostics: Object.freeze(diagnostics),
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
}
