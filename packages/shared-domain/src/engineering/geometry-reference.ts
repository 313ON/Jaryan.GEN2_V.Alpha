import {
  type PhysicalReferentResolutionStatus,
} from './physical-referent-identity.ts';

export interface GeometryReference {
  /** Opaque compatibility reference; never a geometry identity. */
  readonly referenceKey: string | null;
  readonly resolution: PhysicalReferentResolutionStatus;
}

export interface GeometryReferenceInput {
  readonly referenceKey?: string | null;
  readonly resolution: PhysicalReferentResolutionStatus;
}

export function geometryReference(input: GeometryReferenceInput): GeometryReference {
  const errors = validateGeometryReference(input);
  if (errors.length > 0) {
    throw new Error(`Invalid geometry reference: ${errors.join('; ')}`);
  }
  return deepFreeze({
    referenceKey: input.referenceKey ?? null,
    resolution: input.resolution,
  });
}

export function validateGeometryReference(
  input: GeometryReferenceInput,
): readonly string[] {
  const errors: string[] = [];
  if (!isResolutionStatus(input?.resolution)) {
    errors.push(`Unsupported geometry resolution: ${String(input?.resolution)}.`);
  }
  if (
    input?.referenceKey !== undefined &&
    input.referenceKey !== null &&
    (typeof input.referenceKey !== 'string' || input.referenceKey.length === 0)
  ) {
    errors.push('Geometry reference key must be non-empty or null.');
  }
  if (
    (input?.resolution === 'RESOLVED' ||
      input?.resolution === 'UNRESOLVED' ||
      input?.resolution === 'AMBIGUOUS') &&
    (input.referenceKey === undefined ||
      input.referenceKey === null ||
      input.referenceKey.length === 0)
  ) {
    errors.push(
      `${input.resolution} geometry references require an opaque reference key.`,
    );
  }
  return errors;
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
