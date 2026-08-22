import {
  reconstructEngineeringRelationship,
  resolveEngineeringKnowledgeGraph,
  type EngineeringKnowledgeRegistry,
  type RelationshipEvidenceAdapter,
  type RelationshipFact,
  type RelationshipQueryContext,
  type RelationshipReconstruction,
  type RelationshipDeclaration,
  type ResolvedEngineeringKnowledgeGraph,
} from '@jaryan/shared-domain';

export interface EngineeringRelationshipQuery {
  getGraph(): ResolvedEngineeringKnowledgeGraph;
  reconstruct(
    fact: RelationshipFact,
    queryContext: RelationshipQueryContext,
    evidenceAdapter?: RelationshipEvidenceAdapter,
  ): RelationshipReconstruction;
}

/**
 * Application-owned query facade over the canonical KnowledgeGraph.
 *
 * Declarations remain owned by the graph authority. This facade only supplies
 * query context and returns the domain reconstruction; it does not select a
 * current declaration or interpret evidence, authority, or trust.
 */
export function createEngineeringRelationshipQuery(
  registry: EngineeringKnowledgeRegistry,
  declarations: readonly RelationshipDeclaration[] = [],
): EngineeringRelationshipQuery {
  const graph = resolveEngineeringKnowledgeGraph(registry, declarations);
  return Object.freeze({
    getGraph(): ResolvedEngineeringKnowledgeGraph {
      return graph;
    },

    reconstruct(
      fact: RelationshipFact,
      queryContext: RelationshipQueryContext,
      evidenceAdapter?: RelationshipEvidenceAdapter,
    ): RelationshipReconstruction {
      return reconstructEngineeringRelationship(
        registry,
        graph,
        fact,
        queryContext,
        evidenceAdapter,
      );
    },
  });
}
