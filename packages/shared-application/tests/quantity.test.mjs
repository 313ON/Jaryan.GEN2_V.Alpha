import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_ENGINEERING_INPUTS,
  calculateStructural,
} from '@jaryan/shared-domain';
import {
  deriveStructuralQuantities,
} from '@jaryan/shared-application';

const structuralInputs = {
  domeRadiusM: DEFAULT_ENGINEERING_INPUTS.domeRadiusM,
  domeHeightM: DEFAULT_ENGINEERING_INPUTS.domeHeightM,
  wallThicknessM: DEFAULT_ENGINEERING_INPUTS.wallThicknessM,
  openingAreaM2: DEFAULT_ENGINEERING_INPUTS.openingAreaM2,
  soilType: DEFAULT_ENGINEERING_INPUTS.soilType,
};

test('structural quantities are plain immutable serializable values', () => {
  const result = deriveStructuralQuantities({
    projectId: 'project-quantity-1',
    inputs: structuralInputs,
  });

  assert.equal(result.quantities.length, 3);
  for (const quantity of result.quantities) {
    assert.equal(Object.isFrozen(quantity), true);
    assert.equal(Object.isFrozen(quantity.source), true);
    assert.equal(typeof quantity.id, 'string');
    assert.equal(typeof quantity.quantity, 'number');
    assert.ok(['m2', 'm3', 't'].includes(quantity.unit));
    assert.deepEqual(JSON.parse(JSON.stringify(quantity)), quantity);
  }
});

test('structural outputs become explicit quantities without duplicating formulas', () => {
  const result = deriveStructuralQuantities({
    projectId: 'project-quantity-2',
    inputs: structuralInputs,
  });
  const structural = calculateStructural(structuralInputs);
  const byOutput = new Map(
    result.quantities.map((quantity) => [quantity.source.output, quantity]),
  );

  assert.equal(byOutput.get('netEnvelopeAreaM2')?.quantity, structural.netEnvelopeAreaM2);
  assert.equal(byOutput.get('netEnvelopeAreaM2')?.unit, 'm2');
  assert.equal(
    byOutput.get('estimatedWallMaterialM3')?.quantity,
    structural.estimatedWallMaterialM3,
  );
  assert.equal(byOutput.get('estimatedWallMaterialM3')?.unit, 'm3');
  assert.equal(byOutput.get('estimatedWallMassT')?.quantity, structural.estimatedWallMassT);
  assert.equal(byOutput.get('estimatedWallMassT')?.unit, 't');
});

test('quantities preserve calculation and source-field provenance', () => {
  const result = deriveStructuralQuantities({
    projectId: 'project-quantity-3',
    inputs: structuralInputs,
  });

  assert.ok(result.calculation.id.length > 0);
  assert.deepEqual(
    result.quantities.map((quantity) => quantity.source.calculationId),
    [result.calculation.id, result.calculation.id, result.calculation.id],
  );
  assert.deepEqual(
    result.quantities.map((quantity) => quantity.source.output),
    ['netEnvelopeAreaM2', 'estimatedWallMaterialM3', 'estimatedWallMassT'],
  );
});

test('quantity shape is neutral and has no material or structural-system fields', () => {
  const result = deriveStructuralQuantities({
    projectId: 'project-quantity-4',
    inputs: structuralInputs,
  });
  const quantityKeys = Object.keys(result.quantities[0]).sort();

  assert.deepEqual(quantityKeys, ['id', 'quantity', 'source', 'unit']);
  assert.equal('materialId' in result.quantities[0], false);
  assert.equal('structuralSystem' in result.quantities[0], false);
});

test('failed structural calculations do not produce quantities', () => {
  const result = deriveStructuralQuantities({
    projectId: 'project-quantity-5',
    inputs: { ...structuralInputs, domeRadiusM: 1 },
  });

  assert.equal(result.calculation.status, 'failed');
  assert.deepEqual(result.quantities, []);
});
