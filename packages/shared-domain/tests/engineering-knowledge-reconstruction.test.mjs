import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringKnowledgePackageContent,
  engineeringKnowledgePackageFromContent,
  engineeringKnowledgePackageFingerprint,
  rowWeightPrimitive,
  serializeEngineeringKnowledgePackage,
  deserializeEngineeringKnowledgeRegistry,
  verifyEngineeringKnowledgeRegistrySerialization,
} from '@jaryan/shared-domain';
import { engineeringSourceAuthority } from '@jaryan/shared-knowledge';

const buildPackage = (version = '1', volumeM3 = 1) =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3, densityKgM3: 2000 }),
    { version },
  );

const serializedPackageEntry = (pkg) => ({
  identityId: pkg.identity.id,
  baseId: pkg.identity.baseId,
  version: pkg.identity.version,
  fingerprint: pkg.fingerprint,
  package: JSON.parse(serializeEngineeringKnowledgePackage(pkg)),
});

const serializedRegistry = (...packages) =>
  JSON.stringify({
    formatVersion: '1',
    packages: packages.map(serializedPackageEntry),
  });

test('package serialize -> reconstruct is a deterministic round trip', () => {
  const pkg = buildPackage();
  const reconstructed = engineeringKnowledgePackageFromContent(
    JSON.parse(serializeEngineeringKnowledgePackage(pkg)),
    pkg.fingerprint,
  );
  const again = engineeringKnowledgePackageFromContent(
    serializeEngineeringKnowledgePackage(pkg),
    pkg.fingerprint,
  );
  assert.equal(reconstructed.fingerprint, pkg.fingerprint);
  assert.equal(serializeEngineeringKnowledgePackage(reconstructed), serializeEngineeringKnowledgePackage(pkg));
  assert.equal(reconstructed.fingerprint, again.fingerprint);
});

test('tampered formula and inputs are rejected during reconstruction', () => {
  const pkg = buildPackage();
  const content = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  content.definition.formula = `${content.definition.formula} + 1`;
  assert.throws(
    () => engineeringKnowledgePackageFromContent(content, pkg.fingerprint),
    /Invalid serialized engineering knowledge package|Result content fingerprint/,
  );
  const inputContent = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  inputContent.inputs.volumeM3.value = 999;
  assert.throws(
    () => engineeringKnowledgePackageFromContent(inputContent, pkg.fingerprint),
    /Invalid serialized engineering knowledge package|Result content fingerprint/,
  );
});

test('tampered stored package fingerprint is rejected', () => {
  const pkg = buildPackage();
  assert.throws(
    () =>
      engineeringKnowledgePackageFromContent(
        JSON.parse(serializeEngineeringKnowledgePackage(pkg)),
        '0'.repeat(64),
      ),
    /fingerprint mismatch/,
  );
});

test('tampered serialized package format version is rejected without mutating the source package', () => {
  const pkg = buildPackage();
  const serialized = serializeEngineeringKnowledgePackage(pkg);
  const content = JSON.parse(serialized);
  content.formatVersion = '2';

  assert.throws(
    () => engineeringKnowledgePackageFromContent(content, pkg.fingerprint),
    /Unsupported package format version/,
  );
  assert.equal(serializeEngineeringKnowledgePackage(pkg), serialized);
  assert.equal(pkg.formatVersion, '1');
});

test('result value, unit, status, and sources tampering is rejected', () => {
  const pkg = buildPackage();
  for (const result of [
    { ...pkg.result, value: pkg.result.value + 1 },
    { ...pkg.result, unit: 'kg' },
    { ...pkg.result, status: 'REVIEW_REQUIRED' },
    { ...pkg.result, sources: ['FABRICATED-RESULT-SOURCE'] },
  ]) {
    const content = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
    content.result = result;
    assert.throws(
      () => engineeringKnowledgePackageFromContent(content, pkg.fingerprint),
      /Invalid serialized engineering knowledge package|fingerprint mismatch|Result content fingerprint/,
    );
  }
});

test('assumption and provenance tampering is rejected', () => {
  const pkg = buildPackage();
  const assumptions = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  assumptions.definition.assumptions.push('Tampered assumption.');
  assert.throws(
    () => engineeringKnowledgePackageFromContent(assumptions, pkg.fingerprint),
    /Invalid serialized engineering knowledge package|fingerprint mismatch|Result content fingerprint/,
  );

  const provenance = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  provenance.provenance.result = {
    ...provenance.provenance.result,
    id: 'RESULT-SA-OTHER-002-v1',
  };
  assert.throws(
    () => engineeringKnowledgePackageFromContent(provenance, pkg.fingerprint),
    /Invalid serialized engineering knowledge package|fingerprint mismatch|Provenance result/,
  );
});

test('dependency graph tampering is rejected while equivalent ordering is canonicalized', () => {
  const pkg = buildPackage();
  const reordered = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  reordered.dependencies.nodes.reverse();
  reordered.dependencies.edges.reverse();
  const rebuilt = engineeringKnowledgePackageFromContent(
    reordered,
    pkg.fingerprint,
  );
  assert.equal(
    serializeEngineeringKnowledgePackage(rebuilt),
    serializeEngineeringKnowledgePackage(pkg),
  );

  const changed = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  changed.dependencies.nodes.push('EXTERNAL-TAMPERED-NODE');
  changed.dependencies.edges.push({
    fromId: 'EXTERNAL-TAMPERED-NODE',
    toId: changed.dependencies.nodes[0],
  });
  assert.throws(
    () => engineeringKnowledgePackageFromContent(changed, pkg.fingerprint),
    /Invalid serialized engineering knowledge package|fingerprint mismatch/,
  );
});

test('identity field tampering is rejected', () => {
  const pkg = buildPackage();
  for (const identity of [
    { ...pkg.identity, name: 'Tampered package' },
    { ...pkg.identity, id: 'RESULT-SA-OTHER-002-v1' },
    { ...pkg.identity, baseId: 'RESULT-SA-OTHER-002' },
    { ...pkg.identity, version: '2' },
  ]) {
    const content = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
    content.identity = identity;
    assert.throws(
      () => engineeringKnowledgePackageFromContent(content, pkg.fingerprint),
      /Invalid serialized engineering knowledge package|fingerprint mismatch|Package identity/,
    );
  }
});

test('malformed package shapes fail with controlled deterministic errors', () => {
  const pkg = buildPackage();
  const valid = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  const malformed = [
    null,
    [],
    { ...valid, dependencies: undefined },
    { ...valid, provenance: [] },
    { ...valid, inputs: [] },
  ];
  for (const content of malformed) {
    assert.throws(
      () => engineeringKnowledgePackageFromContent(content, pkg.fingerprint),
      /Serialized package|Invalid serialized engineering knowledge package/,
    );
  }
});

test('prototype-shaped serialized keys cannot mutate the clone prototype', () => {
  const pkg = buildPackage();
  const valid = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  const malicious = {};
  Object.defineProperty(malicious, '__proto__', {
    configurable: true,
    enumerable: true,
    value: valid,
    writable: true,
  });
  const beforePrototype = Object.getPrototypeOf(malicious);
  const attempt = () =>
    assert.throws(
      () => engineeringKnowledgePackageFromContent(malicious, pkg.fingerprint),
      /Serialized package content is missing formatVersion/,
    );

  attempt();
  attempt();
  assert.equal(Object.getPrototypeOf(malicious), beforePrototype);
  assert.equal(Object.prototype.polluted, undefined);
});

test('registry reconstruction reconciles duplicated identity index fields', () => {
  const pkg = buildPackage();
  for (const field of ['identityId', 'baseId', 'version']) {
    const entry = serializedPackageEntry(pkg);
    entry[field] = `${entry[field]}-tampered`;
    assert.throws(
      () =>
        deserializeEngineeringKnowledgeRegistry(
          JSON.stringify({ formatVersion: '1', packages: [entry] }),
        ),
      /does not match embedded package content/,
    );
  }
});

test('registry reconstruction preserves canonical ordering and immutability', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const registry = deserializeEngineeringKnowledgeRegistry(
    serializedRegistry(v2, v1),
  );
  assert.deepEqual(
    registry.packages().map((pkg) => pkg.identity.version),
    ['1', '2'],
  );
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.packages()), true);
  assert.equal(Object.isFrozen(registry.packages()[0]), true);
  assert.throws(() => registry.packages().push(v1), TypeError);
});

test('structural verification does not claim authority for fabricated sources', () => {
  const base = buildPackage();
  const fabricated = createEngineeringKnowledgePackage({
    identity: base.identity,
    definition: base.definition,
    inputs: base.inputs,
    result: { ...base.result, sources: ['FABRICATED-RECONSTRUCTION-SOURCE'] },
    provenance: {
      ...base.provenance,
      sources: [{
        ...base.provenance.sources[0],
        id: 'SRC-SA-FABRICATED-001-v1',
        baseId: 'SRC-SA-FABRICATED-001',
        metadata: { sourceId: 'FABRICATED-RECONSTRUCTION-SOURCE' },
      }],
    },
    dependencies: base.dependencies,
  });
  const verification = verifyEngineeringKnowledgeRegistrySerialization(
    serializedRegistry(fabricated),
  );
  assert.equal(verification.structurallyValid, true);
  assert.equal(verification.authoritativelyVerified, false);
  assert.equal(verification.valid, true);
  assert.throws(
    () =>
      deserializeEngineeringKnowledgeRegistry(
        serializedRegistry(fabricated),
        engineeringSourceAuthority,
      ),
    /NOT_FOUND/,
  );
});

test('a supplied resolving authority permits authoritative reconstruction', () => {
  const pkg = buildPackage();
  const authority = {
    resolve(reference) {
      return {
        reference,
        status: 'RESOLVED',
        sourceId: 'TIMO-SHELLS-1959',
      };
    },
  };
  const registry = deserializeEngineeringKnowledgeRegistry(
    serializedRegistry(pkg),
    authority,
  );
  assert.equal(registry.size(), 1);
});

test('malformed input and unsupported registry versions fail deterministically', () => {
  assert.deepEqual(
    verifyEngineeringKnowledgeRegistrySerialization('{not-json'),
    verifyEngineeringKnowledgeRegistrySerialization('{not-json'),
  );
  assert.equal(
    verifyEngineeringKnowledgeRegistrySerialization('{not-json').structurallyValid,
    false,
  );
  assert.throws(
    () =>
      deserializeEngineeringKnowledgeRegistry(
        JSON.stringify({ formatVersion: '2', packages: [] }),
      ),
    /Unsupported registry format version/,
  );
});

test('reconstruction preserves duplicate and fingerprint collision registration semantics', () => {
  const pkg = buildPackage();
  const duplicate = serializedRegistry(pkg, pkg);
  assert.equal(deserializeEngineeringKnowledgeRegistry(duplicate).size(), 1);

  const different = buildPackage('1', 2);
  const collision = serializedRegistry(pkg, different);
  const entries = JSON.parse(collision);
  entries.packages[1].fingerprint = pkg.fingerprint;
  assert.throws(
    () => deserializeEngineeringKnowledgeRegistry(JSON.stringify(entries)),
    /fingerprint mismatch/,
  );

  const identityCollision = serializedRegistry(pkg, different);
  assert.throws(
    () => deserializeEngineeringKnowledgeRegistry(identityCollision),
    /duplicate versioned identity/,
  );
});

test('registry registration order remains independent after reconstruction', () => {
  const v1 = buildPackage('1');
  const v2 = buildPackage('2');
  const forward = deserializeEngineeringKnowledgeRegistry(serializedRegistry(v1, v2));
  const reversed = deserializeEngineeringKnowledgeRegistry(serializedRegistry(v2, v1));
  assert.equal(forward.serialize(), reversed.serialize());
});

test('a serialized registry reconstructs in a fresh process without original package objects', () => {
  const pkg = buildPackage();
  const serialized = serializedRegistry(pkg);
  const childCode = `
    import {
      deserializeEngineeringKnowledgeRegistry
    } from '@jaryan/shared-domain';
    const registry = deserializeEngineeringKnowledgeRegistry(process.argv[1]);
    console.log(JSON.stringify({
      size: registry.size(),
      fingerprint: registry.packages()[0].fingerprint
    }));
  `;
  const child = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', childCode, serialized],
    {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    },
  );
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), {
    size: 1,
    fingerprint: pkg.fingerprint,
  });
});

test('reconstructed package fingerprint equals its content recomputation', () => {
  const pkg = buildPackage();
  const reconstructed = engineeringKnowledgePackageFromContent(
    engineeringKnowledgePackageContent(pkg),
    pkg.fingerprint,
  );
  assert.equal(reconstructed.fingerprint, engineeringKnowledgePackageFingerprint(reconstructed));
});
