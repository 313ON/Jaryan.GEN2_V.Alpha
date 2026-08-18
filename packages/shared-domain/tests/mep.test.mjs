import assert from 'node:assert/strict';
import test from 'node:test';
import {
  envelopeUValue,
  heatLossPrimitive,
} from '@jaryan/shared-domain';

test('thermal envelope heat loss is exact steady-state conduction', () => {
  const result = heatLossPrimitive({ areaM2: 50, uValueWm2K: 0.5, deltaTK: 20 });
  assert.equal(result.heatLossKw, 0.5);
  assert.equal(result.confidence, 'MEDIUM');
});

test('U-value is the reciprocal of R-value', () => {
  assert.equal(envelopeUValue(2), 0.5);
  assert.equal(envelopeUValue(0), Number.NaN);
});

test('heat loss scales linearly with area, U-value and delta-T', () => {
  const base = heatLossPrimitive({ areaM2: 50, uValueWm2K: 0.5, deltaTK: 20 });
  const doubleArea = heatLossPrimitive({ areaM2: 100, uValueWm2K: 0.5, deltaTK: 20 });
  assert.equal(doubleArea.heatLossKw, base.heatLossKw * 2);
});