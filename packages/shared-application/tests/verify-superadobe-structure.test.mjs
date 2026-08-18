import assert from 'node:assert/strict';
import test from 'node:test';
import { verifySuperAdobeStructure } from '@jaryan/shared-application';
import { isUnverified } from '@jaryan/shared-domain';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

test('verification produces a deterministic, traceable report', () => {
  const first = verifySuperAdobeStructure({ projectId: 'project-sa-1', inputs });
  const second = verifySuperAdobeStructure({ projectId: 'project-sa-1', inputs });

  assert.ok(first);
  assert.ok(second);
  assert.equal(first.primitives.length, second.primitives.length);
  assert.deepEqual(
    first.primitives.map((primitive) => primitive.calculationId),
    second.primitives.map((primitive) => primitive.calculationId),
  );
  for (const primitive of first.primitives) {
    assert.ok(primitive.calculationId.length > 0);
    assert.ok(primitive.formula.length > 0);
    assert.ok(primitive.result.unit.length > 0);
  }
});

test('every primitive carries a matching traceability link', () => {
  const result = verifySuperAdobeStructure({ projectId: 'project-sa-2', inputs });
  assert.ok(result);

  const linkedIds = result.traceability.map((link) => link.calculationId);
  for (const primitive of result.primitives) {
    assert.ok(linkedIds.includes(primitive.calculationId));
  }
});

test('SuperAdobe-specific capacities are unverified and force review', () => {
  const result = verifySuperAdobeStructure({ projectId: 'project-sa-3', inputs });
  assert.ok(result);

  const compression = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-COMPRESSION-CHECK-001',
  );
  const contact = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-CONTACT-AREA-001',
  );

  assert.ok(compression);
  assert.ok(contact);
  assert.equal(compression.status, 'UNVERIFIED');
  assert.equal(contact.status, 'UNVERIFIED');
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.ok(result.unverifiedCalculationIds.includes('SA-COMPRESSION-CHECK-001'));
  assert.ok(result.unverifiedCalculationIds.includes('SA-CONTACT-AREA-001'));
});

test('stability frameworks remain unverified without fabricated methodology', () => {
  const result = verifySuperAdobeStructure({ projectId: 'project-sa-4', inputs });
  assert.ok(result);

  const local = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-LOCAL-STABILITY-001',
  );
  const global = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-GLOBAL-STABILITY-001',
  );

  assert.ok(local && global);
  assert.equal(isUnverified(local), true);
  assert.equal(isUnverified(global), true);
});

test('circular domes include the membrane stress primitive', () => {
  const result = verifySuperAdobeStructure({ projectId: 'project-sa-5', inputs });
  assert.ok(result);

  const membrane = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-MEMBRANE-001',
  );
  assert.ok(membrane);
  assert.equal(membrane.status, 'UNVERIFIED');
  assert.match(membrane.validationRequirements[0], /thick SuperAdobe layered assembly/);
});

test('verification is null for invalid geometry inputs', () => {
  const result = verifySuperAdobeStructure({
    projectId: 'project-sa-6',
    inputs: { ...inputs, innerDiameterM: -1 },
  });
  assert.equal(result, null);
});

test('seismic and overturning demand inputs flow into the demand primitives', () => {
  const result = verifySuperAdobeStructure({
    projectId: 'project-sa-7',
    inputs,
    lateralSeismicDemandKn: 40,
    overturningMomentKnM: 120,
  });
  assert.ok(result);

  const sliding = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-SLIDING-CHECK-001',
  );
  const overturning = result.primitives.find(
    (primitive) => primitive.calculationId === 'SA-OVERTURNING-CHECK-001',
  );

  assert.ok(sliding && overturning);
  assert.equal(sliding.inputs.lateralForceKn.value, 40);
  assert.equal(overturning.inputs.overturningMomentKnM.value, 120);
});