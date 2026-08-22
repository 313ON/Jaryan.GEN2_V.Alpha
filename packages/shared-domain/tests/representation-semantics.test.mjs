import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactIdentity,
  engineeringRepresentationSemanticMetadata,
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
    temporalValidity,
  });

  assert.deepEqual(validateEngineeringRepresentationSemanticMetadata(metadata), []);
  assert.equal(Object.isFrozen(metadata), true);
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
    },
  });
  const plan = relationshipDeclaration({
    ...base,
    representationMetadata: {
      representationKind: 'PLAN',
      semanticRole: 'DESIGN_INTENT',
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
        },
        supersedes: [],
      }),
    /only valid for REPRESENTED_BY/,
  );
});
