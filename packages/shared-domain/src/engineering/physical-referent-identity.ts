import { contentFingerprint } from './content-fingerprint.ts';

export const PHYSICAL_REFERENT_IDENTITY_AUTHORITY =
  'EngineeringArtifactIdentity' as const;
export const PHYSICAL_REFERENT_IDENTITY_KIND = 'PHYSICAL_REFERENT' as const;

export type PhysicalReferentResolutionStatus =
  | 'RESOLVED'
  | 'UNKNOWN'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'UNRESOLVED';

export interface PhysicalReferentIdentity {
  readonly identityAuthority: typeof PHYSICAL_REFERENT_IDENTITY_AUTHORITY;
  readonly identityKind: typeof PHYSICAL_REFERENT_IDENTITY_KIND;
  /** The authority-governed, stable referent seed. */
  readonly referentKey: string;
  /** The deterministic content identity of the referent seed. */
  readonly canonicalIdentity: string;
}

export interface PhysicalReferentIdentityInput {
  readonly referentKey: string;
  /** An optional caller-supplied identity claim, never an identity authority. */
  readonly canonicalIdentity?: string;
  readonly identityAuthority?: typeof PHYSICAL_REFERENT_IDENTITY_AUTHORITY;
  readonly identityKind?: typeof PHYSICAL_REFERENT_IDENTITY_KIND;
}

export interface PhysicalReferentResolution {
  readonly status: PhysicalReferentResolutionStatus;
  readonly identity: PhysicalReferentIdentity | null;
}

export function physicalReferentIdentityFingerprint(referentKey: string): string {
  return contentFingerprint({
    authority: PHYSICAL_REFERENT_IDENTITY_AUTHORITY,
    identityKind: PHYSICAL_REFERENT_IDENTITY_KIND,
    referentKey,
  });
}

export function physicalReferentIdentity(
  input: PhysicalReferentIdentityInput,
): PhysicalReferentIdentity {
  const errors = validatePhysicalReferentIdentityInput(input);
  if (errors.length > 0) {
    throw new Error(`Invalid physical referent identity: ${errors.join('; ')}`);
  }

  const canonicalIdentity = physicalReferentIdentityFingerprint(input.referentKey);
  if (
    input.canonicalIdentity !== undefined &&
    input.canonicalIdentity !== canonicalIdentity
  ) {
    throw new Error(
      'Invalid physical referent identity: canonical identity does not match the referent content.',
    );
  }

  return deepFreeze({
    identityAuthority: PHYSICAL_REFERENT_IDENTITY_AUTHORITY,
    identityKind: PHYSICAL_REFERENT_IDENTITY_KIND,
    referentKey: input.referentKey,
    canonicalIdentity,
  });
}

export function validatePhysicalReferentIdentityInput(
  input: PhysicalReferentIdentityInput,
): readonly string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return ['Identity input must be provided.'];
  }
  if (
    input.identityAuthority !== undefined &&
    input.identityAuthority !== PHYSICAL_REFERENT_IDENTITY_AUTHORITY
  ) {
    errors.push('Identity authority must be EngineeringArtifactIdentity.');
  }
  if (
    input.identityKind !== undefined &&
    input.identityKind !== PHYSICAL_REFERENT_IDENTITY_KIND
  ) {
    errors.push('Identity kind must be PHYSICAL_REFERENT.');
  }
  if (typeof input.referentKey !== 'string' || input.referentKey.length === 0) {
    errors.push('Referent key must be a non-empty governed stable key.');
  }
  if (
    input.canonicalIdentity !== undefined &&
    !/^[0-9a-f]{64}$/.test(input.canonicalIdentity)
  ) {
    errors.push('Canonical identity must be a lowercase SHA-256 fingerprint.');
  }
  return errors;
}

export function validatePhysicalReferentIdentity(
  identity: PhysicalReferentIdentity,
): readonly string[] {
  const errors = [...validatePhysicalReferentIdentityInput(identity)];
  if (identity?.canonicalIdentity !== undefined) {
    const expected = physicalReferentIdentityFingerprint(identity.referentKey);
    if (identity.canonicalIdentity !== expected) {
      errors.push('Canonical identity does not match the referent content.');
    }
  }
  return errors;
}

export function physicalReferentResolution(
  status: PhysicalReferentResolutionStatus,
  identity: PhysicalReferentIdentity | null = null,
): PhysicalReferentResolution {
  if (status === 'RESOLVED' && identity === null) {
    throw new Error('Resolved physical referent identity requires an identity.');
  }
  if (status !== 'RESOLVED' && identity !== null) {
    throw new Error(
      `Physical referent identity must be null for ${status} resolution.`,
    );
  }
  return deepFreeze({ status, identity });
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
