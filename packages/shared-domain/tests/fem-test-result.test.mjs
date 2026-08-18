import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFemIntegrationBoundary,
  isUsableTestResult,
  TEST_RESULT_STATUSES,
} from '@jaryan/shared-domain';

test('FEM integration is a boundary and never fabricates results', () => {
  const boundary = buildFemIntegrationBoundary();
  const model = boundary.buildModel('SA-GEOM-001');
  assert.equal(model.status, 'MODEL_READY');

  const solved = boundary.solve(model);
  assert.equal(solved.solved, false);
  assert.equal(solved.resultsAvailable, false);

  const verification = boundary.verify([]);
  assert.equal(verification.verified, false);
  assert.match(verification.note, /no FEM results are fabricated/i);
});

test('test result model supports reported, rejected and reference-only statuses', () => {
  assert.deepEqual(TEST_RESULT_STATUSES, [
    'PENDING',
    'REPORTED',
    'REJECTED',
    'REFERENCE_ONLY',
  ]);
});

test('only reported finite test results with units are usable', () => {
  const usable = {
    testId: 'T-001',
    materialId: 'MAT-001',
    standard: 'ASTM D698',
    specimen: 'Proctor compaction',
    condition: 'Standard effort',
    measuredProperty: 'maxDryDensity',
    value: 1750,
    unit: 'kg/m³',
    status: 'REPORTED',
  };
  assert.equal(isUsableTestResult(usable), true);

  const pending = { ...usable, status: 'PENDING' };
  assert.equal(isUsableTestResult(pending), false);

  const rejected = { ...usable, status: 'REJECTED' };
  assert.equal(isUsableTestResult(rejected), false);

  const nonFinite = { ...usable, value: Number.NaN };
  assert.equal(isUsableTestResult(nonFinite), false);
});