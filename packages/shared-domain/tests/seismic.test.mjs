import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessSeismicSite,
  deriveSeismicDemand,
  seismicDemandReview,
} from '@jaryan/shared-domain';

test('seismic pipeline exposes every step without hardcoding coefficients', () => {
  const assessment = assessSeismicSite(
    { coordinates: { latitudeDeg: 35, longitudeDeg: 51 }, zone: 'UNKNOWN', siteClass: 'UNKNOWN', importance: 'UNKNOWN' },
    undefined,
    undefined,
  );

  assert.equal(assessment.humanReviewRequired, true);
  const steps = assessment.steps.map((step) => step.step);
  assert.deepEqual(steps, [
    'coordinates',
    'zone',
    'site_class',
    'importance',
    'spectrum',
    'demand',
    'superadobe_verification',
  ]);
  assert.equal(assessment.demand.status, 'UNVERIFIED');
});

test('an incomplete spectrum leaves the demand unverified', () => {
  const demand = deriveSeismicDemand(undefined, 500);
  assert.equal(demand.status, 'UNVERIFIED');
  assert.equal(demand.confidence, 'UNKNOWN');
  assert.ok(demand.validationRequirements.length > 0);
});

test('a complete sourced spectrum produces a deterministic response', () => {
  const demand = deriveSeismicDemand(
    {
      zoneDesignAcceleration: { value: 0.3, unit: 'g', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      siteSoilFactor: { value: 1.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      importanceFactor: { value: 1, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      behaviorFactor: { value: 2.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
    },
    500,
  );

  assert.equal(demand.status, 'COMPUTED');
  assert.equal(demand.responseCoefficientCs, 0.18);
  assert.equal(demand.baseShearKn, 90);
  assert.equal(demand.validationRequirements.length, 1);
  assert.deepEqual(demand.sourceIds, ['IRN-STD-2800']);
  assert.equal(demand.formula.length > 0, true);
});

test('a spectrum whose parameters are UNVERIFIED is never used as coefficients', () => {
  const demand = deriveSeismicDemand(
    {
      zoneDesignAcceleration: { value: 0.3, unit: 'g', sourceId: 'IRN-STD-2800', status: 'UNVERIFIED' },
      siteSoilFactor: { value: 1.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      importanceFactor: { value: 1, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      behaviorFactor: { value: 2.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
    },
    500,
  );

  assert.equal(demand.status, 'UNVERIFIED');
  assert.equal(demand.confidence, 'UNKNOWN');
  assert.ok(
    demand.validationRequirements.some((requirement) =>
      requirement.includes('UNVERIFIED parameters are never used'),
    ),
  );
});

test('seismic demand review escalates unverified demand to human review', () => {
  const review = seismicDemandReview({ status: 'UNVERIFIED', confidence: 'UNKNOWN', spectrumComplete: false, validationRequirements: [] });
  assert.equal(review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
});

test('seismic assessment with unknown site inputs demands verification per step', () => {
  const assessment = assessSeismicSite(
    { zone: 'ZONE_2', siteClass: 'TYPE_II', importance: 'IMPORTANCE_II' },
    undefined,
    undefined,
  );
  assert.equal(assessment.demand.status, 'UNVERIFIED');
  assert.ok(
    assessment.steps.some(
      (step) => step.step === 'spectrum' && step.status === 'UNKNOWN',
    ),
  );
});

test('an unknown seismic zone forces human review even with a computed demand', () => {
  const assessment = assessSeismicSite(
    { zone: 'UNKNOWN', siteClass: 'TYPE_II', importance: 'IMPORTANCE_II' },
    {
      zoneDesignAcceleration: { value: 0.3, unit: 'g', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      siteSoilFactor: { value: 1.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      importanceFactor: { value: 1, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
      behaviorFactor: { value: 2.5, unit: '—', sourceId: 'IRN-STD-2800', status: 'VERIFIED' },
    },
    500,
  );

  assert.equal(assessment.demand.status, 'COMPUTED');
  assert.equal(assessment.humanReviewRequired, true);
});