import type { EngineeringArtifactIdentity } from './artifact-identity.ts';

export type EngineeringSourceResolutionStatus =
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'AMBIGUOUS';

export type EngineeringSourceReference =
  | string
  | Pick<EngineeringArtifactIdentity, 'id' | 'type' | 'metadata'>;

export interface EngineeringSourceResolution {
  readonly reference: EngineeringSourceReference;
  readonly status: EngineeringSourceResolutionStatus;
  readonly sourceId: string | null;
}

/**
 * Domain-owned port for resolving source references at an authoritative
 * boundary. Implementations own the source definitions; the domain owns only
 * the resolution vocabulary and contract.
 */
export interface EngineeringSourceAuthority {
  resolve(reference: EngineeringSourceReference): EngineeringSourceResolution;
}

export function sourceIdFromEngineeringSourceReference(
  reference: EngineeringSourceReference,
): string | null {
  if (typeof reference === 'string') {
    return reference;
  }
  if (reference.type !== 'SOURCE') {
    return null;
  }
  const sourceId = reference.metadata?.sourceId;
  return typeof sourceId === 'string' ? sourceId : null;
}

export function isValidEngineeringSourceReference(
  reference: EngineeringSourceReference,
): boolean {
  const sourceId = sourceIdFromEngineeringSourceReference(reference);
  return (
    typeof sourceId === 'string' &&
    /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(sourceId)
  );
}
