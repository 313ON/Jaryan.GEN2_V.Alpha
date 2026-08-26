import { Injectable } from '@nestjs/common';
import {
  createDurableCalculationSnapshot,
  deserializeDurableCalculationSnapshot,
  serializeDurableCalculationSnapshot,
  type EngineeringArtifactIdentity,
  type DurableCalculationSnapshot,
  type DurableCalculationSnapshotInput,
  validateEngineeringArtifactIdentity,
} from '@jaryan/shared-domain';
import { PrismaService } from '../prisma.service.js';
import {
  assertPersistedSnapshotFingerprint,
  type DurableCalculationSnapshotStore,
} from '../../durable-calculation-snapshot-store.ts';

@Injectable()
export class DurableCalculationSnapshotRepository
  implements DurableCalculationSnapshotStore
{
  private readonly prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  async append<TInputs, TOutputs>(
    projectId: string,
    input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ): Promise<{
    readonly storageId: string;
    readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs>;
  }> {
    const snapshot = createDurableCalculationSnapshot(input);
    const row = await this.prisma.durableCalculationSnapshot.create({
      data: {
        projectId,
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
    projectId: string,
    snapshotId: string,
  ): Promise<DurableCalculationSnapshot<TInputs, TOutputs> | null> {
    const row = await this.prisma.durableCalculationSnapshot.findUnique({
      where: { snapshotId },
    });
    if (!row) return null;
    if (row.projectId !== projectId) return null;
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

  async findByCalculationIdentity(
    projectId: string,
    calculationIdentity: EngineeringArtifactIdentity,
  ): Promise<readonly DurableCalculationSnapshot[]> {
    const identityErrors = validateEngineeringArtifactIdentity(calculationIdentity);
    if (identityErrors.length > 0) {
      throw new Error(`Invalid calculation identity: ${identityErrors.join('; ')}`);
    }
    if (calculationIdentity.type !== 'CALCULATION') {
      throw new Error('Calculation identity must use the CALCULATION type.');
    }

    const rows = await this.prisma.durableCalculationSnapshot.findMany({
      where: { projectId },
      orderBy: { snapshotId: 'asc' },
    });
    return rows
      .map((row) => {
        const snapshot = deserializeDurableCalculationSnapshot(String(row.payload));
        try {
          assertPersistedSnapshotFingerprint(row.fingerprint, snapshot.fingerprint);
        } catch {
          throw new Error(
            `Durable calculation snapshot fingerprint mismatch for ${snapshot.snapshotId}.`,
          );
        }
        return snapshot;
      })
      .filter((snapshot) => snapshot.calculationIdentity.id === calculationIdentity.id);
  }

  update(): never {
    throw new Error('Durable calculation snapshots are immutable: update is not supported.');
  }

  delete(): never {
    throw new Error('Durable calculation snapshots are immutable: delete is not supported.');
  }
}
