import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accumulatedWeightPrimitive,
  centerOfGravityPrimitive,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  rowWeightPrimitive,
} from '@jaryan/shared-domain';
import {
  createEngineeringKnowledgeQuery,
} from '@jaryan/shared-application';

const ROW_RESULT = 'RESULT-SA-ROW-WEIGHT-001-v1';
const ROW_CALC = 'CALC-SA-ROW-WEIGHT-001-v1';
const ROW_PRIM = 'PRIM-SA-ROW-WEIGHT-001-v1';
const ACC_RESULT = 'RESULT-SA-ACC-WEIGHT-001-v1';
const CG_RESULT = 'RESULT-SA-CG-001-v1';
const EXTERNAL_RESULT = 'RESULT-SA-EXTERNAL-999-v1';

const rowWeightPackage = (version = '1', volumeM3 = 1) =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3, densityKgM3: 2000 }),
    { version },
  );

const packageFromPrimitive = (primitive, dependencies) =>
  createEngineeringKnowledgePackageFromPrimitive(
    primitive,
    { dependencies },
  );

const accumulatedWeightPackage = (dependencies) =>
  packageFromPrimitive(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    dependencies,
  );

const centerOfGravityPackage = (dependencies) =>
  packageFromPrimitive(
    centerOfGravityPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    dependencies,
  );

const rawGraph = (edges) => ({
  nodes: [...new Set(edges.flatMap(({ fromId, toId }) => [fromId, toId]))].sort(),
  edges: [...edges].sort(
    (a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
  ),
  version: '1',
});

test('looks up packages by identity, artifact identity, and fingerprint', () => {
  const pkg = rowWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  assert.equal(query.getPackage(pkg.identity.id), pkg);
  assert.equal(query.getPackageByIdentity(pkg.identity), pkg);
  assert.deepEqual(query.getPackagesByFingerprint(pkg.fingerprint), [pkg]);
  assert.equal(query.getPackage('RESULT-SA-UNKNOWN-001-v1'), null);
  assert.deepEqual(query.getPackagesByFingerprint('0'.repeat(64)), []);
});

test('resolves an artifact and returns its uniquely owning package', () => {
  const pkg = rowWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  const resolution = query.resolveArtifact({
    kind: 'identity',
    identity: pkg.provenance.calculation,
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(query.getPackageForArtifact({
    kind: 'identity',
    identity: pkg.provenance.calculation,
  }), pkg);
  assert.equal(query.getPackageForArtifact({
    kind: 'identityId',
    identityId: 'RESULT-SA-UNKNOWN-001-v1',
  }), null);
});

test('preserves NOT_FOUND and INVALID artifact resolution states', () => {
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(rowWeightPackage()),
  );

  assert.equal(query.resolveArtifact({
    kind: 'identityId',
    identityId: 'RESULT-SA-UNKNOWN-001-v1',
  }).status, 'NOT_FOUND');
  assert.equal(query.resolveArtifact({
    kind: 'identityId',
    identityId: 'not-an-artifact-id',
  }).status, 'INVALID');
});

test('does not invent ownership for an ambiguous shared artifact', () => {
  const row = rowWeightPackage();
  const accumulated = accumulatedWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(row).register(accumulated),
  );

  const resolution = query.resolveArtifact({
    kind: 'identityId',
    identityId: row.provenance.sources[0].id,
  });
  assert.equal(resolution.status, 'AMBIGUOUS');
  assert.equal(query.getPackageForArtifact({
    kind: 'identityId',
    identityId: row.provenance.sources[0].id,
  }), null);
});

test('retrieves the resolved graph and exposes domain validity state', () => {
  const pkg = rowWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  const graph = query.getGraph();
  assert.equal(graph.open, false);
  assert.equal(graph.acyclic, true);
  assert.equal(graph.nodes.some((node) => node.id === ROW_RESULT), true);
  assert.equal(Object.isFrozen(graph), true);
});

test('preserves open graph state when a dependency edge is unresolved', () => {
  const pkg = packageFromPrimitive(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    rawGraph([{ fromId: ROW_RESULT, toId: EXTERNAL_RESULT }]),
  );
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  const graph = query.getGraph();
  assert.equal(graph.open, true);
  assert.equal(
    graph.edges.some(
      (edge) =>
        edge.fromId === ROW_RESULT &&
        edge.toId === EXTERNAL_RESULT &&
        edge.resolved === false,
    ),
    true,
  );
});

test('queries direct dependencies and dependents through domain graph contracts', () => {
  const row = rowWeightPackage();
  const accumulated = accumulatedWeightPackage({
    nodes: [ACC_RESULT, ROW_RESULT],
    edges: [{ fromId: ACC_RESULT, toId: ROW_RESULT }],
    version: '1',
  });
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(accumulated).register(row),
  );

  assert.deepEqual(query.getDirectDependencies(ROW_RESULT), [
    ROW_CALC,
  ]);
  assert.deepEqual(query.getDirectDependencies(ROW_CALC), [ROW_PRIM]);
  assert.deepEqual(query.getDirectDependents(ROW_RESULT), [ACC_RESULT]);
});

test('exposes registered impact analysis without changing the domain result shape', () => {
  const row = rowWeightPackage();
  const accumulated = accumulatedWeightPackage({
    nodes: [ACC_RESULT, ROW_RESULT],
    edges: [{ fromId: ACC_RESULT, toId: ROW_RESULT }],
    version: '1',
  });
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(accumulated).register(row),
  );

  const impact = query.analyzeImpact(ROW_RESULT);
  assert.equal(impact.target.status, 'RESOLVED');
  assert.deepEqual(impact.affectedArtifactIds, [ACC_RESULT]);
  assert.deepEqual(impact.transitiveAffectedArtifactIds, [ACC_RESULT]);
  assert.equal(impact.open, false);
});

test('analyzeImpact preserves multi-hop transitive impact', () => {
  const row = rowWeightPackage();
  const accumulated = accumulatedWeightPackage(
    rawGraph([{ fromId: ACC_RESULT, toId: ROW_RESULT }]),
  );
  const centerOfGravity = centerOfGravityPackage(
    rawGraph([{ fromId: CG_RESULT, toId: ACC_RESULT }]),
  );
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry()
      .register(centerOfGravity)
      .register(row)
      .register(accumulated),
  );

  const impact = query.analyzeImpact(ROW_RESULT);
  assert.deepEqual(impact.affectedArtifactIds, [ACC_RESULT]);
  assert.deepEqual(impact.transitiveAffectedArtifactIds, [ACC_RESULT, CG_RESULT]);
  assert.deepEqual(
    impact.transitive.map((node) => node.artifactId),
    [ACC_RESULT, CG_RESULT],
  );
});

test('exposes package provenance and returns null for a missing package', () => {
  const pkg = rowWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  assert.equal(query.getProvenance(pkg.identity.id), pkg.provenance);
  assert.deepEqual(
    query.getProvenance(pkg.identity.id).sources,
    pkg.provenance.sources,
  );
  assert.equal(query.getProvenance('RESULT-SA-UNKNOWN-001-v1'), null);
});

test('repeated queries are deterministic and do not leak mutable state', () => {
  const pkg = rowWeightPackage();
  const query = createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(pkg),
  );

  const firstGraph = query.getGraph();
  const secondGraph = query.getGraph();
  assert.deepEqual(firstGraph, secondGraph);
  assert.equal(firstGraph.fingerprint, secondGraph.fingerprint);
  assert.deepEqual(
    query.getDirectDependencies(ROW_RESULT),
    query.getDirectDependencies(ROW_RESULT),
  );
  assert.equal(Object.isFrozen(query), true);
  assert.equal(Object.isFrozen(pkg.provenance), true);
  assert.equal(Object.isFrozen(firstGraph.nodes), true);
  assert.throws(() => {
    firstGraph.nodes.push({});
  }, TypeError);
});

test('fingerprint lookup mutation cannot affect application or domain state', () => {
  const pkg = rowWeightPackage();
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  const query = createEngineeringKnowledgeQuery(registry);
  const matches = query.getPackagesByFingerprint(pkg.fingerprint);

  assert.equal(Object.isFrozen(matches), true);
  assert.throws(() => matches.push(pkg), TypeError);
  assert.deepEqual(query.getPackagesByFingerprint(pkg.fingerprint), [pkg]);
  assert.equal(registry.size(), 1);
});

test('registration order produces equivalent application query results', () => {
  const row = rowWeightPackage();
  const accumulated = accumulatedWeightPackage(
    rawGraph([{ fromId: ACC_RESULT, toId: ROW_RESULT }]),
  );
  const forward = createEngineeringKnowledgeRegistry()
    .register(row)
    .register(accumulated);
  const reversed = createEngineeringKnowledgeRegistry()
    .register(accumulated)
    .register(row);
  const forwardQuery = createEngineeringKnowledgeQuery(forward);
  const reversedQuery = createEngineeringKnowledgeQuery(reversed);

  assert.deepEqual(forwardQuery.getGraph(), reversedQuery.getGraph());
  assert.deepEqual(
    forwardQuery.getDirectDependents(ROW_RESULT),
    reversedQuery.getDirectDependents(ROW_RESULT),
  );
  assert.deepEqual(
    forwardQuery.analyzeImpact(ROW_RESULT),
    reversedQuery.analyzeImpact(ROW_RESULT),
  );
});

test('a query retains its original registry when a derived registry is registered', () => {
  const v1 = rowWeightPackage('1');
  const v2 = rowWeightPackage('2');
  const originalRegistry = createEngineeringKnowledgeRegistry().register(v1);
  const originalQuery = createEngineeringKnowledgeQuery(originalRegistry);
  const derivedRegistry = originalRegistry.register(v2);
  const derivedQuery = createEngineeringKnowledgeQuery(derivedRegistry);

  assert.equal(originalRegistry.size(), 1);
  assert.equal(originalQuery.getPackage(v2.identity.id), null);
  assert.equal(derivedRegistry.size(), 2);
  assert.equal(derivedQuery.getPackage(v2.identity.id), v2);
  assert.deepEqual(originalQuery.getGraph(), createEngineeringKnowledgeQuery(
    createEngineeringKnowledgeRegistry().register(v1),
  ).getGraph());
});
