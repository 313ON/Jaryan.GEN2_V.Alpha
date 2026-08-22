import assert from 'node:assert/strict';
import test from 'node:test';
import {
  physicalReferentIdentity,
  physicalReferentIdentityFingerprint,
  physicalReferentResolution,
  validatePhysicalReferentIdentity,
  validatePhysicalReferentIdentityInput,
} from '@jaryan/shared-domain';

const input = (referentKey = 'governed:PLANT-A:PUMP-001') => ({ referentKey });

test('constructs a deterministic physical referent identity under the existing authority', () => {
  const identity = physicalReferentIdentity(input());

  assert.equal(identity.identityAuthority, 'EngineeringArtifactIdentity');
  assert.equal(identity.identityKind, 'PHYSICAL_REFERENT');
  assert.equal(identity.canonicalIdentity, physicalReferentIdentityFingerprint(input().referentKey));
  assert.deepEqual(validatePhysicalReferentIdentity(identity), []);
  assert.equal(Object.isFrozen(identity), true);
});

test('identical governed content produces identical identities and changed content differs', () => {
  assert.deepEqual(physicalReferentIdentity(input()), physicalReferentIdentity(input()));
  assert.notEqual(
    physicalReferentIdentity(input()).canonicalIdentity,
    physicalReferentIdentity(input('governed:PLANT-A:PUMP-002')).canonicalIdentity,
  );
});

test('identity is immutable and has no generated persistence or API identity', () => {
  const identity = physicalReferentIdentity(input());

  assert.equal(Object.keys(identity).sort().join(','), 'canonicalIdentity,identityAuthority,identityKind,referentKey');
  assert.equal('id' in identity, false);
  assert.equal('uuid' in identity, false);
  assert.equal('databaseId' in identity, false);
  assert.equal('apiId' in identity, false);
  assert.throws(() => {
    identity.referentKey = 'changed';
  }, TypeError);
});

test('identity claims are recomputed and forged or stale content is rejected', () => {
  const identity = physicalReferentIdentity(input());

  assert.throws(
    () =>
      physicalReferentIdentity({
        ...input(),
        canonicalIdentity: '0'.repeat(64),
      }),
    /canonical identity does not match/i,
  );
  assert.throws(
    () =>
      physicalReferentIdentity({
        referentKey: 'governed:PLANT-A:PUMP-002',
        canonicalIdentity: identity.canonicalIdentity,
      }),
    /canonical identity does not match/i,
  );
});

test('identity validation rejects unsupported authority, kind, and empty content', () => {
  const errors = validatePhysicalReferentIdentityInput({
    referentKey: '',
    identityAuthority: 'OtherAuthority',
    identityKind: 'ARTIFACT',
  });

  assert.ok(errors.some((error) => error.includes('authority')));
  assert.ok(errors.some((error) => error.includes('kind')));
  assert.ok(errors.some((error) => error.includes('Referent key')));
});

test('artifact and physical referent identity roles remain distinguishable', () => {
  const identity = physicalReferentIdentity(input());
  assert.notEqual(identity.identityKind, 'ARTIFACT');
  assert.notEqual(identity.canonicalIdentity, input().referentKey);
});

test('serialization round-trip preserves identity and tampering is detected', () => {
  const identity = physicalReferentIdentity(input());
  const roundTrip = physicalReferentIdentity(JSON.parse(JSON.stringify(identity)));

  assert.deepEqual(roundTrip, identity);
  assert.throws(
    () =>
      physicalReferentIdentity({
        ...JSON.parse(JSON.stringify(identity)),
        referentKey: 'governed:PLANT-A:PUMP-999',
      }),
    /canonical identity does not match/i,
  );
});

test('unknown, ambiguous, and unresolved results never carry a canonical identity', () => {
  const identity = physicalReferentIdentity(input());

  assert.deepEqual(physicalReferentResolution('RESOLVED', identity), {
    status: 'RESOLVED',
    identity,
  });
  for (const status of ['UNKNOWN', 'AMBIGUOUS', 'UNRESOLVED']) {
    assert.deepEqual(physicalReferentResolution(status), {
      status,
      identity: null,
    });
  }
  assert.throws(() => physicalReferentResolution('UNKNOWN', identity));
  assert.throws(() => physicalReferentResolution('RESOLVED'));
});
