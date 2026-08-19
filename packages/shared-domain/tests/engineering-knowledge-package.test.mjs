import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDependency,
  createEngineeringDependencyGraph,
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgePackageFromPrimitive,
  engineeringKnowledgePackageContent,
  engineeringKnowledgePackageFingerprint,
  localStabilityCheckPrimitive,
  rowWeightPrimitive,
  serializeEngineeringKnowledgePackage,
  validateEngineeringKnowledgePackage,
} from '@jaryan/shared-domain';

test('A: package identity is the result artifact identity', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(pkg.identity.id, pkg.result.identityId);
  assert.equal(pkg.identity.id, 'RESULT-SA-ROW-WEIGHT-001-v1');
  assert.equal(pkg.identity.type, 'RESULT');
  assert.equal(pkg.provenance.result.id, pkg.identity.id);
  assert.equal(pkg.definition.calculationIdentity.id, 'CALC-SA-ROW-WEIGHT-001-v1');
});

test('B: identical packages serialize identically', () => {
  const build = () =>
    createEngineeringKnowledgePackageFromPrimitive(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    );
  assert.equal(
    serializeEngineeringKnowledgePackage(build()),
    serializeEngineeringKnowledgePackage(build()),
  );
});

test('C: identical packages have identical fingerprints', () => {
  const build = () =>
    createEngineeringKnowledgePackageFromPrimitive(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    );
  assert.equal(engineeringKnowledgePackageFingerprint(build()), build().fingerprint);
  assert.equal(build().fingerprint, build().fingerprint);
  assert.match(build().fingerprint, /^[0-9a-f]{64}$/);
});

test('D: changed inputs change the package fingerprint', () => {
  const baseline = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const changed = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 2, densityKgM3: 2000 }),
  );
  assert.notEqual(baseline.fingerprint, changed.fingerprint);
});

test('E: changed assumptions change the package fingerprint', () => {
  const base = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const withExtra = {
    ...base,
    assumptions: [...base.assumptions, 'Extra engineering assumption.'],
  };
  const baseline = createEngineeringKnowledgePackageFromPrimitive(base);
  const changed = createEngineeringKnowledgePackageFromPrimitive(withExtra);
  assert.notEqual(baseline.fingerprint, changed.fingerprint);
});

test('F: changed dependency set changes the package fingerprint', () => {
  const baseline = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const withDependency = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    {
      dependencies: addDependency(
        createEngineeringDependencyGraph(),
        baseline.identity.id,
        'PRIM-SA-ROW-WEIGHT-001-v1',
      ),
    },
  );
  assert.notEqual(baseline.fingerprint, withDependency.fingerprint);
  assert.ok(
    withDependency.dependencies.nodes.includes(
      'RESULT-SA-ROW-WEIGHT-001-v1',
    ),
  );
  assert.ok(
    withDependency.dependencies.edges.some(
      (edge) =>
        edge.fromId === 'RESULT-SA-ROW-WEIGHT-001-v1' &&
        edge.toId === 'PRIM-SA-ROW-WEIGHT-001-v1',
    ),
  );
});

test('F2: logically-equivalent dependency graphs canonicalize identically', () => {
  const build = (nodes) =>
    createEngineeringKnowledgePackageFromPrimitive(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
      {
        dependencies: createEngineeringDependencyGraph(nodes, [
          { fromId: 'RESULT-SA-ROW-WEIGHT-001-v1', toId: 'PRIM-SA-ROW-WEIGHT-001-v1' },
        ]),
      },
    );
  const forward = build([
    'RESULT-SA-ROW-WEIGHT-001-v1',
    'PRIM-SA-ROW-WEIGHT-001-v1',
  ]);
  const reversed = build([
    'PRIM-SA-ROW-WEIGHT-001-v1',
    'RESULT-SA-ROW-WEIGHT-001-v1',
  ]);
  assert.deepEqual(forward.dependencies.nodes, reversed.dependencies.nodes);
  assert.equal(
    serializeEngineeringKnowledgePackage(forward),
    serializeEngineeringKnowledgePackage(reversed),
  );
  assert.equal(forward.fingerprint, reversed.fingerprint);
});

test('G: an invalid identity is rejected at construction', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const broken = { ...valid, identity: { ...valid.identity, id: 'not-a-valid-id' } };
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: broken.identity,
        definition: valid.definition,
        inputs: valid.inputs,
        result: valid.result,
        provenance: valid.provenance,
        dependencies: valid.dependencies,
      }),
    /Invalid engineering knowledge package/,
  );
});

test('H: missing required evidence is rejected at construction', () => {
  assert.throws(
    () => createEngineeringKnowledgePackageFromPrimitive(localStabilityCheckPrimitive()),
    /Invalid engineering knowledge package.*INPUTS/,
  );
});

test('I: a tampered fingerprint is rejected by validation', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const tampered = { ...valid, fingerprint: '0'.repeat(64) };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(errors.some((error) => error.includes('fingerprint')));
});

test('I2: an invalid provenance artifact identity is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const broken = {
    ...valid,
    provenance: {
      ...valid.provenance,
      sources: [{ ...valid.provenance.sources[0], id: 'not-a-valid-id' }],
    },
  };
  const errors = validateEngineeringKnowledgePackage(broken);
  assert.ok(
    errors.some((error) =>
      error.includes('Provenance source identity is invalid'),
    ),
  );
});

test('packages are deeply frozen and JSON round-trip matches canonical content', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(Object.isFrozen(pkg), true);
  assert.equal(Object.isFrozen(pkg.definition.assumptions), true);
  assert.equal(Object.isFrozen(pkg.result), true);
  assert.equal(Object.isFrozen(pkg.provenance.sources), true);
  assert.equal(Object.isFrozen(pkg.dependencies.nodes), true);
  const parsed = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  assert.deepEqual(parsed, engineeringKnowledgePackageContent(pkg));
  assert.equal(Object.hasOwn(parsed, 'fingerprint'), false);
  assert.equal(parsed.identity.id, 'RESULT-SA-ROW-WEIGHT-001-v1');
});