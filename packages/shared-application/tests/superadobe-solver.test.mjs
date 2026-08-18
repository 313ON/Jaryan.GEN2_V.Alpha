import assert from 'node:assert/strict';
import test from 'node:test';
import { solveSuperAdobe } from '@jaryan/shared-application';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

test('solver is deterministic for identical inputs', () => {
  const first = solveSuperAdobe({ projectId: 'p', inputs });
  const second = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(first);
  assert.ok(second);

  assert.deepEqual(first.geometry, second.geometry);
  assert.deepEqual(first.loads, second.loads);
  assert.deepEqual(first.calculations, second.calculations);
  assert.deepEqual(first.traceability, second.traceability);
  assert.deepEqual(first.summary, second.summary);
});

test('geometry solver exposes rows, radii, volume, mass, center of gravity and contact', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  const geometryCalculation = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-GEOM-001',
  );
  assert.ok(geometryCalculation);
  assert.equal(geometryCalculation.status, 'OK');
  assert.equal(geometryCalculation.result.unit, 'm³');
  assert.ok(geometryCalculation.result.value > 0);

  const rows = result.geometry.rows;
  assert.equal(rows.length, 12);
  assert.ok(rows[0].innerRadiusM > 0);
  assert.ok(rows[0].outerRadiusM > rows[0].innerRadiusM);
  assert.ok(rows[0].perimeterM > 0);
  assert.ok(rows[0].effectiveContactAreaM2 > 0);
  assert.ok(rows[0].rowVolumeM3 > 0);
});

test('mass calculation is consistent with geometry mass and row weights', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  const rowWeightResults = result.calculations.filter(
    (calculation) => calculation.calculationId === 'SA-ROW-WEIGHT-001',
  );
  assert.equal(rowWeightResults.length, 12);

  const accumulated = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-ACC-WEIGHT-001',
  );
  assert.ok(accumulated);
  const sumRows = rowWeightResults.reduce(
    (sum, calculation) => sum + calculation.result.value,
    0,
  );
  assert.ok(Math.abs(accumulated.result.value - sumRows) < 0.05);
  assert.ok(Math.abs(result.summary.totalWeightKn - result.geometry.totalMassT * 9.81) < 1);
  assert.ok(Math.abs(accumulated.result.value - result.summary.totalWeightKn) < 0.05);
  assert.equal(accumulated.result.unit, 'kN');
});

test('load assembly builds a gravity load model with load case and effect', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  const rowWeightResults = result.calculations.filter(
    (calculation) => calculation.calculationId === 'SA-ROW-WEIGHT-001',
  );

  assert.equal(result.loads.rowCount, 12);
  assert.equal(result.loads.loadCase.type, 'G');
  assert.equal(result.loads.loadCase.id, 'LC-G-001');
  assert.equal(result.loads.totalWeightKn, result.summary.totalWeightKn);
  assert.equal(result.loads.loadEffect.axialForceKn, result.summary.totalWeightKn);
  assert.equal(result.loads.loadEffect.slidingDemandKn, 0);
  assert.equal(result.loads.rows.length, rowWeightResults.length);
  assert.ok(
    result.loads.rows.every(
      (row, index) => row.weightKn === rowWeightResults[index].result.value,
    ),
  );
  assert.ok(result.loads.rows.every((row) => row.weightKn > 0));
});

test('compression check computes base stress demand and stays UNVERIFIED', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  const contact = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-CONTACT-AREA-001',
  );
  const verticalStress = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-VERT-STRESS-001',
  );
  const compression = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-COMPRESSION-CHECK-001',
  );

  assert.ok(contact && verticalStress && compression);
  assert.equal(verticalStress.status, 'OK');
  assert.equal(verticalStress.result.unit, 'kPa');
  assert.ok(
    Math.abs(
      verticalStress.result.value - result.summary.totalWeightKn / contact.result.value,
    ) < 0.01,
  );

  assert.equal(compression.status, 'UNVERIFIED');
  assert.equal(compression.capacity, undefined);
  assert.equal(compression.review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
  assert.ok(compression.validationRequirements.length > 0);
});

test('sliding check uses lateral demand input and stays UNVERIFIED', () => {
  const result = solveSuperAdobe({
    projectId: 'p',
    inputs,
    lateralDemandKn: 40,
  });
  assert.ok(result);

  const sliding = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-SLIDING-CHECK-001',
  );
  assert.ok(sliding);
  assert.equal(sliding.inputs.lateralForceKn.value, 40);
  assert.equal(sliding.status, 'UNVERIFIED');
  assert.equal(sliding.review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(result.summary.lateralDemandKn, 40);
});

test('overturning check derives demand as H times center of gravity height', () => {
  const result = solveSuperAdobe({
    projectId: 'p',
    inputs,
    lateralDemandKn: 40,
  });
  assert.ok(result);

  const overturning = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-OVERTURNING-CHECK-001',
  );
  assert.ok(overturning);
  assert.ok(
    Math.abs(
      overturning.result.value - 40 * result.summary.centerOfGravityM,
    ) < 0.01,
  );
  assert.equal(overturning.status, 'UNVERIFIED');
  assert.equal(overturning.review.reviewRequirement, 'HUMAN_REVIEW_REQUIRED');
  assert.equal(result.summary.overturningDemandKnM, overturning.result.value);
});

test('explicit overturning moment overrides the derived demand', () => {
  const result = solveSuperAdobe({
    projectId: 'p',
    inputs,
    lateralDemandKn: 40,
    overturningMomentKnM: 250,
  });
  assert.ok(result);

  const overturning = result.calculations.find(
    (calculation) => calculation.calculationId === 'SA-OVERTURNING-CHECK-001',
  );
  assert.ok(overturning);
  assert.equal(overturning.result.value, 250);
  assert.equal(result.summary.overturningDemandKnM, 250);
});

test('every calculation exposes the full traceability contract', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  for (const calculation of result.calculations) {
    assert.ok(calculation.calculationId.length > 0);
    assert.ok(calculation.method.length > 0);
    assert.ok(calculation.formula.length > 0);
    assert.ok(calculation.result.unit.length > 0);
    assert.ok(calculation.assumptions.length > 0);
    assert.ok(Object.keys(calculation.inputs).length > 0);
    assert.ok(
      ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].includes(calculation.confidence),
    );
    assert.ok(
      [
        'SOURCE_VALIDATED',
        'ANALYTICALLY_VALIDATED',
        'NUMERICALLY_VALIDATED',
        'LAB_VALIDATED',
        'FIELD_VALIDATED',
        'PROFESSIONAL_REVIEW',
        'UNKNOWN',
      ].includes(calculation.validationStatus),
    );
  }
});

test('traceability links match every calculation and carry assumptions', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  assert.equal(result.traceability.length, result.calculations.length);
  const linkedIds = result.traceability.map((link) => link.calculationId);
  for (const calculation of result.calculations) {
    assert.ok(linkedIds.includes(calculation.calculationId));
  }
  for (const link of result.traceability) {
    assert.ok(link.assumptions.length > 0);
    assert.ok(link.formula.length > 0);
    assert.ok(link.inputs.length > 0);
  }
});

test('safety posture: capacity checks are unverified and force review', () => {
  const result = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(result);

  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.ok(
    result.unverifiedCalculationIds.includes('SA-COMPRESSION-CHECK-001'),
  );
  assert.ok(result.unverifiedCalculationIds.includes('SA-SLIDING-CHECK-001'));
  assert.ok(result.unverifiedCalculationIds.includes('SA-OVERTURNING-CHECK-001'));
  assert.ok(result.unverifiedCalculationIds.includes('SA-CONTACT-AREA-001'));
});

test('solver returns null for invalid geometry inputs', () => {
  const result = solveSuperAdobe({
    projectId: 'p',
    inputs: { ...inputs, innerDiameterM: -1 },
  });
  assert.equal(result, null);
});