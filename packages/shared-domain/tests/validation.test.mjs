import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONFIDENCE_LEVELS,
  CONSEQUENCE_LEVELS,
  evaluateReviewRequirement,
  evaluateValidation,
  isHumanReviewRequired,
  VALIDATION_STATUSES,
} from '@jaryan/shared-domain';

test('low or unknown confidence with high consequence requires human review', () => {
  assert.equal(evaluateReviewRequirement('LOW', 'HIGH'), 'HUMAN_REVIEW_REQUIRED');
  assert.equal(evaluateReviewRequirement('UNKNOWN', 'HIGH'), 'HUMAN_REVIEW_REQUIRED');
});

test('high consequence alone escalates to engineer review', () => {
  assert.equal(evaluateReviewRequirement('HIGH', 'HIGH'), 'ENGINEER_REVIEW');
  assert.equal(evaluateReviewRequirement('MEDIUM', 'HIGH'), 'ENGINEER_REVIEW');
});

test('high confidence with moderate consequence requires no review', () => {
  assert.equal(evaluateReviewRequirement('HIGH', 'MODERATE'), 'NONE');
  assert.equal(evaluateReviewRequirement('HIGH', 'LOW'), 'NONE');
});

test('validation review carries confidence, consequence, status and requirement', () => {
  const review = evaluateValidation('LOW', 'HIGH', 'UNKNOWN');
  assert.equal(review.confidence, 'LOW');
  assert.equal(review.consequence, 'HIGH');
  assert.equal(review.validationStatus, 'UNKNOWN');
  assert.equal(isHumanReviewRequired(review), true);
});

test('enumerations cover the validation model', () => {
  assert.deepEqual(CONFIDENCE_LEVELS, ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
  assert.deepEqual(CONSEQUENCE_LEVELS, ['HIGH', 'MODERATE', 'LOW']);
  assert.equal(VALIDATION_STATUSES.length, 7);
  assert.ok(VALIDATION_STATUSES.includes('SOURCE_VALIDATED'));
  assert.ok(VALIDATION_STATUSES.includes('FIELD_VALIDATED'));
  assert.ok(VALIDATION_STATUSES.includes('UNKNOWN'));
});