import {
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  historicalEvidenceBinding,
  type DurableCalculationSnapshot,
  type EngineeringKnowledgeRegistry,
  type EngineeringArtifactIdentity,
  type HistoricalEvidenceBinding,
  type SuperAdobeGeometryInputs,
  validateSuperAdobeGeometryInputs,
} from '@jaryan/shared-domain';
import type {
  DurableCalculationSnapshotStore,
} from '@jaryan/shared-infrastructure';
import {
  createEngineeringKnowledgeRegistryFromSnapshot,
} from '@jaryan/shared-infrastructure';
import type { AuthorizedProjectContext } from './runtime-security.ts';
import {
  solveSuperAdobe,
  type SuperAdobeSolverResult,
} from './superadobe-solver.ts';

export interface GovernedSuperAdobeInput extends SuperAdobeGeometryInputs {
  readonly lateralDemandKn?: number;
  readonly overturningMomentKnM?: number;
}

export interface GovernedSnapshotBinding {
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly snapshotId: string;
  readonly outcome: DurableCalculationSnapshot['outcome'];
}

export type GovernedSuperAdobeExecution =
  | {
      readonly status: 'COMPLETED';
      readonly execution: SuperAdobeSolverResult;
      readonly snapshotBindings: readonly GovernedSnapshotBinding[];
    }
  | {
      readonly status: 'INVALID_INPUT';
      readonly errors: readonly string[];
    }
  | {
      readonly status: 'PARTIAL';
      readonly executionId: string;
      readonly snapshotBindings: readonly GovernedSnapshotBinding[];
      readonly diagnostic: string;
    };

export interface HistoricalEvidenceResult {
  readonly status:
    | 'RESOLVED'
    | 'NOT_FOUND'
    | 'AMBIGUOUS'
    | 'INVALID'
    | 'UNKNOWN';
  readonly calculationIdentity: EngineeringArtifactIdentity | null;
  readonly snapshot: DurableCalculationSnapshot | null;
  readonly reconstruction: unknown | null;
  readonly diagnostic?: string;
}

export class GovernedSuperAdobeRuntime {
  private registry: EngineeringKnowledgeRegistry;

  constructor(
    private readonly store: DurableCalculationSnapshotStore,
    registry: EngineeringKnowledgeRegistry = createEngineeringKnowledgeRegistry(),
  ) {
    this.registry = registry;
  }

  async execute(
    context: AuthorizedProjectContext,
    input: GovernedSuperAdobeInput,
  ): Promise<GovernedSuperAdobeExecution> {
    const errors = validateInput(input);
    if (errors.length > 0) {
      return { status: 'INVALID_INPUT', errors };
    }

    const tracked = new TrackingSnapshotStore(this.store);
    try {
      const execution = await solveSuperAdobe({
        projectId: context.projectId,
        inputs: geometryInputs(input),
        ...(input.lateralDemandKn === undefined
          ? {}
          : { lateralDemandKn: input.lateralDemandKn }),
        ...(input.overturningMomentKnM === undefined
          ? {}
          : { overturningMomentKnM: input.overturningMomentKnM }),
        durableSnapshotStore: tracked,
      });
      if (execution === null) {
        return {
          status: 'INVALID_INPUT',
          errors: ['SuperAdobe geometry input is invalid.'],
        };
      }
      this.registry = registerExecutionPackages(this.registry, execution);
      return {
        status: 'COMPLETED',
        execution,
        snapshotBindings: tracked.bindings,
      };
    } catch (error) {
      return {
        status: 'PARTIAL',
        executionId: tracked.executionId ?? 'unknown',
        snapshotBindings: tracked.bindings,
        diagnostic: errorMessage(error),
      };
    }
  }

  async readHistoricalEvidence(
    context: AuthorizedProjectContext,
    input: HistoricalEvidenceBinding,
  ): Promise<HistoricalEvidenceResult> {
    const binding = historicalEvidenceBinding(input);
    const exactSnapshot = await this.store.get(
      context.projectId,
      binding.snapshotId,
    );
    if (
      exactSnapshot === null ||
      exactSnapshot.calculationIdentity.id !== binding.calculationIdentity.id
    ) {
      return {
        status: 'NOT_FOUND',
        calculationIdentity: binding.calculationIdentity,
        snapshot: null,
        reconstruction: null,
      };
    }
    if (!this.registry.contains(binding.calculationIdentity.id)) {
      this.registry = createEngineeringKnowledgeRegistryFromSnapshot(exactSnapshot);
    }

    const resolution = await import('./historical-calculation-evidence-resolution.ts')
      .then(({ resolveHistoricalCalculationEvidence }) =>
        resolveHistoricalCalculationEvidence({
          calculationIdentity: binding.calculationIdentity,
          snapshotId: binding.snapshotId,
          store: this.store,
          registry: this.registry,
          projectId: context.projectId,
        }),
      );
    return {
      status: resolution.status,
      calculationIdentity: resolution.calculationIdentity,
      snapshot: resolution.snapshot,
      reconstruction: resolution.reconstruction,
      ...(resolution.diagnostic === undefined
        ? {}
        : { diagnostic: resolution.diagnostic }),
    };
  }

  async readHistoricalEvidenceByCalculationId(
    context: AuthorizedProjectContext,
    calculationId: string,
    snapshotId: string,
  ): Promise<HistoricalEvidenceResult> {
    if (calculationId.length === 0 || snapshotId.length === 0) {
      return {
        status: 'NOT_FOUND',
        calculationIdentity: null,
        snapshot: null,
        reconstruction: null,
      };
    }
    const snapshot = await this.store.get(context.projectId, snapshotId);
    if (snapshot === null || snapshot.calculationIdentity.id !== calculationId) {
      return {
        status: 'NOT_FOUND',
        calculationIdentity: null,
        snapshot: null,
        reconstruction: null,
      };
    }
    return this.readHistoricalEvidence(context, {
      calculationIdentity: snapshot.calculationIdentity,
      snapshotId,
    });
  }
}

function validateInput(input: GovernedSuperAdobeInput): readonly string[] {
  if (input === null || typeof input !== 'object') {
    return ['SuperAdobe input must be an object.'];
  }
  const errors = validateSuperAdobeGeometryInputs(geometryInputs(input)).map(
    ({ field, message }) => `${String(field)}: ${message}`,
  );
  for (const [field, value] of [
    ['lateralDemandKn', input.lateralDemandKn],
    ['overturningMomentKnM', input.overturningMomentKnM],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      errors.push(`${field} must be a finite non-negative number.`);
    }
  }
  return errors;
}

function geometryInputs(input: GovernedSuperAdobeInput): SuperAdobeGeometryInputs {
  return {
    innerDiameterM: input.innerDiameterM,
    wallThicknessM: input.wallThicknessM,
    bagWidthM: input.bagWidthM,
    rowHeightM: input.rowHeightM,
    domeHeightM: input.domeHeightM,
    geometryType: input.geometryType,
    compactedDensityKgM3: input.compactedDensityKgM3,
  };
}

function registerExecutionPackages(
  registry: EngineeringKnowledgeRegistry,
  execution: SuperAdobeSolverResult,
): EngineeringKnowledgeRegistry {
  return execution.calculations.reduce(
    (current, primitive) => {
      const pkg = createEngineeringKnowledgePackageFromPrimitive(primitive);
      return current.contains(pkg.identity.id) ? current : current.register(pkg);
    },
    registry,
  );
}

class TrackingSnapshotStore implements DurableCalculationSnapshotStore {
  readonly bindings: GovernedSnapshotBinding[] = [];
  executionId: string | undefined;

  constructor(private readonly inner: DurableCalculationSnapshotStore) {}

  async append<TInputs, TOutputs>(
    projectId: string,
    input: import('@jaryan/shared-domain').DurableCalculationSnapshotInput<TInputs, TOutputs>,
  ): Promise<{ readonly storageId: string; readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs> }> {
    const persisted = await this.inner.append(projectId, input);
    this.executionId ??= persisted.snapshot.executionReference;
    this.bindings.push({
      calculationIdentity: persisted.snapshot.calculationIdentity,
      snapshotId: persisted.snapshot.snapshotId,
      outcome: persisted.snapshot.outcome,
    });
    return persisted as {
      readonly storageId: string;
      readonly snapshot: DurableCalculationSnapshot<TInputs, TOutputs>;
    };
  }

  async get<TInputs, TOutputs>(projectId: string, snapshotId: string) {
    return this.inner.get<TInputs, TOutputs>(projectId, snapshotId);
  }

  findByCalculationIdentity(projectId: string, identity: EngineeringArtifactIdentity) {
    return this.inner.findByCalculationIdentity(projectId, identity);
  }

  update(): never {
    return this.inner.update();
  }

  delete(): never {
    return this.inner.delete();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
