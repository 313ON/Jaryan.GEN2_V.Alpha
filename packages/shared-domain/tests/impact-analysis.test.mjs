import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDependency,
  analyzeDirectImpact,
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