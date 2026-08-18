import type { EngineeringDependencyGraph } from './dependency-graph.ts';
import { directDependentsOf } from './dependency-graph.ts';

export interface EngineeringImpactNode {
  readonly artifactId: string;
  readonly depth: number;
}

export interface EngineeringImpactAnalysis {
  readonly targetId: string;
  readonly direct: readonly EngineeringImpactNode[];
  readonly affectedArtifactIds: readonly string[];
  readonly transitive: readonly EngineeringImpactNode[];
  readonly transitiveAffectedArtifactIds: readonly string[];
}

export type EngineeringImpactAnalyzer = (
  graph: EngineeringDependencyGraph,
  targetId: string,
) => EngineeringImpactAnalysis;

function analyzeImpact(
  graph: EngineeringDependencyGraph,
  targetId: string,
): EngineeringImpactAnalysis {
  const directIds = directDependentsOf(graph, targetId);
  const transitiveNodes: EngineeringImpactNode[] = [];
  const visited = new Set<string>();
  const queue: EngineeringImpactNode[] = directIds.map((artifactId) => ({
    artifactId,
    depth: 1,
  }));
  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    if (visited.has(node.artifactId)) {
      continue;
    }
    visited.add(node.artifactId);
    transitiveNodes.push(node);
    for (const dependantId of directDependentsOf(graph, node.artifactId)) {
      if (!visited.has(dependantId)) {
        queue.push({ artifactId: dependantId, depth: node.depth + 1 });
      }
    }
  }
  transitiveNodes.sort(
    (a, b) =>
      a.depth - b.depth || a.artifactId.localeCompare(b.artifactId),
  );
  return {
    targetId,
    direct: directIds.map((artifactId) => ({ artifactId, depth: 1 })),
    affectedArtifactIds: [...directIds],
    transitive: transitiveNodes,
    transitiveAffectedArtifactIds: [...visited].sort(),
  };
}

export function analyzeDirectImpact(
  graph: EngineeringDependencyGraph,
  targetId: string,
): EngineeringImpactAnalysis {
  return analyzeImpact(graph, targetId);
}

export function analyzeTransitiveImpact(
  graph: EngineeringDependencyGraph,
  targetId: string,
): EngineeringImpactAnalysis {
  return analyzeImpact(graph, targetId);
}