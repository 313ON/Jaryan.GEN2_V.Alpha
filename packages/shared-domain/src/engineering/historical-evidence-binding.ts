import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';

export interface HistoricalEvidenceBinding {
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly snapshotId: string;
}

export function historicalEvidenceBinding(
  input: HistoricalEvidenceBinding,
): HistoricalEvidenceBinding {
  const errors = validateHistoricalEvidenceBinding(input);
  if (errors.length > 0) {
    throw new Error(
      `Invalid historical evidence binding: ${errors.join('; ')}`,
    );
  }
  return deepFreeze({
    calculationIdentity: {
      ...input.calculationIdentity,
      metadata: { ...input.calculationIdentity.metadata },
    },
    snapshotId: input.snapshotId,
  });
}

export function validateHistoricalEvidenceBinding(
  input: HistoricalEvidenceBinding,
): readonly string[] {
  if (!input || typeof input !== 'object') {
    return ['Binding must be provided.'];
  }

  const errors = validateEngineeringArtifactIdentity(
    input.calculationIdentity,
  ).map((error) => `Calculation identity is invalid: ${error}`);

  if (input.calculationIdentity?.type !== 'CALCULATION') {
    errors.push('Calculation identity must use the CALCULATION type.');
  }
  if (typeof input.snapshotId !== 'string' || input.snapshotId.length === 0) {
    errors.push('Snapshot id must be a non-empty opaque string.');
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
