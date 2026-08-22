import type {
  EngineeringArtifactIdentity,
  EngineeringChangeEvent,
  EngineeringDecision,
  KnowledgeGraphEndpoint,
  RelationshipEvidenceAdapter,
  RelationshipQueryContext,
  RelationshipReconstruction,
} from '@jaryan/shared-domain';
import type {
  EngineeringChangeEventQueryResult,
  EngineeringDecisionQueryResult,
  EngineeringRelationshipQuery,
} from './engineering-relationship-query.ts';
import type {
  RelationshipAuthorityEvaluationAdapter,
  RelationshipAuthorityProjection,
  RelationshipAuthoritySubjectReference,
} from './relationship-authority-evaluation.ts';

export interface EngineeringDecisionTraceAuthorityOptions {
  readonly adapter: RelationshipAuthorityEvaluationAdapter;
  readonly authoritySubject: RelationshipAuthoritySubjectReference | null;
}

export interface EngineeringDecisionTraceRelationship {
  readonly reconstruction: RelationshipReconstruction;
  readonly authority: RelationshipAuthorityProjection | null;
}

export interface EngineeringDecisionTraceDecision {
  readonly decision: EngineeringDecision;
  readonly reconstruction: EngineeringDecisionQueryResult;
  readonly appliesTo: readonly EngineeringDecisionTraceRelationship[];
  readonly relationships: readonly EngineeringDecisionTraceRelationship[];
  readonly supportingEvidence: readonly EngineeringArtifactIdentity[];
  readonly relatedChanges: readonly EngineeringDecisionTraceChange[];
}

export interface EngineeringDecisionTraceChange {
  readonly changeEvent: EngineeringChangeEvent;
  readonly reconstruction: EngineeringChangeEventQueryResult;
  readonly relationships: readonly EngineeringDecisionTraceRelationship[];
  readonly supportingEvidence: readonly EngineeringArtifactIdentity[];
}

type EngineeringDecisionTraceCandidate = Omit<
  EngineeringDecisionTraceDecision,
  'relatedChanges'
>;

export interface EngineeringDecisionTrace {
  readonly subject: KnowledgeGraphEndpoint;
  readonly queryContext: RelationshipQueryContext;
  readonly decisions: readonly EngineeringDecisionTraceDecision[];
  readonly changes: readonly EngineeringDecisionTraceChange[];
  readonly authorityEvaluated: boolean;
}

/**
 * Read-only application projection over the existing relationship query.
 *
 * Decisions and changes are supplied as immutable domain declarations. The
 * KnowledgeGraph remains the only relationship authority; this projection
 * only joins reconstructed relationship facts by canonical endpoint identity.
 */
export function reconstructEngineeringDecisionTrace(
  query: EngineeringRelationshipQuery,
  subject: KnowledgeGraphEndpoint,
  decisions: readonly EngineeringDecision[],
  changeEvents: readonly EngineeringChangeEvent[],
  queryContext: RelationshipQueryContext,
  evidenceAdapter?: RelationshipEvidenceAdapter,
  authorityOptions?: EngineeringDecisionTraceAuthorityOptions,
): EngineeringDecisionTrace {
  const decisionReconstructions = decisions
    .map((decision) => ({
      decision,
      reconstruction: query.reconstructDecision(
        decision,
        queryContext,
        evidenceAdapter,
      ),
    }))
    .sort((left, right) =>
      left.decision.fingerprint.localeCompare(right.decision.fingerprint),
    );
  const changeReconstructions = changeEvents
    .map((changeEvent) => ({
      changeEvent,
      reconstruction: query.reconstructChangeEvent(
        changeEvent,
        queryContext,
        evidenceAdapter,
      ),
    }))
    .sort((left, right) =>
      left.changeEvent.fingerprint.localeCompare(right.changeEvent.fingerprint),
    );

  const decisionCandidates: EngineeringDecisionTraceCandidate[] =
    decisionReconstructions
    .map(({ decision, reconstruction }) => {
      const relationships = traceRelationships(
        query,
        reconstruction.relationships,
        queryContext,
        evidenceAdapter,
        authorityOptions,
      );
      const appliesTo = relationships.filter(
        (relationship) =>
          relationship.reconstruction.fact.predicate === 'APPLIES_TO' &&
          endpointMatches(relationship.reconstruction.fact.object, subject),
      );
      if (appliesTo.length === 0) {
        return null;
      }
      return {
        decision,
        reconstruction,
        appliesTo: Object.freeze(appliesTo),
        relationships: Object.freeze(relationships),
        supportingEvidence: Object.freeze(
          collectEvidence(decision.evidenceReferences, relationships),
        ),
      } satisfies EngineeringDecisionTraceCandidate;
    })
    .filter((value): value is EngineeringDecisionTraceCandidate => value !== null);

  const selectedDecisionIds = new Set(
    decisionCandidates.map(({ decision }) => decision.identity.id),
  );
  const changesForSubject = changeReconstructions
    .map(({ changeEvent, reconstruction }) => {
      const relationships = traceRelationships(
        query,
        reconstruction.relationships,
        queryContext,
        evidenceAdapter,
        authorityOptions,
      );
      const affectsSubject = relationships.some(
        (relationship) =>
          relationship.reconstruction.fact.predicate === 'AFFECTS' &&
          endpointMatches(relationship.reconstruction.fact.object, subject),
      );
      const implementsDecision = relationships.some(
        (relationship) =>
          relationship.reconstruction.fact.predicate === 'IMPLEMENTS' &&
          endpointArtifactId(relationship.reconstruction.fact.object) !== null &&
          selectedDecisionIds.has(
            endpointArtifactId(relationship.reconstruction.fact.object) as string,
          ),
      );
      if (!affectsSubject && !implementsDecision) {
        return null;
      }
      return {
        changeEvent,
        reconstruction,
        relationships,
        supportingEvidence: collectEvidence(
          changeEvent.evidenceReferences,
          relationships,
        ),
      };
    })
    .filter(
      (value): value is EngineeringDecisionTraceChange => value !== null,
    );

  const traceDecisions = decisionCandidates.map((entry) => ({
    ...entry,
    relatedChanges: changesForSubject.filter((change) =>
      change.relationships.some(
        (relationship) =>
          relationship.reconstruction.fact.predicate === 'IMPLEMENTS' &&
          endpointArtifactId(relationship.reconstruction.fact.object) ===
            entry.decision.identity.id,
      ),
    ),
  }));

  return deepFreeze({
    subject,
    queryContext: { ...queryContext },
    decisions: traceDecisions,
    changes: changesForSubject,
    authorityEvaluated: authorityOptions !== undefined,
  });
}

function traceRelationships(
  query: EngineeringRelationshipQuery,
  reconstructions: readonly RelationshipReconstruction[],
  queryContext: RelationshipQueryContext,
  evidenceAdapter: RelationshipEvidenceAdapter | undefined,
  authorityOptions: EngineeringDecisionTraceAuthorityOptions | undefined,
): readonly EngineeringDecisionTraceRelationship[] {
  return reconstructions.map((reconstruction) => ({
    reconstruction,
    authority:
      authorityOptions === undefined
        ? null
        : query.evaluateAuthority(
            reconstruction.fact,
            queryContext,
            authorityOptions.adapter,
            authorityOptions.authoritySubject,
            evidenceAdapter,
          ),
  }));
}

function collectEvidence(
  declarationEvidence: readonly EngineeringArtifactIdentity[],
  relationships: readonly EngineeringDecisionTraceRelationship[],
): readonly EngineeringArtifactIdentity[] {
  const byId = new Map<string, EngineeringArtifactIdentity>();
  for (const evidence of declarationEvidence) {
    byId.set(evidence.id, evidence);
  }
  for (const relationship of relationships) {
    for (const declaration of [
      ...relationship.reconstruction.declarations,
      ...relationship.reconstruction.historicalDeclarations,
    ]) {
      for (const evidence of declaration.evidenceReferences) {
        byId.set(evidence.id, evidence);
      }
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function endpointMatches(
  endpoint: RelationshipReconstruction['fact']['object'],
  subject: KnowledgeGraphEndpoint,
): boolean {
  if (endpoint.kind !== subject.kind) {
    return false;
  }
  if (
    endpoint.kind === 'ARTIFACT' &&
    subject.kind === 'ARTIFACT' &&
    !('identityKind' in endpoint.identity) &&
    !('identityKind' in subject.identity)
  ) {
    return endpoint.identity.id === subject.identity.id;
  }
  if (
    endpoint.kind === 'PHYSICAL_REFERENT' &&
    subject.kind === 'PHYSICAL_REFERENT' &&
    'identityKind' in endpoint.identity &&
    'identityKind' in subject.identity
  ) {
    return (
      endpoint.identity.canonicalIdentity === subject.identity.canonicalIdentity
    );
  }
  return false;
}

function endpointArtifactId(
  endpoint: RelationshipReconstruction['fact']['object'],
): string | null {
  if (endpoint.kind !== 'ARTIFACT' || 'identityKind' in endpoint.identity) {
    return null;
  }
  return endpoint.identity.id;
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
