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
}

export type EngineeringImpactAnalyzer = (
  graph: EngineeringDependencyGraph,
  targetId: string,
) => EngineeringImpactAnalysis;

export function analyzeDirectImpact(
  graph: EngineeringDependencyGraph,
  targetId: string,
): EngineeringImpactAnalysis {
  const affectedArtifactIds = directDependentsOf(graph, targetId);
  return {
    targetId,
    direct: affectedArtifactIds.map((artifactId) => ({
      artifactId,
      depth: 1,
    })),
    affectedArtifactIds,
  };
}