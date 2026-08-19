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

export function isEngineeringDependencyGraphAcyclic(
  graph: EngineeringDependencyGraph,
): boolean {
  const nodeSet = new Set(graph.nodes);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodeSet) {
    inDegree.set(node, 0);
    adjacency.set(node, []);
  }
  const seen = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeSet.has(edge.fromId) || !nodeSet.has(edge.toId)) {
      continue;
    }
    const key = `${edge.fromId}\u0000${edge.toId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    (adjacency.get(edge.fromId) as string[]).push(edge.toId);
    inDegree.set(edge.toId, (inDegree.get(edge.toId) as number) + 1);
  }
  const queue = [...nodeSet].filter(
    (node) => (inDegree.get(node) as number) === 0,
  );
  let processed = 0;
  while (queue.length > 0) {
    const current = queue.pop() as string;
    processed += 1;
    for (const next of adjacency.get(current) as string[]) {
      const degree = (inDegree.get(next) as number) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        queue.push(next);
      }
    }
  }
  return processed === nodeSet.size;
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