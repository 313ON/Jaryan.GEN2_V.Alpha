import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  relationshipDeclaration,
  relationshipFact,
} from '@jaryan/shared-domain';
import {
  createEngineeringRelationshipQuery,
} from '@jaryan/shared-application';

const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
  accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 2 },
    { weightKn: 20, elevationM: 4 },
  ]),
);
const registry = createEngineeringKnowledgeRegistry().register(packageFixture);
const artifactEndpoint = knowledgeGraphEndpoint({
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: packageFixture.identity,
});
const physicalEndpoint = knowledgeGraphEndpoint({
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalReferentIdentity({
    referentKey: 'governed:REL:PHYSICAL-001',
  }),
});
const fact = relationshipFact({
  subject: physicalEndpoint,
  predicate: 'DESCRIBED_BY',
  object: artifactEndpoint,
});

const declaration = (overrides = {}) =>
  relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:REL',
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-01-01T00:00:00Z',
    },
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [],
    supersedes: [],
    ...overrides,
  });

const queryContext = {
  queryTime: '2026-08-22T12:00:00Z',
  applicabilityContext: 'PROJECT:REL',
};

test('application relationship query delegates exact historical reconstruction', () => {
  const first = declaration();
  const query = createEngineeringRelationshipQuery(registry, [first]);
  const result = query.reconstruct(fact, queryContext);

  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.deepEqual(
    result.declarations.map((item) => item.fingerprint),
    [first.fingerprint],
  );
  assert.equal(query.getGraph().declarations.length, 1);
});

test('application relationship query preserves deterministic order and conflicts', () => {
  const affirm = declaration();
  const deny = declaration({
    assertionDisposition: 'DENY',
    temporalValidity: {
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      recordedAt: '2026-02-01T00:00:00Z',
    },
  });
  const forward = createEngineeringRelationshipQuery(registry, [deny, affirm]);
  const reverse = createEngineeringRelationshipQuery(registry, [affirm, deny]);
  const first = forward.reconstruct(fact, queryContext);
  const second = reverse.reconstruct(fact, queryContext);

  assert.equal(first.status, 'CONFLICTING');
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(forward), true);
});

test('application relationship query keeps evidence external and AI non-authoritative', () => {
  const proposal = declaration({
    origin: 'AI_PROPOSAL',
    evidenceReferences: [packageFixture.provenance.sources[0]],
  });
  const query = createEngineeringRelationshipQuery(registry, [proposal]);
  const result = query.reconstruct(fact, queryContext, {
    resolve: () => ({ status: 'RESOLVED', complete: true }),
  });

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.evidence[0].status, 'RESOLVED');
  assert.equal(result.declarations[0].origin, 'AI_PROPOSAL');
  assert.equal('authorityStatus' in result, false);
  assert.equal('trustStatus' in result, false);
});

test('application relationship query does not fall back for invalid query context', () => {
  const query = createEngineeringRelationshipQuery(registry, [declaration()]);
  const result = query.reconstruct(fact, {
    queryTime: 'not-a-time',
    applicabilityContext: 'PROJECT:REL',
  });

  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.declarations, []);
});
