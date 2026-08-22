import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  changeAffects,
  changeImplements,
  changeSupersedes,
  engineeringChangeEvent,
  engineeringDecision,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  decisionAppliesTo,
  decisionDerivedFrom,
  decisionSupersedes,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  relationshipDeclaration,
} from '@jaryan/shared-domain';
import { createEngineeringRelationshipQuery } from '@jaryan/shared-application';

const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 2 },
    { weightKn: 20, elevationM: 4 },
  ]),
);
const registry = createEngineeringKnowledgeRegistry().register(packageFixture);
const physicalEndpoint = knowledgeGraphEndpoint({
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalReferentIdentity({
    referentKey: 'governed:PHASE-17:PHYSICAL-001',
  }),
});
const artifactEndpoint = knowledgeGraphEndpoint({
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: packageFixture.identity,
});
const decision = engineeringDecision({
  identity: packageFixture.identity,
  kind: 'DECISION',
  subjectScope: [physicalEndpoint],
  outcome: 'Use the governed design basis.',
  rationale: 'The selected basis is supported by the record.',
  alternatives: ['Alternative A'],
  decisionTime: '2026-08-22T09:00:00Z',
  temporalValidity: {
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2026-12-31T23:59:59Z',
    recordedAt: '2026-08-22T09:00:00Z',
  },
  applicabilityContext: 'PROJECT:PHASE-17',
  status: 'ACCEPTED',
  resolution: 'RESOLVED',
  origin: 'HUMAN',
  actor: 'engineer-001',
  evidenceReferences: [packageFixture.provenance.sources[0]],
  supersedes: [],
});
const changeEvent = engineeringChangeEvent({
  identity: packageFixture.provenance.calculation,
  kind: 'IMPLEMENTED',
  affectedScope: [physicalEndpoint],
  description: 'Apply the selected design basis.',
  beforeMeaning: 'Original basis',
  afterMeaning: 'Governed design basis',
  eventTime: '2026-08-23T09:00:00Z',
  temporalValidity: {
    validFrom: '2026-01-01T00:00:00Z',
    validTo: '2026-12-31T23:59:59Z',
    recordedAt: '2026-08-23T09:00:00Z',
  },
  applicabilityContext: 'PROJECT:PHASE-17',
  relatedDecisionIdentities: [decision.identity],
  status: 'IMPLEMENTED',
  resolution: 'RESOLVED',
  origin: 'HUMAN',
  actor: 'engineer-002',
  evidenceReferences: [packageFixture.provenance.sources[0]],
  supersedes: [],
});

const declaration = (fact, overrides = {}) =>
  relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:PHASE-17',
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-08-22T10:00:00Z',
    },
    origin: 'HUMAN',
    actor: 'engineer-001',
    evidenceReferences: [packageFixture.provenance.sources[0]],
    supersedes: [],
    ...overrides,
  });

const decisionFactDeclarations = [
  declaration(decisionAppliesTo(decision, physicalEndpoint)),
  declaration(decisionDerivedFrom(decision, packageFixture.provenance.sources[0])),
  declaration(decisionSupersedes(decision, changeEvent)),
];
const changeFactDeclarations = [
  declaration(changeAffects(changeEvent, physicalEndpoint)),
  declaration(changeImplements(changeEvent, decision)),
  declaration(changeSupersedes(changeEvent, decision)),
];
const evidenceAdapter = {
  resolve: () => ({ status: 'RESOLVED', complete: true }),
};
const queryContext = {
  queryTime: '2026-08-22T12:00:00Z',
  applicabilityContext: 'PROJECT:PHASE-17',
};

test('application facade reconstructs typed decisions and changes through graph declarations', () => {
  const query = createEngineeringRelationshipQuery(registry, [
    ...decisionFactDeclarations,
    ...changeFactDeclarations,
  ]);
  const reconstructedDecision = query.reconstructDecision(
    decision,
    queryContext,
    evidenceAdapter,
  );
  const reconstructedChange = query.reconstructChangeEvent(
    changeEvent,
    queryContext,
    evidenceAdapter,
  );

  assert.equal(reconstructedDecision.decision.identity.id, decision.identity.id);
  assert.deepEqual(
    reconstructedDecision.relationships
      .map((item) => item.fact.predicate)
      .sort(),
    ['APPLIES_TO', 'DERIVED_FROM', 'SUPERSEDES'].sort(),
  );
  assert.deepEqual(
    reconstructedChange.relationships
      .map((item) => item.fact.predicate)
      .sort(),
    ['AFFECTS', 'IMPLEMENTS', 'SUPERSEDES'].sort(),
  );
  assert.ok(
    reconstructedChange.relationships.every(
      (item) => item.status === 'UNVERIFIED',
    ),
  );
});

test('query facade preserves temporal history, applicability, conflicts, and no latest fallback', () => {
  const appliesFact = decisionAppliesTo(decision, physicalEndpoint);
  const current = declaration(appliesFact);
  const historical = declaration(appliesFact, {
    temporalValidity: {
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
      recordedAt: '2026-08-23T10:00:00Z',
    },
  });
  const conflicting = declaration(appliesFact, {
    assertionDisposition: 'DENY',
    temporalValidity: {
      ...current.temporalValidity,
      recordedAt: '2026-08-24T10:00:00Z',
    },
  });
  const query = createEngineeringRelationshipQuery(registry, [
    conflicting,
    historical,
    current,
  ]);
  const result = query.reconstructDecision(
    decision,
    queryContext,
    evidenceAdapter,
  );
  const relationship = result.relationships.find(
    (item) => item.fact.fingerprint === appliesFact.fingerprint,
  );

  assert.equal(relationship.status, 'CONFLICTING');
  assert.equal(relationship.declarations.length, 2);
  assert.deepEqual(
    relationship.historicalDeclarations.map((item) => item.fingerprint),
    [historical.fingerprint],
  );
  assert.equal(
    relationship.declarations.some(
      (item) => item.fingerprint === conflicting.fingerprint,
    ),
    true,
  );

  const otherContext = query.reconstructDecision(
    decision,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'OTHER' },
    evidenceAdapter,
  );
  assert.ok(
    otherContext.relationships.every((item) => item.status === 'HISTORICAL'),
  );
});

test('AI proposals and unresolved declarations remain explicit and non-authoritative', () => {
  const proposal = declaration(decisionAppliesTo(decision, artifactEndpoint), {
    origin: 'AI_PROPOSAL',
    actor: null,
    evidenceReferences: [],
  });
  const unresolved = declaration(changeAffects(changeEvent, physicalEndpoint), {
    temporalValidity: { recordedAt: '2026-08-22T10:00:00Z' },
  });
  const query = createEngineeringRelationshipQuery(registry, [proposal, unresolved]);
  const decisionResult = query.reconstructDecision(decision, queryContext);
  const changeResult = query.reconstructChangeEvent(changeEvent, queryContext);

  assert.equal(decisionResult.relationships[0].status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(decisionResult.relationships[0].declarations[0].origin, 'AI_PROPOSAL');
  assert.equal(changeResult.relationships[0].status, 'UNKNOWN');
});

test('typed query ordering is independent of declaration registration order', () => {
  const forward = createEngineeringRelationshipQuery(registry, [
    ...changeFactDeclarations,
    ...decisionFactDeclarations,
  ]).reconstructChangeEvent(changeEvent, queryContext, evidenceAdapter);
  const reverse = createEngineeringRelationshipQuery(registry, [
    ...decisionFactDeclarations,
    ...changeFactDeclarations,
  ]).reconstructChangeEvent(changeEvent, queryContext, evidenceAdapter);

  assert.deepEqual(forward, reverse);
  assert.equal(Object.isFrozen(forward), true);
  assert.equal(Object.isFrozen(forward.relationships), true);
});
