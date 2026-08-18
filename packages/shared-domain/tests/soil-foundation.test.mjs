import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySoilEvidence,
  foundationCheck,
  promoteToVerified,
  terzaghiBearingCapacity,
  terzaghiFactors,
} from '@jaryan/shared-domain';

test('Terzaghi factors are exact for the cohesionless reference case', () => {
  assert.deepEqual(terzaghiFactors(0), { nc: 5.14, nq: 1, ngamma: 0 });
});

test('bearing capacity scales with width and depth', () => {
  const narrow = terzaghiBearingCapacity({
    cohesionKpa: 0,
    frictionAngleDeg: 30,
    unitWeightKnM3: 18,
    depthM: 1,
    widthM: 1,
    factorOfSafety: 3,
  });
  const wide = terzaghiBearingCapacity({
    cohesionKpa: 0,
    frictionAngleDeg: 30,
    unitWeightKnM3: 18,
    depthM: 1,
    widthM: 2,
    factorOfSafety: 3,
  });

  assert.ok(narrow.ultimateKpa > 0);
  assert.ok(wide.ultimateKpa > narrow.ultimateKpa);
  assert.ok(Math.abs(wide.allowableKpa - wide.ultimateKpa / 3) < 0.15);
});

test('foundation check is PRELIMINARY without verified soil evidence', () => {
  const result = foundationCheck(
    { cohesionKpa: 10, frictionAngleDeg: 25, unitWeightKnM3: 18, depthM: 1, widthM: 1, factorOfSafety: 3 },
    100,
    'PRELIMINARY',
  );

  assert.equal(result.status, 'PRELIMINARY');
  assert.equal(result.confidence, 'LOW');
  assert.ok(result.validationRequirements.length > 0);
});

test('foundation check passes against verified soil evidence', () => {
  const result = foundationCheck(
    { cohesionKpa: 50, frictionAngleDeg: 30, unitWeightKnM3: 19, depthM: 1.5, widthM: 1, factorOfSafety: 3 },
    100,
    'VERIFIED',
  );

  assert.equal(result.status, 'OK');
  assert.equal(result.confidence, 'MEDIUM');
  assert.equal(result.review.reviewRequirement, 'ENGINEER_REVIEW');
});

test('foundation check fails when applied bearing exceeds allowable capacity', () => {
  const result = foundationCheck(
    { cohesionKpa: 0, frictionAngleDeg: 0, unitWeightKnM3: 17, depthM: 0.5, widthM: 0.5, factorOfSafety: 2 },
    500,
    'VERIFIED',
  );

  assert.equal(result.status, 'FAIL');
  assert.ok(result.utilization > 1);
});

test('foundation check exposes formula and source traceability', () => {
  const result = foundationCheck(
    { cohesionKpa: 10, frictionAngleDeg: 25, unitWeightKnM3: 18, depthM: 1, widthM: 1, factorOfSafety: 3 },
    100,
    'PRELIMINARY',
  );

  assert.equal(result.method.length > 0, true);
  assert.match(result.formula, /q_u = c·Nc/);
  assert.deepEqual(result.sourceIds, ['TERZAGHI-1943']);
});

test('remote or assumed soil evidence is never promoted to verified', () => {
  assert.equal(classifySoilEvidence('REMOTE'), 'PRELIMINARY');
  assert.equal(classifySoilEvidence('ASSUMPTION'), 'PRELIMINARY');
  assert.equal(classifySoilEvidence('FIELD_TEST'), 'VERIFIED');
  assert.equal(classifySoilEvidence('LAB_TEST'), 'VERIFIED');

  assert.throws(
    () => promoteToVerified({ id: 'remote-soil', name: 'Remote soil', evidenceKind: 'REMOTE', status: 'PRELIMINARY', notes: '' }),
    /cannot be promoted to verified engineering data/,
  );

  const promoted = promoteToVerified({ id: 'lab-soil', name: 'Lab soil', evidenceKind: 'LAB_TEST', status: 'PRELIMINARY', notes: '' });
  assert.equal(promoted.status, 'VERIFIED');
});