import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactId,
  engineeringArtifactIdentity,
  validateEngineeringArtifactIdentityInput,
  isEngineeringArtifactType,
  ENGINEERING_ARTIFACT_TYPES,
} from '@jaryan/shared-domain';

test('artifact ids are deterministic strings', () => {
  assert.equal(
    engineeringArtifactId('SOURCE', 'SA', 'MATERIAL', 1),
    'SRC-SA-MATERIAL-001',
  );
  assert.equal(
    engineeringArtifactId('PRIMITIVE', 'SA', 'GEOM', 1),
    'PRIM-SA-GEOM-001',
  );
  assert.equal(
    engineeringArtifactId('CALCULATION', 'SA', 'STRESS', 1),
    'CALC-SA-STRESS-001',
  );
  assert.equal(
    engineeringArtifactId('RESULT', 'SA', 'STRESS', 1),
    'RESULT-SA-STRESS-001',
  );
  assert.equal(
    engineeringArtifactId('BENCHMARK', 'SA', 'BENCH', 1),
    'BENCH-SA-BENCH-001',
  );
});

test('identical inputs produce identical identities', () => {
  const first = engineeringArtifactIdentity({
    type: 'CALCULATION',
    systemCode: 'SA',
    slug: 'WEIGHT',
    sequence: 1,
    name: 'Row weight',
    version: '1',
  });
  const second = engineeringArtifactIdentity({
    type: 'CALCULATION',
    systemCode: 'sa',
    slug: 'weight',
    sequence: 1,
    name: 'Row weight',
    version: '1',
  });
  assert.deepEqual(first, second);
});

test('artifact identity carries type, name, version and metadata', () => {
  const identity = engineeringArtifactIdentity({
    type: 'RESULT',
    systemCode: 'SA',
    slug: 'STRESS',
    sequence: 1,
    name: 'Base vertical stress',
    version: '1',
    metadata: { unit: 'kPa' },
  });

  assert.equal(identity.id, 'RESULT-SA-STRESS-001');
  assert.equal(identity.type, 'RESULT');
  assert.equal(identity.name, 'Base vertical stress');
  assert.equal(identity.version, '1');
  assert.deepEqual(identity.metadata, { unit: 'kPa' });
});

test('artifact types are validated', () => {
  assert.equal(isEngineeringArtifactType('SOURCE'), true);
  assert.equal(isEngineeringArtifactType('BENCHMARK'), true);
  assert.equal(isEngineeringArtifactType('DATABASE'), false);
  assert.deepEqual(ENGINEERING_ARTIFACT_TYPES, [
    'SOURCE',
    'PRIMITIVE',
    'CALCULATION',
    'RESULT',
    'BENCHMARK',
  ]);
});

test('invalid identity inputs are rejected with explicit issues', () => {
  const errors = validateEngineeringArtifactIdentityInput({
    type: 'DATABASE',
    systemCode: 'sa code',
    slug: 'bad slug!',
    sequence: 0,
    name: '',
    version: '',
  });

  assert.ok(errors.some((error) => error.includes('artifact type')));
  assert.ok(errors.some((error) => error.includes('System code')));
  assert.ok(errors.some((error) => error.includes('Slug')));
  assert.ok(errors.some((error) => error.includes('Sequence')));
  assert.ok(errors.some((error) => error.includes('Name')));
  assert.ok(errors.some((error) => error.includes('Version')));
});

test('valid identity input produces no validation issues', () => {
  const errors = validateEngineeringArtifactIdentityInput({
    type: 'SOURCE',
    systemCode: 'SA',
    slug: 'MATERIAL',
    sequence: 1,
    name: 'Source material',
    version: '1',
  });
  assert.deepEqual(errors, []);
});

test('artifact identity is serializable', () => {
  const identity = engineeringArtifactIdentity({
    type: 'PRIMITIVE',
    systemCode: 'SA',
    slug: 'GEOM',
    sequence: 1,
    name: 'Dome geometry',
    version: '1',
  });
  const serialized = JSON.stringify(identity);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.id, 'PRIM-SA-GEOM-001');
  assert.equal(parsed.type, 'PRIMITIVE');
});