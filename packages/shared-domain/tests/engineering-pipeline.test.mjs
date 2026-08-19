import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defineEngineeringPipeline,
  runEngineeringPipeline,
  STANDARD_ENGINEERING_PIPELINE_STAGES,
  toEngineeringCalculationResult,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';

const demandPipeline = defineEngineeringPipeline({
  id: 'DEMO-PIPELINE-001',
  description: 'Demonstration pipeline for the reusable calculation contract',
  validate: (input) => {
    const issues = [];
    if (!Number.isFinite(input.volumeM3) || input.volumeM3 <= 0) {
      issues.push({ field: 'volumeM3', message: 'Volume must be positive.' });
    }
    if (!Number.isFinite(input.densityKgM3) || input.densityKgM3 <= 0) {
      issues.push({ field: 'densityKgM3', message: 'Density must be positive.' });
    }
    return issues;
  },
  solve: (input) => rowWeightPrimitive(input),
  produce: (primitive) => [toEngineeringCalculationResult(primitive)],
});

test('pipeline exposes the standard reusable stage contract', () => {
  assert.deepEqual(STANDARD_ENGINEERING_PIPELINE_STAGES, [
    'INPUT',
    'VALIDATOR',
    'SOLVER',
    'DEMAND',
    'CAPACITY',
    'TRACEABILITY',
    'RESULT',
  ]);
  assert.deepEqual(demandPipeline.stages, STANDARD_ENGINEERING_PIPELINE_STAGES);
});

test('valid input runs through the pipeline to a completed result', () => {
  const run = runEngineeringPipeline(demandPipeline, {
    volumeM3: 1,
    densityKgM3: 2000,
  });

  assert.equal(run.pipelineId, 'DEMO-PIPELINE-001');
  assert.equal(run.status, 'COMPLETED');
  assert.deepEqual(run.issues, []);
  assert.ok(run.solved);
  assert.equal(run.results.length, 1);
  assert.equal(run.results[0].id, 'RESULT-SA-ROW-WEIGHT-001-v1');
  assert.equal(run.results[0].value, 19.62);
});

test('invalid input fails validation before the solver runs', () => {
  const run = runEngineeringPipeline(demandPipeline, {
    volumeM3: 0,
    densityKgM3: 2000,
  });

  assert.equal(run.status, 'INVALID');
  assert.equal(run.solved, null);
  assert.deepEqual(run.results, []);
  assert.ok(run.issues.some((issue) => issue.field === 'volumeM3'));
});

test('a run whose results require review reports REVIEW_REQUIRED', () => {
  const reviewPipeline = defineEngineeringPipeline({
    id: 'DEMO-PIPELINE-002',
    description: 'Pipeline producing a review-required result',
    validate: () => [],
    solve: (value) => value,
    produce: (value) => [
      {
        id: 'SA-COMPRESSION-CHECK-001',
        value: value,
        unit: 'kPa',
        status: 'UNVERIFIED',
        confidence: 'UNKNOWN',
        assumptions: ['Capacity pending validation.'],
        sources: [],
        reviewerRequired: true,
      },
    ],
  });

  const run = runEngineeringPipeline(reviewPipeline, 100);
  assert.equal(run.status, 'REVIEW_REQUIRED');
  assert.equal(run.results[0].status, 'UNVERIFIED');
});
