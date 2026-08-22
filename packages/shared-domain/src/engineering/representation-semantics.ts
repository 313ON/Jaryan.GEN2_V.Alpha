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

export type EngineeringRepresentationScopeKind = 'SHEET' | 'VIEW';

export const ENGINEERING_REPRESENTATION_SCOPE_KINDS: readonly EngineeringRepresentationScopeKind[] =
  ['SHEET', 'VIEW'];

export type EngineeringRepresentationScopeResolution =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'UNRESOLVED'
  | 'AMBIGUOUS'
  | 'INVALID';

export const ENGINEERING_REPRESENTATION_SCOPE_RESOLUTIONS: readonly EngineeringRepresentationScopeResolution[] =
  ['RESOLVED', 'UNKNOWN', 'UNRESOLVED', 'AMBIGUOUS', 'INVALID'];

export interface EngineeringRepresentationScopeReference {
  readonly kind: EngineeringRepresentationScopeKind;
  /** Opaque source-declared value; never an identity or authority key. */
  readonly value: string;
  /**
   * RESOLVED means only semantically recognized and structurally valid.
   * It does not imply authority, existence, correctness, or trust.
   */
  readonly resolution: EngineeringRepresentationScopeResolution;
}

export interface EngineeringRepresentationSemanticMetadata {
  readonly representationKind: EngineeringRepresentationKind;
  readonly semanticRole: EngineeringRepresentationRole;
  /** Human/source-declared issue label; not an identity or supersession signal. */
  readonly issue: string | null;
  /** Null is the canonical representation of no declared scope. */
  readonly scopeReferences: readonly EngineeringRepresentationScopeReference[] | null;
}

export interface EngineeringRepresentationSemanticMetadataInput
  extends Omit<
    EngineeringRepresentationSemanticMetadata,
    'issue' | 'scopeReferences'
  > {
  readonly issue?: string | null;
  readonly scopeReferences?:
    | readonly EngineeringRepresentationScopeReference[]
    | null;
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
    scopeReferences: canonicalScopeReferences(input.scopeReferences),
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
  if (input.scopeReferences !== undefined && input.scopeReferences !== null) {
    if (!Array.isArray(input.scopeReferences)) {
      errors.push('Representation scope references must be an array or null.');
    } else {
      input.scopeReferences.forEach((reference, index) => {
        errors.push(
          ...validateEngineeringRepresentationScopeReference(reference).map(
            (error) => `Representation scope reference ${index}: ${error}`,
          ),
        );
      });
    }
  }
  return errors;
}

export function validateEngineeringRepresentationScopeReference(
  input: EngineeringRepresentationScopeReference,
): readonly string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return ['Scope reference must be provided as an object.'];
  }
  if (!ENGINEERING_REPRESENTATION_SCOPE_KINDS.includes(input.kind)) {
    errors.push(`Unsupported representation scope kind: ${String(input.kind)}.`);
  }
  if (typeof input.value !== 'string' || input.value.trim().length === 0) {
    errors.push('Representation scope value must be a non-empty string.');
  }
  if (!ENGINEERING_REPRESENTATION_SCOPE_RESOLUTIONS.includes(input.resolution)) {
    errors.push(
      `Unsupported representation scope resolution: ${String(input.resolution)}.`,
    );
  }
  return errors;
}

function canonicalScopeReferences(
  references:
    | readonly EngineeringRepresentationScopeReference[]
    | null
    | undefined,
): readonly EngineeringRepresentationScopeReference[] | null {
  if (references === undefined || references === null || references.length === 0) {
    return null;
  }
  const unique = new Map<
    string,
    EngineeringRepresentationScopeReference
  >();
  for (const reference of references) {
    unique.set(
      JSON.stringify([reference.kind, reference.value, reference.resolution]),
      {
        kind: reference.kind,
        value: reference.value,
        resolution: reference.resolution,
      },
    );
  }
  return [...unique.values()].sort((left, right) => {
    const kindOrder = left.kind.localeCompare(right.kind);
    if (kindOrder !== 0) return kindOrder;
    const valueOrder = left.value.localeCompare(right.value);
    if (valueOrder !== 0) return valueOrder;
    return left.resolution.localeCompare(right.resolution);
  });
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
