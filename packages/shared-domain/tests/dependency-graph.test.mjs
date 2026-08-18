import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDependency,
  addNode,
  createEngineeringDependencyGraph,
  directDependenciesOf,
  directDependentsOf,
  serializeEngineeringDependencyGraph,
} from '@jaryan/shared-domain';

test('dependency graph records directed artifact relationships', () => {
  const graph = addDependency(
    createEngineeringDependencyGraph(),
    'CALC-SA-STRESS-001',
    'CALC-SA-WEIGHT-001',
  );

  assert.deepEqual(graph.nodes, ['CALC-SA-STRESS-001', 'CALC-SA-WEIGHT-001']);
  assert.deepEqual(graph.edges, [
    { fromId: 'CALC-SA-STRESS-001', toId: 'CALC-SA-WEIGHT-001' },
  ]);
  assert.deepEqual(directDependenciesOf(graph, 'CALC-SA-STRESS-001'), [
    'CALC-SA-WEIGHT-001',
  ]);
  assert.deepEqual(directDependentsOf(graph, 'CALC-SA-WEIGHT-001'), [
    'CALC-SA-STRESS-001',
  ]);
});

test('a chain of dependencies serializes correctly', () => {
  const graph = addDependency(
    addDependency(
      createEngineeringDependencyGraph(),
      'CALC-SA-WEIGHT-001',
      'PRIM-SA-GEOM-001',
    ),
    'CALC-SA-STRESS-001',
    'CALC-SA-WEIGHT-001',
  );

  const serialized = serializeEngineeringDependencyGraph(graph);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.version, '1');
  assert.equal(parsed.nodes.length, 3);
  assert.equal(parsed.edges.length, 2);
  assert.deepEqual(parsed.edges, [
    { fromId: 'CALC-SA-WEIGHT-001', toId: 'PRIM-SA-GEOM-001' },
    { fromId: 'CALC-SA-STRESS-001', toId: 'CALC-SA-WEIGHT-001' },
  ]);
});

test('serialization is deterministic for identical graphs', () => {
  const build = () =>
    addDependency(
      createEngineeringDependencyGraph(),
      'CALC-SA-STRESS-001',
      'PRIM-SA-GEOM-001',
    );
  assert.equal(serializeEngineeringDependencyGraph(build()), serializeEngineeringDependencyGraph(build()));
});

test('duplicate nodes and edges are not repeated', () => {
  const graph = addDependency(
    addDependency(
      addNode(createEngineeringDependencyGraph(), 'CALC-SA-STRESS-001'),
      'CALC-SA-STRESS-001',
      'PRIM-SA-GEOM-001',
    ),
    'CALC-SA-STRESS-001',
    'PRIM-SA-GEOM-001',
  );

  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 1);
});

test('dependency queries are ordered deterministically', () => {
  const graph = addDependency(
    addDependency(
      createEngineeringDependencyGraph(),
      'B-CALC-002',
      'PRIM-SA-GEOM-001',
    ),
    'A-CALC-001',
    'PRIM-SA-GEOM-001',
  );

  assert.deepEqual(directDependentsOf(graph, 'PRIM-SA-GEOM-001'), [
    'A-CALC-001',
    'B-CALC-002',
  ]);
});