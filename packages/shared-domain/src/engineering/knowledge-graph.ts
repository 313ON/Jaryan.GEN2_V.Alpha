import {
  ENGINEERING_ARTIFACT_TYPE_PREFIXES,
  ENGINEERING_ARTIFACT_VERSION_PATTERN,
  type EngineeringArtifactIdentity,
  type EngineeringArtifactType,
  engineeringArtifactVersionOf,
} from './artifact-identity.ts';
import { contentFingerprint } from './content-fingerprint.ts';
import {
  ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  type EngineeringDependencyGraph,
  isEngineeringDependencyGraphAcyclic,
} from './dependency-graph.ts';
import { type EngineeringImpactNode, analyzeDirectImpact } from './impact-analysis.ts';
import type { EngineeringKnowledgePackage } from './engineering-knowledge-package.ts';
import type { EngineeringKnowledgeRegistry } from './knowledge-package-registry.ts';

export const ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION = '1';

const ENGINEERING_ARTIFACT_BASE_ID_PATTERN =
  /^(RESULT|CALC|PRIM|SRC|BENCH)-[A-Z][A-Z0-9]*-[A-Z][A-Z0-9-]*-\d{3}$/;

const ARTIFACT_TYPE_BY_PREFIX = Object.fromEntries(
  Object.entries(ENGINEERING_ARTIFACT_TYPE_PREFIXES).map(([type, prefix]) => [
    prefix,
    type,
  ]),
) as Readonly<Record<string, EngineeringArtifactType>>;

export type EngineeringArtifactResolutionStatus =
  | 'RESOLVED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID';

/**
 * A resolvable reference to an engineering artifact:
 * - `identityId`: a versioned identity id (e.g. `RESULT-SA-STRESS-001-v1`).
 * - `identity`: a full artifact identity, resolved by its versioned id.
 * - `baseId`: a stable artifact series, optionally pinned to a version.
 *   Without a version, a single candidate resolves while multiple
 *   candidates are reported as `AMBIGUOUS` (never a silent "latest").
 */
export type EngineeringArtifactReference =
  | { readonly kind: 'identityId'; readonly identityId: string }
  | { readonly kind: 'identity'; readonly identity: EngineeringArtifactIdentity }
  | { readonly kind: 'baseId'; readonly baseId: string; readonly version?: string };

export interface EngineeringArtifactResolution {
  readonly reference: EngineeringArtifactReference;
  readonly status: EngineeringArtifactResolutionStatus;
  readonly baseId: string | null;
  readonly artifactType: EngineeringArtifactType | null;
  readonly identityId: string | null;
  readonly owningPackageIds: readonly string[];
  readonly candidates: readonly EngineeringArtifactIdentity[];
}

export interface ResolvedEngineeringGraphNode {
  readonly id: string;
  readonly baseId: string | null;
  readonly artifactType: EngineeringArtifactType | null;
  readonly resolution: EngineeringArtifactResolutionStatus;
  readonly owningPackageIds: readonly string[];
}

export interface ResolvedEngineeringGraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly fromStatus: EngineeringArtifactResolutionStatus;
  readonly toStatus: EngineeringArtifactResolutionStatus;
  readonly resolved: boolean;
}

export interface ResolvedEngineeringKnowledgeGraph {
  readonly formatVersion: string;
  readonly nodes: readonly ResolvedEngineeringGraphNode[];
  readonly edges: readonly ResolvedEngineeringGraphEdge[];
  readonly acyclic: boolean;
  /** True when any edge references an unresolved artifact (an open graph). */
  readonly open: boolean;
  readonly selfDependencies: readonly { readonly fromId: string; readonly toId: string }[];
  readonly fingerprint: string;
}

export interface RegisteredEngineeringImpact {
  readonly targetId: string;
  readonly target: EngineeringArtifactResolution;
  readonly direct: readonly EngineeringImpactNode[];
  readonly affectedArtifactIds: readonly string[];
  readonly transitive: readonly EngineeringImpactNode[];
  readonly transitiveAffectedArtifactIds: readonly string[];
  /** True when the target is unresolved or an impacted edge is unresolved. */
  readonly open: boolean;
}

interface ArtifactOwnership {
  readonly identity: EngineeringArtifactIdentity;
  readonly package: EngineeringKnowledgePackage;
}

interface OwnershipIndex {
  readonly byArtifactId: ReadonlyMap<string, readonly ArtifactOwnership[]>;
  readonly byBaseId: ReadonlyMap<string, readonly ArtifactOwnership[]>;
}

/**
 * Resolves an engineering artifact reference against a registry.
 *
 * Resolution is deterministic and registration-order independent:
 * - `RESOLVED`: exactly one registered package owns the artifact.
 * - `AMBIGUOUS`: more than one package owns the artifact (shared sources,
 *   or multiple versions of a base id referenced without a version).
 * - `NOT_FOUND`: no package owns the artifact.
 * - `INVALID`: the reference id is malformed.
 */
export function resolveEngineeringArtifactReference(
  registry: EngineeringKnowledgeRegistry,
  reference: EngineeringArtifactReference,
): EngineeringArtifactResolution {
  const index = buildOwnershipIndex(registry);
  if (reference.kind === 'identityId') {
    return resolveArtifactVersionedId(index, reference.identityId, reference);
  }
  if (reference.kind === 'identity') {
    return resolveArtifactVersionedId(index, reference.identity.id, reference);
  }
  return resolveByBaseId(index, reference.baseId, reference.version, reference);
}

/**
 * Resolves the union of all registered package dependency graphs into a
 * single canonical knowledge graph. Every node is resolved against the
 * ownership index; chain edges (result -> calculation -> primitive ->
 * source) and caller-declared cross-package edges are both preserved.
 *
 * The resolved graph is deterministic: nodes are sorted by id, edges by
 * (fromId, toId), and the fingerprint is registration-order independent.
 */
export function resolveEngineeringKnowledgeGraph(
  registry: EngineeringKnowledgeRegistry,
): ResolvedEngineeringKnowledgeGraph {
  const index = buildOwnershipIndex(registry);
  const nodeIds = new Set<string>();
  const edgeMap = new Map<string, { fromId: string; toId: string }>();
  for (const pkg of registry.packages()) {
    for (const nodeId of pkg.dependencies.nodes) {
      nodeIds.add(nodeId);
    }
    for (const edge of pkg.dependencies.edges) {
      edgeMap.set(`${edge.fromId}\u0000${edge.toId}`, {
        fromId: edge.fromId,
        toId: edge.toId,
      });
    }
  }

  const sortedNodeIds = [...nodeIds].sort();
  const edges = [...edgeMap.values()].sort(
    (a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
  );
  const rawGraph: EngineeringDependencyGraph = {
    nodes: sortedNodeIds,
    edges,
    version: ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  };

  const resolutions = new Map<string, EngineeringArtifactResolution>();
  for (const nodeId of sortedNodeIds) {
    resolutions.set(
      nodeId,
      resolveArtifactVersionedId(index, nodeId, {
        kind: 'identityId',
        identityId: nodeId,
      }),
    );
  }

  const nodes: ResolvedEngineeringGraphNode[] = sortedNodeIds.map((nodeId) => {
    const resolution = resolutions.get(nodeId) as EngineeringArtifactResolution;
    return {
      id: nodeId,
      baseId: resolution.baseId,
      artifactType: resolution.artifactType,
      resolution: resolution.status,
      owningPackageIds: resolution.owningPackageIds,
    };
  });

  const resolvedEdges: ResolvedEngineeringGraphEdge[] = edges.map((edge) => {
    const fromResolution = resolutions.get(edge.fromId) as EngineeringArtifactResolution;
    const toResolution = resolutions.get(edge.toId) as EngineeringArtifactResolution;
    const resolved =
      fromResolution.status === 'RESOLVED' && toResolution.status === 'RESOLVED';
    return {
      fromId: edge.fromId,
      toId: edge.toId,
      fromStatus: fromResolution.status,
      toStatus: toResolution.status,
      resolved,
    };
  });

  const selfDependencies = resolvedEdges
    .filter((edge) => edge.fromId === edge.toId)
    .map((edge) => ({ fromId: edge.fromId, toId: edge.toId }));

  const graph: ResolvedEngineeringKnowledgeGraph = {
    formatVersion: ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION,
    nodes,
    edges: resolvedEdges,
    acyclic: isEngineeringDependencyGraphAcyclic(rawGraph),
    open: resolvedEdges.some((edge) => !edge.resolved),
    selfDependencies,
    fingerprint: '',
  };
  return deepFreeze<ResolvedEngineeringKnowledgeGraph>({
    ...graph,
    fingerprint: engineeringKnowledgeGraphFingerprint(graph),
  });
}

/**
 * Validates the structural invariants of a resolved knowledge graph:
 * canonical node/edge ordering, node references, no self dependencies,
 * acyclicity, consistency of the derived flags (`acyclic`, `open`,
 * `selfDependencies`, edge `resolved`), and fingerprint integrity.
 */
export function validateResolvedEngineeringKnowledgeGraph(
  graph: ResolvedEngineeringKnowledgeGraph,
): readonly string[] {
  const errors: string[] = [];
  if (!graph || typeof graph !== 'object') {
    return ['Resolved graph must be provided.'];
  }
  if (graph.formatVersion !== ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION) {
    errors.push(
      `Unsupported resolved graph format version: ${String(graph.formatVersion)}.`,
    );
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  if (nodes.length === 0) {
    errors.push('Resolved graph must declare at least one node.');
  }
  const nodeIds = nodes.map((node) => node.id);
  if (new Set(nodeIds).size !== nodeIds.length) {
    errors.push('Resolved graph node ids must be unique.');
  }
  const sortedNodeIds = [...new Set(nodeIds)].sort();
  if (
    nodeIds.length !== sortedNodeIds.length ||
    nodeIds.some((id, index) => id !== sortedNodeIds[index])
  ) {
    errors.push('Resolved graph nodes must be sorted by id.');
  }
  const nodeSet = new Set(nodeIds);
  for (const edge of edges) {
    if (!nodeSet.has(edge.fromId)) {
      errors.push(`Resolved graph edge fromId ${edge.fromId} is not a graph node.`);
    }
    if (!nodeSet.has(edge.toId)) {
      errors.push(`Resolved graph edge toId ${edge.toId} is not a graph node.`);
    }
    if (edge.fromId === edge.toId) {
      errors.push(
        `Resolved graph self dependency edge ${edge.fromId} -> ${edge.toId} is not allowed.`,
      );
    }
    if (
      edge.resolved !==
      (edge.fromStatus === 'RESOLVED' && edge.toStatus === 'RESOLVED')
    ) {
      errors.push(
        `Resolved graph edge ${edge.fromId} -> ${edge.toId} resolved flag is inconsistent.`,
      );
    }
  }
  const rawEdges = edges.map((edge) => ({ fromId: edge.fromId, toId: edge.toId }));
  const canonicalEdges = [...rawEdges].sort(
    (a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
  );
  if (JSON.stringify(rawEdges) !== JSON.stringify(canonicalEdges)) {
    errors.push('Resolved graph edges must be sorted by fromId then toId.');
  }
  for (const node of nodes) {
    if (node.resolution === 'RESOLVED' && node.owningPackageIds.length !== 1) {
      errors.push(
        `Resolved graph node ${node.id} is RESOLVED but must have exactly one owning package.`,
      );
    }
    if (node.resolution === 'AMBIGUOUS' && node.owningPackageIds.length < 2) {
      errors.push(
        `Resolved graph node ${node.id} is AMBIGUOUS but must have at least two owning packages.`,
      );
    }
    if (
      (node.resolution === 'NOT_FOUND' || node.resolution === 'INVALID') &&
      node.owningPackageIds.length !== 0
    ) {
      errors.push(
        `Resolved graph node ${node.id} must declare no owning packages.`,
      );
    }
  }
  const rawGraph: EngineeringDependencyGraph = {
    nodes: nodeIds,
    edges: rawEdges,
    version: ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  };
  const acyclic = isEngineeringDependencyGraphAcyclic(rawGraph);
  if (!acyclic) {
    errors.push('Resolved graph must be acyclic.');
  }
  if (graph.acyclic !== acyclic) {
    errors.push('Resolved graph acyclic flag must match the edges.');
  }
  const expectedSelfDependencies = edges
    .filter((edge) => edge.fromId === edge.toId)
    .map((edge) => ({ fromId: edge.fromId, toId: edge.toId }));
  if (
    JSON.stringify(graph.selfDependencies ?? []) !==
    JSON.stringify(expectedSelfDependencies)
  ) {
    errors.push('Resolved graph selfDependencies must match the edges.');
  }
  const expectedOpen = edges.some((edge) => !edge.resolved);
  if (graph.open !== expectedOpen) {
    errors.push('Resolved graph open flag must match the resolved edges.');
  }
  if (graph.fingerprint !== engineeringKnowledgeGraphFingerprint(graph)) {
    errors.push('Resolved graph fingerprint does not match the graph content.');
  }
  return errors;
}

/**
 * Computes the canonical content fingerprint of a resolved knowledge graph
 * over its format version, nodes and edges. Deterministic and independent
 * of registration order.
 */
export function engineeringKnowledgeGraphFingerprint(
  graph: Pick<
    ResolvedEngineeringKnowledgeGraph,
    'formatVersion' | 'nodes' | 'edges'
  >,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_KNOWLEDGE_GRAPH',
    formatVersion: graph.formatVersion,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      baseId: node.baseId,
      artifactType: node.artifactType,
      resolution: node.resolution,
      owningPackageIds: node.owningPackageIds,
    })),
    edges: graph.edges.map((edge) => ({
      fromId: edge.fromId,
      toId: edge.toId,
      fromStatus: edge.fromStatus,
      toStatus: edge.toStatus,
      resolved: edge.resolved,
    })),
  });
}

/**
 * Projects a resolved knowledge graph back onto an
 * EngineeringDependencyGraph so existing graph and impact-analysis
 * contracts can operate on it.
 */
export function engineeringDependencyGraphOfResolvedGraph(
  graph: ResolvedEngineeringKnowledgeGraph,
): EngineeringDependencyGraph {
  return {
    nodes: graph.nodes.map((node) => node.id),
    edges: graph.edges.map((edge) => ({ fromId: edge.fromId, toId: edge.toId })),
    version: ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  };
}

/**
 * Analyzes the impact of an artifact over the registered knowledge graph.
 * The target may be a versioned identity id or a base id; base ids resolve
 * through the ownership index (ambiguous bases yield an open, empty impact).
 * The result mirrors the existing impact-analysis contract and is derived
 * from the same dependency-graph traversal primitives.
 */
export function analyzeRegisteredEngineeringImpact(
  registry: EngineeringKnowledgeRegistry,
  targetId: string,
): RegisteredEngineeringImpact {
  const resolvedGraph = resolveEngineeringKnowledgeGraph(registry);
  const parsed = parseArtifactVersionedId(targetId);
  const reference: EngineeringArtifactReference = parsed
    ? { kind: 'identityId', identityId: targetId }
    : { kind: 'baseId', baseId: targetId };
  const target = resolveEngineeringArtifactReference(registry, reference);
  const resolvedTargetId =
    target.status === 'RESOLVED' && target.identityId !== null
      ? target.identityId
      : targetId;
  const dependencyGraph = engineeringDependencyGraphOfResolvedGraph(resolvedGraph);
  const analysis = analyzeDirectImpact(dependencyGraph, resolvedTargetId);
  const impactedIds = new Set<string>([
    resolvedTargetId,
    ...analysis.transitiveAffectedArtifactIds,
  ]);
  const open =
    target.status !== 'RESOLVED' ||
    resolvedGraph.edges.some(
      (edge) =>
        !edge.resolved &&
        (impactedIds.has(edge.fromId) || impactedIds.has(edge.toId)),
    );
  return {
    targetId,
    target,
    direct: analysis.direct,
    affectedArtifactIds: analysis.affectedArtifactIds,
    transitive: analysis.transitive,
    transitiveAffectedArtifactIds: analysis.transitiveAffectedArtifactIds,
    open,
  };
}

function buildOwnershipIndex(
  registry: EngineeringKnowledgeRegistry,
): OwnershipIndex {
  const byArtifactId = new Map<string, ArtifactOwnership[]>();
  const byBaseId = new Map<string, ArtifactOwnership[]>();
  const add = (
    identity: EngineeringArtifactIdentity,
    pkg: EngineeringKnowledgePackage,
  ): void => {
    const idOwners = byArtifactId.get(identity.id) ?? [];
    if (!idOwners.some((owner) => owner.package.identity.id === pkg.identity.id)) {
      idOwners.push({ identity, package: pkg });
      byArtifactId.set(identity.id, idOwners);
    }
    const baseOwners = byBaseId.get(identity.baseId) ?? [];
    if (!baseOwners.some((owner) => owner.package.identity.id === pkg.identity.id)) {
      baseOwners.push({ identity, package: pkg });
      byBaseId.set(identity.baseId, baseOwners);
    }
  };
  for (const pkg of registry.packages()) {
    add(pkg.identity, pkg);
    add(pkg.provenance.calculation, pkg);
    add(pkg.provenance.primitive, pkg);
    for (const source of pkg.provenance.sources ?? []) {
      add(source, pkg);
    }
  }
  return { byArtifactId, byBaseId };
}

function resolveArtifactVersionedId(
  index: OwnershipIndex,
  identityId: string,
  reference: EngineeringArtifactReference,
): EngineeringArtifactResolution {
  const parsed = parseArtifactVersionedId(identityId);
  if (!parsed) {
    return invalidResolution(reference);
  }
  const owners = index.byArtifactId.get(identityId);
  if (owners === undefined || owners.length === 0) {
    return {
      reference,
      status: 'NOT_FOUND',
      baseId: parsed.baseId,
      artifactType: parsed.artifactType,
      identityId,
      owningPackageIds: [],
      candidates: [],
    };
  }
  if (owners.length > 1) {
    return {
      reference,
      status: 'AMBIGUOUS',
      baseId: parsed.baseId,
      artifactType: parsed.artifactType,
      identityId,
      owningPackageIds: sortedUniquePackageIds(owners),
      candidates: sortedIdentities(owners),
    };
  }
  return {
    reference,
    status: 'RESOLVED',
    baseId: parsed.baseId,
    artifactType: parsed.artifactType,
    identityId,
    owningPackageIds: sortedUniquePackageIds(owners),
    candidates: sortedIdentities(owners),
  };
}

function resolveByBaseId(
  index: OwnershipIndex,
  baseId: string,
  version: string | undefined,
  reference: EngineeringArtifactReference,
): EngineeringArtifactResolution {
  const artifactType = parseBaseIdType(baseId);
  if (!artifactType) {
    return invalidResolution(reference);
  }
  if (version !== undefined) {
    if (!new RegExp(ENGINEERING_ARTIFACT_VERSION_PATTERN).test(version)) {
      return invalidResolution(reference);
    }
    return resolveArtifactVersionedId(
      index,
      engineeringArtifactVersionOf(baseId, version),
      reference,
    );
  }
  const owners = index.byBaseId.get(baseId);
  if (owners === undefined || owners.length === 0) {
    return {
      reference,
      status: 'NOT_FOUND',
      baseId,
      artifactType,
      identityId: null,
      owningPackageIds: [],
      candidates: [],
    };
  }
  if (owners.length > 1) {
    return {
      reference,
      status: 'AMBIGUOUS',
      baseId,
      artifactType,
      identityId: null,
      owningPackageIds: sortedUniquePackageIds(owners),
      candidates: sortedIdentities(owners),
    };
  }
  const owner = owners[0];
  return {
    reference,
    status: 'RESOLVED',
    baseId,
    artifactType,
    identityId: owner.identity.id,
    owningPackageIds: sortedUniquePackageIds(owners),
    candidates: sortedIdentities(owners),
  };
}

function invalidResolution(
  reference: EngineeringArtifactReference,
): EngineeringArtifactResolution {
  return {
    reference,
    status: 'INVALID',
    baseId: null,
    artifactType: null,
    identityId: null,
    owningPackageIds: [],
    candidates: [],
  };
}

function sortedUniquePackageIds(
  owners: readonly ArtifactOwnership[],
): readonly string[] {
  return [...new Set(owners.map((owner) => owner.package.identity.id))].sort();
}

function sortedIdentities(
  owners: readonly ArtifactOwnership[],
): readonly EngineeringArtifactIdentity[] {
  return owners.map((owner) => owner.identity).sort((a, b) => a.id.localeCompare(b.id));
}

function parseArtifactVersionedId(
  identityId: string,
): { baseId: string; artifactType: EngineeringArtifactType; version: string } | null {
  if (typeof identityId !== 'string' || identityId.length === 0) {
    return null;
  }
  const separator = identityId.lastIndexOf('-v');
  if (separator < 0) {
    return null;
  }
  const baseId = identityId.slice(0, separator);
  const version = identityId.slice(separator + 2);
  const match = ENGINEERING_ARTIFACT_BASE_ID_PATTERN.exec(baseId);
  if (!match) {
    return null;
  }
  if (!new RegExp(ENGINEERING_ARTIFACT_VERSION_PATTERN).test(version)) {
    return null;
  }
  return {
    baseId,
    artifactType: ARTIFACT_TYPE_BY_PREFIX[match[1]],
    version,
  };
}

function parseBaseIdType(baseId: string): EngineeringArtifactType | null {
  if (typeof baseId !== 'string') {
    return null;
  }
  const match = ENGINEERING_ARTIFACT_BASE_ID_PATTERN.exec(baseId);
  return match ? ARTIFACT_TYPE_BY_PREFIX[match[1]] : null;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
