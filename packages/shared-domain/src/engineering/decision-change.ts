import type { EngineeringArtifactIdentity } from './artifact-identity.ts';
import { validateEngineeringArtifactIdentity } from './artifact-identity.ts';
import { contentFingerprint } from './content-fingerprint.ts';
import {
  type KnowledgeGraphEndpoint,
  knowledgeGraphEndpoint,
  validateKnowledgeGraphEndpoint,
} from './graph-endpoint.ts';
import {
  type EngineeringRelationshipEndpoint,
  type EngineeringRelationshipPredicate,
  type RelationshipFact,
  relationshipFact,
} from './relationship-declaration.ts';
import {
  type RelationshipDeclarationOrigin,
  RELATIONSHIP_DECLARATION_ORIGINS,
} from './relationship-declaration.ts';
import {
  type TemporalValidity,
  validateTemporalValidity,
} from './semantic-backbone.ts';

export type EngineeringDecisionKind =
  | 'REQUIREMENT'
  | 'ASSUMPTION'
  | 'CONSTRAINT'
  | 'ALTERNATIVE'
  | 'DECISION'
  | 'APPROVAL';

export const ENGINEERING_DECISION_KINDS: readonly EngineeringDecisionKind[] = [
  'REQUIREMENT',
  'ASSUMPTION',
  'CONSTRAINT',
  'ALTERNATIVE',
  'DECISION',
  'APPROVAL',
];

export type EngineeringDecisionStatus =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'SUPERSEDED'
  | 'UNKNOWN';

export const ENGINEERING_DECISION_STATUSES: readonly EngineeringDecisionStatus[] = [
  'PROPOSED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'SUPERSEDED',
  'UNKNOWN',
];

export type EngineeringChangeEventKind =
  | 'PROPOSED'
  | 'AUTHORIZED'
  | 'IMPLEMENTED'
  | 'OBSERVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'UNKNOWN';

export const ENGINEERING_CHANGE_EVENT_KINDS: readonly EngineeringChangeEventKind[] = [
  'PROPOSED',
  'AUTHORIZED',
  'IMPLEMENTED',
  'OBSERVED',
  'REJECTED',
  'WITHDRAWN',
  'UNKNOWN',
];

export type EngineeringChangeEventResolution =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'UNRESOLVED'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE';

export const ENGINEERING_CHANGE_EVENT_RESOLUTIONS: readonly EngineeringChangeEventResolution[] =
  [
    'RESOLVED',
    'UNKNOWN',
    'AMBIGUOUS',
    'INVALID',
    'UNRESOLVED',
    'CONFLICTING',
    'NOT_APPLICABLE',
  ];

export type EngineeringDecisionResolution = EngineeringChangeEventResolution;

export interface EngineeringDecision {
  readonly identity: EngineeringArtifactIdentity;
  readonly kind: EngineeringDecisionKind;
  readonly subjectScope: readonly KnowledgeGraphEndpoint[];
  readonly outcome: string;
  readonly rationale: string | null;
  readonly alternatives: readonly string[];
  readonly decisionTime: string;
  readonly temporalValidity: TemporalValidity;
  readonly applicabilityContext: string | null;
  readonly status: EngineeringDecisionStatus;
  readonly resolution: EngineeringDecisionResolution;
  readonly origin: RelationshipDeclarationOrigin;
  readonly actor: string | null;
  readonly evidenceReferences: readonly EngineeringArtifactIdentity[];
  readonly supersedes: readonly string[];
  readonly fingerprint: string;
}

export interface EngineeringDecisionInput
  extends Omit<
    EngineeringDecision,
    | 'subjectScope'
    | 'rationale'
    | 'alternatives'
    | 'applicabilityContext'
    | 'evidenceReferences'
    | 'supersedes'
    | 'fingerprint'
  > {
  readonly subjectScope: readonly KnowledgeGraphEndpoint[];
  readonly rationale?: string | null;
  readonly alternatives?: readonly string[];
  readonly applicabilityContext?: string | null;
  readonly evidenceReferences?: readonly EngineeringArtifactIdentity[];
  readonly supersedes?: readonly string[];
  readonly fingerprint?: string;
}

export interface EngineeringChangeEvent {
  readonly identity: EngineeringArtifactIdentity;
  readonly kind: EngineeringChangeEventKind;
  readonly affectedScope: readonly KnowledgeGraphEndpoint[];
  readonly description: string;
  readonly beforeMeaning: string | null;
  readonly afterMeaning: string | null;
  readonly eventTime: string;
  readonly temporalValidity: TemporalValidity;
  readonly applicabilityContext: string | null;
  readonly relatedDecisionIdentities: readonly EngineeringArtifactIdentity[];
  readonly status: EngineeringChangeEventKind;
  readonly resolution: EngineeringChangeEventResolution;
  readonly origin: RelationshipDeclarationOrigin;
  readonly actor: string | null;
  readonly evidenceReferences: readonly EngineeringArtifactIdentity[];
  readonly supersedes: readonly string[];
  readonly fingerprint: string;
}

export interface EngineeringChangeEventInput
  extends Omit<
    EngineeringChangeEvent,
    | 'affectedScope'
    | 'beforeMeaning'
    | 'afterMeaning'
    | 'applicabilityContext'
    | 'relatedDecisionIdentities'
    | 'evidenceReferences'
    | 'supersedes'
    | 'fingerprint'
  > {
  readonly affectedScope: readonly KnowledgeGraphEndpoint[];
  readonly beforeMeaning?: string | null;
  readonly afterMeaning?: string | null;
  readonly applicabilityContext?: string | null;
  readonly relatedDecisionIdentities?: readonly EngineeringArtifactIdentity[];
  readonly evidenceReferences?: readonly EngineeringArtifactIdentity[];
  readonly supersedes?: readonly string[];
  readonly fingerprint?: string;
}

export function engineeringDecision(
  input: EngineeringDecisionInput,
): EngineeringDecision {
  const normalized = {
    ...input,
    subjectScope: canonicalEndpoints(input.subjectScope),
    rationale: input.rationale ?? null,
    alternatives: canonicalStrings(input.alternatives ?? []),
    applicabilityContext: input.applicabilityContext ?? null,
    evidenceReferences: canonicalIdentities(input.evidenceReferences ?? []),
    supersedes: canonicalStrings(input.supersedes ?? []),
  };
  const errors = validateEngineeringDecision(normalized);
  if (errors.length > 0) {
    throw new Error(`Invalid engineering decision: ${errors.join('; ')}`);
  }
  const fingerprint = engineeringDecisionFingerprint(normalized);
  if (input.fingerprint !== undefined && input.fingerprint !== fingerprint) {
    throw new Error('Invalid engineering decision: fingerprint does not match content.');
  }
  return deepFreeze({ ...normalized, fingerprint });
}

export function engineeringChangeEvent(
  input: EngineeringChangeEventInput,
): EngineeringChangeEvent {
  const normalized = {
    ...input,
    affectedScope: canonicalEndpoints(input.affectedScope),
    beforeMeaning: input.beforeMeaning ?? null,
    afterMeaning: input.afterMeaning ?? null,
    applicabilityContext: input.applicabilityContext ?? null,
    relatedDecisionIdentities: canonicalIdentities(
      input.relatedDecisionIdentities ?? [],
    ),
    evidenceReferences: canonicalIdentities(input.evidenceReferences ?? []),
    supersedes: canonicalStrings(input.supersedes ?? []),
  };
  const errors = validateEngineeringChangeEvent(normalized);
  if (errors.length > 0) {
    throw new Error(`Invalid engineering change event: ${errors.join('; ')}`);
  }
  const fingerprint = engineeringChangeEventFingerprint(normalized);
  if (input.fingerprint !== undefined && input.fingerprint !== fingerprint) {
    throw new Error(
      'Invalid engineering change event: fingerprint does not match content.',
    );
  }
  return deepFreeze({ ...normalized, fingerprint });
}

export function validateEngineeringDecision(
  input: Omit<EngineeringDecision, 'fingerprint'>,
): readonly string[] {
  const errors = validateDeclarationCommon(input);
  if (!ENGINEERING_DECISION_KINDS.includes(input.kind)) {
    errors.push(`Unsupported engineering decision kind: ${String(input.kind)}.`);
  }
  if (!ENGINEERING_DECISION_STATUSES.includes(input.status)) {
    errors.push(`Unsupported engineering decision status: ${String(input.status)}.`);
  }
  if (!ENGINEERING_CHANGE_EVENT_RESOLUTIONS.includes(input.resolution)) {
    errors.push(`Unsupported engineering decision resolution: ${String(input.resolution)}.`);
  }
  if (!isIsoTimestamp(input.decisionTime)) {
    errors.push('Decision time must be an ISO-8601 timestamp.');
  }
  if (!isNonEmptyString(input.outcome)) {
    errors.push('Decision outcome must be non-empty.');
  }
  errors.push(...validateOptionalText(input.rationale, 'Decision rationale'));
  errors.push(...validateStringArray(input.alternatives, 'Decision alternatives'));
  return errors;
}

export function validateEngineeringChangeEvent(
  input: Omit<EngineeringChangeEvent, 'fingerprint'>,
): readonly string[] {
  const errors = validateDeclarationCommon(input);
  if (!ENGINEERING_CHANGE_EVENT_KINDS.includes(input.kind)) {
    errors.push(`Unsupported engineering change event kind: ${String(input.kind)}.`);
  }
  if (!ENGINEERING_CHANGE_EVENT_KINDS.includes(input.status)) {
    errors.push(`Unsupported engineering change event status: ${String(input.status)}.`);
  }
  if (!ENGINEERING_CHANGE_EVENT_RESOLUTIONS.includes(input.resolution)) {
    errors.push(
      `Unsupported engineering change event resolution: ${String(input.resolution)}.`,
    );
  }
  if (!isIsoTimestamp(input.eventTime)) {
    errors.push('Event time must be an ISO-8601 timestamp.');
  }
  if (!isNonEmptyString(input.description)) {
    errors.push('Change event description must be non-empty.');
  }
  errors.push(...validateOptionalText(input.beforeMeaning, 'Before meaning'));
  errors.push(...validateOptionalText(input.afterMeaning, 'After meaning'));
  errors.push(
    ...validateArtifactArray(
      input.relatedDecisionIdentities,
      'Related decision identity',
    ),
  );
  return errors;
}

export function engineeringDecisionFingerprint(
  input: Omit<EngineeringDecision, 'fingerprint'>,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_DECISION',
    identity: canonicalIdentity(input.identity),
    decisionKind: input.kind,
    subjectScope: input.subjectScope.map(canonicalEndpoint),
    outcome: input.outcome,
    rationale: input.rationale,
    alternatives: canonicalStrings(input.alternatives),
    decisionTime: input.decisionTime,
    temporalValidity: input.temporalValidity,
    applicabilityContext: input.applicabilityContext,
    status: input.status,
    resolution: input.resolution,
    origin: input.origin,
    actor: input.actor,
    evidenceReferences: input.evidenceReferences.map((reference) => reference.id),
    supersedes: canonicalStrings(input.supersedes),
  });
}

export function engineeringChangeEventFingerprint(
  input: Omit<EngineeringChangeEvent, 'fingerprint'>,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_CHANGE_EVENT',
    identity: canonicalIdentity(input.identity),
    changeKind: input.kind,
    affectedScope: input.affectedScope.map(canonicalEndpoint),
    description: input.description,
    beforeMeaning: input.beforeMeaning,
    afterMeaning: input.afterMeaning,
    eventTime: input.eventTime,
    temporalValidity: input.temporalValidity,
    applicabilityContext: input.applicabilityContext,
    relatedDecisionIdentities: input.relatedDecisionIdentities.map(
      (reference) => reference.id,
    ),
    status: input.status,
    resolution: input.resolution,
    origin: input.origin,
    actor: input.actor,
    evidenceReferences: input.evidenceReferences.map((reference) => reference.id),
    supersedes: canonicalStrings(input.supersedes),
  });
}

export function decisionEndpoint(
  decision: Pick<EngineeringDecision, 'identity'>,
): KnowledgeGraphEndpoint {
  return artifactEndpoint(decision.identity);
}

export function changeEventEndpoint(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
): KnowledgeGraphEndpoint {
  return artifactEndpoint(changeEvent.identity);
}

export function artifactEndpoint(
  identity: EngineeringArtifactIdentity,
): KnowledgeGraphEndpoint {
  return knowledgeGraphEndpoint({
    kind: 'ARTIFACT',
    status: 'RESOLVED',
    identity,
  });
}

export function decisionAppliesTo(
  decision: Pick<EngineeringDecision, 'identity'>,
  target: KnowledgeGraphEndpoint | EngineeringArtifactIdentity,
): RelationshipFact {
  return decisionChangeFact('APPLIES_TO', decisionEndpoint(decision), target);
}

export function changeAppliesTo(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
  target: KnowledgeGraphEndpoint | EngineeringArtifactIdentity,
): RelationshipFact {
  return decisionChangeFact('APPLIES_TO', changeEventEndpoint(changeEvent), target);
}

export function decisionSupportedBy(
  decision: Pick<EngineeringDecision, 'identity'>,
  evidenceArtifact: EngineeringArtifactIdentity,
): RelationshipFact {
  return decisionChangeFact(
    'SUPPORTED_BY',
    decisionEndpoint(decision),
    artifactEndpoint(evidenceArtifact),
  );
}

export function changeSupportedBy(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
  evidenceArtifact: EngineeringArtifactIdentity,
): RelationshipFact {
  return decisionChangeFact(
    'SUPPORTED_BY',
    changeEventEndpoint(changeEvent),
    artifactEndpoint(evidenceArtifact),
  );
}

export function decisionDerivedFrom(
  decision: Pick<EngineeringDecision, 'identity'>,
  source: EngineeringArtifactIdentity | Pick<EngineeringDecision, 'identity'> | Pick<EngineeringChangeEvent, 'identity'>,
): RelationshipFact {
  return decisionChangeFact('DERIVED_FROM', decisionEndpoint(decision), identityEndpoint(source));
}

export function changeDerivedFrom(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
  source: EngineeringArtifactIdentity | Pick<EngineeringDecision, 'identity'> | Pick<EngineeringChangeEvent, 'identity'>,
): RelationshipFact {
  return decisionChangeFact(
    'DERIVED_FROM',
    changeEventEndpoint(changeEvent),
    identityEndpoint(source),
  );
}

export function changeAffects(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
  target: KnowledgeGraphEndpoint | EngineeringArtifactIdentity,
): RelationshipFact {
  return decisionChangeFact('AFFECTS', changeEventEndpoint(changeEvent), target);
}

export function changeImplements(
  changeEvent: Pick<EngineeringChangeEvent, 'identity'>,
  decision: Pick<EngineeringDecision, 'identity'>,
): RelationshipFact {
  return decisionChangeFact(
    'IMPLEMENTS',
    changeEventEndpoint(changeEvent),
    decisionEndpoint(decision),
  );
}

export function decisionSupersedes(
  later: Pick<EngineeringDecision, 'identity'>,
  earlier: Pick<EngineeringDecision, 'identity'> | Pick<EngineeringChangeEvent, 'identity'>,
): RelationshipFact {
  return decisionChangeFact('SUPERSEDES', decisionEndpoint(later), identityEndpoint(earlier));
}

export function changeSupersedes(
  later: Pick<EngineeringChangeEvent, 'identity'>,
  earlier: Pick<EngineeringDecision, 'identity'> | Pick<EngineeringChangeEvent, 'identity'>,
): RelationshipFact {
  return decisionChangeFact('SUPERSEDES', changeEventEndpoint(later), identityEndpoint(earlier));
}

function decisionChangeFact(
  predicate: EngineeringRelationshipPredicate,
  subject: KnowledgeGraphEndpoint,
  object: KnowledgeGraphEndpoint | EngineeringArtifactIdentity,
): RelationshipFact {
  return relationshipFact({
    subject,
    predicate,
    object: isKnowledgeGraphEndpoint(object) ? object : artifactEndpoint(object),
  });
}

function identityEndpoint(
  identity: EngineeringArtifactIdentity | Pick<EngineeringDecision, 'identity'> | Pick<EngineeringChangeEvent, 'identity'>,
): KnowledgeGraphEndpoint {
  return artifactEndpoint('identity' in identity ? identity.identity : identity);
}

function validateDeclarationCommon(
  input: {
    readonly identity: EngineeringArtifactIdentity;
    readonly subjectScope?: readonly KnowledgeGraphEndpoint[];
    readonly affectedScope?: readonly KnowledgeGraphEndpoint[];
    readonly temporalValidity: TemporalValidity;
    readonly applicabilityContext: string | null;
    readonly origin: RelationshipDeclarationOrigin;
    readonly actor: string | null;
    readonly evidenceReferences: readonly EngineeringArtifactIdentity[];
    readonly supersedes: readonly string[];
  },
): string[] {
  const errors = validateEngineeringArtifactIdentity(input.identity).map(
    (error) => `Identity: ${error}`,
  );
  const scope = input.subjectScope ?? input.affectedScope ?? [];
  if (!Array.isArray(scope) || scope.length === 0) {
    errors.push('Subject scope must contain at least one canonical endpoint.');
  } else {
    scope.forEach((endpoint, index) => {
      errors.push(
        ...validateKnowledgeGraphEndpoint(endpoint).map(
          (error) => `Scope endpoint ${index}: ${error}`,
        ),
      );
    });
  }
  errors.push(...validateTemporalValidity(input.temporalValidity));
  if (
    input.applicabilityContext !== null &&
    !isNonEmptyString(input.applicabilityContext)
  ) {
    errors.push('Applicability context must be non-empty or null.');
  }
  if (!RELATIONSHIP_DECLARATION_ORIGINS.includes(input.origin)) {
    errors.push(`Unsupported declaration origin: ${String(input.origin)}.`);
  }
  const actorRequired =
    input.origin === 'HUMAN' ||
    input.origin === 'OBSERVATION' ||
    input.origin === 'AUTHORITY_RECORD';
  if (actorRequired && !isNonEmptyString(input.actor)) {
    errors.push(`Actor is required for ${input.origin} declarations.`);
  }
  if (input.actor !== null && !isNonEmptyString(input.actor)) {
    errors.push('Actor must be non-empty or null.');
  }
  errors.push(...validateArtifactArray(input.evidenceReferences, 'Evidence reference'));
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

function validateArtifactArray(
  values: readonly EngineeringArtifactIdentity[],
  label: string,
): string[] {
  if (!Array.isArray(values)) {
    return [`${label}s must be an array.`];
  }
  return values.flatMap((identity, index) =>
    validateEngineeringArtifactIdentity(identity).map(
      (error) => `${label} ${index}: ${error}`,
    ),
  );
}

function validateStringArray(values: readonly string[], label: string): string[] {
  if (!Array.isArray(values)) {
    return [`${label} must be an array.`];
  }
  return values.flatMap((value, index) =>
    isNonEmptyString(value) ? [] : [`${label} ${index} must be non-empty.`],
  );
}

function validateOptionalText(value: string | null, label: string): string[] {
  return value === null || isNonEmptyString(value)
    ? []
    : [`${label} must be non-empty or null.`];
}

function canonicalIdentities(
  identities: readonly EngineeringArtifactIdentity[],
): readonly EngineeringArtifactIdentity[] {
  const byId = new Map<string, EngineeringArtifactIdentity>();
  for (const identity of identities) {
    byId.set(identity.id, {
      ...identity,
      metadata: { ...identity.metadata },
    });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function canonicalEndpoints(
  endpoints: readonly KnowledgeGraphEndpoint[],
): readonly KnowledgeGraphEndpoint[] {
  const byKey = new Map<string, KnowledgeGraphEndpoint>();
  for (const endpoint of endpoints) {
    byKey.set(JSON.stringify(canonicalEndpoint(endpoint)), endpoint);
  }
  return [...byKey.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, endpoint]) => endpoint);
}

function canonicalIdentity(identity: EngineeringArtifactIdentity): Record<string, unknown> {
  return {
    id: identity.id,
    baseId: identity.baseId,
    type: identity.type,
    name: identity.name,
    version: identity.version,
    metadata: identity.metadata,
  };
}

function canonicalEndpoint(endpoint: KnowledgeGraphEndpoint): Record<string, unknown> {
  const identity = endpoint.identity;
  return {
    kind: endpoint.kind,
    identity:
      endpoint.kind === 'ARTIFACT'
        ? { id: (identity as Extract<typeof identity, { readonly id: string }>).id }
        : {
            identityKind: (
              identity as Extract<typeof identity, { readonly identityKind: string }>
            ).identityKind,
            canonicalIdentity: (
              identity as Extract<typeof identity, { readonly identityKind: string }>
            ).canonicalIdentity,
          },
  };
}

function isKnowledgeGraphEndpoint(
  value: KnowledgeGraphEndpoint | EngineeringArtifactIdentity,
): value is KnowledgeGraphEndpoint {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    (value.kind === 'ARTIFACT' || value.kind === 'PHYSICAL_REFERENT')
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
