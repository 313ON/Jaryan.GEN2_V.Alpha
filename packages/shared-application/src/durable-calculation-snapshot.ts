import {
  createDurableCalculationSnapshot,
  createEngineeringKnowledgePackageFromPrimitive,
  type EngineeringKnowledgePackage,
  type PrimitiveResult,
  type DurableCalculationSnapshot,
  type DurableCalculationSnapshotInput,
} from '@jaryan/shared-domain';
import type { DurableCalculationSnapshotStore } from '@jaryan/shared-infrastructure';

/**
 * Application boundary for an execution that has already passed the
 * calculation/knowledge/provenance governance owned by existing contracts.
 * This type coordinates capture; it does not create a new authority.
 */
export type GovernedCalculationExecution<TInputs = unknown, TOutputs = unknown> =
  DurableCalculationSnapshotInput<TInputs, TOutputs>;

export function createDurableSnapshotFromExecution<TInputs, TOutputs>(
  execution: GovernedCalculationExecution<TInputs, TOutputs>,
): DurableCalculationSnapshot<TInputs, TOutputs> {
  return createDurableCalculationSnapshot(execution);
}

/**
 * Captures an already-created governed knowledge package at the application
 * boundary. The package remains the authority for definition, result,
 * provenance, and dependency graph content.
 */
export function createDurableSnapshotFromGovernedPackage(
  pkg: EngineeringKnowledgePackage,
  input: Omit<
    DurableCalculationSnapshotInput,
    | 'calculationIdentity'
    | 'method'
    | 'formula'
    | 'inputs'
    | 'effectiveAssumptions'
    | 'knowledgeBindings'
    | 'provenanceBindings'
    | 'provenanceGraph'
    | 'completedOutputs'
  >,
): DurableCalculationSnapshot {
  return createDurableCalculationSnapshot({
    ...input,
    calculationIdentity: pkg.definition.calculationIdentity,
    method: pkg.definition.method,
    formula: pkg.definition.formula,
    inputs: pkg.inputs,
    effectiveAssumptions: pkg.definition.assumptions,
    knowledgeBindings: [{
      reference: pkg.definition.calculationIdentity.id,
      resultAffecting: true,
      resolution: 'RESOLVED',
      identity: pkg.definition.calculationIdentity,
    }],
    provenanceBindings: pkg.provenance,
    provenanceGraph: pkg.dependencies,
    completedOutputs: pkg.result,
  });
}

/**
 * Captures one result produced by the governed primitive calculation path.
 * Identity, definition normalization, result content, provenance, and graph
 * structure remain owned by the existing knowledge-package authority.
 */
export function createDurableSnapshotFromPrimitiveExecution(
  primitive: PrimitiveResult,
  input: {
    readonly snapshotId: string;
    readonly executionReference: string;
    readonly algorithmVersion?: string;
    readonly projectContext?: Readonly<Record<string, unknown>>;
    readonly chronology?: Readonly<Record<string, unknown>>;
    readonly packageVersion?: string;
  },
): DurableCalculationSnapshot {
  const packageVersion = input.packageVersion ?? '1';
  const pkg = createEngineeringKnowledgePackageFromPrimitive(primitive, {
    version: packageVersion,
  });
  const outcome = primitive.status === 'FAIL' ? 'FAILED' : 'COMPLETED';

  return createDurableCalculationSnapshot({
    snapshotId: input.snapshotId,
    executionReference: input.executionReference,
    outcome,
    algorithmVersion: input.algorithmVersion ?? packageVersion,
    calculationIdentity: pkg.definition.calculationIdentity,
    method: pkg.definition.method,
    formula: pkg.definition.formula,
    inputs: pkg.inputs,
    effectiveAssumptions: pkg.definition.assumptions,
    knowledgeBindings: [{
      reference: pkg.definition.calculationIdentity.id,
      resultAffecting: true,
      resolution: 'RESOLVED',
      identity: pkg.definition.calculationIdentity,
    }],
    provenanceBindings: pkg.provenance,
    provenanceGraph: pkg.dependencies,
    ...(outcome === 'COMPLETED'
      ? { completedOutputs: pkg.result }
      : {
          completedOutputs: null,
          failedDiagnostics: [{
            code: 'GOVERNED_PRIMITIVE_FAILED',
            calculationId: primitive.calculationId,
            status: primitive.status,
          }],
        }),
    ...(input.projectContext === undefined
      ? {}
      : { projectContext: input.projectContext }),
    ...(input.chronology === undefined
      ? {}
      : { chronology: input.chronology }),
  });
}

export async function captureDurableSnapshotsFromPrimitiveExecution(
  primitives: readonly PrimitiveResult[],
  input: {
    readonly projectId: string;
    readonly executionReference: string;
    readonly snapshotIdPrefix: string;
    readonly projectContext?: Readonly<Record<string, unknown>>;
    readonly chronology?: Readonly<Record<string, unknown>>;
    readonly algorithmVersion?: string;
    readonly packageVersion?: string;
    readonly store: DurableCalculationSnapshotStore;
  },
): Promise<readonly DurableCalculationSnapshot[]> {
  const captured: DurableCalculationSnapshot[] = [];
  for (const [index, primitive] of primitives.entries()) {
    const snapshot = createDurableSnapshotFromPrimitiveExecution(primitive, {
      snapshotId: `${input.snapshotIdPrefix}:${index}:${primitive.calculationId}`,
      executionReference: input.executionReference,
      ...(input.projectContext === undefined
        ? {}
        : { projectContext: input.projectContext }),
      ...(input.chronology === undefined
        ? {}
        : { chronology: input.chronology }),
      ...(input.algorithmVersion === undefined
        ? {}
        : { algorithmVersion: input.algorithmVersion }),
      ...(input.packageVersion === undefined
        ? {}
        : { packageVersion: input.packageVersion }),
    });
    const persisted = await input.store.append(input.projectId, snapshot);
    captured.push(persisted.snapshot);
  }
  return Object.freeze(captured);
}
