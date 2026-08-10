import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateEngineeringModel,
  DEFAULT_ENGINEERING_INPUTS,
  estimatePeakSunHours,
} from '../src/domain/engineering.ts';

test('peak sun heuristic is deterministic and bounded', () => {
  assert.equal(estimatePeakSunHours(34), 4.1);
  assert.equal(estimatePeakSunHours(-34), 4.1);
  assert.equal(estimatePeakSunHours(90), 1);
});

test('default model produces coherent concept estimates', () => {
  const result = calculateEngineeringModel(DEFAULT_ENGINEERING_INPUTS);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.recommendedPanelCount, 12);
  assert.equal(result.outputs.installedSolarCapacityKw, 4.8);
  assert.equal(result.outputs.batteryCapacityKwh, 41.7);
  assert.equal(result.outputs.dailyWaterUseL, 200);
  assert.equal(result.outputs.recommendedTankL, 600);
  assert.equal(result.outputs.geometryStatus, 'balanced');
});

test('invalid fields return explicit errors without partial output', () => {
  const result = calculateEngineeringModel({
    ...DEFAULT_ENGINEERING_INPUTS,
    dailyDemandKwh: Number.NaN,
    occupants: 0,
  });

  assert.equal(result.ok, false);
  assert.equal(result.outputs, null);
  assert.deepEqual(
    result.errors.map((error) => error.field),
    ['dailyDemandKwh', 'occupants'],
  );
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
  assert.equal(result.outputs.recommendedTankL, 500);
  assert.equal(result.outputs.storageMeetsPracticalMinimum, false);
});
