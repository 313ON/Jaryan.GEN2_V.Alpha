import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changeAffects,
  changeDerivedFrom,
  changeEventEndpoint,
  changeImplements,
  changeSupportedBy,
  changeSupersedes,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringArtifactIdentity,
  engineeringChangeEvent,
  engineeringDecision,
  knowledgeGraphEndpoint,
  physicalReferentIdentity,
  reconstructEngineeringRelationship,
  relationshipDeclaration,
  relationshipFact,
  resolveEngineeringKnowledgeGraph,
  rowWeightPrimitive,
  decisionAppliesTo,
  decisionDerivedFrom,
  decisionEndpoint,
  decisionSupportedBy,
  decisionSupersedes,
} from '@jaryan/shared-domain';

const artifact = (slug, sequence, type = 'SOURCE') =>
  engineeringArtifactIdentity({
    type,
    systemCode: 'DEC',
    slug,
    sequence,
    name: `${slug} artifact`,
    version: '1',
  });

const decisionIdentity = artifact('DECISION-001', 1);
const changeIdentity = artifact('CHANGE-001', 2);
const evidenceIdentity = artifact('EVIDENCE-001', 3);
const physicalIdentity = physicalReferentIdentity({
  referentKey: 'governed:DECISION:PHYSICAL-001',
});
const physicalEndpoint = knowledgeGraphEndpoint({
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalIdentity,
});
const artifactEndpoint = (identity) =>
  knowledgeGraphEndpoint({
    kind: 'ARTIFACT',
    status: 'RESOLVED',
    identity,
  });
const temporalValidity = {
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  recordedAt: '2026-08-22T10:00:00Z',
};

const decision = (overrides = {}) =>
  engineeringDecision({
    identity: decisionIdentity,
    kind: 'DECISION',
    subjectScope: [physicalEndpoint],
    outcome: 'Use the governed design basis.',
    rationale: 'The selected basis is supported by the available record.',
    alternatives: ['Alternative B', 'Alternative A'],
    decisionTime: '2026-08-22T09:00:00Z',
    temporalValidity,
    applicabilityContext: 'PROJECT:DEC',
    status: 'ACCEPTED',
    resolution: 'RESOLVED',
    origin: 'HUMAN',
    actor: 'engineer-001',
    evidenceReferences: [evidenceIdentity],
    supersedes: [],
    ...overrides,
  });

const change = (overrides = {}) =>
  engineeringChangeEvent({
    identity: changeIdentity,
    kind: 'IMPLEMENTED',
    affectedScope: [physicalEndpoint],
    description: 'The declared design basis was implemented.',
    beforeMeaning: 'Original basis',
    afterMeaning: 'Governed design basis',
    eventTime: '2026-08-23T09:00:00Z',
    temporalValidity,
    applicabilityContext: 'PROJECT:DEC',
    relatedDecisionIdentities: [decisionIdentity],
    status: 'IMPLEMENTED',
    resolution: 'RESOLVED',
    origin: 'HUMAN',
    actor: 'engineer-002',
    evidenceReferences: [evidenceIdentity],
    supersedes: [],
    ...overrides,
  });

test('decision and change declarations are immutable and fingerprint-deterministic', () => {
  const first = decision();
  const second = decision({
    subjectScope: [physicalEndpoint, physicalEndpoint],
    alternatives: ['Alternative A', 'Alternative B'],
  });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.subjectScope), true);
  assert.equal(Object.isFrozen(first.temporalValidity), true);
  assert.throws(() => {
    first.outcome = 'mutated';
  }, TypeError);

  const event = change();
  assert.equal(Object.isFrozen(event), true);
  assert.notEqual(first.fingerprint, event.fingerprint);
});

test('validation preserves explicit unresolved states and rejects malformed declarations', () => {
  assert.equal(decision({ resolution: 'UNRESOLVED' }).resolution, 'UNRESOLVED');
  assert.equal(change({ resolution: 'AMBIGUOUS' }).resolution, 'AMBIGUOUS');
  assert.throws(
    () => decision({ subjectScope: [] }),
    /Subject scope must contain at least one canonical endpoint/,
  );
  assert.throws(
    () => change({ eventTime: 'not-a-time' }),
    /Event time must be an ISO-8601 timestamp/,
  );
  assert.throws(
    () => decision({ supersedes: ['not-a-fingerprint'] }),
    /lowercase SHA-256 fingerprint/,
  );
});

test('six decision/change helpers use only canonical artifact and physical endpoints', () => {
  const currentDecision = decision();
  const currentChange = change();

  assert.equal(decisionAppliesTo(currentDecision, physicalEndpoint).predicate, 'APPLIES_TO');
  assert.equal(changeAffects(currentChange, physicalEndpoint).predicate, 'AFFECTS');
  assert.equal(decisionSupportedBy(currentDecision, evidenceIdentity).predicate, 'SUPPORTED_BY');
  assert.equal(changeSupportedBy(currentChange, evidenceIdentity).predicate, 'SUPPORTED_BY');
  assert.equal(decisionDerivedFrom(currentDecision, evidenceIdentity).predicate, 'DERIVED_FROM');
  assert.equal(changeDerivedFrom(currentChange, currentDecision).predicate, 'DERIVED_FROM');
  assert.equal(changeImplements(currentChange, currentDecision).predicate, 'IMPLEMENTS');
  assert.equal(decisionSupersedes(currentDecision, currentChange).predicate, 'SUPERSEDES');
  assert.equal(changeSupersedes(currentChange, currentDecision).predicate, 'SUPERSEDES');
  assert.equal(decisionEndpoint(currentDecision).kind, 'ARTIFACT');
  assert.equal(changeEventEndpoint(currentChange).kind, 'ARTIFACT');

  assert.throws(
    () => decisionSupportedBy(currentDecision, physicalIdentity),
    /validateEngineeringArtifactIdentity|Invalid KnowledgeGraph endpoint/,
  );
  assert.throws(
    () =>
      relationshipFact({
        subject: decisionEndpoint(currentDecision),
        predicate: 'SUPPORTED_BY',
        object: physicalEndpoint,
      }),
    /SUPPORTED_BY requires object endpoint kind ARTIFACT/,
  );
  assert.throws(
    () =>
      relationshipFact({
        subject: decisionEndpoint(currentDecision),
        predicate: 'DERIVED_FROM',
        object: physicalEndpoint,
      }),
    /DERIVED_FROM requires object endpoint kind ARTIFACT/,
  );
});

test('evidence remains an artifact reference and never becomes a graph endpoint', () => {
  const currentDecision = decision();
  assert.deepEqual(
    currentDecision.evidenceReferences.map((reference) => reference.id),
    [evidenceIdentity.id],
  );
  assert.equal('identityKind' in evidenceIdentity, false);
  assert.throws(
    () =>
      knowledgeGraphEndpoint({
        kind: 'EVIDENCE',
        status: 'RESOLVED',
        identity: evidenceIdentity,
      }),
    /Unsupported reference kind|Invalid KnowledgeGraph endpoint/,
  );
});

test('new predicates reconstruct through KnowledgeGraph with temporal and supersession semantics', () => {
  const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const registry = createEngineeringKnowledgeRegistry().register(packageFixture);
  const registeredChange = change({
    identity: packageFixture.provenance.calculation,
    evidenceReferences: packageFixture.provenance.sources,
  });
  const old = relationshipDeclaration({
    fact: changeAffects(registeredChange, physicalEndpoint),
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:DEC',
    temporalValidity,
    origin: 'HUMAN',
    actor: 'engineer-002',
    evidenceReferences: packageFixture.provenance.sources,
    supersedes: [],
  });
  const replacement = relationshipDeclaration({
    fact: old.fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:DEC',
    temporalValidity: {
      ...temporalValidity,
      recordedAt: '2026-08-23T10:00:00Z',
    },
    origin: 'HUMAN',
    actor: 'engineer-003',
    evidenceReferences: packageFixture.provenance.sources,
    supersedes: [old.fingerprint],
  });
  const graph = resolveEngineeringKnowledgeGraph(registry, [replacement, old]);
  const reconstructed = reconstructEngineeringRelationship(
    registry,
    graph,
    old.fact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:DEC' },
    { resolve: () => ({ status: 'RESOLVED', complete: true }) },
  );

  assert.equal(reconstructed.status, 'UNVERIFIED');
  assert.deepEqual(
    reconstructed.declarations.map((item) => item.fingerprint),
    [replacement.fingerprint],
  );
  assert.deepEqual(
    reconstructed.historicalDeclarations.map((item) => item.fingerprint),
    [old.fingerprint],
  );
  assert.equal(graph.edges.some((edge) => edge.predicate === 'AFFECTS'), false);
  assert.equal(graph.declarations.length, 2);
});

test('record time alone never selects a latest decision or change', () => {
  const packageFixture = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const registry = createEngineeringKnowledgeRegistry().register(packageFixture);
  const currentDecision = decision({
    identity: packageFixture.identity,
    evidenceReferences: packageFixture.provenance.sources,
  });
  const later = relationshipDeclaration({
    fact: decisionAppliesTo(currentDecision, physicalEndpoint),
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:DEC',
    temporalValidity: {
      ...temporalValidity,
      recordedAt: '2026-12-01T10:00:00Z',
    },
    origin: 'HUMAN',
    actor: 'engineer-004',
    evidenceReferences: packageFixture.provenance.sources,
    supersedes: [],
  });
  const earlier = relationshipDeclaration({
    fact: later.fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT:DEC',
    temporalValidity,
    origin: 'HUMAN',
    actor: 'engineer-001',
    evidenceReferences: packageFixture.provenance.sources,
    supersedes: [],
  });
  const result = reconstructEngineeringRelationship(
    registry,
    resolveEngineeringKnowledgeGraph(registry, [later, earlier]),
    earlier.fact,
    { queryTime: '2026-08-22T12:00:00Z', applicabilityContext: 'PROJECT:DEC' },
    { resolve: () => ({ status: 'RESOLVED', complete: true }) },
  );

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.declarations.length, 2);
});
