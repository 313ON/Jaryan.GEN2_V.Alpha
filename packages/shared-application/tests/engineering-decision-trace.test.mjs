import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  changeAffects,
  changeImplements,
  changeSupersedes,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  decisionAppliesTo,
  decisionDerivedFrom,
  decisionSupersedes,
  engineeringChangeEvent,
  engineeringDecision,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  relationshipDeclaration,
} from '@jaryan/shared-domain';
import {
  createEngineeringRelationshipQuery,
  reconstructEngineeringDecisionTrace,
} from '@jaryan/shared-application';

const physicalPackage = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 2 },
    { weightKn: 20, elevationM: 4 },
  ]),
);
const artifactPackage = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 15, elevationM: 2 },
    { weightKn: 25, elevationM: 4 },
  ]),
  { version: '2' },
);
const registry = createEngineeringKnowledgeRegistry()
  .register(physicalPackage)
  .register(artifactPackage);
const evidence = physicalPackage.provenance.sources[0];
const physicalSubject = knowledgeGraphEndpoint({
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalReferentIdentity({
    referentKey: 'governed:PHASE-18:PHYSICAL-001',
  }),
});
const artifactSubject = knowledgeGraphEndpoint({
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: artifactPackage.identity,
});
const validTime = {
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  recordedAt: '2026-08-22T10:00:00Z',
};
const queryContext = {
  queryTime: '2026-08-22T12:00:00Z',
  applicabilityContext: 'PROJECT:PHASE-18',
};
const decision = engineeringDecision({
  identity: physicalPackage.identity,
  kind: 'DECISION',
  subjectScope: [physicalSubject],
  outcome: 'Use the governed design basis.',
  rationale: 'The selected basis is supported by the cited record.',
  alternatives: ['Alternative A', 'Alternative B'],
  decisionTime: '2026-08-22T09:00:00Z',
  temporalValidity: validTime,
  applicabilityContext: 'PROJECT:PHASE-18',
  status: 'ACCEPTED',
  resolution: 'RESOLVED',
  origin: 'HUMAN',
  actor: 'engineer-001',
  evidenceReferences: [evidence],
  supersedes: [],
});
const artifactDecision = engineeringDecision({
  identity: artifactPackage.identity,
  kind: 'DECISION',
  subjectScope: [artifactSubject],
  outcome: 'Use the artifact design basis.',
  rationale: 'Artifact scope is explicit.',
  alternatives: [],
  decisionTime: '2026-08-22T09:30:00Z',
  temporalValidity: validTime,
  applicabilityContext: 'PROJECT:PHASE-18',
  status: 'ACCEPTED',
  resolution: 'RESOLVED',
  origin: 'HUMAN',
  actor: 'engineer-001',
  evidenceReferences: [evidence],
  supersedes: [],
});
const changeEvent = engineeringChangeEvent({
  identity: physicalPackage.provenance.calculation,
  kind: 'IMPLEMENTED',
  affectedScope: [physicalSubject],
  description: 'Apply the selected design basis.',
  beforeMeaning: 'Original basis',
  afterMeaning: 'Governed design basis',
  eventTime: '2026-08-23T09:00:00Z',
  temporalValidity: validTime,
  applicabilityContext: 'PROJECT:PHASE-18',
  relatedDecisionIdentities: [decision.identity],
  status: 'IMPLEMENTED',
  resolution: 'RESOLVED',
  origin: 'HUMAN',
  actor: 'engineer-002',
  evidenceReferences: [evidence],
  supersedes: [],
});

const declaration = (fact, overrides = {}) =>
  relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:PHASE-18',
    temporalValidity: validTime,
    origin: 'HUMAN',
    actor: 'engineer-001',
    evidenceReferences: [evidence],
    supersedes: [],
    ...overrides,
  });

const traceDeclarations = [
  declaration(decisionAppliesTo(decision, physicalSubject)),
  declaration(decisionDerivedFrom(decision, evidence)),
  declaration(decisionSupersedes(decision, changeEvent)),
  declaration(decisionAppliesTo(artifactDecision, artifactSubject)),
  declaration(changeAffects(changeEvent, physicalSubject)),
  declaration(changeImplements(changeEvent, decision)),
  declaration(changeSupersedes(changeEvent, decision)),
];

test('trace joins a physical referent decision to rationale, evidence, and related implementation change', () => {
  const query = createEngineeringRelationshipQuery(registry, traceDeclarations);
  const trace = reconstructEngineeringDecisionTrace(
    query,
    physicalSubject,
    [decision, artifactDecision],
    [changeEvent],
    queryContext,
    { resolve: () => ({ status: 'RESOLVED', complete: true }) },
  );

  assert.equal(trace.decisions.length, 1);
  assert.equal(trace.decisions[0].decision.identity.id, decision.identity.id);
  assert.equal(trace.decisions[0].decision.rationale.length > 0, true);
  assert.deepEqual(trace.decisions[0].decision.alternatives, [
    'Alternative A',
    'Alternative B',
  ]);
  assert.deepEqual(
    trace.decisions[0].supportingEvidence.map((item) => item.id),
    [evidence.id],
  );
  assert.equal(trace.decisions[0].relatedChanges.length, 1);
  assert.equal(
    trace.decisions[0].relatedChanges[0].relationships.some(
      (item) => item.reconstruction.fact.predicate === 'IMPLEMENTS',
    ),
    true,
  );
  assert.equal(
    trace.decisions[0].relationships.some(
      (item) => item.reconstruction.fact.predicate === 'SUPERSEDES',
    ),
    true,
  );
  assert.equal(trace.changes.length, 1);
});

test('trace selects an artifact-scoped decision without mixing physical scope', () => {
  const query = createEngineeringRelationshipQuery(
    registry,
    traceDeclarations,
  );
  const trace = reconstructEngineeringDecisionTrace(
    query,
    artifactSubject,
    [decision, artifactDecision],
    [changeEvent],
    queryContext,
  );

  assert.deepEqual(
    trace.decisions.map((item) => item.decision.identity.id),
    [artifactDecision.identity.id],
  );
  assert.equal(trace.changes.length, 0);
});

test('trace preserves historical, conflicting, unresolved, and applicability states', () => {
  const appliesFact = decisionAppliesTo(decision, physicalSubject);
  const current = declaration(appliesFact);
  const conflict = declaration(appliesFact, {
    assertionDisposition: 'DENY',
    temporalValidity: {
      ...validTime,
      recordedAt: '2026-08-23T10:00:00Z',
    },
  });
  const historical = declaration(appliesFact, {
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2026-08-24T10:00:00Z',
    },
  });
  const unresolved = declaration(changeAffects(changeEvent, physicalSubject), {
    temporalValidity: { recordedAt: '2026-08-25T10:00:00Z' },
  });
  const query = createEngineeringRelationshipQuery(registry, [
    conflict,
    historical,
    current,
    unresolved,
  ]);
  const trace = reconstructEngineeringDecisionTrace(
    query,
    physicalSubject,
    [decision],
    [changeEvent],
    queryContext,
  );
  const appliesTo = trace.decisions[0].appliesTo[0].reconstruction;
  const changeAffectsRelation = trace.changes[0].relationships.find(
    (item) => item.reconstruction.fact.predicate === 'AFFECTS',
  ).reconstruction;

  assert.equal(appliesTo.status, 'CONFLICTING');
  assert.equal(appliesTo.historicalDeclarations.length, 1);
  assert.equal(changeAffectsRelation.status, 'UNKNOWN');

  const otherContext = reconstructEngineeringDecisionTrace(
    query,
    physicalSubject,
    [decision],
    [changeEvent],
    { queryTime: queryContext.queryTime, applicabilityContext: 'OTHER' },
  );
  assert.equal(
    otherContext.decisions[0].appliesTo[0].reconstruction.status,
    'HISTORICAL',
  );
});

test('trace ordering is deterministic and record time does not select a current declaration', () => {
  const appliesFact = decisionAppliesTo(decision, physicalSubject);
  const first = declaration(appliesFact);
  const later = declaration(appliesFact, {
    temporalValidity: {
      ...validTime,
      recordedAt: '2026-12-01T10:00:00Z',
    },
  });
  const forwardQuery = createEngineeringRelationshipQuery(registry, [
    later,
    first,
    ...traceDeclarations,
  ]);
  const reverseQuery = createEngineeringRelationshipQuery(registry, [
    ...traceDeclarations,
    first,
    later,
  ]);
  const forward = reconstructEngineeringDecisionTrace(
    forwardQuery,
    physicalSubject,
    [decision],
    [changeEvent],
    queryContext,
  );
  const reverse = reconstructEngineeringDecisionTrace(
    reverseQuery,
    physicalSubject,
    [decision],
    [changeEvent],
    queryContext,
  );

  assert.deepEqual(forward, reverse);
  assert.equal(
    forward.decisions[0].appliesTo[0].reconstruction.declarations.length,
    2,
  );
});

test('AI proposals remain non-authoritative and authority/trust projection stays optional', () => {
  const proposal = declaration(decisionAppliesTo(decision, physicalSubject), {
    origin: 'AI_PROPOSAL',
    actor: null,
    evidenceReferences: [],
  });
  const query = createEngineeringRelationshipQuery(registry, [proposal]);
  const trace = reconstructEngineeringDecisionTrace(
    query,
    physicalSubject,
    [decision],
    [],
    queryContext,
  );
  const relation = trace.decisions[0].appliesTo[0];

  assert.equal(trace.authorityEvaluated, false);
  assert.equal(relation.authority, null);
  assert.equal(relation.reconstruction.declarations[0].origin, 'AI_PROPOSAL');
  assert.equal(relation.reconstruction.status, 'INSUFFICIENT_EVIDENCE');
});
