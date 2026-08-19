import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION,
  createEngineeringDependencyGraph,
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgePackageFromPrimitive,
  deriveEngineeringEvidence,
  engineeringArtifactLineageKey,
  engineeringCalculationIdentityFromLegacyId,
  engineeringKnowledgePackageContent,
  engineeringKnowledgePackageFingerprint,
  engineeringPrimitiveIdentityFromLegacyId,
  isEngineeringDependencyGraphAcyclic,
  localStabilityCheckPrimitive,
  rowWeightPrimitive,
  serializeEngineeringKnowledgePackage,
  validateEngineeringKnowledgePackage,
} from '@jaryan/shared-domain';

test('A: caller-declared complete evidence cannot bypass derived evidence rules', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: valid.identity,
        definition: valid.definition,
        inputs: {},
        result: valid.result,
        provenance: valid.provenance,
      }),
    /Invalid engineering knowledge package.*INPUTS/,
  );
  const tampered = { ...valid, inputs: {} };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(
    errors.some((error) =>
      error.includes('Provenance completeness must match the derived evidence contract'),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes('Provenance missing evidence must match the derived evidence contract'),
    ),
  );
});

test('B: missing inputs are detected', () => {
  assert.throws(
    () => createEngineeringKnowledgePackageFromPrimitive(localStabilityCheckPrimitive()),
    /Invalid engineering knowledge package.*INPUTS/,
  );
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const errors = validateEngineeringKnowledgePackage({ ...valid, inputs: {} });
  assert.ok(errors.some((error) => error.includes('INPUTS')));
});

test('C: missing sources are detected when required', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(valid.result.status, 'SOURCE_VALIDATED');
  const tampered = {
    ...valid,
    result: { ...valid.result, sources: [] },
    provenance: { ...valid.provenance, sources: [] },
  };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(errors.some((error) => error.includes('SOURCES')));
});

test('D: a cross-lineage provenance chain is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const foreignCalculation = engineeringCalculationIdentityFromLegacyId(
    'SA-VERT-STRESS-001',
    '1',
  );
  assert.ok(foreignCalculation);
  const tampered = {
    ...valid,
    definition: { ...valid.definition, calculationIdentity: foreignCalculation },
    provenance: { ...valid.provenance, calculation: foreignCalculation },
  };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(errors.some((error) => error.includes('same base lineage')));
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: valid.identity,
        definition: {
          ...valid.definition,
          calculationIdentity: foreignCalculation,
        },
        inputs: valid.inputs,
        result: valid.result,
        provenance: { ...valid.provenance, calculation: foreignCalculation },
        dependencies: valid.dependencies,
      }),
    /same base lineage/,
  );
});

test('E: result.sources and provenance.sources must correspond one-to-one', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const tampered = { ...valid, result: { ...valid.result, sources: [] } };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(
    errors.some((error) => error.includes('correspond one-to-one')),
  );
});

test('F: an injected cyclic dependency graph is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const cyclic = {
    nodes: ['A', 'B'],
    edges: [
      { fromId: 'A', toId: 'B' },
      { fromId: 'B', toId: 'A' },
    ],
    version: '1',
  };
  const errors = validateEngineeringKnowledgePackage({
    ...valid,
    dependencies: cyclic,
  });
  assert.ok(errors.some((error) => error.includes('acyclic')));
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: valid.identity,
        definition: valid.definition,
        inputs: valid.inputs,
        result: valid.result,
        provenance: valid.provenance,
        dependencies: cyclic,
      }),
    /acyclic/,
  );
});

test('G: the primitive → calculation → result chain is reflected in dependencies', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const edgeKey = (fromId, toId) => `${fromId}->${toId}`;
  const edges = new Set(
    pkg.dependencies.edges.map((edge) => edgeKey(edge.fromId, edge.toId)),
  );
  assert.ok(
    edges.has(edgeKey(pkg.provenance.result.id, pkg.provenance.calculation.id)),
  );
  assert.ok(
    edges.has(
      edgeKey(pkg.provenance.calculation.id, pkg.provenance.primitive.id),
    ),
  );
  assert.ok(
    edges.has(
      edgeKey(pkg.provenance.primitive.id, pkg.provenance.sources[0].id),
    ),
  );
  for (const node of [
    pkg.provenance.result.id,
    pkg.provenance.calculation.id,
    pkg.provenance.primitive.id,
    pkg.provenance.sources[0].id,
  ]) {
    assert.ok(pkg.dependencies.nodes.includes(node));
  }
});

test('I: the package format version is serialized and round-trips', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(pkg.formatVersion, ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION);
  const parsed = JSON.parse(serializeEngineeringKnowledgePackage(pkg));
  assert.equal(parsed.formatVersion, '1');
  assert.deepEqual(parsed, engineeringKnowledgePackageContent(pkg));
});

test('J: an unsupported format version changes the fingerprint and fails validation', () => {
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const upgraded = { ...pkg, formatVersion: '2' };
  assert.notEqual(
    engineeringKnowledgePackageFingerprint(pkg),
    engineeringKnowledgePackageFingerprint(upgraded),
  );
  const errors = validateEngineeringKnowledgePackage(upgraded);
  assert.ok(errors.some((error) => error.includes('format version')));
});

test('K: rebuilding the same logical package is deterministic', () => {
  const build = () =>
    createEngineeringKnowledgePackageFromPrimitive(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    );
  const first = build();
  const second = build();
  assert.equal(
    serializeEngineeringKnowledgePackage(first),
    serializeEngineeringKnowledgePackage(second),
  );
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(
    JSON.parse(serializeEngineeringKnowledgePackage(first)),
    engineeringKnowledgePackageContent(second),
  );
});

test('L: the hardened public contract surface is exported', () => {
  assert.equal(ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION, '1');
  assert.equal(typeof deriveEngineeringEvidence, 'function');
  assert.equal(typeof isEngineeringDependencyGraphAcyclic, 'function');
  assert.equal(typeof engineeringArtifactLineageKey, 'function');
  const pkg = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(
    engineeringArtifactLineageKey(pkg.identity),
    'SA-ROW-WEIGHT-001',
  );
  assert.equal(
    engineeringArtifactLineageKey(pkg.provenance.primitive),
    'SA-ROW-WEIGHT-001',
  );
  assert.equal(
    isEngineeringDependencyGraphAcyclic(pkg.dependencies),
    true,
  );
});

test('N1: a self-loop dependency edge is rejected', () => {
  const selfLoop = {
    nodes: ['A'],
    edges: [{ fromId: 'A', toId: 'A' }],
    version: '1',
  };
  assert.equal(isEngineeringDependencyGraphAcyclic(selfLoop), false);
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const errors = validateEngineeringKnowledgePackage({
    ...valid,
    dependencies: selfLoop,
  });
  assert.ok(errors.some((error) => error.includes('acyclic')));
});

test('N2: a non-canonical dependency graph is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const resultId = valid.provenance.result.id;
  const calcId = valid.provenance.calculation.id;
  const primId = valid.provenance.primitive.id;
  const srcId = valid.provenance.sources[0].id;

  const chainEdges = [
    { fromId: resultId, toId: calcId },
    { fromId: calcId, toId: primId },
    { fromId: primId, toId: srcId },
  ];

  const unsorted = {
    nodes: [srcId, primId, resultId, calcId],
    edges: [
      chainEdges[2],
      chainEdges[0],
      chainEdges[1],
    ],
    version: '1',
  };
  const unsortedErrors = validateEngineeringKnowledgePackage({
    ...valid,
    dependencies: unsorted,
  });
  assert.ok(
    unsortedErrors.some((error) => error.includes('must be canonical')),
  );

  const duplicated = {
    nodes: [resultId, resultId, calcId, primId, srcId],
    edges: chainEdges,
    version: '1',
  };
  const duplicatedErrors = validateEngineeringKnowledgePackage({
    ...valid,
    dependencies: duplicated,
  });
  assert.ok(
    duplicatedErrors.some((error) => error.includes('must be canonical')),
  );
});

test('N3: a provenance chain with mismatched artifact versions is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const primitiveV2 = engineeringPrimitiveIdentityFromLegacyId(
    'SA-ROW-WEIGHT-001',
    '2',
  );
  assert.ok(primitiveV2);
  const tampered = {
    ...valid,
    provenance: { ...valid.provenance, primitive: primitiveV2 },
  };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(
    errors.some((error) => error.includes('same artifact version')),
  );
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: valid.identity,
        definition: valid.definition,
        inputs: valid.inputs,
        result: valid.result,
        provenance: { ...valid.provenance, primitive: primitiveV2 },
        dependencies: valid.dependencies,
      }),
    /same artifact version/,
  );
});

test('N4: a reverse chain edge that creates a cycle after merge is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const primId = valid.provenance.primitive.id;
  const resultId = valid.provenance.result.id;
  const reverseEdge = createEngineeringDependencyGraph(
    [primId, resultId],
    [{ fromId: primId, toId: resultId }],
  );
  assert.throws(
    () =>
      createEngineeringKnowledgePackage({
        identity: valid.identity,
        definition: valid.definition,
        inputs: valid.inputs,
        result: valid.result,
        provenance: valid.provenance,
        dependencies: reverseEdge,
      }),
    /acyclic/,
  );
});

test('N5: a provenance source without a resolvable sourceId is rejected', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const withoutMetadata = {
    ...valid.provenance.sources[0],
    metadata: {},
  };
  const errors = validateEngineeringKnowledgePackage({
    ...valid,
    provenance: { ...valid.provenance, sources: [withoutMetadata] },
  });
  assert.ok(
    errors.some((error) => error.includes('resolvable sourceId')),
  );
});

test('N6: evidence completeness cannot be declared into validity', () => {
  const valid = createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const tampered = {
    ...valid,
    provenance: {
      ...valid.provenance,
      requiredEvidence: ['METHOD'],
      missingEvidence: ['INPUTS'],
      complete: false,
    },
  };
  const errors = validateEngineeringKnowledgePackage(tampered);
  assert.ok(
    errors.some((error) =>
      error.includes(
        'Provenance required evidence must match the derived evidence contract',
      ),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes(
        'Provenance missing evidence must match the derived evidence contract',
      ),
    ),
  );
  assert.ok(
    errors.some((error) =>
      error.includes(
        'Provenance completeness must match the derived evidence contract',
      ),
    ),
  );
});