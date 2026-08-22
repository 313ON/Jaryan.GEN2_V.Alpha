import type { EngineeringArtifactReference } from './knowledge-graph.ts';
import type { EngineeringArtifactIdentity } from './artifact-identity.ts';
import { validateEngineeringArtifactIdentity } from './artifact-identity.ts';
import { contentFingerprint } from './content-fingerprint.ts';
import {
  type KnowledgeGraphEndpoint,
  validateKnowledgeGraphEndpoint,
} from './graph-endpoint.ts';
import type { PhysicalReferentIdentity } from './physical-referent-identity.ts';
import {
  type TemporalValidity,
  validateTemporalValidity,
} from './semantic-backbone.ts';

export type EngineeringRelationshipPredicate =
  | 'DEPENDENCY'
  | 'DESCRIBED_BY'
  | 'CALCULATED_FOR';

export const ENGINEERING_RELATIONSHIP_PREDICATES: readonly EngineeringRelationshipPredicate[] =
  ['DEPENDENCY', 'DESCRIBED_BY', 'CALCULATED_FOR'];

export type RelationshipAssertionDisposition = 'AFFIRM' | 'DENY';

export const RELATIONSHIP_ASSERTION_DISPOSITIONS: readonly RelationshipAssertionDisposition[] =
  ['AFFIRM', 'DENY'];

export type RelationshipDeclarationOrigin =
  | 'HUMAN'
  | 'OBSERVATION'
  | 'IMPORTED'
  | 'SYSTEM'
  | 'AUTHORITY_RECORD'
  | 'AI_PROPOSAL';

export const RELATIONSHIP_DECLARATION_ORIGINS: readonly RelationshipDeclarationOrigin[] =
  ['HUMAN', 'OBSERVATION', 'IMPORTED', 'SYSTEM', 'AUTHORITY_RECORD', 'AI_PROPOSAL'];

export type EngineeringRelationshipEndpoint =
  | EngineeringArtifactReference
  | KnowledgeGraphEndpoint;

export interface RelationshipFact {
  readonly subject: EngineeringRelationshipEndpoint;
  readonly predicate: EngineeringRelationshipPredicate;
  readonly object: EngineeringRelationshipEndpoint;
  readonly fingerprint: string;
}

export interface RelationshipDeclaration {
  readonly fact: RelationshipFact;
  readonly assertionDisposition: RelationshipAssertionDisposition;
  /** Null is an explicit unknown applicability context. */
  readonly applicabilityContext: string | null;
  readonly temporalValidity: TemporalValidity;
  readonly origin: RelationshipDeclarationOrigin;
  readonly actor: string | null;
  readonly evidenceReferences: readonly EngineeringArtifactIdentity[];
  readonly supersedes: readonly string[];
  readonly fingerprint: string;
}

export interface RelationshipDeclarationInput
  extends Omit<RelationshipDeclaration, 'fact' | 'fingerprint'> {
  readonly fact: RelationshipFactInput;
}

export interface RelationshipFactInput
  extends Omit<RelationshipFact, 'fingerprint'> {}

export interface RelationshipEvidenceResolution {
  readonly status: 'RESOLVED' | 'NOT_FOUND' | 'INVALID' | 'AMBIGUOUS' | 'UNVERIFIED';
  readonly complete: boolean;
}

export interface RelationshipEvidenceAdapter {
  resolve(
    references: readonly EngineeringArtifactIdentity[],
  ): RelationshipEvidenceResolution;
}

export type RelationshipReconstructionStatus =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'CONFLICTING'
  | 'HISTORICAL'
  | 'INSUFFICIENT_EVIDENCE'
  | 'UNVERIFIED';

export interface RelationshipQueryContext {
  readonly queryTime: string;
  readonly applicabilityContext?: string | null;
}

export interface RelationshipReconstruction {
  readonly status: RelationshipReconstructionStatus;
  readonly fact: RelationshipFact;
  readonly declarations: readonly RelationshipDeclaration[];
  readonly historicalDeclarations: readonly RelationshipDeclaration[];
  readonly evidence: readonly RelationshipEvidenceResolution[];
}

export function relationshipFact(
  input: RelationshipFactInput,
): RelationshipFact {
  const errors = validateRelationshipFact(input);
  if (errors.length > 0) {
    throw new Error(`Invalid relationship fact: ${errors.join('; ')}`);
  }
  return deepFreeze({
    subject: cloneReference(input.subject),
    predicate: input.predicate,
    object: cloneReference(input.object),
    fingerprint: relationshipFactFingerprint(input),
  });
}

export function relationshipDeclaration(
  input: RelationshipDeclarationInput,
): RelationshipDeclaration {
  const errors = validateRelationshipDeclaration(input);
  if (errors.length > 0) {
    throw new Error(`Invalid relationship declaration: ${errors.join('; ')}`);
  }
  const evidenceReferences = canonicalEvidenceReferences(input.evidenceReferences);
  const supersedes = canonicalStrings(input.supersedes);
  const fact = relationshipFact(input.fact);
  const declaration = {
    fact,
    assertionDisposition: input.assertionDisposition,
    applicabilityContext: input.applicabilityContext,
    temporalValidity: { ...input.temporalValidity },
    origin: input.origin,
    actor: input.actor,
    evidenceReferences,
    supersedes,
    fingerprint: relationshipDeclarationFingerprint({
      fact,
      assertionDisposition: input.assertionDisposition,
      applicabilityContext: input.applicabilityContext,
      temporalValidity: input.temporalValidity,
      origin: input.origin,
      actor: input.actor,
      evidenceReferences,
      supersedes,
    }),
  } satisfies RelationshipDeclaration;
  return deepFreeze(declaration);
}

export function validateRelationshipFact(
  input: RelationshipFactInput,
): readonly string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return ['Fact must be provided.'];
  }
  if (!ENGINEERING_RELATIONSHIP_PREDICATES.includes(input.predicate)) {
    errors.push(`Unsupported relationship predicate: ${String(input.predicate)}.`);
  }
  errors.push(
    ...validateRelationshipEndpoint(
      input.subject,
      input.predicate,
      'subject',
    ),
  );
  errors.push(
    ...validateRelationshipEndpoint(
      input.object,
      input.predicate,
      'object',
    ),
  );
  return errors;
}

export function validateRelationshipDeclaration(
  input: RelationshipDeclarationInput,
): readonly string[] {
  const errors = [...validateRelationshipFact(input.fact)];
  if (!RELATIONSHIP_ASSERTION_DISPOSITIONS.includes(input.assertionDisposition)) {
    errors.push(
      `Unsupported assertion disposition: ${String(input.assertionDisposition)}.`,
    );
  }
  if (
    input.applicabilityContext !== null &&
    (typeof input.applicabilityContext !== 'string' ||
      input.applicabilityContext.trim().length === 0)
  ) {
    errors.push('Applicability context must be non-empty or null.');
  }
  errors.push(...validateTemporalValidity(input.temporalValidity));
  if (!RELATIONSHIP_DECLARATION_ORIGINS.includes(input.origin)) {
    errors.push(`Unsupported declaration origin: ${String(input.origin)}.`);
  }
  const actorRequired =
    input.origin === 'HUMAN' ||
    input.origin === 'OBSERVATION' ||
    input.origin === 'AUTHORITY_RECORD';
  if (
    actorRequired &&
    (typeof input.actor !== 'string' || input.actor.trim().length === 0)
  ) {
    errors.push(`Actor is required for ${input.origin} declarations.`);
  }
  if (
    input.actor !== null &&
    (typeof input.actor !== 'string' || input.actor.trim().length === 0)
  ) {
    errors.push('Actor must be non-empty or null.');
  }
  if (!Array.isArray(input.evidenceReferences)) {
    errors.push('Evidence references must be an array.');
  } else {
    input.evidenceReferences.forEach((reference, index) => {
      errors.push(
        ...validateEngineeringArtifactIdentity(
          reference,
        ).map((error) => `Evidence reference ${index}: ${error}`),
      );
    });
  }
  if (!Array.isArray(input.supersedes)) {
    errors.push('Supersedes must be an array.');
  } else {
    input.supersedes.forEach((fingerprint, index) => {
      if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
        errors.push(
          `Supersedes reference ${index} must be a lowercase SHA-256 fingerprint.`,
        );
      }
    });
  }
  return errors;
}

export function relationshipFactFingerprint(
  fact: RelationshipFactInput,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_RELATIONSHIP_FACT',
    subject: canonicalReference(fact.subject),
    predicate: fact.predicate,
    object: canonicalReference(fact.object),
  });
}

export function relationshipDeclarationFingerprint(
  declaration: Omit<RelationshipDeclaration, 'fingerprint'>,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_RELATIONSHIP_DECLARATION',
    fact: {
      subject: canonicalReference(declaration.fact.subject),
      predicate: declaration.fact.predicate,
      object: canonicalReference(declaration.fact.object),
    },
    assertionDisposition: declaration.assertionDisposition,
    applicabilityContext: declaration.applicabilityContext,
    temporalValidity: {
      validFrom: declaration.temporalValidity.validFrom,
      validTo: declaration.temporalValidity.validTo,
      recordedAt: declaration.temporalValidity.recordedAt,
    },
    origin: declaration.origin,
    actor: declaration.actor,
    evidenceReferences: canonicalEvidenceReferences(declaration.evidenceReferences).map(
      (reference) => reference.id,
    ),
    supersedes: canonicalStrings(declaration.supersedes),
  });
}

export function canonicalizeRelationshipDeclarations(
  declarations: readonly RelationshipDeclaration[],
): readonly RelationshipDeclaration[] {
  const byFingerprint = new Map<string, RelationshipDeclaration>();
  for (const declaration of declarations) {
    const fact = relationshipFact({
      subject: declaration.fact.subject,
      predicate: declaration.fact.predicate,
      object: declaration.fact.object,
    });
    if (declaration.fact.fingerprint !== fact.fingerprint) {
      throw new Error(
        `Invalid relationship declaration: fact fingerprint mismatch for ${declaration.fingerprint}.`,
      );
    }
    const canonical = relationshipDeclaration({
      fact,
      assertionDisposition: declaration.assertionDisposition,
      applicabilityContext: declaration.applicabilityContext,
      temporalValidity: declaration.temporalValidity,
      origin: declaration.origin,
      actor: declaration.actor,
      evidenceReferences: declaration.evidenceReferences,
      supersedes: declaration.supersedes,
    });
    if (declaration.fingerprint !== canonical.fingerprint) {
      throw new Error(
        `Invalid relationship declaration: declaration fingerprint mismatch for ${declaration.fingerprint}.`,
      );
    }
    byFingerprint.set(canonical.fingerprint, canonical);
  }
  return [...byFingerprint.values()].sort((a, b) =>
    a.fingerprint.localeCompare(b.fingerprint),
  );
}

export function reconstructRelationship(
  fact: RelationshipFact,
  declarations: readonly RelationshipDeclaration[],
  resolveEndpoint: (
    reference: EngineeringRelationshipEndpoint,
  ) => 'RESOLVED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'INVALID',
  queryContext: RelationshipQueryContext,
  evidenceAdapter?: RelationshipEvidenceAdapter,
): RelationshipReconstruction {
  const factErrors = validateRelationshipFact(fact);
  if (
    factErrors.length > 0 ||
    fact.fingerprint !== relationshipFactFingerprint(fact)
  ) {
    return emptyReconstruction('INVALID', fact);
  }
  const endpointStatuses = [resolveEndpoint(fact.subject), resolveEndpoint(fact.object)];
  if (endpointStatuses.includes('INVALID')) {
    return emptyReconstruction('INVALID', fact);
  }
  if (endpointStatuses.includes('AMBIGUOUS')) {
    return emptyReconstruction('AMBIGUOUS', fact);
  }
  if (endpointStatuses.includes('NOT_FOUND')) {
    return emptyReconstruction('UNKNOWN', fact);
  }
  if (!isIsoTimestamp(queryContext.queryTime)) {
    return emptyReconstruction('INVALID', fact);
  }

  const matching = canonicalizeRelationshipDeclarations(declarations).filter(
    (declaration) => declaration.fact.fingerprint === fact.fingerprint,
  );
  if (matching.length === 0) {
    return emptyReconstruction('UNKNOWN', fact);
  }

  const superseded = new Set(
    matching
      .filter(
        (declaration) =>
          temporalApplicability(declaration, queryContext) === 'APPLICABLE',
      )
      .flatMap((declaration) => declaration.supersedes),
  );
  const active = matching.filter(
    (declaration) => !superseded.has(declaration.fingerprint),
  );
  const supersededDeclarations = matching.filter((declaration) =>
    superseded.has(declaration.fingerprint),
  );
  const historicalDeclarations = [
    ...supersededDeclarations,
    ...active.filter(
      (declaration) =>
        temporalApplicability(declaration, queryContext) === 'HISTORICAL',
    ),
  ].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  const unknownTemporalDeclarations = active.filter(
    (declaration) =>
      temporalApplicability(declaration, queryContext) === 'UNKNOWN',
  );
  const eligible = active.filter((declaration) =>
    temporalApplicability(declaration, queryContext) === 'APPLICABLE',
  );

  if (eligible.length === 0) {
    return {
      status:
        historicalDeclarations.length > 0 && unknownTemporalDeclarations.length === 0
          ? 'HISTORICAL'
          : 'UNKNOWN',
      fact,
      declarations: [],
      historicalDeclarations,
      evidence: [],
    };
  }

  const evidence = eligible.map((declaration) =>
    resolveEvidence(declaration, evidenceAdapter),
  );
  const dispositions = new Set(
    eligible.map((declaration) => declaration.assertionDisposition),
  );
  if (dispositions.has('AFFIRM') && dispositions.has('DENY')) {
    return {
      status: 'CONFLICTING',
      fact,
      declarations: eligible,
      historicalDeclarations,
      evidence,
    };
  }
  if (evidence.some((result) => result.status === 'INVALID' || result.status === 'NOT_FOUND')) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      fact,
      declarations: eligible,
      historicalDeclarations,
      evidence,
    };
  }
  return {
    status: 'UNVERIFIED',
    fact,
    declarations: eligible,
    historicalDeclarations,
    evidence,
  };
}

function resolveEvidence(
  declaration: RelationshipDeclaration,
  adapter: RelationshipEvidenceAdapter | undefined,
): RelationshipEvidenceResolution {
  if (declaration.evidenceReferences.length === 0) {
    return { status: 'NOT_FOUND', complete: false };
  }
  if (adapter === undefined) {
    return { status: 'UNVERIFIED', complete: false };
  }
  return adapter.resolve(declaration.evidenceReferences);
}

function temporalApplicability(
  declaration: RelationshipDeclaration,
  queryContext: RelationshipQueryContext,
): 'APPLICABLE' | 'HISTORICAL' | 'UNKNOWN' {
  if (
    queryContext.applicabilityContext !== undefined &&
    declaration.applicabilityContext !== queryContext.applicabilityContext
  ) {
    return 'HISTORICAL';
  }
  const { validFrom, validTo } = declaration.temporalValidity;
  if (validFrom === undefined || validTo === undefined) {
    return 'UNKNOWN';
  }
  const queryTime = Date.parse(queryContext.queryTime);
  const applicable = (
    queryTime >= Date.parse(validFrom) &&
    queryTime <= Date.parse(validTo)
  );
  return applicable ? 'APPLICABLE' : 'HISTORICAL';
}

function emptyReconstruction(
  status: RelationshipReconstructionStatus,
  fact: RelationshipFact,
): RelationshipReconstruction {
  return {
    status,
    fact,
    declarations: [],
    historicalDeclarations: [],
    evidence: [],
  };
}

function validateRelationshipEndpoint(
  reference: EngineeringRelationshipEndpoint,
  predicate: EngineeringRelationshipPredicate,
  position: 'subject' | 'object',
): readonly string[] {
  const label = position === 'subject' ? 'Subject' : 'Object';
  if (!reference || typeof reference !== 'object') {
    return [`${label} reference must be provided.`];
  }
  if (predicate === 'DEPENDENCY') {
    return validateArtifactReference(reference, label);
  }
  if (!isKnowledgeGraphEndpoint(reference)) {
    return [
      `${label} endpoint for ${predicate} must be a canonical KnowledgeGraph endpoint.`,
    ];
  }
  const expectedKind =
    predicate === 'DESCRIBED_BY'
      ? position === 'subject'
        ? 'PHYSICAL_REFERENT'
        : 'ARTIFACT'
      : position === 'subject'
        ? 'ARTIFACT'
        : 'PHYSICAL_REFERENT';
  if (reference.kind !== expectedKind) {
    return [
      `${predicate} requires ${position} endpoint kind ${expectedKind}; received ${reference.kind}.`,
    ];
  }
  return validateKnowledgeGraphEndpoint(reference).map(
    (error) => `${label}: ${error}`,
  );
}

function validateArtifactReference(
  reference: EngineeringRelationshipEndpoint,
  label: string,
): readonly string[] {
  if (isKnowledgeGraphEndpoint(reference)) {
    return [`${label} must be an artifact reference for DEPENDENCY.`];
  }
  if (reference.kind === 'identity') {
    return validateEngineeringArtifactIdentity(reference.identity).map(
      (error) => `${label}: ${error}`,
    );
  }
  if (reference.kind === 'identityId') {
    return typeof reference.identityId === 'string' &&
      reference.identityId.trim().length > 0
      ? []
      : [`${label} identityId must be non-empty.`];
  }
  if (reference.kind === 'baseId') {
    return [`${label} baseId references are not canonical artifact identities.`];
  }
  return [`${label} reference kind is unsupported.`];
}

function canonicalReference(
  reference: EngineeringRelationshipEndpoint,
): Record<string, unknown> {
  if (isKnowledgeGraphEndpoint(reference)) {
    return {
      kind: reference.kind,
      identity:
        reference.kind === 'ARTIFACT'
          ? { id: (reference.identity as EngineeringArtifactIdentity).id }
          : {
              identityKind: (reference.identity as PhysicalReferentIdentity)
                .identityKind,
              canonicalIdentity: (reference.identity as PhysicalReferentIdentity)
                .canonicalIdentity,
            },
    };
  }
  if (reference.kind === 'identity') {
    return { kind: 'identityId', identityId: reference.identity.id };
  }
  if (reference.kind === 'identityId') {
    return { kind: 'identityId', identityId: reference.identityId };
  }
  return {
    kind: 'baseId',
    baseId: reference.baseId,
    ...(reference.version === undefined ? {} : { version: reference.version }),
  };
}

function cloneReference(
  reference: EngineeringRelationshipEndpoint,
): EngineeringRelationshipEndpoint {
  if (isKnowledgeGraphEndpoint(reference)) {
    return {
      kind: reference.kind,
      identity: { ...reference.identity },
    } as KnowledgeGraphEndpoint;
  }
  return { ...canonicalReference(reference) } as EngineeringArtifactReference;
}

function isKnowledgeGraphEndpoint(
  reference: EngineeringRelationshipEndpoint,
): reference is KnowledgeGraphEndpoint {
  return reference.kind === 'ARTIFACT' || reference.kind === 'PHYSICAL_REFERENT';
}

function canonicalEvidenceReferences(
  references: readonly EngineeringArtifactIdentity[],
): readonly EngineeringArtifactIdentity[] {
  const byId = new Map<string, EngineeringArtifactIdentity>();
  for (const reference of references) {
    byId.set(reference.id, {
      ...reference,
      metadata: { ...reference.metadata },
    });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value)) &&
    value.includes('T')
  );
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
