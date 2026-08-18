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
  const uniqueNodes = [...new Set(nodes)];
  const uniqueEdges: EngineeringDependencyEdge[] = [];
  for (const edge of edges) {
    const alreadyPresent = uniqueEdges.some(
      (existing) =>
        existing.fromId === edge.fromId && existing.toId === edge.toId,
    );
    if (!alreadyPresent) {
      uniqueEdges.push(edge);
    }
  }
  return {
    nodes: uniqueNodes,
    edges: uniqueEdges,
    version: ENGINEERING_DEPENDENCY_GRAPH_VERSION,
  };
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

export function addDependency(
  graph: EngineeringDependencyGraph,
  fromId: string,
  toId: string,
): EngineeringDependencyGraph {
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
  return JSON.stringify({
    nodes: [...graph.nodes],
    edges: [...graph.edges],
    version: graph.version,
  });
}