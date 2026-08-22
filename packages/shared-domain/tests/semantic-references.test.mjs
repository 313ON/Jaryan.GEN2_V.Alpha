import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactIdentity,
  engineeringObjectSemanticReference,
  locationReference,
  measurement,
  observation,
  physicalReferentIdentity,
  validateEngineeringObjectSemanticReference,
  validateLocationReference,
  validateTemporalValidity,
} from '@jaryan/shared-domain';

const artifact = engineeringArtifactIdentity({
  type: 'RESULT',
  systemCode: 'SEM',
  slug: 'REFERENCE',
  sequence: 1,
  name: 'Semantic reference',
  version: '1',
});

const physical = physicalReferentIdentity({
  referentKey: 'governed:PLANT-A:PUMP-001',
});

const artifactReference = {
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: artifact,
};

const physicalReference = {
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physical,
};

const temporalValidity = {
  recordedAt: '2026-08-22T10:00:00Z',
  validFrom: '2026-08-22T09:00:00Z',
};

test('engineering object references support artifact and physical referent identities', () => {
  const artifactResult = engineeringObjectSemanticReference(artifactReference);
  const physicalResult = engineeringObjectSemanticReference(physicalReference);

  assert.equal(artifactResult.kind, 'ARTIFACT');
  assert.equal(physicalResult.kind, 'PHYSICAL_REFERENT');
  assert.equal(artifactResult.status, 'RESOLVED');
  assert.equal(Object.isFrozen(physicalResult), true);
});

test('invalid, unknown, and ambiguous references remain explicit without fallback', () => {
  assert.ok(
    validateEngineeringObjectSemanticReference({
      kind: 'ARTIFACT',
      status: 'RESOLVED',
      identity: physical,
    }).length > 0,
  );
  for (const status of ['UNKNOWN', 'AMBIGUOUS', 'UNRESOLVED']) {
    const reference = engineeringObjectSemanticReference({
      kind: 'PHYSICAL_REFERENT',
      status,
    });
    assert.equal(reference.identity, null);
  }
});

test('location references remain opaque and non-canonical', () => {
  const location = locationReference({
    status: 'UNRESOLVED',
    referenceKey: 'imported:site:west',
  });

  assert.equal(location.status, 'UNRESOLVED');
  assert.equal(location.referenceKey, 'imported:site:west');
  assert.ok(validateLocationReference(location).length === 0);
  assert.throws(() => locationReference({ status: 'RESOLVED', referenceKey: 'site-1' }));
});

test('temporal validity reuses the existing contract and missing boundaries remain unknown', () => {
  assert.deepEqual(validateTemporalValidity({ recordedAt: temporalValidity.recordedAt }), []);
  assert.equal('validTo' in temporalValidity, false);
});

test('measurements preserve value, unit, subject, temporal context, and uncertainty', () => {
  const result = measurement({
    subject: physicalReference,
    value: 42.5,
    unit: 'mm',
    temporalValidity,
    uncertainty: 'ESTIMATED',
  });

  assert.equal(result.value, 42.5);
  assert.equal(result.unit, 'mm');
  assert.equal(result.uncertainty, 'ESTIMATED');
  assert.equal(Object.isFrozen(result), true);
  assert.match(result.fingerprint, /^[0-9a-f]{64}$/);
});

test('observations are immutable, provenance-bearing, and do not imply truth or trust', () => {
  const result = observation({
    subject: physicalReference,
    observedValue: { status: 'running' },
    observedAt: '2026-08-22T10:05:00Z',
    temporalValidity,
    location: { status: 'UNKNOWN' },
    measurement: {
      subject: physicalReference,
      value: 42.5,
      unit: 'mm',
      temporalValidity,
    },
    evidenceReferences: [artifact],
    lifecycleState: 'INSPECTED',
  });

  assert.equal(result.observedValue.status, 'running');
  assert.equal(result.measurement.unit, 'mm');
  assert.equal(result.location.status, 'UNKNOWN');
  assert.equal(result.lifecycleState, 'INSPECTED');
  assert.equal(result.evidenceReferences[0].id, artifact.id);
  assert.equal('trustStatus' in result, false);
  assert.equal('authorityStatus' in result, false);
  assert.equal(Object.isFrozen(result), true);
  assert.throws(() => {
    result.evidenceReferences.push(artifact);
  }, TypeError);
});

test('measurement and observation fingerprints are deterministic and reject tampering', () => {
  const first = measurement({
    subject: physicalReference,
    value: 1,
    unit: 'bar',
    temporalValidity,
  });
  const second = measurement({
    temporalValidity: { ...temporalValidity },
    unit: 'bar',
    value: 1,
    subject: { ...physicalReference },
  });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.throws(
    () =>
      measurement({
        subject: physicalReference,
        value: 2,
        unit: 'bar',
        temporalValidity,
        fingerprint: first.fingerprint,
      }),
    /fingerprint does not match/i,
  );
});
