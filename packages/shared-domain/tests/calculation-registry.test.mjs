import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEngineeringCalculationRegistry,
  engineeringArtifactIdentity,
} from '@jaryan/shared-domain';

function calculationEntry(calculationId, slug, sequence) {
  return {
    identity: engineeringArtifactIdentity({
      type: 'CALCULATION',
      systemCode: 'SA',
      slug,
      sequence,
      name: calculationId,
      version: '1',
    }),
    calculationId,
    method: 'Statics',
    formula: 'W = ρ · V · g',
  };
}

test('an empty registry lists no calculations', () => {
  const registry = createEngineeringCalculationRegistry();
  assert.deepEqual(registry.list(), []);
  assert.equal(registry.get('SA-ROW-WEIGHT-001'), undefined);
});

test('registering adds a lookup by legacy id and by canonical identity', () => {
  const registry = createEngineeringCalculationRegistry().register(
    calculationEntry('SA-ROW-WEIGHT-001', 'ROW-WEIGHT', 1),
  );

  assert.equal(registry.list().length, 1);
  assert.equal(registry.get('SA-ROW-WEIGHT-001')?.calculationId, 'SA-ROW-WEIGHT-001');
  assert.equal(
    registry.getByIdentity('CALC-SA-ROW-WEIGHT-001')?.calculationId,
    'SA-ROW-WEIGHT-001',
  );
});

test('registry registration is immutable', () => {
  const empty = createEngineeringCalculationRegistry();
  const withEntry = empty.register(calculationEntry('SA-ROW-WEIGHT-001', 'ROW-WEIGHT', 1));

  assert.equal(empty.list().length, 0);
  assert.equal(withEntry.list().length, 1);
});

test('list preserves deterministic registration order', () => {
  const registry = createEngineeringCalculationRegistry()
    .register(calculationEntry('SA-ROW-WEIGHT-001', 'ROW-WEIGHT', 1))
    .register(calculationEntry('SA-ACC-WEIGHT-001', 'ACC-WEIGHT', 1))
    .register(calculationEntry('SA-CG-001', 'CG', 1));

  const ids = registry.list().map((entry) => entry.calculationId);
  assert.deepEqual(ids, ['SA-ROW-WEIGHT-001', 'SA-ACC-WEIGHT-001', 'SA-CG-001']);
});

test('duplicate registration is skipped', () => {
  const registry = createEngineeringCalculationRegistry()
    .register(calculationEntry('SA-ROW-WEIGHT-001', 'ROW-WEIGHT', 1))
    .register(calculationEntry('SA-ROW-WEIGHT-001', 'ROW-WEIGHT', 1));

  assert.equal(registry.list().length, 1);
});

test('non-calculation artifact identities are rejected', () => {
  const sourceEntry = {
    identity: engineeringArtifactIdentity({
      type: 'SOURCE',
      systemCode: 'SA',
      slug: 'MATERIAL',
      sequence: 1,
      name: 'Source',
      version: '1',
    }),
    calculationId: 'SA-ROW-WEIGHT-001',
    method: 'Statics',
    formula: 'W = ρ · V · g',
  };

  const registry = createEngineeringCalculationRegistry().register(sourceEntry);
  assert.deepEqual(registry.list(), []);
});