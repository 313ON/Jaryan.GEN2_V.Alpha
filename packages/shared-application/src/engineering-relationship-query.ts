import {
  reconstructEngineeringRelationship,
  resolveEngineeringKnowledgeGraph,
  type EngineeringKnowledgeRegistry,
  type EngineeringChangeEvent,
  type EngineeringDecision,
  type EngineeringKnowledgeGraphPredicate,
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
  reconstructDecision(
    decision: EngineeringDecision,
    queryContext: RelationshipQueryContext,
    evidenceAdapter?: RelationshipEvidenceAdapter,
  ): EngineeringDecisionQueryResult;
  reconstructChangeEvent(
    changeEvent: EngineeringChangeEvent,
    queryContext: RelationshipQueryContext,
    evidenceAdapter?: RelationshipEvidenceAdapter,
  ): EngineeringChangeEventQueryResult;
}

export interface EngineeringDecisionQueryResult {
  readonly decision: EngineeringDecision;
  readonly relationships: readonly RelationshipReconstruction[];
}

export interface EngineeringChangeEventQueryResult {
  readonly changeEvent: EngineeringChangeEvent;
  readonly relationships: readonly RelationshipReconstruction[];
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

    reconstructDecision(
      decision: EngineeringDecision,
      queryContext: RelationshipQueryContext,
      evidenceAdapter?: RelationshipEvidenceAdapter,
    ): EngineeringDecisionQueryResult {
      return Object.freeze({
        decision,
        relationships: Object.freeze(
          reconstructSubjectRelationships(
            decision.identity.id,
            graph,
            (fact) =>
              reconstructEngineeringRelationship(
                registry,
                graph,
                fact,
                queryContext,
                evidenceAdapter,
              ),
          ),
        ),
      });
    },

    reconstructChangeEvent(
      changeEvent: EngineeringChangeEvent,
      queryContext: RelationshipQueryContext,
      evidenceAdapter?: RelationshipEvidenceAdapter,
    ): EngineeringChangeEventQueryResult {
      return Object.freeze({
        changeEvent,
        relationships: Object.freeze(
          reconstructSubjectRelationships(
            changeEvent.identity.id,
            graph,
            (fact) =>
              reconstructEngineeringRelationship(
                registry,
                graph,
                fact,
                queryContext,
                evidenceAdapter,
              ),
          ),
        ),
      });
    },
  });
}

const DECISION_CHANGE_PREDICATES = new Set<EngineeringKnowledgeGraphPredicate>([
  'APPLIES_TO',
  'SUPPORTED_BY',
  'DERIVED_FROM',
  'AFFECTS',
  'IMPLEMENTS',
  'SUPERSEDES',
]);

function reconstructSubjectRelationships(
  artifactId: string,
  graph: ResolvedEngineeringKnowledgeGraph,
  reconstruct: (fact: RelationshipFact) => RelationshipReconstruction,
): readonly RelationshipReconstruction[] {
  const facts = new Map<string, RelationshipFact>();
  for (const declaration of graph.declarations ?? []) {
    const subject = declaration.fact.subject;
    if (
      subject.kind !== 'ARTIFACT' ||
      'identityKind' in subject.identity ||
      subject.identity.id !== artifactId ||
      !DECISION_CHANGE_PREDICATES.has(declaration.fact.predicate)
    ) {
      continue;
    }
    facts.set(declaration.fact.fingerprint, declaration.fact);
  }
  return [...facts.values()]
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint))
    .map(reconstruct);
}
