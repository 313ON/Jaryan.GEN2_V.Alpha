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
    projectId: string,
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ) => Promise<{ readonly storageId: string; readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs> }>;
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

export class InMemoryDurableCalculationSnapshotStore
  implements DurableCalculationSnapshotStore
{
  private readonly records: {
    readonly projectId: string;
    readonly snapshotId: string;
    readonly storageId: string;
    readonly serialized: string;
  }[] = [];

  async append<TInputs, TOutputs>(
    projectId: string,
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ): Promise<{ readonly storageId: string; readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs> }> {
    assertProjectId(projectId);
    const snapshot = createDurableCalculationSnapshot(input);
    const storageId = `storage-${this.records.length + 1}`;
    this.records.push({
      projectId,
      snapshotId: snapshot.snapshotId,
      storageId,
      serialized: serializeDurableCalculationSnapshot(snapshot),
    });
    return { storageId, snapshot };
  }

  async get<TInputs, TOutputs>(
    projectId: string,
    snapshotId: string,
  ): Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null> {
    assertProjectId(projectId);
    const record = this.records.find(
      (entry) => entry.projectId === projectId && entry.snapshotId === snapshotId,
    );
    if (!record) return null;
    return deserializeDurableCalculationSnapshot(record.serialized) as DurableCalculationSnapshot<
      TInputs,
      TOutputs
    >;
  }

  async findByCalculationIdentity(
    projectId: string,
    calculationIdentity: EngineeringArtifactIdentity,
  ): Promise<readonly DurableCalculationSnapshot[]> {
    assertProjectId(projectId);
    assertCalculationIdentity(calculationIdentity);
    const snapshots = this.records
      .map((record) => deserializeDurableCalculationSnapshot(record.serialized))
      .filter((snapshot, index) => this.records[index].projectId === projectId)
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

function assertProjectId(projectId: string): void {
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Project id must be a non-empty string.');
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
