import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactId,
  engineeringArtifactIdentity,
  engineeringArtifactVersionedId,
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

  assert.equal(identity.id, 'RESULT-SA-STRESS-001-v1');
  assert.equal(identity.baseId, 'RESULT-SA-STRESS-001');
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
  assert.equal(parsed.id, 'PRIM-SA-GEOM-001-v1');
  assert.equal(parsed.baseId, 'PRIM-SA-GEOM-001');
  assert.equal(parsed.type, 'PRIMITIVE');
});

test('version changes create different identities', () => {
  const input = {
    type: 'CALCULATION',
    systemCode: 'SA',
    slug: 'STRESS',
    sequence: 1,
    name: 'Stress check',
  };
  const v1 = engineeringArtifactIdentity({ ...input, version: '1' });
  const v2 = engineeringArtifactIdentity({ ...input, version: '2' });

  assert.equal(v1.id, 'CALC-SA-STRESS-001-v1');
  assert.equal(v2.id, 'CALC-SA-STRESS-001-v2');
  assert.notEqual(v1.id, v2.id);
  assert.equal(v1.baseId, v2.baseId);
});

test('versioned artifact ids are deterministic and version-first-class', () => {
  assert.equal(
    engineeringArtifactVersionedId('CALCULATION', 'SA', 'STRESS', 1, '1'),
    'CALC-SA-STRESS-001-v1',
  );
  assert.equal(
    engineeringArtifactVersionedId('CALCULATION', 'SA', 'STRESS', 1, '2'),
    'CALC-SA-STRESS-001-v2',
  );
});

test('identity construction validates at construction time', () => {
  assert.throws(
    () =>
      engineeringArtifactIdentity({
        type: 'CALCULATION',
        systemCode: 'SA',
        slug: 'STRESS',
        sequence: 1,
        name: 'Stress check',
        version: 'invalid',
      }),
    /Version/,
  );
  assert.throws(
    () =>
      engineeringArtifactIdentity({
        type: 'CALCULATION',
        systemCode: 'SA',
        slug: 'STRESS',
        sequence: 1,
        name: '',
        version: '1',
      }),
    /Name/,
  );
});

test('invalid version strings are rejected with explicit issues', () => {
  const errors = validateEngineeringArtifactIdentityInput({
    type: 'CALCULATION',
    systemCode: 'SA',
    slug: 'STRESS',
    sequence: 1,
    name: 'Stress check',
    version: 'v1',
  });
  assert.ok(errors.some((error) => error.includes('Version')));
});