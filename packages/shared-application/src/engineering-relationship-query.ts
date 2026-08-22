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
import type {
  RelationshipAuthorityEvaluationAdapter,
  RelationshipAuthorityEvaluation,
  RelationshipAuthorityProjection,
  RelationshipAuthoritySubjectReference,
} from './relationship-authority-evaluation.ts';
import { projectRelationshipAuthorityState } from './relationship-authority-evaluation.ts';

export interface EngineeringRelationshipQuery {
  getGraph(): ResolvedEngineeringKnowledgeGraph;
  reconstruct(
    fact: RelationshipFact,
    queryContext: RelationshipQueryContext,
    evidenceAdapter?: RelationshipEvidenceAdapter,
  ): RelationshipReconstruction;
  evaluateAuthority(
    fact: RelationshipFact,
    queryContext: RelationshipQueryContext,
    authorityAdapter: RelationshipAuthorityEvaluationAdapter,
    authoritySubject: RelationshipAuthoritySubjectReference | null,
    evidenceAdapter?: RelationshipEvidenceAdapter,
  ): RelationshipAuthorityProjection;
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

    evaluateAuthority(
      fact: RelationshipFact,
      queryContext: RelationshipQueryContext,
      authorityAdapter: RelationshipAuthorityEvaluationAdapter,
      authoritySubject: RelationshipAuthoritySubjectReference | null,
      evidenceAdapter?: RelationshipEvidenceAdapter,
    ): RelationshipAuthorityProjection {
      const reconstruction = reconstructEngineeringRelationship(
        registry,
        graph,
        fact,
        queryContext,
        evidenceAdapter,
      );
      const evaluations: RelationshipAuthorityEvaluation[] =
        reconstruction.declarations.map((declaration, index) =>
          authorityAdapter.evaluate({
            declaration,
            structuralStatus: reconstruction.status,
            authoritySubject,
            evidenceResolution: evidenceAdapter
              ? reconstruction.evidence[index]
              : undefined,
          }),
        );
      const historicalEvaluations: RelationshipAuthorityEvaluation[] =
        reconstruction.historicalDeclarations.map((declaration) =>
          authorityAdapter.evaluate({
            declaration,
            structuralStatus: 'HISTORICAL',
            authoritySubject,
          }),
        );
      return projectRelationshipAuthorityState(
        reconstruction,
        evaluations,
        historicalEvaluations,
      );
    },
  });
}
