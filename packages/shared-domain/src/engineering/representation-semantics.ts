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
}

export function engineeringRepresentationSemanticMetadata(
  input: EngineeringRepresentationSemanticMetadata,
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
  });
}

export function validateEngineeringRepresentationSemanticMetadata(
  input: EngineeringRepresentationSemanticMetadata,
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
