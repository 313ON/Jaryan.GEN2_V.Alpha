import assert from 'node:assert/strict';
import test from 'node:test';
import {
  solveSuperAdobe,
  traceResultProvenance,
  traceabilityBundleFromLinks,
} from '@jaryan/shared-application';
import { toEngineeringCalculationResult } from '@jaryan/shared-domain';

const inputs = {
  innerDiameterM: 6,
  wallThicknessM: 0.4,
  bagWidthM: 0.45,
  rowHeightM: 0.3,
  domeHeightM: 3.6,
  geometryType: 'circular',
  compactedDensityKgM3: 1850,
};

test('every solver result answers what created its number', () => {
  const solved = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(solved);

  const bundle = traceabilityBundleFromLinks(
    solved.id,
    solved.traceability,
  );

  for (const calculation of solved.calculations) {
    const result = toEngineeringCalculationResult(calculation);
    const provenance = traceResultProvenance(result, bundle);

    assert.ok(provenance, `missing provenance for ${result.id}`);
    assert.equal(provenance.resultId, result.id);
    assert.ok(provenance.calculation.method.length > 0);
    assert.ok(provenance.calculation.formula.length > 0);
    assert.equal(provenance.calculation.validationStatus, calculation.validationStatus);
    assert.equal(provenance.calculation.confidence, calculation.confidence);
    assert.deepEqual(provenance.assumptions, [...calculation.assumptions]);
    assert.deepEqual(provenance.sources, [...calculation.sourceIds]);
    assert.equal(provenance.complete, true);
  }
});

test('provenance chain resolves to the calculation, primitive, assumption and source', () => {
  const solved = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(solved);

  const weightPrimitive = solved.calculations.find(
    (calculation) => calculation.calculationId === 'SA-ROW-WEIGHT-001',
  );
  assert.ok(weightPrimitive);

  const bundle = traceabilityBundleFromLinks(solved.id, solved.traceability);
  const provenance = traceResultProvenance(
    toEngineeringCalculationResult(weightPrimitive),
    bundle,
  );

  assert.ok(provenance);
  assert.equal(provenance.resultId, 'SA-ROW-WEIGHT-001');
  assert.match(provenance.calculation.formula, /W = ρ · V · g/);
  assert.ok(provenance.primitiveInputs.length > 0);
  assert.ok(provenance.assumptions.some((assumption) => assumption.includes('g = 9.81')));
  assert.deepEqual(provenance.sources, ['TIMO-SHELLS-1959']);
});

test('unknown result id has no resolvable provenance', () => {
  const bundle = traceabilityBundleFromLinks('p', []);
  const provenance = traceResultProvenance(
    {
      id: 'SA-UNKNOWN-001',
      value: 0,
      unit: 'kN',
      status: 'UNVERIFIED',
      confidence: 'UNKNOWN',
      assumptions: [],
      sources: [],
      reviewerRequired: true,
    },
    bundle,
  );

  assert.equal(provenance, null);
});