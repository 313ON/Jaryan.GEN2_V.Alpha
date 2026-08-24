import {
  reconstructDurableCalculationSnapshot,
  validateDurableCalculationSnapshot,
  validateEngineeringArtifactIdentity,
  type DurableCalculationSnapshot,
  type DurableSnapshotReconstruction,
  type EngineeringArtifactIdentity,
  type EngineeringKnowledgeRegistry,
} from '@jaryan/shared-domain';
import type { DurableCalculationSnapshotStore } from '@jaryan/shared-infrastructure';

export type HistoricalCalculationEvidenceResolutionStatus =
  | 'RESOLVED'
  | 'NOT_FOUND'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'UNKNOWN';

export interface HistoricalCalculationEvidenceResolution {
  readonly status: HistoricalCalculationEvidenceResolutionStatus;
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly candidates: readonly DurableCalculationSnapshot[];
  readonly snapshot: DurableCalculationSnapshot | null;
  readonly reconstruction: DurableSnapshotReconstruction | null;
  readonly diagnostic?: string;
}

export interface ResolveHistoricalCalculationEvidenceInput {
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly snapshotId?: string;
  readonly store: DurableCalculationSnapshotStore;
  readonly registry: EngineeringKnowledgeRegistry;
}

/**
 * Resolves a calculation definition to a historical execution snapshot.
 * A single candidate is allowed to resolve; multiple candidates require the
 * caller to provide the exact historical snapshotId.
 */
export async function resolveHistoricalCalculationEvidence(
  input: ResolveHistoricalCalculationEvidenceInput,
): Promise<HistoricalCalculationEvidenceResolution> {
  const identityErrors = validateCalculationIdentity(input.calculationIdentity);
  if (identityErrors.length > 0) {
    return invalidResolution(input.calculationIdentity, identityErrors.join('; '));
  }
  if (input.snapshotId !== undefined &&
      (typeof input.snapshotId !== 'string' || input.snapshotId.length === 0)) {
    return invalidResolution(input.calculationIdentity, 'Snapshot selector must not be empty.');
  }

  let candidates: readonly DurableCalculationSnapshot[];
  try {
    candidates = await input.store.findByCalculationIdentity(input.calculationIdentity);
  } catch (error) {
    return {
      ...emptyResolution(input.calculationIdentity, 'UNKNOWN'),
      diagnostic: errorMessage(error),
    };
  }

  const candidateErrors = candidates.flatMap((snapshot) =>
    validateDurableCalculationSnapshot(snapshot),
  );
  if (candidateErrors.length > 0) {
    return {
      ...emptyResolution(input.calculationIdentity, 'INVALID'),
      candidates,
      diagnostic: candidateErrors.join('; '),
    };
  }
  if (candidates.length === 0) {
    return { ...emptyResolution(input.calculationIdentity, 'NOT_FOUND'), candidates };
  }
  if (input.snapshotId === undefined && candidates.length > 1) {
    return { ...emptyResolution(input.calculationIdentity, 'AMBIGUOUS'), candidates };
  }

  const snapshot = input.snapshotId === undefined
    ? candidates[0]
    : candidates.find((candidate) => candidate.snapshotId === input.snapshotId) ?? null;
  if (!snapshot) {
    return { ...emptyResolution(input.calculationIdentity, 'NOT_FOUND'), candidates };
  }
  if (snapshot.calculationIdentity.id !== input.calculationIdentity.id) {
    return { ...emptyResolution(input.calculationIdentity, 'NOT_FOUND'), candidates };
  }

  try {
    const reconstruction = reconstructDurableCalculationSnapshot(snapshot, {
      registry: input.registry,
    });
    return {
      status: 'RESOLVED',
      calculationIdentity: input.calculationIdentity,
      candidates,
      snapshot,
      reconstruction,
    };
  } catch (error) {
    return {
      ...emptyResolution(input.calculationIdentity, 'INVALID'),
      candidates,
      snapshot,
      diagnostic: errorMessage(error),
    };
  }
}

function validateCalculationIdentity(
  identity: EngineeringArtifactIdentity,
): readonly string[] {
  try {
    const errors = validateEngineeringArtifactIdentity(identity);
    return identity.type === 'CALCULATION'
      ? errors
      : [...errors, 'Calculation identity must use the CALCULATION type.'];
  } catch (error) {
    return [errorMessage(error)];
  }
}

function emptyResolution(
  calculationIdentity: EngineeringArtifactIdentity,
  status: HistoricalCalculationEvidenceResolutionStatus,
): HistoricalCalculationEvidenceResolution {
  return {
    status,
    calculationIdentity,
    candidates: [],
    snapshot: null,
    reconstruction: null,
  };
}

function invalidResolution(
  calculationIdentity: EngineeringArtifactIdentity,
  diagnostic: string,
): HistoricalCalculationEvidenceResolution {
  return { ...emptyResolution(calculationIdentity, 'INVALID'), diagnostic };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
