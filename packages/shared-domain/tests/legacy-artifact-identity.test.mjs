import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseLegacyCalculationId,
  legacyCalculationArtifactBaseId,
  engineeringCalculationIdentityFromLegacyId,
  engineeringPrimitiveIdentityFromLegacyId,
  engineeringResultIdentityFromLegacyId,
  engineeringSourceIdentityFromSourceId,
} from '@jaryan/shared-domain';

test('legacy calculation ids parse deterministically', () => {
  assert.deepEqual(parseLegacyCalculationId('SA-ROW-WEIGHT-001'), {
    systemCode: 'SA',
    slug: 'ROW-WEIGHT',
    sequence: 1,
  });
  assert.equal(parseLegacyCalculationId('not-an-id'), null);
  assert.equal(parseLegacyCalculationId('SA-X-01'), null);
});

test('legacy ids resolve to canonical artifact base ids', () => {
  assert.equal(
    legacyCalculationArtifactBaseId('SA-ROW-WEIGHT-001'),
    'CALC-SA-ROW-WEIGHT-001',
  );
  assert.equal(legacyCalculationArtifactBaseId('bad'), null);
});

test('legacy derivation produces versioned canonical identities', () => {
  const calculation = engineeringCalculationIdentityFromLegacyId(
    'SA-ROW-WEIGHT-001',
    '1',
  );
  const primitive = engineeringPrimitiveIdentityFromLegacyId(
    'SA-ROW-WEIGHT-001',
    '1',
  );
  const result = engineeringResultIdentityFromLegacyId(
    'SA-ROW-WEIGHT-001',
    '1',
  );

  assert.ok(calculation && primitive && result);
  assert.equal(calculation.id, 'CALC-SA-ROW-WEIGHT-001-v1');
  assert.equal(primitive.id, 'PRIM-SA-ROW-WEIGHT-001-v1');
  assert.equal(result.id, 'RESULT-SA-ROW-WEIGHT-001-v1');
  assert.equal(calculation.baseId, 'CALC-SA-ROW-WEIGHT-001');
});

test('legacy derivation is deterministic with no random identity generation', () => {
  const first = engineeringCalculationIdentityFromLegacyId('SA-CG-001', '1');
  const second = engineeringCalculationIdentityFromLegacyId('SA-CG-001', '1');
  assert.deepEqual(first, second);
  assert.equal(first.id, 'CALC-SA-CG-001-v1');
});

test('legacy derivation is null for unparseable ids', () => {
  assert.equal(engineeringCalculationIdentityFromLegacyId('nope'), null);
  assert.equal(engineeringResultIdentityFromLegacyId('nope'), null);
});

test('source ids resolve to stable source identities', () => {
  const first = engineeringSourceIdentityFromSourceId('TIMO-SHELLS-1959', '1');
  const second = engineeringSourceIdentityFromSourceId('TIMO-SHELLS-1959', '1');
  assert.deepEqual(first, second);
  assert.equal(first.type, 'SOURCE');
  assert.equal(first.baseId.startsWith('SRC-TIMO-SHELLS-1959-'), true);
  assert.equal(first.id, `${first.baseId}-v1`);
});