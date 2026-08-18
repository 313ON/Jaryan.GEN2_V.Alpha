import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDependency,
  analyzeDirectImpact,
  analyzeTransitiveImpact,
  createEngineeringDependencyGraph,
} from '@jaryan/shared-domain';

test('direct impact analysis reports artifacts that depend on a target', () => {
  const graph = addDependency(
    addDependency(
      addDependency(
        createEngineeringDependencyGraph(),
        'CALC-SA-WEIGHT-001',
        'PRIM-SA-GEOM-001',
      ),
      'CALC-SA-STRESS-001',
      'CALC-SA-WEIGHT-001',
    ),
    'CALC-SA-CONTACT-001',
    'CALC-SA-WEIGHT-001',
  );

  const impact = analyzeDirectImpact(graph, 'CALC-SA-WEIGHT-001');

  assert.equal(impact.targetId, 'CALC-SA-WEIGHT-001');
  assert.deepEqual(impact.affectedArtifactIds, [
    'CALC-SA-CONTACT-001',
    'CALC-SA-STRESS-001',
  ]);
  assert.deepEqual(impact.direct, [
    { artifactId: 'CALC-SA-CONTACT-001', depth: 1 },
    { artifactId: 'CALC-SA-STRESS-001', depth: 1 },
  ]);
});

test('an untouched artifact has no direct impact', () => {
  const graph = addDependency(
    createEngineeringDependencyGraph(),
    'CALC-SA-WEIGHT-001',
    'PRIM-SA-GEOM-001',
  );
  const impact = analyzeDirectImpact(graph, 'PRIM-SA-GEOM-001');
  assert.equal(impact.targetId, 'PRIM-SA-GEOM-001');
  assert.deepEqual(impact.affectedArtifactIds, ['CALC-SA-WEIGHT-001']);
  assert.equal(impact.direct.length, 1);
});

test('transitive impact analysis discovers downstream artifacts', () => {
  const graph = addDependency(
    addDependency(
      addDependency(
        createEngineeringDependencyGraph(),
        'B',
        'A',
      ),
      'C',
      'B',
    ),
    'D',
    'C',
  );

  const impact = analyzeTransitiveImpact(graph, 'A');

  assert.equal(impact.targetId, 'A');
  assert.deepEqual(impact.direct, [{ artifactId: 'B', depth: 1 }]);
  assert.deepEqual(impact.affectedArtifactIds, ['B']);
  assert.deepEqual(impact.transitive, [
    { artifactId: 'B', depth: 1 },
    { artifactId: 'C', depth: 2 },
    { artifactId: 'D', depth: 3 },
  ]);
  assert.deepEqual(impact.transitiveAffectedArtifactIds, ['B', 'C', 'D']);
});

test('direct impact analysis also reports transitive scope', () => {
  const graph = addDependency(
    addDependency(
      createEngineeringDependencyGraph(),
      'B',
      'A',
    ),
    'C',
    'B',
  );

  const impact = analyzeDirectImpact(graph, 'A');
  assert.deepEqual(impact.transitiveAffectedArtifactIds, ['B', 'C']);
});

test('transitive impact analysis is cycle safe', () => {
  const graph = {
    nodes: ['A', 'B', 'C'],
    edges: [
      { fromId: 'B', toId: 'A' },
      { fromId: 'C', toId: 'B' },
      { fromId: 'A', toId: 'C' },
    ],
    version: '1',
  };

  const impact = analyzeTransitiveImpact(graph, 'A');
  assert.equal(impact.transitiveAffectedArtifactIds.length, 3);
  assert.deepEqual(
    impact,
    analyzeTransitiveImpact(graph, 'A'),
  );
});

test('transitive impact analysis is deterministic', () => {
  const graph = addDependency(
    addDependency(
      addDependency(
        createEngineeringDependencyGraph(),
        'B',
        'A',
      ),
      'C',
      'B',
    ),
    'D',
    'A',
  );

  assert.deepEqual(
    analyzeTransitiveImpact(graph, 'A'),
    analyzeTransitiveImpact(graph, 'A'),
  );
});