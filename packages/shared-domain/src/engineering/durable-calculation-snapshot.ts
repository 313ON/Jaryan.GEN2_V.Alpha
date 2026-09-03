import {
  contentFingerprint,
  stableSerialize,
} from './content-fingerprint.ts';
import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';
import type {
  EngineeringKnowledgePackageProvenanceInput,
} from './engineering-knowledge-package.ts';
import type { EngineeringKnowledgeRegistry } from './knowledge-package-registry.ts';
import type { ResolvedEngineeringKnowledgeGraph } from './knowledge-graph.ts';
import {
  engineeringKnowledgePackageChainEdges,
} from './engineering-knowledge-package.ts';
import {
  resolveEngineeringArtifactReference,
  resolveEngineeringKnowledgeGraph,
} from './knowledge-graph.ts';
import type { EngineeringArtifactResolutionStatus } from './knowledge-graph.ts';
import type { EngineeringDependencyGraph } from './dependency-graph.ts';
import { isEngineeringDependencyGraphAcyclic } from './dependency-graph.ts';

export const DURABLE_CALCULATION_SNAPSHOT_FORMAT_VERSION = '1';

export interface DurableCalculationBinding {
  readonly reference: string;
  readonly resultAffecting: boolean;
  readonly resolution: EngineeringArtifactResolutionStatus;
  readonly identity?: EngineeringArtifactIdentity;
  readonly diagnostic?: string;
}

export interface DurableCalculationSnapshot<TInputs = unknown, TOutputs = unknown> {
  readonly formatVersion: string;
  readonly snapshotId: string;
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly executionReference: string;
  readonly outcome: 'COMPLETED' | 'FAILED';
  readonly algorithmVersion: string;
  readonly fingerprint: string;
  readonly method: string;
  readonly formula: string;
  readonly inputs: TInputs;
  readonly effectiveAssumptions: readonly unknown[];
  readonly knowledgeBindings: readonly DurableCalculationBinding[];
  /**
   * Existing governed provenance structure. This is intentionally the
   * RESULT -> CALCULATION -> PRIMITIVE -> SOURCE identity chain, not a
   * persistence-local graph.
   */
  readonly provenanceBindings: EngineeringKnowledgePackageProvenanceInput;
  readonly provenanceGraph: EngineeringDependencyGraph;
  readonly completedOutputs: TOutputs | null;
  readonly failedDiagnostics: readonly unknown[];
  readonly projectContext?: Readonly<Record<string, unknown>>;
  readonly chronology?: Readonly<Record<string, unknown>>;
}

export interface DurableCalculationSnapshotInput<TInputs = unknown, TOutputs = unknown> {
  readonly snapshotId: string;
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly executionReference: string;
  readonly outcome: 'COMPLETED' | 'FAILED';
  readonly algorithmVersion: string;
  readonly method: string;
  readonly formula: string;
  readonly inputs: TInputs;
  readonly effectiveAssumptions: readonly unknown[];
  readonly knowledgeBindings: readonly DurableCalculationBinding[];
  readonly provenanceBindings: EngineeringKnowledgePackageProvenanceInput;
  readonly provenanceGraph: EngineeringDependencyGraph;
  readonly completedOutputs?: TOutputs | null;
  readonly failedDiagnostics?: readonly unknown[];
  readonly projectContext?: Readonly<Record<string, unknown>>;
  readonly chronology?: Readonly<Record<string, unknown>>;
}

export interface DurableSnapshotReconstruction {
  readonly snapshotId: string;
  readonly outcome: 'COMPLETED' | 'FAILED';
  readonly bindings: readonly DurableCalculationBinding[];
  readonly provenance: EngineeringKnowledgePackageProvenanceInput;
  readonly outputs: unknown | null;
  readonly diagnostics: readonly unknown[];
}

export type DurableSnapshotResolutionStatus =
  | 'NOT_FOUND'
  | 'AMBIGUOUS'
  | 'INVALID'
  | 'UNKNOWN';

export interface DurableCalculationSnapshotReconstructionContext {
  readonly registry: EngineeringKnowledgeRegistry;
  readonly graph?: ResolvedEngineeringKnowledgeGraph;
}

export class DurableCalculationSnapshotError extends Error {
  readonly code = 'DURABLE_CALCULATION_SNAPSHOT_INVALID';
  readonly resolutionStatus: DurableSnapshotResolutionStatus;

  constructor(
    message: string,
    resolutionStatus: DurableSnapshotResolutionStatus = 'INVALID',
  ) {
    super(message);
    this.name = 'DurableCalculationSnapshotError';
    this.resolutionStatus = resolutionStatus;
  }
}

export function durableCalculationSnapshotFingerprint(
  input: Pick<
    DurableCalculationSnapshotInput,
    | 'calculationIdentity'
    | 'outcome'
    | 'algorithmVersion'
    | 'method'
    | 'formula'
    | 'inputs'
    | 'effectiveAssumptions'
    | 'knowledgeBindings'
    | 'provenanceBindings'
    | 'provenanceGraph'
    | 'completedOutputs'
    | 'failedDiagnostics'
  >,
): string {
  return contentFingerprint({
    kind: 'DURABLE_CALCULATION_SNAPSHOT',
    formatVersion: DURABLE_CALCULATION_SNAPSHOT_FORMAT_VERSION,
    calculationIdentity: input.calculationIdentity,
    outcome: input.outcome,
    algorithmVersion: input.algorithmVersion,
    method: input.method,
    formula: input.formula,
    inputs: input.inputs,
    effectiveAssumptions: input.effectiveAssumptions,
    knowledgeBindings: input.knowledgeBindings,
    provenanceBindings: input.provenanceBindings,
    provenanceGraph: input.provenanceGraph,
    completedOutputs:
      input.outcome === 'COMPLETED' ? input.completedOutputs : null,
    failedDiagnostics:
      input.outcome === 'FAILED' ? input.failedDiagnostics ?? [] : [],
  });
}

export function createDurableCalculationSnapshot<TInputs, TOutputs>(
  input: DurableCalculationSnapshotInput<TInputs, TOutputs>,
): DurableCalculationSnapshot<TInputs, TOutputs> {
  validateSnapshotInput(input);
  const snapshot = {
    formatVersion: DURABLE_CALCULATION_SNAPSHOT_FORMAT_VERSION,
    ...cloneValue(input),
    completedOutputs: input.outcome === 'COMPLETED' ? cloneValue(input.completedOutputs) : null,
    failedDiagnostics: input.outcome === 'FAILED' ? cloneValue(input.failedDiagnostics ?? []) : [],
    fingerprint: durableCalculationSnapshotFingerprint(input),
  } as DurableCalculationSnapshot<TInputs, TOutputs>;
  const errors = validateDurableCalculationSnapshot(snapshot);
  if (errors.length > 0) {
    throw new DurableCalculationSnapshotError(
      `Invalid durable calculation snapshot: ${errors.join('; ')}`,
    );
  }
  return deepFreeze(snapshot);
}

export function serializeDurableCalculationSnapshot(
  snapshot: DurableCalculationSnapshot,
): string {
  const errors = validateDurableCalculationSnapshot(snapshot);
  if (errors.length > 0) {
    throw new DurableCalculationSnapshotError(errors.join('; '));
  }
  return stableSerialize(encodeSpecialValues(snapshot));
}

export function deserializeDurableCalculationSnapshot(
  serialized: string,
): DurableCalculationSnapshot {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    const snapshot = decodeSpecialValues(parsed) as DurableCalculationSnapshot;
    const errors = validateDurableCalculationSnapshot(snapshot);
    if (errors.length > 0) {
      throw new DurableCalculationSnapshotError(errors.join('; '));
    }
    return deepFreeze(snapshot);
  } catch (error) {
    if (error instanceof DurableCalculationSnapshotError) throw error;
    throw new DurableCalculationSnapshotError(
      `Invalid serialized durable calculation snapshot: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    );
  }
}

export function validateDurableCalculationSnapshot(
  snapshot: DurableCalculationSnapshot,
): readonly string[] {
  const errors: string[] = [];
  if (!isRecord(snapshot)) return ['Snapshot must be an object.'];
  if (snapshot.formatVersion !== DURABLE_CALCULATION_SNAPSHOT_FORMAT_VERSION) {
    errors.push('Unsupported durable calculation snapshot format version.');
  }
  if (!nonEmptyString(snapshot.snapshotId) || !nonEmptyString(snapshot.executionReference)) {
    errors.push('Snapshot and execution identities must not be empty.');
  }
  errors.push(
    ...validateEngineeringArtifactIdentity(snapshot.calculationIdentity).map(
      (error) => `Calculation identity is invalid: ${error}`,
    ),
  );
  if (snapshot.calculationIdentity?.type !== 'CALCULATION') {
    errors.push('Snapshot must use a CALCULATION engineering identity.');
  }
  if (!nonEmptyString(snapshot.algorithmVersion)) errors.push('Algorithm version is mandatory.');
  if (!nonEmptyString(snapshot.method)) errors.push('Method is mandatory.');
  if (!nonEmptyString(snapshot.formula)) errors.push('Formula is mandatory.');
  if (snapshot.outcome !== 'COMPLETED' && snapshot.outcome !== 'FAILED') {
    errors.push('Snapshot outcome must be COMPLETED or FAILED.');
  }
  if (!Array.isArray(snapshot.knowledgeBindings)) {
    errors.push('Knowledge bindings must be an array.');
  } else {
    errors.push(...validateBindings(snapshot.knowledgeBindings));
  }
  errors.push(...validateProvenance(snapshot.provenanceBindings, snapshot.provenanceGraph));
  if (
    snapshot.provenanceBindings?.calculation?.id &&
    snapshot.provenanceBindings.calculation.id !== snapshot.calculationIdentity?.id
  ) {
    errors.push('Snapshot calculation identity must match provenance calculation identity.');
  }
  if (snapshot.outcome === 'COMPLETED') {
    if (snapshot.completedOutputs === null || snapshot.completedOutputs === undefined) {
      errors.push('Completed snapshots require non-null outputs.');
    }
    if (!Array.isArray(snapshot.failedDiagnostics) || snapshot.failedDiagnostics.length > 0) {
      errors.push('Completed snapshots cannot carry failed diagnostics.');
    }
  }
  if (snapshot.outcome === 'FAILED') {
    if (snapshot.completedOutputs !== null && snapshot.completedOutputs !== undefined) {
      errors.push('Failed snapshots cannot carry authoritative outputs.');
    }
    if (!Array.isArray(snapshot.failedDiagnostics)) {
      errors.push('Failed snapshots must preserve diagnostics as an array.');
    }
  }
  if (snapshot.fingerprint !== durableCalculationSnapshotFingerprint(snapshot)) {
    errors.push('Snapshot fingerprint does not match its content.');
  }
  return errors;
}

export function reconstructDurableCalculationSnapshot(
  snapshot: DurableCalculationSnapshot,
  context: DurableCalculationSnapshotReconstructionContext,
): DurableSnapshotReconstruction {
  const validationErrors = validateDurableCalculationSnapshot(snapshot);
  if (validationErrors.length > 0) {
    throw new DurableCalculationSnapshotError(validationErrors.join('; '));
  }

  const graph = context.graph ?? resolveEngineeringKnowledgeGraph(context.registry);
  const bindings = snapshot.knowledgeBindings.map((binding) => {
    if (binding.resolution !== 'RESOLVED') {
      if (binding.resultAffecting) {
        throw new DurableCalculationSnapshotError(
          `Reconstruction blocked by unresolved calculation-relevant binding: ${binding.reference}.`,
          resolutionStatusOfBinding(binding),
        );
      }
      return binding;
    }
    return resolvePinnedBinding(context.registry, binding);
  });

  const provenance = snapshot.provenanceBindings;
  for (const identity of [
    provenance.result,
    provenance.calculation,
    provenance.primitive,
    ...provenance.sources,
  ]) {
    resolvePinnedIdentity(context.registry, identity);
  }
  const expectedEdges = engineeringKnowledgePackageChainEdges({
    result: provenance.result,
    calculation: provenance.calculation,
    primitive: provenance.primitive,
    sources: provenance.sources,
  });
  for (const edge of expectedEdges) {
    const graphEdge = graph.edges.find(
      (candidate) => candidate.fromId === edge.fromId && candidate.toId === edge.toId,
    );
    if (!graphEdge || !graphEdge.resolved) {
      throw new DurableCalculationSnapshotError(
        `Reconstruction blocked by unresolved provenance edge: ${edge.fromId} -> ${edge.toId}.`,
      );
    }
  }
  return {
    snapshotId: snapshot.snapshotId,
    outcome: snapshot.outcome,
    bindings: Object.freeze(bindings),
    provenance,
    outputs: snapshot.completedOutputs,
    diagnostics: snapshot.failedDiagnostics,
  };
}

function resolvePinnedBinding(
  registry: EngineeringKnowledgeRegistry,
  binding: DurableCalculationBinding,
): DurableCalculationBinding {
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: binding.reference,
  });
  if (resolution.status !== 'RESOLVED' || resolution.identityId !== binding.reference) {
    throw new DurableCalculationSnapshotError(
      `Pinned binding did not resolve exactly: ${binding.reference}.`,
      resolutionStatusOfArtifactResolution(resolution.status),
    );
  }
  if (binding.identity && binding.identity.id !== binding.reference) {
    throw new DurableCalculationSnapshotError(
      `Binding identity does not match its pinned reference: ${binding.reference}.`,
    );
  }
  return {
    ...binding,
    resolution: 'RESOLVED',
    identity: binding.identity ?? resolution.candidates[0],
  };
}

function resolvePinnedIdentity(
  registry: EngineeringKnowledgeRegistry,
  identity: EngineeringArtifactIdentity,
): void {
  const errors = validateEngineeringArtifactIdentity(identity);
  if (errors.length > 0) {
    throw new DurableCalculationSnapshotError(errors.join('; '));
  }
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identity',
    identity,
  });
  if (resolution.status !== 'RESOLVED' || resolution.identityId !== identity.id) {
    throw new DurableCalculationSnapshotError(
      `Pinned provenance identity did not resolve exactly: ${identity.id}.`,
      resolutionStatusOfArtifactResolution(resolution.status),
    );
  }
}

function resolutionStatusOfBinding(
  binding: DurableCalculationBinding,
): DurableSnapshotResolutionStatus {
  return binding.resolution === 'NOT_FOUND' ||
    binding.resolution === 'AMBIGUOUS' ||
    binding.resolution === 'INVALID'
    ? binding.resolution
    : 'UNKNOWN';
}

function resolutionStatusOfArtifactResolution(
  status: EngineeringArtifactResolutionStatus,
): DurableSnapshotResolutionStatus {
  return status === 'NOT_FOUND' || status === 'AMBIGUOUS' || status === 'INVALID'
    ? status
    : 'UNKNOWN';
}

function validateBindings(bindings: readonly DurableCalculationBinding[]): readonly string[] {
  const errors: string[] = [];
  for (const binding of bindings) {
    if (!nonEmptyString(binding.reference)) errors.push('Binding reference must not be empty.');
    if (!['RESOLVED', 'AMBIGUOUS', 'NOT_FOUND', 'INVALID'].includes(binding.resolution)) {
      errors.push(`Invalid binding resolution: ${String(binding.resolution)}.`);
    }
    if (binding.resolution === 'RESOLVED' && !binding.identity) {
      errors.push(`Resolved binding ${binding.reference} must carry its identity.`);
    }
    if (binding.identity) {
      errors.push(...validateEngineeringArtifactIdentity(binding.identity));
      if (binding.identity.id !== binding.reference) {
        errors.push(`Binding identity must match reference ${binding.reference}.`);
      }
    }
  }
  return errors;
}

function validateProvenance(
  provenance: EngineeringKnowledgePackageProvenanceInput,
  graph: EngineeringDependencyGraph,
): readonly string[] {
  const errors: string[] = [];
  if (!provenance || !Array.isArray(provenance.sources)) {
    return ['Provenance bindings must preserve the governed provenance chain.'];
  }
  for (const [label, identity] of [
    ['result', provenance.result],
    ['calculation', provenance.calculation],
    ['primitive', provenance.primitive],
    ...provenance.sources.map((source) => ['source', source] as const),
  ] as const) {
    errors.push(...validateEngineeringArtifactIdentity(identity).map((error) => `Provenance ${label}: ${error}`));
  }
  if (provenance.result.type !== 'RESULT') errors.push('Provenance result must be a RESULT identity.');
  if (provenance.calculation.type !== 'CALCULATION') errors.push('Provenance calculation must be a CALCULATION identity.');
  if (provenance.primitive.type !== 'PRIMITIVE') errors.push('Provenance primitive must be a PRIMITIVE identity.');
  if (provenance.sources.some((source) => source.type !== 'SOURCE')) errors.push('Provenance sources must be SOURCE identities.');
  if (provenance.result.id === provenance.calculation.id ||
      provenance.result.id === provenance.primitive.id ||
      provenance.calculation.id === provenance.primitive.id) {
    errors.push('Provenance endpoints must remain distinct.');
  }
  const expectedEdges = engineeringKnowledgePackageChainEdges({
    result: provenance.result,
    calculation: provenance.calculation,
    primitive: provenance.primitive,
    sources: provenance.sources,
  });
  for (const edge of expectedEdges) {
    if (!graph.edges.some((candidate) => candidate.fromId === edge.fromId && candidate.toId === edge.toId)) {
      errors.push(`Provenance graph is missing edge ${edge.fromId} -> ${edge.toId}.`);
    }
  }
  if (!isEngineeringDependencyGraphAcyclic(graph)) errors.push('Provenance graph must be acyclic.');
  return errors;
}

function cloneValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new DurableCalculationSnapshotError('Snapshot values must not be circular.');
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => cloneValue(item, seen)) as T;
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(value as object)) clone[key] = cloneValue((value as Record<string, unknown>)[key], seen);
  seen.delete(value);
  return clone as T;
}

function encodeSpecialValues(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return { __durableSnapshotNumber: 'NaN' };
    if (Object.is(value, -0)) return { __durableSnapshotNumber: '-0' };
    return value;
  }
  if (value === undefined) return { __durableSnapshotUndefined: true };
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new DurableCalculationSnapshotError('Snapshot values must not be circular.');
  seen.add(value);
  if (Array.isArray(value)) {
    const encoded = value.map((item) => encodeSpecialValues(item, seen));
    seen.delete(value);
    return encoded;
  }
  const encoded = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeSpecialValues(item, seen)]));
  seen.delete(value);
  return encoded;
}

function decodeSpecialValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeSpecialValues);
  if (!isRecord(value)) return value;
  if (value.__durableSnapshotNumber === 'NaN') return Number.NaN;
  if (value.__durableSnapshotNumber === '-0') return -0;
  if (value.__durableSnapshotUndefined === true) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeSpecialValues(item)]));
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function validateSnapshotInput(input: DurableCalculationSnapshotInput): void {
  if (input.outcome !== 'COMPLETED' && input.outcome !== 'FAILED') {
    throw new DurableCalculationSnapshotError('Snapshot outcome must be COMPLETED or FAILED.');
  }
  if (input.outcome === 'COMPLETED' && (input.completedOutputs === null || input.completedOutputs === undefined)) {
    throw new DurableCalculationSnapshotError('Completed snapshots require non-null outputs.');
  }
  if (input.outcome === 'FAILED' && input.completedOutputs !== undefined && input.completedOutputs !== null) {
    throw new DurableCalculationSnapshotError('Failed snapshots cannot carry authoritative outputs.');
  }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  return value;
}
