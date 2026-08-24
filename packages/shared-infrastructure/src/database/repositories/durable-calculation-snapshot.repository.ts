import { Injectable } from '@nestjs/common';
import {
  createDurableCalculationSnapshot,
  deserializeDurableCalculationSnapshot,
  serializeDurableCalculationSnapshot,
  type DurableCalculationSnapshot,
  type DurableCalculationSnapshotInput,
} from '@jaryan/shared-domain';
import { PrismaService } from '../prisma.service';
import { assertPersistedSnapshotFingerprint } from '../../durable-calculation-snapshot-store.ts';

@Injectable()
export class DurableCalculationSnapshotRepository {
  private readonly prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async append<TInputs, TOutputs>(
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ): Promise<{
    readonly storageId: string;
    readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs>;
  }> {
    const snapshot = createDurableCalculationSnapshot(input);
    const row = await this.prisma.durableCalculationSnapshot.create({
      data: {
        snapshotId: snapshot.snapshotId,
        fingerprint: snapshot.fingerprint,
        payload: serializeDurableCalculationSnapshot(snapshot),
      },
    });
    return {
      storageId: row.storageId,
      snapshot,
    };
  }

  async get<TInputs, TOutputs>(
    snapshotId: string,
  ): Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null> {
    const row = await this.prisma.durableCalculationSnapshot.findUnique({
      where: { snapshotId },
    });
    if (!row) return null;
    const snapshot = deserializeDurableCalculationSnapshot(String(row.payload)) as DurableCalculationSnapshot<
      TInputs,
      TOutputs
    >;
    try {
      assertPersistedSnapshotFingerprint(row.fingerprint, snapshot.fingerprint);
    } catch {
      throw new Error(
        `Durable calculation snapshot fingerprint mismatch for ${snapshotId}.`,
      );
    }
    return snapshot;
  }

  update(): never {
    throw new Error('Durable calculation snapshots are immutable: update is not supported.');
  }

  delete(): never {
    throw new Error('Durable calculation snapshots are immutable: delete is not supported.');
  }
}
