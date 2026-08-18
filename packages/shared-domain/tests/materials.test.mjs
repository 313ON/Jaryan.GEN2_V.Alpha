import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defineMaterial,
  getMaterialProperty,
  materialProperty,
  SOIL_PROPERTY_POLICY,
} from '@jaryan/shared-domain';

test('no universal SuperAdobe soil properties are defined', () => {
  assert.match(SOIL_PROPERTY_POLICY.statement, /no universal SuperAdobe soil properties/i);
});

test('material properties carry value, unit, source, method, confidence and status', () => {
  const property = materialProperty({
    value: 40,
    unit: 'kN/m',
    sourceId: 'ICC-ESR-4126',
    testMethod: 'ASTM D4632',
    confidence: 'MEDIUM',
    applicability: 'PP woven bag tensile strength',
    status: 'REFERENCE_ONLY',
  });

  assert.equal(property.value, 40);
  assert.equal(property.unit, 'kN/m');
  assert.equal(property.sourceId, 'ICC-ESR-4126');
  assert.equal(property.testMethod, 'ASTM D4632');
  assert.equal(property.status, 'REFERENCE_ONLY');
});

test('materials are defined by category and retrieved by property key', () => {
  const bag = defineMaterial('bag-pp', 'Polypropylene bag', 'bag', {
    tensileStrength: materialProperty({
      value: 40,
      unit: 'kN/m',
      confidence: 'UNKNOWN',
      applicability: 'Manufacturer-dependent',
      status: 'UNKNOWN',
    }),
  });

  assert.equal(bag.category, 'bag');
  assert.equal(getMaterialProperty(bag, 'tensileStrength')?.value, 40);
  assert.equal(getMaterialProperty(bag, 'missing'), undefined);
});

test('material model supports soil, wire, binder, plaster and waterproofing categories', () => {
  const wire = defineMaterial('wire-barbed', 'Barbed wire', 'wire', {});
  const binder = defineMaterial('binder-cement', 'Cement stabilizer', 'binder', {});
  const plaster = defineMaterial('plaster-earthen', 'Earthen plaster', 'plaster', {});
  const waterproofing = defineMaterial('wp-membrane', 'Waterproofing membrane', 'waterproofing', {});

  assert.equal(wire.category, 'wire');
  assert.equal(binder.category, 'binder');
  assert.equal(plaster.category, 'plaster');
  assert.equal(waterproofing.category, 'waterproofing');
});