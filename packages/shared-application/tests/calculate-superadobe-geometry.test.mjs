import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSuperAdobeGeometryRecord } from '@jaryan/shared-application';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

test('geometry calculation creates a completed generic record', () => {
  const record = calculateSuperAdobeGeometryRecord({
    projectId: 'project-geo-1',
    inputs,
  });

  assert.equal(record.status, 'completed');
  assert.equal(record.projectId, 'project-geo-1');
  assert.equal(record.system, 'superadobe');
  assert.equal(record.outputs?.rowCount, 12);
  assert.equal(record.assumptions.length, 2);
  assert.ok(record.id.length > 0);
  assert.ok(Number.isFinite(Date.parse(record.calculatedAt ?? '')));
  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
});

test('geometry calculation fails with preserved errors for invalid inputs', () => {
  const record = calculateSuperAdobeGeometryRecord({
    projectId: 'project-geo-2',
    inputs: { ...inputs, innerDiameterM: 0 },
  });

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.deepEqual(
    record.errors?.map((error) => error.field),
    ['innerDiameterM'],
  );
});