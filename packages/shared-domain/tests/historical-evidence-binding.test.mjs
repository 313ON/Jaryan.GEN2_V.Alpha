import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactIdentity,
  historicalEvidenceBinding,
  validateHistoricalEvidenceBinding,
} from '@jaryan/shared-domain';

const calculationIdentity = engineeringArtifactIdentity({
  type: 'CALCULATION',
  systemCode: 'D92',
  slug: 'HISTORICAL',
  sequence: 1,
  name: 'Historical calculation',
  version: '1',
  metadata: { domain: 'engineering' },
});

const bindingInput = {
  calculationIdentity,
  snapshotId: 'snapshot-opaque-1',
};

test('constructs a valid historical evidence binding for a calculation', () => {
  const binding = historicalEvidenceBinding(bindingInput);

  assert.deepEqual(binding, bindingInput);
  assert.equal(binding.calculationIdentity.type, 'CALCULATION');
  assert.equal(binding.snapshotId, 'snapshot-opaque-1');
});

test('rejects an invalid calculation identity', () => {
  assert.throws(
    () =>
      historicalEvidenceBinding({
        ...bindingInput,
        calculationIdentity: {
          ...calculationIdentity,
          id: 'forged',
        },
      }),
    /Calculation identity is invalid/,
  );
});

test('rejects a non-CALCULATION identity', () => {
  const resultIdentity = engineeringArtifactIdentity({
    type: 'RESULT',
    systemCode: 'D92',
    slug: 'HISTORICAL',
    sequence: 1,
    name: 'Historical result',
    version: '1',
  });

  assert.throws(
    () =>
      historicalEvidenceBinding({
        calculationIdentity: resultIdentity,
        snapshotId: 'snapshot-opaque-1',
      }),
    /must use the CALCULATION type/,
  );
});

test('rejects an empty snapshot id', () => {
  assert.throws(
    () =>
      historicalEvidenceBinding({
        ...bindingInput,
        snapshotId: '',
      }),
    /Snapshot id must be a non-empty opaque string/,
  );
});

test('deeply freezes the binding and its embedded identity', () => {
  const binding = historicalEvidenceBinding(bindingInput);

  assert.equal(Object.isFrozen(binding), true);
  assert.equal(Object.isFrozen(binding.calculationIdentity), true);
  assert.equal(Object.isFrozen(binding.calculationIdentity.metadata), true);
  assert.throws(() => {
    binding.snapshotId = 'changed';
  }, TypeError);
  assert.throws(() => {
    binding.calculationIdentity.metadata.domain = 'changed';
  }, TypeError);
});

test('equal structural inputs produce equal bindings deterministically', () => {
  const first = historicalEvidenceBinding(bindingInput);
  const second = historicalEvidenceBinding({
    calculationIdentity: {
      ...calculationIdentity,
      metadata: { domain: 'engineering' },
    },
    snapshotId: 'snapshot-opaque-1',
  });

  assert.deepEqual(first, second);
});

test('calculation identity and snapshot id remain separate values', () => {
  const binding = historicalEvidenceBinding(bindingInput);

  assert.notEqual(binding.calculationIdentity.id, binding.snapshotId);
  assert.notEqual(binding.calculationIdentity.baseId, binding.snapshotId);
  assert.equal('bindingId' in binding, false);
  assert.equal('fingerprint' in binding, false);
  assert.equal('executionReference' in binding, false);
});

test('validation exposes no independent binding identity or graph shape', () => {
  assert.deepEqual(validateHistoricalEvidenceBinding(bindingInput), []);
  assert.equal('type' in bindingInput, false);
  assert.equal('id' in bindingInput, false);
  assert.equal('graphAuthority' in bindingInput, false);
});
