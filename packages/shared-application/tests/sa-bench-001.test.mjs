import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runSuperAdobeBenchmark001,
  SA_BENCH_001,
} from '@jaryan/shared-application';

test('SA-BENCH-001 runs against the simple circular dome case', () => {
  const run = runSuperAdobeBenchmark001();
  assert.equal(run.benchmarkId, 'SA-BENCH-001');
  assert.equal(run.checks.length, 10);
  assert.equal(run.passed, true, JSON.stringify(run.checks));
});

test('SA-BENCH-001 case matches its documented inputs', () => {
  assert.equal(SA_BENCH_001.case.inputs.geometryType, 'circular');
  assert.equal(SA_BENCH_001.case.inputs.innerDiameterM, 6);
  assert.equal(SA_BENCH_001.case.inputs.domeHeightM, 3.6);
  assert.equal(SA_BENCH_001.case.lateralDemandKn, 40);
});

test('SA-BENCH-001 documents its benchmark scope', () => {
  assert.match(SA_BENCH_001.title, /Deterministic circular-dome solver pipeline/);
  assert.match(SA_BENCH_001.description, /internal consistency/);
  assert.match(SA_BENCH_001.description, /no external validation values/i);
});