import assert from 'node:assert/strict';
import test from 'node:test';
import {
  stableSerialize,
  contentFingerprint,
  calculationContentFingerprint,
} from '@jaryan/shared-domain';

const payload = () => ({
  definition: 'CALC-SA-ROW-WEIGHT-001',
  version: '1',
  formula: 'W = ρ · V · g',
  assumptions: ['Homogeneous compacted density per row.', 'g = 9.81 m/s².'],
  inputs: { volumeM3: 2.5, densityKgM3: 1850 },
});

test('identical calculation payloads produce identical fingerprints', () => {
  assert.equal(
    calculationContentFingerprint(payload()),
    calculationContentFingerprint(payload()),
  );
});

test('version changes produce different fingerprints', () => {
  const v1 = calculationContentFingerprint(payload());
  const v2 = calculationContentFingerprint({
    ...payload(),
    version: '2',
  });
  assert.notEqual(v1, v2);
});

test('input changes produce different fingerprints', () => {
  const baseline = calculationContentFingerprint(payload());
  const changed = calculationContentFingerprint({
    ...payload(),
    inputs: { ...payload().inputs, densityKgM3: 2000 },
  });
  assert.notEqual(baseline, changed);
});

test('formula and assumption changes produce different fingerprints', () => {
  const baseline = calculationContentFingerprint(payload());
  const changedFormula = calculationContentFingerprint({
    ...payload(),
    formula: 'W = ρ · V · g / 1000',
  });
  const changedAssumption = calculationContentFingerprint({
    ...payload(),
    assumptions: ['Different assumption.'],
  });
  assert.notEqual(baseline, changedFormula);
  assert.notEqual(baseline, changedAssumption);
});

test('fingerprints are deterministic and contain no timestamps or randomness', () => {
  const fingerprint = contentFingerprint(payload());
  const repeated = contentFingerprint(payload());
  assert.equal(fingerprint, repeated);
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.ok(!fingerprint.includes('T'));
});

test('stable serialization is independent of object key order', () => {
  assert.equal(
    stableSerialize({ a: 1, b: 2 }),
    stableSerialize({ b: 2, a: 1 }),
  );
  assert.equal(stableSerialize([1, 2, 3]), '[1,2,3]');
});

test('fingerprints differ when only serialization order differs', () => {
  assert.notEqual(
    contentFingerprint([1, 2]),
    contentFingerprint([2, 1]),
  );
});