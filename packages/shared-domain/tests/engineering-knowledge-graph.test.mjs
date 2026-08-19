import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION,
  accumulatedWeightPrimitive,
  analyzeRegisteredEngineeringImpact,
  createEngineeringDependencyGraph,
  createEngineeringKnowledgePackageFromPrimitive,
  createEngineeringKnowledgeRegistry,
  engineeringDependencyGraphOfResolvedGraph,
  engineeringKnowledgeGraphFingerprint,
  resolveEngineeringArtifactReference,
  resolveEngineeringKnowledgeGraph,
  rowWeightPrimitive,
  validateResolvedEngineeringKnowledgeGraph,
} from '@jaryan/shared-domain';

const ROW_RESULT = 'RESULT-SA-ROW-WEIGHT-001-v1';
const ROW_CALC = 'CALC-SA-ROW-WEIGHT-001-v1';
const ROW_PRIM = 'PRIM-SA-ROW-WEIGHT-001-v1';
const ACC_RESULT = 'RESULT-SA-ACC-WEIGHT-001-v1';
const ACC_CALC = 'CALC-SA-ACC-WEIGHT-001-v1';
const ACC_PRIM = 'PRIM-SA-ACC-WEIGHT-001-v1';

const rowWeightPackage = (version = '1', volumeM3 = 1) =>
  createEngineeringKnowledgePackageFromPrimitive(
    rowWeightPrimitive({ volumeM3, densityKgM3: 2000 }),
    { version },
  );

const accWeightPackage = (version = '1') =>
  createEngineeringKnowledgePackageFromPrimitive(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    { version },
  );

const packageWithDependencies = (primitive, edges) =>
  createEngineeringKnowledgePackageFromPrimitive(primitive, {
    dependencies: rawGraph(edges),
  });

const rawGraph = (edges) => {
  const nodeSet = new Set();
  const edgeSet = new Map();
  for (const { fromId, toId } of edges) {
    nodeSet.add(fromId);
    nodeSet.add(toId);
    edgeSet.set(`${fromId}\u0000${toId}`, { fromId, toId });
  }
  return {
    nodes: [...nodeSet].sort(),
    edges: [...edgeSet.values()].sort(
      (a, b) => a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
    ),
    version: '1',
  };
};

const nodeById = (graph, id) => graph.nodes.find((node) => node.id === id);
const edgeBetween = (graph, fromId, toId) =>
  graph.edges.find((edge) => edge.fromId === fromId && edge.toId === toId);

test('A: a RESULT artifact resolves to its owning package by identity id', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: ROW_RESULT,
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.identityId, ROW_RESULT);
  assert.equal(resolution.baseId, 'RESULT-SA-ROW-WEIGHT-001');
  assert.equal(resolution.artifactType, 'RESULT');
  assert.deepEqual(resolution.owningPackageIds, [ROW_RESULT]);
  assert.deepEqual(resolution.candidates, [registry.get(ROW_RESULT).identity]);
});

test('B: a CALCULATION artifact resolves to its owning package', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: ROW_CALC,
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.artifactType, 'CALCULATION');
  assert.deepEqual(resolution.owningPackageIds, [ROW_RESULT]);
});

test('C: a PRIMITIVE artifact resolves to its owning package', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: ROW_PRIM,
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.artifactType, 'PRIMITIVE');
  assert.deepEqual(resolution.owningPackageIds, [ROW_RESULT]);
});

test('D: a SOURCE shared by two packages resolves as AMBIGUOUS', () => {
  const row = rowWeightPackage('1');
  const acc = accWeightPackage('1');
  const sourceId = row.provenance.sources[0].id;
  assert.equal(acc.provenance.sources[0].id, sourceId);
  const registry = createEngineeringKnowledgeRegistry().register(row).register(acc);
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: sourceId,
  });
  assert.equal(resolution.status, 'AMBIGUOUS');
  assert.deepEqual(resolution.owningPackageIds, [ACC_RESULT, ROW_RESULT]);
  assert.deepEqual(
    resolution.candidates.map((identity) => identity.id),
    [sourceId, sourceId],
  );
  assert.equal(resolution.identityId, sourceId);
});

test('E: a missing artifact resolves as NOT_FOUND', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: 'RESULT-SA-UNKNOWN-001-v1',
  });
  assert.equal(resolution.status, 'NOT_FOUND');
  assert.equal(resolution.baseId, 'RESULT-SA-UNKNOWN-001');
  assert.equal(resolution.artifactType, 'RESULT');
  assert.deepEqual(resolution.owningPackageIds, []);
  assert.deepEqual(resolution.candidates, []);
});

test('F: a malformed id resolves as INVALID', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identityId',
    identityId: 'not-an-artifact-id',
  });
  assert.equal(resolution.status, 'INVALID');
  assert.equal(resolution.baseId, null);
  assert.equal(resolution.artifactType, null);
  assert.deepEqual(resolution.owningPackageIds, []);
});

test('G: a baseId with an explicit version resolves as RESOLVED', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'baseId',
    baseId: 'RESULT-SA-ROW-WEIGHT-001',
    version: '1',
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.identityId, ROW_RESULT);
  assert.deepEqual(resolution.owningPackageIds, [ROW_RESULT]);
});

test('H: a baseId with a single candidate resolves without a version', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'baseId',
    baseId: 'RESULT-SA-ROW-WEIGHT-001',
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.identityId, ROW_RESULT);
});

test('I: a baseId with multiple versions resolves as AMBIGUOUS, never silent latest', () => {
  const registry = createEngineeringKnowledgeRegistry()
    .register(rowWeightPackage('1'))
    .register(rowWeightPackage('2'));
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'baseId',
    baseId: 'RESULT-SA-ROW-WEIGHT-001',
  });
  assert.equal(resolution.status, 'AMBIGUOUS');
  assert.equal(resolution.identityId, null);
  assert.deepEqual(
    resolution.candidates.map((identity) => identity.id).sort(),
    ['RESULT-SA-ROW-WEIGHT-001-v1', 'RESULT-SA-ROW-WEIGHT-001-v2'],
  );
});

test('J: an identity reference resolves by its versioned id', () => {
  const pkg = rowWeightPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  const resolution = resolveEngineeringArtifactReference(registry, {
    kind: 'identity',
    identity: pkg.provenance.calculation,
  });
  assert.equal(resolution.status, 'RESOLVED');
  assert.equal(resolution.identityId, ROW_CALC);
  assert.equal(resolution.artifactType, 'CALCULATION');
});

test('K: the resolved graph is canonical, frozen, and deterministic', () => {
  const pkg = rowWeightPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  const graph = resolveEngineeringKnowledgeGraph(registry);
  assert.equal(graph.formatVersion, ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION);
  assert.equal(Object.isFrozen(graph), true);
  assert.deepEqual(graph.selfDependencies, []);
  assert.equal(graph.acyclic, true);
  assert.equal(graph.open, false);
  assert.equal(graph.fingerprint, engineeringKnowledgeGraphFingerprint(graph));
  const ids = graph.nodes.map((node) => node.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.equal(validateResolvedEngineeringKnowledgeGraph(graph).length, 0);
  assert.equal(resolveEngineeringKnowledgeGraph(registry).fingerprint, graph.fingerprint);
});

test('L: the resolved graph carries chain edges with package ownership', () => {
  const row = rowWeightPackage('1');
  const acc = accWeightPackage('1');
  const rowWithCross = packageWithDependencies(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    [{ fromId: ROW_RESULT, toId: ACC_CALC }],
  );
  const registry = createEngineeringKnowledgeRegistry()
    .register(acc)
    .register(rowWithCross);
  const graph = resolveEngineeringKnowledgeGraph(registry);
  const sourceId = row.provenance.sources[0].id;

  assert.equal(nodeById(graph, ROW_RESULT).resolution, 'RESOLVED');
  assert.deepEqual(nodeById(graph, ROW_RESULT).owningPackageIds, [ROW_RESULT]);
  assert.deepEqual(nodeById(graph, ACC_CALC).owningPackageIds, [ACC_RESULT]);
  assert.equal(nodeById(graph, sourceId).resolution, 'AMBIGUOUS');
  assert.deepEqual(nodeById(graph, sourceId).owningPackageIds, [ACC_RESULT, ROW_RESULT]);

  assert.ok(edgeBetween(graph, ROW_RESULT, ROW_CALC));
  assert.ok(edgeBetween(graph, ROW_CALC, ROW_PRIM));
  assert.ok(edgeBetween(graph, ROW_PRIM, sourceId));
  assert.equal(edgeBetween(graph, ROW_RESULT, ACC_CALC).resolved, true);
  assert.equal(edgeBetween(graph, ROW_PRIM, sourceId).resolved, false);
  assert.equal(graph.open, true);
  assert.equal(graph.acyclic, true);
});

test('M: an unresolved external edge keeps the graph open and explicit', () => {
  const external = 'RESULT-SA-EXTERNAL-999-v1';
  const pkg = packageWithDependencies(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    [{ fromId: ROW_RESULT, toId: external }],
  );
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  const graph = resolveEngineeringKnowledgeGraph(registry);
  const node = nodeById(graph, external);
  assert.equal(node.resolution, 'NOT_FOUND');
  assert.deepEqual(node.owningPackageIds, []);
  const edge = edgeBetween(graph, ROW_RESULT, external);
  assert.equal(edge.toStatus, 'NOT_FOUND');
  assert.equal(edge.resolved, false);
  assert.equal(graph.open, true);
  assert.equal(graph.acyclic, true);
});

test('N: a cross-package cycle is detected in the resolved graph', () => {
  const a = packageWithDependencies(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    [{ fromId: ROW_CALC, toId: ACC_RESULT }],
  );
  const b = packageWithDependencies(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    [{ fromId: ACC_CALC, toId: ROW_RESULT }],
  );
  const registry = createEngineeringKnowledgeRegistry().register(a).register(b);
  const graph = resolveEngineeringKnowledgeGraph(registry);
  assert.equal(graph.acyclic, false);
  assert.ok(edgeBetween(graph, ROW_CALC, ACC_RESULT));
  assert.ok(edgeBetween(graph, ACC_CALC, ROW_RESULT));
});

test('O: registration order does not change the resolved graph', () => {
  const v1 = rowWeightPackage('1');
  const v2 = rowWeightPackage('2');
  const forward = createEngineeringKnowledgeRegistry().register(v1).register(v2);
  const reversed = createEngineeringKnowledgeRegistry().register(v2).register(v1);
  const forwardGraph = resolveEngineeringKnowledgeGraph(forward);
  const reversedGraph = resolveEngineeringKnowledgeGraph(reversed);
  assert.deepEqual(forwardGraph, reversedGraph);
  assert.equal(forwardGraph.fingerprint, reversedGraph.fingerprint);
  assert.equal(forward.serialize(), reversed.serialize());
});

test('P: the validator rejects a crafted self-dependency graph', () => {
  const crafted = {
    formatVersion: ENGINEERING_KNOWLEDGE_GRAPH_FORMAT_VERSION,
    nodes: [
      {
        id: 'RESULT-SA-CRAFTED-001-v1',
        baseId: 'RESULT-SA-CRAFTED-001',
        artifactType: 'RESULT',
        resolution: 'RESOLVED',
        owningPackageIds: ['RESULT-SA-CRAFTED-001-v1'],
      },
    ],
    edges: [
      {
        fromId: 'RESULT-SA-CRAFTED-001-v1',
        toId: 'RESULT-SA-CRAFTED-001-v1',
        fromStatus: 'RESOLVED',
        toStatus: 'RESOLVED',
        resolved: true,
      },
    ],
    acyclic: true,
    open: false,
    selfDependencies: [],
    fingerprint: '',
  };
  const errors = validateResolvedEngineeringKnowledgeGraph(crafted);
  assert.ok(errors.some((error) => error.includes('self dependency')));
  assert.ok(errors.some((error) => error.includes('acyclic')));
});

test('Q: registered impact resolves the target and reports dependents', () => {
  const row = rowWeightPackage('1');
  const acc = accWeightPackage('1');
  const accWithCross = packageWithDependencies(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    [{ fromId: ACC_RESULT, toId: ROW_RESULT }],
  );
  const registry = createEngineeringKnowledgeRegistry().register(accWithCross).register(row);
  const impact = analyzeRegisteredEngineeringImpact(registry, ROW_RESULT);
  assert.equal(impact.target.status, 'RESOLVED');
  assert.equal(impact.targetId, ROW_RESULT);
  assert.deepEqual(
    impact.direct.map((node) => node.artifactId),
    [ACC_RESULT],
  );
  assert.deepEqual(impact.affectedArtifactIds, [ACC_RESULT]);
  assert.deepEqual(
    impact.transitiveAffectedArtifactIds,
    [ACC_RESULT],
  );
  assert.equal(impact.open, false);
});

test('R: registered impact on an unresolved target is open and empty', () => {
  const registry = createEngineeringKnowledgeRegistry().register(rowWeightPackage('1'));
  const impact = analyzeRegisteredEngineeringImpact(registry, 'RESULT-SA-UNKNOWN-001-v1');
  assert.equal(impact.target.status, 'NOT_FOUND');
  assert.deepEqual(impact.direct, []);
  assert.deepEqual(impact.affectedArtifactIds, []);
  assert.deepEqual(impact.transitive, []);
  assert.equal(impact.open, true);
});

test('S: registered impact is bounded on a cyclic resolved graph', () => {
  const a = packageWithDependencies(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    [{ fromId: ROW_CALC, toId: ACC_RESULT }],
  );
  const b = packageWithDependencies(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    [{ fromId: ACC_CALC, toId: ROW_RESULT }],
  );
  const registry = createEngineeringKnowledgeRegistry().register(a).register(b);
  const impact = analyzeRegisteredEngineeringImpact(registry, ROW_RESULT);
  assert.equal(impact.target.status, 'RESOLVED');
  assert.ok(impact.transitive.length > 0);
  assert.ok(impact.transitive.length < 10);
  assert.deepEqual([...new Set(impact.transitiveAffectedArtifactIds)].length, impact.transitiveAffectedArtifactIds.length);
});

test('T: impact via an unresolved external edge is open', () => {
  const external = 'RESULT-SA-EXTERNAL-999-v1';
  const pkg = packageWithDependencies(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    [{ fromId: ROW_RESULT, toId: external }],
  );
  const registry = createEngineeringKnowledgeRegistry().register(pkg);
  const impact = analyzeRegisteredEngineeringImpact(registry, ROW_RESULT);
  assert.equal(impact.target.status, 'RESOLVED');
  assert.equal(impact.open, true);
});

test('U: registration order does not change registered impact', () => {
  const row = rowWeightPackage('1');
  const accWithCross = packageWithDependencies(
    accumulatedWeightPrimitive([
      { weightKn: 10, elevationM: 2 },
      { weightKn: 20, elevationM: 4 },
    ]),
    [{ fromId: ACC_RESULT, toId: ROW_RESULT }],
  );
  const forward = createEngineeringKnowledgeRegistry().register(row).register(accWithCross);
  const reversed = createEngineeringKnowledgeRegistry().register(accWithCross).register(row);
  assert.deepEqual(
    analyzeRegisteredEngineeringImpact(forward, ROW_RESULT),
    analyzeRegisteredEngineeringImpact(reversed, ROW_RESULT),
  );
});

test('V: the resolved graph projects onto an EngineeringDependencyGraph', () => {
  const row = rowWeightPackage('1');
  const acc = accWeightPackage('1');
  const registry = createEngineeringKnowledgeRegistry().register(row).register(acc);
  const graph = resolveEngineeringKnowledgeGraph(registry);
  const projected = engineeringDependencyGraphOfResolvedGraph(graph);
  const rebuilt = createEngineeringDependencyGraph(projected.nodes, projected.edges);
  assert.equal(rebuilt.version, '1');
  assert.ok(rebuilt.nodes.includes(ROW_RESULT));
  assert.ok(rebuilt.nodes.includes(ACC_CALC));
  assert.ok(rebuilt.edges.some((edge) => edge.fromId === ROW_RESULT && edge.toId === ROW_CALC));
});
