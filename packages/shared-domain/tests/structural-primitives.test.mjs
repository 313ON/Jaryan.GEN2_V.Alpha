import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  centerOfGravityPrimitive,
  compressionCheckPrimitive,
  effectiveContactAreaPrimitive,
  globalStabilityCheckPrimitive,
  isUnverified,
  kernLimitsPrimitive,
  localStabilityCheckPrimitive,
  membraneForcesPrimitive,
  overturningCheckPrimitive,
  rolloverCheckPrimitive,
  rowWeightPrimitive,
  shearCheckPrimitive,
  slidingCheckPrimitive,
  verticalStressPrimitive,
} from '@jaryan/shared-domain';

test('row weight is exact statics from volume, density and gravity', () => {
  const result = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  assert.equal(result.result.value, 19.62);
  assert.equal(result.result.unit, 'kN');
  assert.equal(result.status, 'OK');
  assert.equal(result.confidence, 'HIGH');
  assert.equal(result.calculationId, 'SA-ROW-WEIGHT-001');
});

test('accumulated weight and center of gravity are exact sums and moments', () => {
  const accumulated = accumulatedWeightPrimitive([
    { weightKn: 10, elevationM: 0 },
    { weightKn: 20, elevationM: 2 },
  ]);
  assert.equal(accumulated.result.value, 30);

  const cg = centerOfGravityPrimitive([
    { weightKn: 10, elevationM: 0 },
    { weightKn: 10, elevationM: 2 },
  ]);
  assert.equal(cg.result.value, 1);
});

test('kern limits are the textbook middle-third and middle-eighth values', () => {
  assert.equal(kernLimitsPrimitive({ section: 'rectangle', dimensionM: 0.6 }).result.value, 0.1);
  assert.equal(kernLimitsPrimitive({ section: 'circle', dimensionM: 0.8 }).result.value, 0.1);
});

test('vertical stress is exact normal stress on an area', () => {
  const result = verticalStressPrimitive({ forceKn: 19.62, areaM2: 1 });
  assert.equal(result.result.value, 19.62);
  assert.equal(result.result.unit, 'kPa');
});

test('membrane forces at the crown match spherical membrane theory', () => {
  const result = membraneForcesPrimitive({
    sphereRadiusM: 3.05,
    phiRad: 0,
    surfaceLoadPa: 1000,
    thicknessM: 0.4,
  });
  assert.equal(result.result.value, -3.81);
  assert.equal(result.capacity?.value, 3.81);
  assert.equal(result.status, 'UNVERIFIED');
});

test('effective contact area is unverified and demands human review', () => {
  const result = effectiveContactAreaPrimitive({ perimeterM: 20, contactWidthM: 0.45 });
  assert.equal(result.result.value, 9);
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(result.review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(isUnverified(result), true);
});

test('compression check uses demand over capacity and surfaces missing capacity', () => {
  const ok = compressionCheckPrimitive({ axialStressKpa: 100, allowableCompressiveKpa: 200 });
  assert.equal(ok.status, 'OK');
  assert.equal(ok.utilization, 0.5);

  const fail = compressionCheckPrimitive({ axialStressKpa: 250, allowableCompressiveKpa: 200 });
  assert.equal(fail.status, 'FAIL');
  assert.ok((fail.utilization ?? 0) > 1);

  const missing = compressionCheckPrimitive({ axialStressKpa: 100, allowableCompressiveKpa: undefined });
  assert.equal(missing.status, 'UNVERIFIED');
  assert.equal(missing.validationRequirements.length, 1);
  assert.equal(isUnverified(missing), true);
});

test('shear check mirrors compression check contract', () => {
  const ok = shearCheckPrimitive({ shearStressKpa: 10, allowableShearKpa: 20 });
  assert.equal(ok.status, 'OK');
  const missing = shearCheckPrimitive({ shearStressKpa: 10, allowableShearKpa: undefined });
  assert.equal(missing.status, 'UNVERIFIED');
});

test('sliding check is friction equilibrium with explicit coefficient requirement', () => {
  const ok = slidingCheckPrimitive({ lateralForceKn: 10, normalForceKn: 20, frictionCoefficient: 0.5 });
  assert.equal(ok.status, 'OK');
  assert.equal(ok.capacity?.value, 10);

  const missing = slidingCheckPrimitive({ lateralForceKn: 10, normalForceKn: 20, frictionCoefficient: undefined });
  assert.equal(missing.status, 'UNVERIFIED');
  assert.equal(isUnverified(missing), true);
});

test('overturning check compares overturning to resisting moment', () => {
  const ok = overturningCheckPrimitive({ overturningMomentKnM: 10, resistingMomentKnM: 20 });
  assert.equal(ok.status, 'OK');
  assert.equal(ok.utilization, 0.5);
});

test('rollover, local and global stability remain explicitly unverified frameworks', () => {
  assert.equal(rolloverCheckPrimitive({ stabilizingMomentKnM: 100, destabilizingMomentKnM: undefined }).status, 'UNVERIFIED');
  assert.equal(localStabilityCheckPrimitive().status, 'UNVERIFIED');
  assert.equal(globalStabilityCheckPrimitive().status, 'UNVERIFIED');
  assert.equal(globalStabilityCheckPrimitive().review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
});