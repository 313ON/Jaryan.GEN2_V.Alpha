import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';
import { contentFingerprint } from './content-fingerprint.ts';
import {
  type PhysicalReferentIdentity,
  type PhysicalReferentResolutionStatus,
  validatePhysicalReferentIdentity,
} from './physical-referent-identity.ts';
import {
  type LifecycleState,
  LIFECYCLE_STATES,
  type TemporalValidity,
  type UncertaintyState,
  UNCERTAINTY_STATES,
  validateTemporalValidity,
} from './semantic-backbone.ts';

export type SemanticReferenceIdentity =
  | EngineeringArtifactIdentity
  | PhysicalReferentIdentity;

export type EngineeringObjectSemanticReferenceKind =
  | 'ARTIFACT'
  | 'PHYSICAL_REFERENT';

export interface EngineeringObjectSemanticReference {
  readonly kind: EngineeringObjectSemanticReferenceKind;
  readonly status: PhysicalReferentResolutionStatus;
  readonly identity: SemanticReferenceIdentity | null;
}

export interface EngineeringObjectSemanticReferenceInput {
  readonly kind: EngineeringObjectSemanticReferenceKind;
  readonly status: PhysicalReferentResolutionStatus;
  readonly identity?: SemanticReferenceIdentity | null;
}

/**
 * Location identity is intentionally not canonical in this phase. A supplied
 * key is retained as an opaque compatibility reference only.
 */
export interface LocationReference {
  readonly status: Exclude<PhysicalReferentResolutionStatus, 'RESOLVED'>;
  readonly referenceKey: string | null;
}

export interface LocationReferenceInput {
  readonly status: Exclude<PhysicalReferentResolutionStatus, 'RESOLVED'>;
  readonly referenceKey?: string | null;
}

export interface Measurement {
  readonly subject: EngineeringObjectSemanticReference;
  readonly value: number;
  readonly unit: string;
  readonly temporalValidity: TemporalValidity;
  readonly uncertainty?: UncertaintyState;
  readonly fingerprint: string;
}

export interface MeasurementInput
  extends Omit<Measurement, 'fingerprint' | 'subject'> {
  readonly subject: EngineeringObjectSemanticReferenceInput | EngineeringObjectSemanticReference;
  readonly fingerprint?: string;
}

export interface Observation {
  readonly subject: EngineeringObjectSemanticReference;
  readonly observedValue: unknown;
  readonly observedAt: string;
  readonly temporalValidity: TemporalValidity;
  readonly location: LocationReference | null;
  readonly measurement: Measurement | null;
  readonly lifecycleState?: LifecycleState;
  readonly evidenceReferences: readonly EngineeringArtifactIdentity[];
  readonly fingerprint: string;
}

export interface ObservationInput
  extends Omit<Observation, 'fingerprint' | 'subject' | 'location' | 'measurement' | 'evidenceReferences'> {
  readonly subject: EngineeringObjectSemanticReferenceInput | EngineeringObjectSemanticReference;
  readonly location?: LocationReferenceInput | LocationReference | null;
  readonly measurement?: MeasurementInput | Measurement | null;
  readonly evidenceReferences?: readonly EngineeringArtifactIdentity[];
  readonly fingerprint?: string;
}

export function engineeringObjectSemanticReference(
  input: EngineeringObjectSemanticReferenceInput,
): EngineeringObjectSemanticReference {
  const errors = validateEngineeringObjectSemanticReference(input);
  if (errors.length > 0) {
    throw new Error(
      `Invalid engineering object semantic reference: ${errors.join('; ')}`,
    );
  }
  return deepFreeze({
    kind: input.kind,
    status: input.status,
    identity: input.identity ?? null,
  });
}

export function validateEngineeringObjectSemanticReference(
  input: EngineeringObjectSemanticReferenceInput,
): readonly string[] {
  const errors: string[] = [];
  if (input?.kind !== 'ARTIFACT' && input?.kind !== 'PHYSICAL_REFERENT') {
    errors.push(`Unsupported reference kind: ${String(input?.kind)}.`);
    return errors;
  }
  if (!isResolutionStatus(input?.status)) {
    errors.push(`Unsupported reference status: ${String(input?.status)}.`);
  }
  const identity = input?.identity ?? null;
  if (input?.status === 'RESOLVED' && identity === null) {
    errors.push('Resolved references require a canonical identity.');
  }
  if (input?.status !== 'RESOLVED' && identity !== null) {
    errors.push('Unresolved references must not carry a canonical identity.');
  }
  if (identity !== null) {
    if (input.kind === 'ARTIFACT') {
      if ('identityKind' in identity) {
        errors.push('Artifact references require an artifact identity.');
      } else {
        errors.push(
          ...validateEngineeringArtifactIdentity(identity).map(
            (error) => `Artifact identity: ${error}`,
          ),
        );
      }
    } else if (!('identityKind' in identity)) {
      errors.push('Physical referent references require a physical identity.');
    } else {
      errors.push(
        ...validatePhysicalReferentIdentity(identity).map(
          (error) => `Physical referent identity: ${error}`,
        ),
      );
    }
  }
  return errors;
}

export function locationReference(input: LocationReferenceInput): LocationReference {
  const errors = validateLocationReference(input);
  if (errors.length > 0) {
    throw new Error(`Invalid location reference: ${errors.join('; ')}`);
  }
  return deepFreeze({
    status: input.status,
    referenceKey: input.referenceKey ?? null,
  });
}

export function validateLocationReference(
  input: LocationReferenceInput,
): readonly string[] {
  const errors: string[] = [];
  const status = (input as { status?: unknown } | null | undefined)?.status;
  if (status === 'RESOLVED') {
    errors.push('Location references cannot be canonical in this phase.');
  } else if (!isResolutionStatus(status)) {
    errors.push(`Unsupported location status: ${String(status)}.`);
  }
  if (
    input?.referenceKey !== undefined &&
    input.referenceKey !== null &&
    (typeof input.referenceKey !== 'string' || input.referenceKey.length === 0)
  ) {
    errors.push('Location reference key must be non-empty or null.');
  }
  return errors;
}

export function measurement(input: MeasurementInput): Measurement {
  const subject = canonicalSubject(input.subject);
  const errors = validateMeasurement({ ...input, subject });
  if (errors.length > 0) {
    throw new Error(`Invalid measurement: ${errors.join('; ')}`);
  }
  const fingerprint = measurementFingerprint({
    subject,
    value: input.value,
    unit: input.unit,
    temporalValidity: input.temporalValidity,
    uncertainty: input.uncertainty,
  });
  if (input.fingerprint !== undefined && input.fingerprint !== fingerprint) {
    throw new Error('Invalid measurement: fingerprint does not match content.');
  }
  return deepFreeze({
    subject,
    value: input.value,
    unit: input.unit,
    temporalValidity: { ...input.temporalValidity },
    ...(input.uncertainty === undefined ? {} : { uncertainty: input.uncertainty }),
    fingerprint,
  });
}

export function validateMeasurement(
  input: Omit<Measurement, 'fingerprint'>,
): readonly string[] {
  const errors = [
    ...validateEngineeringObjectSemanticReference(input.subject),
    ...validateTemporalValidity(input.temporalValidity, 'Measurement temporal validity'),
  ];
  if (!Number.isFinite(input.value)) {
    errors.push('Measurement value must be finite.');
  }
  if (typeof input.unit !== 'string' || input.unit.length === 0) {
    errors.push('Measurement unit must be non-empty.');
  }
  if (input.uncertainty !== undefined && !UNCERTAINTY_STATES.includes(input.uncertainty)) {
    errors.push(`Unsupported measurement uncertainty: ${String(input.uncertainty)}.`);
  }
  return errors;
}

export function measurementFingerprint(
  input: Omit<Measurement, 'fingerprint'>,
): string {
  return contentFingerprint({
    kind: 'MEASUREMENT',
    subject: canonicalSubjectContent(input.subject),
    value: input.value,
    unit: input.unit,
    temporalValidity: input.temporalValidity,
    uncertainty: input.uncertainty ?? null,
  });
}

export function observation(input: ObservationInput): Observation {
  const subject = canonicalSubject(input.subject);
  const location =
    input.location === undefined || input.location === null
      ? null
      : locationReference(input.location);
  const measurementValue =
    input.measurement === undefined || input.measurement === null
      ? null
      : measurement(input.measurement);
  const evidenceReferences = canonicalEvidenceReferences(input.evidenceReferences ?? []);
  const errors = validateObservation({
    ...input,
    subject,
    location,
    measurement: measurementValue,
    evidenceReferences,
  });
  if (errors.length > 0) {
    throw new Error(`Invalid observation: ${errors.join('; ')}`);
  }
  const fingerprint = observationFingerprint({
    subject,
    observedValue: input.observedValue,
    observedAt: input.observedAt,
    temporalValidity: input.temporalValidity,
    location,
    measurement: measurementValue,
    lifecycleState: input.lifecycleState,
    evidenceReferences,
  });
  if (input.fingerprint !== undefined && input.fingerprint !== fingerprint) {
    throw new Error('Invalid observation: fingerprint does not match content.');
  }
  return deepFreeze({
    subject,
    observedValue: input.observedValue,
    observedAt: input.observedAt,
    temporalValidity: { ...input.temporalValidity },
    location,
    measurement: measurementValue,
    ...(input.lifecycleState === undefined
      ? {}
      : { lifecycleState: input.lifecycleState }),
    evidenceReferences,
    fingerprint,
  });
}

export function validateObservation(
  input: Omit<Observation, 'fingerprint'>,
): readonly string[] {
  const errors = [
    ...validateEngineeringObjectSemanticReference(input.subject),
    ...validateTemporalValidity(input.temporalValidity, 'Observation temporal validity'),
  ];
  if (!isIsoTimestamp(input.observedAt)) {
    errors.push('Observation observedAt must be an ISO-8601 timestamp.');
  }
  if (input.location !== null) {
    errors.push(...validateLocationReference(input.location));
  }
  if (input.measurement !== null) {
    errors.push(...validateMeasurement(input.measurement));
  }
  if (
    input.lifecycleState !== undefined &&
    !LIFECYCLE_STATES.includes(input.lifecycleState)
  ) {
    errors.push(`Unsupported observation lifecycle state: ${String(input.lifecycleState)}.`);
  }
  input.evidenceReferences.forEach((reference, index) => {
    errors.push(
      ...validateEngineeringArtifactIdentity(reference).map(
        (error) => `Evidence reference ${index}: ${error}`,
      ),
    );
  });
  return errors;
}

export function observationFingerprint(
  input: Omit<Observation, 'fingerprint'>,
): string {
  return contentFingerprint({
    kind: 'OBSERVATION',
    subject: canonicalSubjectContent(input.subject),
    observedValue: input.observedValue,
    observedAt: input.observedAt,
    temporalValidity: input.temporalValidity,
    location: input.location,
    measurement: input.measurement,
    lifecycleState: input.lifecycleState ?? null,
    evidenceReferences: input.evidenceReferences.map((reference) => reference.id),
  });
}

function canonicalSubject(
  input: EngineeringObjectSemanticReferenceInput | EngineeringObjectSemanticReference,
): EngineeringObjectSemanticReference {
  return engineeringObjectSemanticReference(input);
}

function canonicalSubjectContent(
  subject: EngineeringObjectSemanticReference,
): Record<string, unknown> {
  return {
    kind: subject.kind,
    status: subject.status,
    identity:
      subject.identity === null
        ? null
        : 'identityKind' in subject.identity
          ? {
              identityKind: subject.identity.identityKind,
              canonicalIdentity: subject.identity.canonicalIdentity,
            }
          : { id: subject.identity.id },
  };
}

function canonicalEvidenceReferences(
  references: readonly EngineeringArtifactIdentity[],
): readonly EngineeringArtifactIdentity[] {
  const byId = new Map<string, EngineeringArtifactIdentity>();
  for (const reference of references) {
    byId.set(reference.id, reference);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function isResolutionStatus(value: unknown): value is PhysicalReferentResolutionStatus {
  return (
    value === 'RESOLVED' ||
    value === 'UNKNOWN' ||
    value === 'AMBIGUOUS' ||
    value === 'INVALID' ||
    value === 'UNRESOLVED'
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value)) &&
    /T/.test(value)
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
