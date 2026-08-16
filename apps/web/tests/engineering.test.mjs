import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessSolarCoverage,
  calculateEngineeringModel,
  calculateSolarInstallation,
  DEFAULT_ENGINEERING_INPUTS,
  estimatePeakSunHours,
  SOIL_PROFILES,
  validateEngineeringInputs,
} from '@jaryan/shared-domain';

test('peak sun heuristic is deterministic and bounded', () => {
  assert.equal(estimatePeakSunHours(34), 4.1);
  assert.equal(estimatePeakSunHours(-34), 4.1);
  assert.equal(estimatePeakSunHours(90), 1);
});

test('default model produces coherent conservative concept estimates', () => {
  const result = calculateEngineeringModel(DEFAULT_ENGINEERING_INPUTS);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.recommendedPanelCount, 14);
  assert.equal(result.outputs.installedSolarCapacityKw, 5.6);
  assert.equal(result.outputs.batteryCapacityKwh, 41.7);
  assert.equal(result.outputs.nominalBatteryCapacityAh, 868);
  assert.equal(result.outputs.dailyWaterUseL, 200);
  assert.equal(result.outputs.recommendedTankL, 600);
  assert.equal(result.outputs.dataQualityStatus, 'limited');
  assert.equal(result.outputs.geometryStatus, 'review');
});

test('invalid numeric and categorical fields return errors without partial output', () => {
  const result = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    latitudeDeg: 91,
    longitudeDeg: Number.NaN,
    occupants: 0,
    soilType: 'unsupported',
  });

  assert.equal(result.ok, false);
  assert.equal(result.outputs, null);
  assert.deepEqual(
    result.errors.map((error) => error.field),
    ['latitudeDeg', 'longitudeDeg', 'occupants', 'soilType'],
  );
});

test('manual/map coordinate contract accepts boundaries and rejects out-of-range values', () => {
  assert.deepEqual(
    validateEngineeringInputs({
      ...DEFAULT_ENGINEERING_INPUTS,
      latitudeDeg: -90,
      longitudeDeg: 180,
    }).filter((error) =>
      ['latitudeDeg', 'longitudeDeg'].includes(error.field),
    ),
    [],
  );

  const errors = validateEngineeringInputs({
    ...DEFAULT_ENGINEERING_INPUTS,
    latitudeDeg: -90.01,
    longitudeDeg: 180.01,
  });
  assert.deepEqual(
    errors.map((error) => error.field),
    ['latitudeDeg', 'longitudeDeg'],
  );
});

test('soil selection changes documented mass assumptions', () => {
  const sandy = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    soilType: 'sandy',
  });
  const silty = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    soilType: 'silty',
  });

  assert.equal(sandy.ok, true);
  assert.equal(silty.ok, true);
  if (!sandy.ok || !silty.ok) return;

  assert.equal(sandy.outputs.soilProfile, SOIL_PROFILES.sandy);
  assert.equal(silty.outputs.soilProfile, SOIL_PROFILES.silty);
  assert.notEqual(
    sandy.outputs.estimatedWallMassT,
    silty.outputs.estimatedWallMassT,
  );
  assert.equal(sandy.outputs.dataQualityStatus, 'screening');
});

test('panel count rounds up and modeled demand is covered', () => {
  const result = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    soilType: 'clay-rich',
    dailyDemandKwh: 10,
    panelWattage: 400,
    shadingFactor: 1,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.recommendedPanelCount, 8);
  assert.equal(result.outputs.solarDemandCovered, true);
  assert.ok(result.outputs.estimatedDailySolarYieldKwh >= 10);
});

test('solar module area and footprint factors are auditable', () => {
  const roof = calculateSolarInstallation(10, 410, 'roof');
  const ground = calculateSolarInstallation(10, 410, 'ground');

  assert.ok(roof);
  assert.ok(ground);
  assert.equal(roof.panelFaceAreaM2, 2);
  assert.equal(roof.moduleAreaM2, 20);
  assert.equal(roof.installationFootprintM2, 27);
  assert.equal(ground.installationFootprintM2, 35);
  assert.ok(ground.installationFootprintM2 > roof.installationFootprintM2);
});

test('solar area rejects zero and invalid input', () => {
  assert.equal(calculateSolarInstallation(-1, 400, 'roof'), null);
  assert.equal(calculateSolarInstallation(2.5, 400, 'roof'), null);
  assert.equal(calculateSolarInstallation(2, 0, 'ground'), null);
  assert.deepEqual(calculateSolarInstallation(0, 400, 'ground'), {
    panelCount: 0,
    panelFaceAreaM2: 1.95,
    moduleAreaM2: 0,
    installationFootprintM2: 0,
    installationFootprintFactor: 1.75,
  });
});

test('solar coverage exposes a demand-not-covered case', () => {
  const coverage = assessSolarCoverage(15, 2, 400, 4.1, 0.8);

  assert.equal(coverage.demandCovered, false);
  assert.ok(coverage.generationMarginKwh < 0);
});

test('water model applies the practical minimum transparently', () => {
  const result = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    occupants: 1,
    storageDays: 1,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.dailyWaterUseL, 50);
  assert.equal(result.outputs.designReserveL, 50);
  assert.equal(result.outputs.recommendedTankL, 500);
  assert.equal(result.outputs.storageMeetsPracticalMinimum, false);
});

test('geometry subtracts openings from quantity and flags excessive openings', () => {
  const noOpenings = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    soilType: 'clay-rich',
    openingAreaM2: 0,
  });
  const largeOpenings = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    soilType: 'clay-rich',
    openingAreaM2: 20,
  });

  assert.equal(noOpenings.ok, true);
  assert.equal(largeOpenings.ok, true);
  if (!noOpenings.ok || !largeOpenings.ok) return;

  assert.ok(
    largeOpenings.outputs.estimatedWallMaterialM3 <
      noOpenings.outputs.estimatedWallMaterialM3,
  );
  assert.equal(largeOpenings.outputs.geometryStatus, 'review');
  assert.ok(
    largeOpenings.outputs.structuralWarnings.some((warning) =>
      warning.includes('Openings exceed 20%'),
    ),
  );
});
