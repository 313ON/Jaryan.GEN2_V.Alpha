import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactIdentity,
  engineeringRepresentationSemanticMetadata,
  reconstructRelationship,
  relationshipDeclaration,
  relationshipFact,
  validateEngineeringRepresentationSemanticMetadata,
} from '@jaryan/shared-domain';

const artifact = (type, slug, sequence = 1) =>
  engineeringArtifactIdentity({
    type,
    systemCode: 'REP',
    slug,
    sequence,
    name: `${slug} artifact`,
    version: '1',
  });

const physicalEndpoint = {
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: {
    identityKind: 'PHYSICAL_REFERENT',
    referentKey: 'governed:REP:BUILDING-001',
  },
};

const drawingEndpoint = {
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: artifact('SOURCE', 'DRAWING'),
};

const fact = relationshipFact({
  subject: physicalEndpoint,
  predicate: 'REPRESENTED_BY',
  object: drawingEndpoint,
});

const temporalValidity = {
  validFrom: '2026-01-01T00:00:00Z',
  validTo: '2026-12-31T23:59:59Z',
  recordedAt: '2026-08-22T10:00:00Z',
};

test('representation metadata classifies plan/drawing meaning and remains immutable', () => {
  const metadata = engineeringRepresentationSemanticMetadata({
    representationKind: 'DRAWING',
    semanticRole: 'DESIGN_INTENT',
    issue: 'IFC-02',
  });

  assert.deepEqual(validateEngineeringRepresentationSemanticMetadata(metadata), []);
  assert.equal(Object.isFrozen(metadata), true);
  assert.equal(metadata.issue, 'IFC-02');
});

test('representation metadata is declaration-scoped and participates in deterministic fingerprints', () => {
  const base = {
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'PROJECT-REP',
    temporalValidity,
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [artifact('SOURCE', 'EVIDENCE')],
    supersedes: [],
  };
  const drawing = relationshipDeclaration({
    ...base,
    representationMetadata: {
      representationKind: 'DRAWING',
      semanticRole: 'DESIGN_INTENT',
      issue: 'IFC-02',
    },
  });
  const plan = relationshipDeclaration({
    ...base,
    representationMetadata: {
      representationKind: 'PLAN',
      semanticRole: 'DESIGN_INTENT',
      issue: 'IFC-03',
    },
  });

  assert.equal(drawing.representationMetadata.representationKind, 'DRAWING');
  assert.notEqual(drawing.fingerprint, plan.fingerprint);
  assert.equal(drawing.fact.fingerprint, plan.fact.fingerprint);
});

test('representation metadata cannot be attached to another predicate', () => {
  const dependencyFact = relationshipFact({
    subject: { kind: 'identity', identity: artifact('RESULT', 'RESULT') },
    predicate: 'DEPENDENCY',
    object: { kind: 'identity', identity: artifact('CALCULATION', 'CALC') },
  });

  assert.throws(
    () =>
      relationshipDeclaration({
        fact: dependencyFact,
        assertionDisposition: 'AFFIRM',
        applicabilityContext: null,
        temporalValidity,
        origin: 'SYSTEM',
        actor: null,
        evidenceReferences: [],
        representationMetadata: {
          representationKind: 'PLAN',
          semanticRole: 'REFERENCE',
          issue: null,
        },
        supersedes: [],
      }),
    /only valid for REPRESENTED_BY/,
  );
});

test('representation issue remains explicit and rejects empty labels', () => {
  const errors = validateEngineeringRepresentationSemanticMetadata({
    representationKind: 'DRAWING',
    semanticRole: 'REFERENCE',
    issue: '   ',
  });

  assert.ok(errors.some((error) => error.includes('issue must be non-empty')));
  assert.equal(
    engineeringRepresentationSemanticMetadata({
      representationKind: 'DRAWING',
      semanticRole: 'REFERENCE',
    }).issue,
    null,
  );
});

test('issue applicability uses the existing declaration context without implicit latest selection', () => {
  const declarationForIssue02 = relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'ISSUE-02',
    temporalValidity,
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [artifact('SOURCE', 'EVIDENCE')],
    representationMetadata: {
      representationKind: 'DRAWING',
      semanticRole: 'DESIGN_INTENT',
      issue: '02',
    },
    supersedes: [],
  });
  const declarationForIssue03 = relationshipDeclaration({
    fact,
    assertionDisposition: 'AFFIRM',
    applicabilityContext: 'ISSUE-03',
    temporalValidity,
    origin: 'IMPORTED',
    actor: null,
    evidenceReferences: [artifact('SOURCE', 'EVIDENCE')],
    representationMetadata: {
      representationKind: 'DRAWING',
      semanticRole: 'DESIGN_INTENT',
      issue: '03',
    },
    supersedes: [],
  });

  const result = reconstructRelationship(
    fact,
    [declarationForIssue02, declarationForIssue03],
    () => 'RESOLVED',
    {
      queryTime: '2026-08-22T12:00:00Z',
      applicabilityContext: 'ISSUE-02',
    },
    {
      resolve: () => ({ status: 'RESOLVED', complete: true }),
    },
  );

  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.declarations.length, 1);
  assert.equal(result.declarations[0].representationMetadata.issue, '02');
  assert.equal(result.historicalDeclarations.length, 1);
  assert.equal(
    result.historicalDeclarations[0].representationMetadata.issue,
    '03',
  );
});
