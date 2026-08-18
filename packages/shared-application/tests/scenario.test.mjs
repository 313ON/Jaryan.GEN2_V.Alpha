import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSuperAdobeScenario } from '@jaryan/shared-application';
import {
  defineMaterial,
  materialProperty,
  remoteEvidence,
} from '@jaryan/shared-domain';

const request = {
  projectId: 'scenario-1',
  site: {
    latitudeDeg: 34,
    longitudeDeg: 52,
    siteIntelligence: {
      latitudeDeg: 34,
      longitudeDeg: 52,
      soil: {
        value: 'Remote soil class reference',
        evidence: remoteEvidence(
          'SOILGRIDS-ISRIC',
          '250m',
          'Remote dataset; preliminary evidence only.',
        ),
      },
    },
  },
  structure: {
    innerDiameterM: 6,
    wallThicknessM: 0.4,
    bagWidthM: 0.45,
    rowHeightM: 0.3,
    domeHeightM: 3.6,
    geometryType: 'circular',
    compactedDensityKgM3: 1850,
  },
  material: {
    soil: defineMaterial(
      'soil-001',
      'Site compacted earth',
      'soil',
      {
        compactedDensityKgM3: materialProperty({
          value: 1850,
          unit: 'kg/m³',
          confidence: 'LOW',
          applicability: 'Site soil screening',
          status: 'ASSUMPTION',
        }),
      },
    ),
    frictionCoefficient: 0.5,
  },
  lateralDemandKn: 40,
};

test('scenario connects site, structure, material, loads, calculations, results and validation', () => {
  const scenario = buildSuperAdobeScenario(request);
  assert.ok(scenario);

  assert.ok(scenario.site.assessment);
  assert.equal(scenario.site.assessment.overallStatus, 'PRELIMINARY');
  assert.match(scenario.site.statement, /preliminary/);

  assert.equal(scenario.structure.rowCount, 12);
  assert.ok(scenario.structure.totalMassT > 0);

  assert.equal(scenario.material.soil?.id, 'soil-001');
  assert.equal(scenario.material.frictionCoefficient, 0.5);

  assert.equal(scenario.loads.rowCount, 12);
  assert.equal(scenario.loads.loadCase.type, 'G');

  assert.ok(scenario.calculations.length > 0);
  assert.equal(scenario.results.lateralDemandKn, 40);

  assert.equal(scenario.validation.humanReviewRequired, true);
  assert.equal(scenario.validation.status, 'REVIEW_REQUIRED');
  assert.ok(scenario.validation.requirements.some((requirement) =>
    requirement.includes('Friction coefficient'),
  ));
});

test('scenario validation surfaces site and capacity requirements', () => {
  const scenario = buildSuperAdobeScenario(request);
  assert.ok(scenario);

  assert.ok(
    scenario.validation.requirements.some((requirement) =>
      requirement.includes('PRELIMINARY'),
    ),
  );
  assert.ok(
    scenario.validation.requirements.some((requirement) =>
      requirement.includes('UNVERIFIED'),
    ),
  );
  assert.ok(
    scenario.validation.unverifiedCalculationIds.includes('SA-COMPRESSION-CHECK-001'),
  );
});

test('scenario is deterministic across runs', () => {
  const first = buildSuperAdobeScenario(request);
  const second = buildSuperAdobeScenario(request);
  assert.ok(first && second);

  assert.deepEqual(first.structure, second.structure);
  assert.deepEqual(first.loads, second.loads);
  assert.deepEqual(first.calculations, second.calculations);
  assert.deepEqual(first.traceability, second.traceability);
});

test('scenario with no site intelligence reports the missing site context', () => {
  const scenario = buildSuperAdobeScenario({
    ...request,
    site: {},
    material: {},
  });
  assert.ok(scenario);
  assert.equal(scenario.site.assessment, undefined);
  assert.match(scenario.site.statement, /No site intelligence/);
  assert.equal(scenario.material.soil, undefined);
});

test('scenario returns null for invalid structure inputs', () => {
  const scenario = buildSuperAdobeScenario({
    ...request,
    structure: { ...request.structure, domeHeightM: 0 },
  });
  assert.equal(scenario, null);
});