import {
  createDurableCalculationSnapshot,
  deserializeDurableCalculationSnapshot,
  serializeDurableCalculationSnapshot,
  type DurableCalculationSnapshot,
  type DurableCalculationSnapshotInput,
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

  update(): never {
    throw new Error('Durable calculation snapshots are immutable: update is not supported.');
  }

  delete(): never {
    throw new Error('Durable calculation snapshots are immutable: delete is not supported.');
  }
}
