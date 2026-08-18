export interface EngineeringDependencyEdge {
  readonly fromId: string;
  readonly toId: string;
}

export interface EngineeringDependencyGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly EngineeringDependencyEdge[];
  readonly version: string;
}

export const ENGINEERING_DEPENDENCY_GRAPH_VERSION = '1';

export function createEngineeringDependencyGraph(
  nodes: readonly string[] = [],
  edges: readonly EngineeringDependencyEdge[] = [],
): EngineeringDependencyGraph {
  let graph: EngineeringDependencyGraph = {
    nodes: [...new Set(nodes)],
    edges: [],
    version: ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  };
  for (const edge of edges) {
    const alreadyPresent = graph.edges.some(
      (existing) =>
        existing.fromId === edge.fromId && existing.toId === edge.toId,
    );
    if (!alreadyPresent) {
      graph = addDependency(graph, edge.fromId, edge.toId);
    }
  }
  return graph;
}

export function addNode(
  graph: EngineeringDependencyGraph,
  nodeId: string,
): EngineeringDependencyGraph {
  if (graph.nodes.includes(nodeId)) {
    return graph;
  }
  return { ...graph, nodes: [...graph.nodes, nodeId] };
}

export function wouldCreateCycle(
  graph: EngineeringDependencyGraph,
  fromId: string,
  toId: string,
): boolean {
  if (fromId === toId) {
    return true;
  }
  return canReach(graph, toId, fromId);
}

export function addDependency(
  graph: EngineeringDependencyGraph,
  fromId: string,
  toId: string,
): EngineeringDependencyGraph {
  if (wouldCreateCycle(graph, fromId, toId)) {
    throw new Error(
      `Dependency edge ${fromId} -> ${toId} would create a cycle and was rejected.`,
    );
  }
  const withNodes = addNode(addNode(graph, fromId), toId);
  const alreadyPresent = withNodes.edges.some(
    (edge) => edge.fromId === fromId && edge.toId === toId,
  );
  if (alreadyPresent) {
    return withNodes;
  }
  return {
    ...withNodes,
    edges: [...withNodes.edges, { fromId, toId }],
  };
}

export function directDependenciesOf(
  graph: EngineeringDependencyGraph,
  artifactId: string,
): readonly string[] {
  return graph.edges
    .filter((edge) => edge.fromId === artifactId)
    .map((edge) => edge.toId)
    .sort();
}

export function directDependentsOf(
  graph: EngineeringDependencyGraph,
  artifactId: string,
): readonly string[] {
  return graph.edges
    .filter((edge) => edge.toId === artifactId)
    .map((edge) => edge.fromId)
    .sort();
}

export function serializeEngineeringDependencyGraph(
  graph: EngineeringDependencyGraph,
): string {
  const nodes = [...graph.nodes].sort();
  const edges = [...graph.edges]
    .map((edge) => ({ fromId: edge.fromId, toId: edge.toId }))
    .sort(
      (a, b) =>
        a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
    );
  return JSON.stringify({
    nodes,
    edges,
    version: graph.version,
  });
}

function canReach(
  graph: EngineeringDependencyGraph,
  startId: string,
  targetId: string,
): boolean {
  const stack = [...directDependenciesOf(graph, startId)];
  const visited = new Set<string>([startId]);
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === targetId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    stack.push(...directDependenciesOf(graph, current));
  }
  return false;
}