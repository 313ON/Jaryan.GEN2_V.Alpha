import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateSuperAdobeGeometry,
  DOME_PROFILES,
  validateSuperAdobeGeometryInputs,
} from '@jaryan/shared-domain';

const baseInputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

test('geometry engine is deterministic for identical inputs', () => {
  const first = calculateSuperAdobeGeometry(baseInputs);
  const second = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.deepEqual(first, second);
});

test('row generation covers the dome height with positive rows', () => {
  const result = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.geometry.rowCount, 12);
  assert.equal(result.geometry.rows.length, 12);
  for (const row of result.geometry.rows) {
    assert.ok(row.innerRadiusM >= 0);
    assert.ok(row.perimeterM >= 0);
    assert.ok(row.effectiveContactAreaM2 >= 0);
    assert.ok(row.rowMassT > 0);
  }
});

test('base row radius approaches the inner base radius', () => {
  const result = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const firstRow = result.geometry.rows[0];
  assert.ok(Math.abs(firstRow.innerRadiusM - 3) < 0.1);
});

test('inner radius decreases monotonically above the base for a shallow dome', () => {
  const result = calculateSuperAdobeGeometry({
    ...baseInputs,
    domeHeightM: 2.4,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const radii = result.geometry.rows.map((row) => row.innerRadiusM);
  for (let index = 1; index < radii.length; index += 1) {
    assert.ok(radii[index] <= radii[index - 1] + 1e-6);
  }
});

test('dome converges toward the apex: last row is smaller than the base row', () => {
  const result = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const first = result.geometry.rows[0].innerRadiusM;
  const last = result.geometry.rows[result.geometry.rows.length - 1].innerRadiusM;
  assert.ok(last < first);
});

test('total mass equals the sum of row masses', () => {
  const result = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const rowSum = result.geometry.rows.reduce(
    (sum, row) => sum + row.rowMassT,
    0,
  );
  assert.ok(Math.abs(result.geometry.totalMassT - rowSum) < 0.05);
});

test('accumulated mass and center of gravity are monotonic and bounded', () => {
  const result = calculateSuperAdobeGeometry(baseInputs);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  let previous = 0;
  for (const row of result.geometry.rows) {
    assert.ok(row.accumulatedMassT >= previous);
    assert.ok(row.centerOfGravityM >= 0 && row.centerOfGravityM <= 3.6);
    previous = row.accumulatedMassT;
  }
  assert.ok(result.geometry.centerOfGravityM > 0);
  assert.ok(result.geometry.centerOfGravityM < 3.6);
});

test('supported dome profiles produce distinct geometries', () => {
  const circular = calculateSuperAdobeGeometry({ ...baseInputs, geometryType: 'circular' });
  const parabolic = calculateSuperAdobeGeometry({ ...baseInputs, geometryType: 'parabolic' });
  const pointed = calculateSuperAdobeGeometry({
    ...baseInputs,
    geometryType: 'pointed',
    domeHeightM: 2.4,
  });

  assert.equal(circular.ok, true);
  assert.equal(parabolic.ok, true);
  assert.equal(pointed.ok, true);
  if (!circular.ok || !parabolic.ok || !pointed.ok) return;

  assert.notDeepEqual(circular.geometry.rows, parabolic.geometry.rows);
  assert.notDeepEqual(circular.geometry.rows, pointed.geometry.rows);
  assert.equal(circular.geometry.profileParameters.profile, 'circular');
  assert.equal(parabolic.geometry.profileParameters.profile, 'parabolic');
  assert.equal(pointed.geometry.profileParameters.profile, 'pointed');
});

test('pointed profile rejects a rise exceeding the inner base radius', () => {
  const errors = validateSuperAdobeGeometryInputs({
    ...baseInputs,
    geometryType: 'pointed',
    domeHeightM: 6,
  });

  assert.ok(
    errors.some((error) =>
      error.message.includes('Pointed profile requires'),
    ),
  );
});

test('invalid numeric and profile inputs are rejected without geometry', () => {
  const result = calculateSuperAdobeGeometry({
    ...baseInputs,
    innerDiameterM: 0,
    geometryType: 'invalid',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.length >= 2);
  assert.ok(result.errors.some((error) => error.field === 'innerDiameterM'));
  assert.ok(result.errors.some((error) => error.field === 'geometryType'));
});

test('all dome profiles are enumerated for the geometry type input', () => {
  assert.deepEqual(DOME_PROFILES, ['circular', 'pointed', 'parabolic']);
});