import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION,
  compareEngineeringArtifactVersions,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringPrimitiveIdentityFromLegacyId,
  rowWeightPrimitive,
  validateEngineeringKnowledgePackageRegistration,
} from '@jaryan/shared-domain';

const BASE_ID = 'RESULT-SA-ROW-WEIGHT-001';

const buildPackage = (version = '1', volumeM3 = 1) =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3, densityKgM3: 2000 }),
    { version },
  );

const versionedId = (version) => `RESULT-SA-ROW-WEIGHT-001-v${version}`;

test('A: an empty registry reports no packages', () => {
  const registry = createEngineeringKnowledgeRegistry();
  assert.equal(registry.size(), 0);
  assert.equal(registry.contains(versionedId('1')), false);
  assert.equal(registry.get(versionedId('1')), null);
  assert.equal(registry.getByIdentity({ id: versionedId('1') }), null);
  assert.deepEqual(registry.getByFingerprint('0'.repeat(64)), []);
  assert.equal(registry.getVersion(BASE_ID, '1'), null);
  assert.deepEqual(registry.listVersions(BASE_ID), []);
  assert.equal(registry.latest(BASE_ID), null);
});

test('B: a valid package registers', () => {
  const pkg = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  assert.equal(registry.size(), 1);
  assert.equal(registry.contains(pkg.identity.id), true);
});

test('C: a package is retrieved by its versioned identity id', () => {
  const pkg = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  assert.equal(registry.get(pkg.identity.id), pkg);
  assert.equal(registry.get(versionedId('1')), pkg);
});

test('D: a package is retrieved by its artifact identity', () => {
  const pkg = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  assert.equal(registry.getByIdentity(pkg.identity), pkg);
  assert.equal(registry.getByIdentity(pkg.provenance.result), pkg);
});

test('E: a package is retrieved by its content fingerprint', () => {
  const pkg = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  assert.deepEqual(registry.getByFingerprint(pkg.fingerprint), [pkg]);
});

test('F: multiple versions of one base id coexist', () => {
  const registry = createEngineeringKnowledgeRegistry()
    .register(buildPackage('1'))
    .register(buildPackage('2'))
    .register(buildPackage('10'));
  assert.equal(registry.size(), 3);
  assert.equal(registry.get(versionedId('1')).identity.version, '1');
  assert.equal(registry.get(versionedId('2')).identity.version, '2');
  assert.equal(registry.get(versionedId('10')).identity.version, '10');
});

test('G: listVersions returns numeric version order', () => {
  const registry = createEngineeringKnowledgeRegistry()
    .register(buildPackage('10'))
    .register(buildPackage('2'))
    .register(buildPackage('1'));
  assert.deepEqual(registry.listVersions(BASE_ID), ['1', '2', '10']);
});

test('H: latest resolves the numerically greatest version', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const v10 = buildPackage('10');
  const registry = createEngineeringKnowledgeRegistry()
    .register(v2)
    .register(v10)
    .register(v1);
  assert.equal(registry.latest(BASE_ID), v10);
  assert.equal(registry.latest(BASE_ID).identity.version, '10');
});

test('I: historical versions remain addressable after later registrations', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const registry = createEngineeringKnowledgeRegistry()
    .register(v2)
    .register(v1);
  assert.equal(registry.get(versionedId('1')), v1);
  assert.equal(registry.get(versionedId('2')), v2);
  assert.equal(registry.getVersion(BASE_ID, '1'), v1);
  assert.equal(registry.getVersion(BASE_ID, '2'), v2);
});

test('J: re-registering an identical package is deterministic and idempotent', () => {
  const pkg = buildPackage('1');
  const once = createEngineeringKnowledgeRegistry().register(pkg);
  const twice = once.register(pkg);
  assert.equal(twice.size(), 1);
  assert.equal(once.serialize(), twice.serialize());
  const rebuilt = once.register(buildPackage('1'));
  assert.equal(rebuilt.size(), 1);
  assert.equal(once.serialize(), rebuilt.serialize());
});

test('K: a duplicate versioned identity with a different fingerprint is rejected', () => {
  const v1a = buildPackage('1', 1);
  const v1b = buildPackage('1', 2);
  assert.equal(v1a.identity.id, v1b.identity.id);
  assert.notEqual(v1a.fingerprint, v1b.fingerprint);
  const registry = createEngineeringKnowledgeRegistry().register(v1a);
  assert.throws(() => registry.register(v1b), /duplicate versioned identity/);
  assert.equal(registry.size(), 1);
});

test('L: an invalid package is rejected', () => {
  const pkg = buildPackage('1');
  const tampered = { ...pkg, fingerprint: '0'.repeat(64) };
  const registry = createEngineeringKnowledgeRegistry();
  assert.throws(
    () => registry.register(tampered),
    /Cannot register engineering knowledge package/,
  );
  assert.equal(registry.size(), 0);
});

test('M: an invalid artifact identity is rejected', () => {
  const pkg = buildPackage('1');
  const badId = { ...pkg, identity: { ...pkg.identity, id: 'not-a-valid-id' } };
  assert.throws(
    () => createEngineeringKnowledgeRegistry().register(badId),
    /Identity is invalid/,
  );
  const primitiveIdentity = engineeringPrimitiveIdentityFromLegacyId(
    'SA-ROW-WEIGHT-001',
    '1',
  );
  assert.ok(primitiveIdentity);
  assert.ok(
    validateEngineeringKnowledgePackageRegistration({
      ...pkg,
      identity: primitiveIdentity,
    }).some((error) => error.includes('must be a RESULT artifact')),
  );
  assert.ok(
    validateEngineeringKnowledgePackageRegistration({
      ...pkg,
      identity: { ...pkg.identity, version: '2' },
    }).some((error) => error.includes('base id plus version')),
  );
});

test('N: registration returns a new registry and leaves the original unchanged', () => {
  const empty = createEngineeringKnowledgeRegistry();
  const populated = empty.register(buildPackage('1'));
  assert.equal(empty.size(), 0);
  assert.equal(populated.size(), 1);
  assert.equal(Object.isFrozen(populated.get(versionedId('1'))), true);
  const later = populated.register(buildPackage('2'));
  assert.equal(populated.size(), 1);
  assert.equal(later.size(), 2);
});

test('O: registration order does not change canonical serialization', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const forward = createEngineeringKnowledgeRegistry()
    .register(v1)
    .register(v2);
  const reversed = createEngineeringKnowledgeRegistry()
    .register(v2)
    .register(v1);
  assert.equal(forward.serialize(), reversed.serialize());
});

test('P: registry serialization is deterministic and complete', () => {
  const pkg = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry()
    .register(pkg)
    .register(buildPackage('2'));
  const serialized = registry.serialize();
  assert.equal(serialized, registry.serialize());
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.formatVersion, ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION);
  assert.equal(parsed.packages.length, 2);
  assert.equal(parsed.packages[0].identityId, versionedId('1'));
  assert.equal(parsed.packages[0].fingerprint, pkg.fingerprint);
  assert.equal(parsed.packages[0].package.identity.id, versionedId('1'));
  assert.equal(Object.hasOwn(parsed.packages[0].package, 'fingerprint'), false);
});

test('Q: a missing baseId yields empty results', () => {
  const registry = createEngineeringKnowledgeRegistry().register(buildPackage('1'));
  assert.equal(registry.latest('RESULT-SA-UNKNOWN-001'), null);
  assert.deepEqual(registry.listVersions('RESULT-SA-UNKNOWN-001'), []);
  assert.equal(registry.getVersion('RESULT-SA-UNKNOWN-001', '1'), null);
});

test('R: a missing identity yields empty results', () => {
  const registry = createEngineeringKnowledgeRegistry().register(buildPackage('1'));
  assert.equal(registry.get('RESULT-SA-UNKNOWN-001-v1'), null);
  assert.equal(registry.getByIdentity({ id: 'RESULT-SA-UNKNOWN-001-v1' }), null);
  assert.equal(registry.contains('RESULT-SA-UNKNOWN-001-v1'), false);
});

test('S: fingerprint lookup is deterministic', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const registry = createEngineeringKnowledgeRegistry()
    .register(v1)
    .register(v2);
  assert.deepEqual(registry.getByFingerprint(v1.fingerprint), [v1]);
  assert.deepEqual(registry.getByFingerprint(v2.fingerprint), [v2]);
  assert.deepEqual(registry.getByFingerprint('0'.repeat(64)), []);
});

test('T: version comparison handles multi-component versions numerically', () => {
  const scrambled = ['10', '1.10', '1.9', '2', '1'];
  const sorted = [...scrambled].sort(compareEngineeringArtifactVersions);
  assert.deepEqual(sorted, ['1', '1.9', '1.10', '2', '10']);
  const registry = scrambled.reduce(
    (current, version) => current.register(buildPackage(version)),
    createEngineeringKnowledgeRegistry(),
  );
  assert.deepEqual(registry.listVersions(BASE_ID), ['1', '1.9', '1.10', '2', '10']);
  assert.equal(registry.latest(BASE_ID).identity.version, '10');
  const distinct = createEngineeringKnowledgeRegistry()
    .register(buildPackage('1'))
    .register(buildPackage('1.0'))
    .register(buildPackage('1.0.0'));
  assert.equal(distinct.size(), 3);
  assert.deepEqual(distinct.listVersions(BASE_ID), ['1', '1.0', '1.0.0']);
  assert.equal(distinct.latest(BASE_ID).identity.version, '1.0.0');
  assert.equal(distinct.getVersion(BASE_ID, '1').identity.version, '1');
  assert.equal(distinct.getVersion(BASE_ID, '1.0').identity.version, '1.0');
  assert.equal(compareEngineeringArtifactVersions('1', '1.0') < 0, true);
  assert.equal(compareEngineeringArtifactVersions('1.9', '1.10') < 0, true);
  assert.equal(compareEngineeringArtifactVersions('2', '10') < 0, true);
  assert.equal(compareEngineeringArtifactVersions('10', '2') > 0, true);
});

test('U: packages() enumerates registered packages in canonical order', () => {
  const v2 = buildPackage('2');
  const v1 = buildPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(v2).register(v1);
  assert.deepEqual(
    registry.packages().map((pkg) => pkg.identity.id),
    [versionedId('1'), versionedId('2')],
  );
  assert.equal(Object.isFrozen(registry.packages()), true);
  assert.equal(Object.isFrozen(registry.packages()[0]), true);
  assert.deepEqual(createEngineeringKnowledgeRegistry().packages(), []);
});