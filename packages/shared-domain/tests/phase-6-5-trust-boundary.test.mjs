import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEngineeringKnowledgeRegistry,
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgePackageFromPrimitive,
  engineeringSourceIdentityFromSourceId,
  resolveEngineeringKnowledgeGraph,
  resolveEngineeringArtifactReference,
  rowWeightPrimitive,
  validateEngineeringCalculationResult,
  validateEngineeringKnowledgePackage,
  validateEngineeringKnowledgePackageAuthoritatively,
} from '@jaryan/shared-domain';
import {
  ENGINEERING_SOURCES,
  engineeringSourceAuthority,
} from '@jaryan/shared-knowledge';

test('canonical result id is the identity id and legacy mismatch is rejected', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(pkg.result.id, pkg.result.identityId);
  assert.deepEqual(validateEngineeringCalculationResult({
    ...pkg.result,
    id: 'SA-ROW-WEIGHT-001',
  }), ['Result id must equal the result identity id.']);
  const errors = validateEngineeringKnowledgePackage({
    ...pkg,
    result: { ...pkg.result, id: 'SA-ROW-WEIGHT-001' },
  });
  assert.ok(errors.some((error) => error.includes('Result id')));
});

test('all adversarial result identity mismatches fail structural package validation', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const cases = [
    {
      name: 'malformed result id',
      result: { ...pkg.result, id: 'not-a-result-id' },
    },
    {
      name: 'malformed identity id',
      result: { ...pkg.result, identityId: 'RESULT-SA-ROW-WEIGHT-001' },
    },
    {
      name: 'different result artifact',
      result: { ...pkg.result, id: 'RESULT-SA-OTHER-002-v1' },
    },
    {
      name: 'version mismatch',
      result: { ...pkg.result, id: 'RESULT-SA-ROW-WEIGHT-001-v2' },
    },
  ];
  for (const { name, result } of cases) {
    const errors = validateEngineeringKnowledgePackage({ ...pkg, result });
    assert.ok(errors.length > 0, `${name} must be rejected`);
  }
});

test('package construction rejects tampered result identity fields', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  for (const result of [
    { ...pkg.result, id: 'RESULT-SA-OTHER-002-v1' },
    { ...pkg.result, identityId: 'RESULT-SA-ROW-WEIGHT-001' },
  ]) {
    assert.throws(
      () =>
        createEngineeringKnowledgePackage({
          identity: pkg.identity,
          definition: pkg.definition,
          inputs: pkg.inputs,
          result,
          provenance: pkg.provenance,
          dependencies: pkg.dependencies,
        }),
      /Invalid engineering knowledge package/,
    );
  }
});

test('source authority distinguishes resolved, not found and invalid references', () => {
  assert.equal(
    engineeringSourceAuthority.resolve('TIMO-SHELLS-1959').status,
    'RESOLVED',
  );
  assert.equal(
    engineeringSourceAuthority.resolve('FABRICATED-SOURCE').status,
    'NOT_FOUND',
  );
  assert.equal(
    engineeringSourceAuthority.resolve('not a source').status,
    'INVALID',
  );
});

test('ambiguous source authority is an explicit contract state', () => {
  const authority = {
    resolve(reference) {
      return { reference, status: 'AMBIGUOUS', sourceId: 'DUPLICATE' };
    },
  };
  assert.equal(authority.resolve('DUPLICATE').status, 'AMBIGUOUS');
});

test('authoritative package validation rejects fabricated sources', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const fabricated = {
    ...pkg,
    result: { ...pkg.result, sources: ['FABRICATED-SOURCE'] },
    provenance: {
      ...pkg.provenance,
      sources: [engineeringSourceIdentityFromSourceId('FABRICATED-SOURCE')],
    },
  };
  const errors = validateEngineeringKnowledgePackageAuthoritatively(
    fabricated,
    engineeringSourceAuthority,
  );
  assert.ok(errors.some((error) => error.includes('NOT_FOUND')));
});

test('authority-free construction does not claim authoritative source resolution', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(validateEngineeringKnowledgePackage(pkg).length, 0);
  const fabricated = {
    ...pkg,
    result: { ...pkg.result, sources: ['FABRICATED-SOURCE'] },
    provenance: {
      ...pkg.provenance,
      sources: [engineeringSourceIdentityFromSourceId('FABRICATED-SOURCE')],
    },
  };
  assert.ok(validateEngineeringKnowledgePackage(fabricated).length > 0);
  assert.ok(
    validateEngineeringKnowledgePackageAuthoritatively(
      fabricated,
      engineeringSourceAuthority,
    ).some((error) => error.includes('NOT_FOUND')),
  );
});

test('authority-free construction permits syntactically valid but unknown source references', () => {
  const base = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const unknownSource = engineeringSourceIdentityFromSourceId('UNKNOWN-SOURCE');
  const built = createEngineeringKnowledgePackage({
    identity: base.identity,
    definition: base.definition,
    inputs: base.inputs,
    result: { ...base.result, sources: ['UNKNOWN-SOURCE'] },
    provenance: {
      ...base.provenance,
      sources: [unknownSource],
    },
    dependencies: base.dependencies,
  });
  assert.equal(built.provenance.sources[0].metadata.sourceId, 'UNKNOWN-SOURCE');
  assert.ok(
    validateEngineeringKnowledgePackageAuthoritatively(
      built,
      engineeringSourceAuthority,
    ).some((error) => error.includes('NOT_FOUND')),
  );
});

test('authorities are explicit, isolated, and deterministic', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const resolvingAuthority = {
    resolve(reference) {
      return { reference, status: 'RESOLVED', sourceId: 'TIMO-SHELLS-1959' };
    },
  };
  const rejectingAuthority = {
    resolve(reference) {
      return { reference, status: 'NOT_FOUND', sourceId: 'TIMO-SHELLS-1959' };
    },
  };
  const first = validateEngineeringKnowledgePackageAuthoritatively(
    pkg,
    resolvingAuthority,
  );
  const second = validateEngineeringKnowledgePackageAuthoritatively(
    pkg,
    resolvingAuthority,
  );
  const rejected = validateEngineeringKnowledgePackageAuthoritatively(
    pkg,
    rejectingAuthority,
  );
  assert.deepEqual(first, second);
  assert.deepEqual(first, []);
  assert.ok(rejected.some((error) => error.includes('NOT_FOUND')));
});

test('authoritative validation does not mutate package, authority, or source state', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const before = JSON.stringify(pkg);
  const calls = [];
  const authority = {
    resolve(reference) {
      calls.push(reference);
      return {
        reference,
        status: 'RESOLVED',
        sourceId: 'TIMO-SHELLS-1959',
      };
    },
  };
  validateEngineeringKnowledgePackageAuthoritatively(pkg, authority);
  validateEngineeringKnowledgePackageAuthoritatively(pkg, authority);
  assert.equal(JSON.stringify(pkg), before);
  assert.equal(calls.length, 2);
  assert.equal(Object.isFrozen(pkg), true);
  assert.equal(Object.isFrozen(pkg.provenance), true);
  assert.equal(Object.isFrozen(pkg.dependencies), true);
});

test('source authority resolution returns no mutable collections and handles identity references', () => {
  const source = engineeringSourceIdentityFromSourceId('TIMO-SHELLS-1959');
  const resolved = engineeringSourceAuthority.resolve(source);
  assert.equal(resolved.status, 'RESOLVED');
  assert.equal(resolved.sourceId, 'TIMO-SHELLS-1959');
  assert.equal(Object.hasOwn(resolved, 'candidates'), false);
  assert.equal(
    engineeringSourceAuthority.resolve({
      ...source,
      metadata: { sourceId: 'not a source' },
    }).status,
    'INVALID',
  );
});

test('source authority does not alter graph ownership or open-graph semantics', () => {
  const row = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const acc = createEngineeringKnowledgePackageFromPrimitive(
    {
      ...rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
      calculationId: 'SA-ACC-WEIGHT-001',
    },
  );
  const registry = createEngineeringKnowledgeRegistry().register(row).register(acc);
  const sourceId = row.provenance.sources[0].id;
  const artifactResolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: sourceId,
  });
  assert.equal(artifactResolution.status, 'AMBIGUOUS');
  assert.equal(
    engineeringSourceAuthority.resolve(row.provenance.sources[0].metadata.sourceId)
      .status,
    'RESOLVED',
  );
  const graph = resolveEngineeringKnowledgeGraph(registry);
  assert.equal(
    graph.nodes.find((node) => node.id === sourceId).resolution,
    'AMBIGUOUS',
  );
});

test('shared-domain production source contains no shared-knowledge import or ambient authority', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(
    new URL('../src/engineering/engineering-knowledge-package.ts', import.meta.url),
    'utf8',
  );
  const authority = await fs.readFile(
    new URL('../src/engineering/source-authority.ts', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /shared-knowledge/);
  assert.doesNotMatch(authority, /globalThis|global\\.|singleton|registry/i);
});

test('shared sources remain one source identity across multiple packages', () => {
  const ids = ENGINEERING_SOURCES
    .filter((source) => source.sourceId === 'TIMO-SHELLS-1959')
    .map((source) => source.sourceId);
  assert.deepEqual(ids, ['TIMO-SHELLS-1959']);
});
