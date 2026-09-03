import type {
  DurableCalculationSnapshot,
  DurableCalculationSnapshotInput,
  EngineeringArtifactIdentity,
} from '@jaryan/shared-domain';

export interface DurableCalculationSnapshotStore {
  readonly append: <TInputs, TOutputs>(
    projectId: string,
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ) => Promise<{
    readonly storageId: string;
    readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs>;
  }>;
  readonly get: <TInputs, TOutputs>(
    projectId: string,
    snapshotId: string,
  ) => Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null>;
  readonly findByCalculationIdentity: (
    projectId: string,
    calculationIdentity: EngineeringArtifactIdentity,
  ) => Promise<readonly DurableCalculationSnapshot[]>;
  readonly update: () => never;
  readonly delete: () => never;
}
