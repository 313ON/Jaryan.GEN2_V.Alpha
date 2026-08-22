export type EngineeringRepresentationKind = 'PLAN' | 'DRAWING';

export const ENGINEERING_REPRESENTATION_KINDS: readonly EngineeringRepresentationKind[] =
  ['PLAN', 'DRAWING'];

export type EngineeringRepresentationRole =
  | 'DESIGN_INTENT'
  | 'CONSTRUCTION_RECORD'
  | 'AS_BUILT_RECORD'
  | 'REFERENCE';

export const ENGINEERING_REPRESENTATION_ROLES: readonly EngineeringRepresentationRole[] =
  ['DESIGN_INTENT', 'CONSTRUCTION_RECORD', 'AS_BUILT_RECORD', 'REFERENCE'];

export interface EngineeringRepresentationSemanticMetadata {
  readonly representationKind: EngineeringRepresentationKind;
  readonly semanticRole: EngineeringRepresentationRole;
  /** Human/source-declared issue label; not an identity or supersession signal. */
  readonly issue: string | null;
}

export interface EngineeringRepresentationSemanticMetadataInput
  extends Omit<EngineeringRepresentationSemanticMetadata, 'issue'> {
  readonly issue?: string | null;
}

export function engineeringRepresentationSemanticMetadata(
  input: EngineeringRepresentationSemanticMetadataInput,
): EngineeringRepresentationSemanticMetadata {
  const errors = validateEngineeringRepresentationSemanticMetadata(input);
  if (errors.length > 0) {
    throw new Error(
      `Invalid engineering representation semantic metadata: ${errors.join('; ')}`,
    );
  }
  return deepFreeze({
    representationKind: input.representationKind,
    semanticRole: input.semanticRole,
    issue: input.issue ?? null,
  });
}

export function validateEngineeringRepresentationSemanticMetadata(
  input: EngineeringRepresentationSemanticMetadataInput,
): readonly string[] {
  if (!input || typeof input !== 'object') {
    return ['Representation metadata must be provided as an object.'];
  }
  const errors: string[] = [];
  if (!ENGINEERING_REPRESENTATION_KINDS.includes(input.representationKind)) {
    errors.push(
      `Unsupported engineering representation kind: ${String(input.representationKind)}.`,
    );
  }
  if (!ENGINEERING_REPRESENTATION_ROLES.includes(input.semanticRole)) {
    errors.push(
      `Unsupported engineering representation role: ${String(input.semanticRole)}.`,
    );
  }
  if (
    input.issue !== undefined &&
    input.issue !== null &&
    (typeof input.issue !== 'string' || input.issue.trim().length === 0)
  ) {
    errors.push('Representation issue must be non-empty or null.');
  }
  return errors;
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
