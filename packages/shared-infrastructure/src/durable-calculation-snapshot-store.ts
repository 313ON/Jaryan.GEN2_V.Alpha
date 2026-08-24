import {
  createDurableCalculationSnapshot,
  deserializeDurableCalculationSnapshot,
  serializeDurableCalculationSnapshot,
  type EngineeringArtifactIdentity,
  type DurableCalculationSnapshot,
  type DurableCalculationSnapshotInput,
  validateEngineeringArtifactIdentity,
} from '@jaryan/shared-domain';

export function assertPersistedSnapshotFingerprint(
  persistedFingerprint: string,
  snapshotFingerprint: string,
): void {
  if (persistedFingerprint !== snapshotFingerprint) {
    throw new Error('Durable calculation snapshot fingerprint mismatch.');
  }
}

export interface DurableCalculationSnapshotStore {
  readonly append: <TInputs, TOutputs>(
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ) => Promise<{ readonly storageId: string; readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs> }>;
  readonly get: <TInputs, TOutputs>(
    snapshotId: string,
  ) => Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null>;
  readonly findByCalculationIdentity: (
    calculationIdentity: EngineeringArtifactIdentity,
  ) => Promise<readonly DurableCalculationSnapshot[]>;
  readonly update: () => never;
  readonly delete: () => never;
}

export class InMemoryDurableCalculationSnapshotStore
  implements DurableCalculationSnapshotStore
{
  private readonly records: {
    readonly snapshotId: string;
    readonly storageId: string;
    readonly serialized: string;
  }[] = [];

  async append<TInputs, TOutputs>(
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ): Promise<{ readonly storageId: string; readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs> }> {
    const snapshot = createDurableCalculationSnapshot(input);
    const storageId = `storage-${this.records.length + 1}`;
    this.records.push({
      snapshotId: snapshot.snapshotId,
      storageId,
      serialized: serializeDurableCalculationSnapshot(snapshot),
    });
    return { storageId, snapshot };
  }

  async get<TInputs, TOutputs>(
    snapshotId: string,
  ): Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null> {
    const record = this.records.find((entry) => entry.snapshotId === snapshotId);
    if (!record) return null;
    return deserializeDurableCalculationSnapshot(record.serialized) as DurableCalculationSnapshot<
      TInputs,
      TOutputs
    >;
  }

  async findByCalculationIdentity(
    calculationIdentity: EngineeringArtifactIdentity,
  ): Promise<readonly DurableCalculationSnapshot[]> {
    assertCalculationIdentity(calculationIdentity);
    const snapshots = this.records
      .map((record) => deserializeDurableCalculationSnapshot(record.serialized))
      .filter((snapshot) => snapshot.calculationIdentity.id === calculationIdentity.id)
      .sort((left, right) => left.snapshotId.localeCompare(right.snapshotId));
    return Object.freeze(snapshots);
  }

  update(): never {
    throw new Error('Durable calculation snapshots are immutable: update is not supported.');
  }

  delete(): never {
    throw new Error('Durable calculation snapshots are immutable: delete is not supported.');
  }
}

function assertCalculationIdentity(
  identity: EngineeringArtifactIdentity,
): void {
  const errors = validateEngineeringArtifactIdentity(identity);
  if (errors.length > 0) {
    throw new Error(`Invalid calculation identity: ${errors.join('; ')}`);
  }
  if (identity.type !== 'CALCULATION') {
    throw new Error('Calculation identity must use the CALCULATION type.');
  }
}
