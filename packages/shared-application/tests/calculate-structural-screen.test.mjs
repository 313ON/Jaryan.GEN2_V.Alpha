import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateStructural,
  DEFAULT_ENGINEERING_INPUTS,
} from '@jaryan/shared-domain';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge';
import { calculateStructuralScreen } from '@jaryan/shared-application';

const inputs = {
  domeRadiusM: DEFAULT_ENGINEERING_INPUTS.domeRadiusM,
  domeHeightM: DEFAULT_ENGINEERING_INPUTS.domeHeightM,
  wallThicknessM: DEFAULT_ENGINEERING_INPUTS.wallThicknessM,
  openingAreaM2: DEFAULT_ENGINEERING_INPUTS.openingAreaM2,
  soilType: DEFAULT_ENGINEERING_INPUTS.soilType,
};

test('structural screen creates a completed generic calculation record', () => {
  const record = calculateStructuralScreen({
    projectId: 'project-structural-1',
    inputs,
  });
  const domain = calculateStructural(inputs);

  assert.equal(record.status, 'completed');
  assert.equal(record.projectId, 'project-structural-1');
  assert.equal(record.system, 'superadobe');
  assert.deepEqual(record.outputs, domain);
  assert.equal(record.outputs?.soilProfile.value, 'mixed-unknown');
  assert.equal(record.assumptions.length, 2);
  assert.deepEqual(record.knowledge.sourceIds, REFERENCE_BASIS.sourceIds);
  assert.ok(record.id.length > 0);
  assert.ok(Number.isFinite(Date.parse(record.calculatedAt ?? '')));
  assert.equal(record.modelVersion, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
});

test('structural screen validates through the domain and preserves known assumptions on failure', () => {
  const record = calculateStructuralScreen({
    projectId: 'project-structural-2',
    inputs: { ...inputs, domeRadiusM: 1 },
  });

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.deepEqual(record.errors, [
    {
      field: 'domeRadiusM',
      message: 'Dome radius must be between 1.5 and 8.',
    },
  ]);
  assert.equal(record.assumptions.length, 2);
});
