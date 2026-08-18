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

test('source-backed results require source evidence for completeness', () => {
  const solved = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(solved);

  const weightPrimitive = solved.calculations.find(
    (calculation) => calculation.calculationId === 'SA-ROW-WEIGHT-001',
  );
  assert.ok(weightPrimitive);

  const provenance = traceResultProvenance(
    toEngineeringCalculationResult(weightPrimitive),
    traceabilityBundleFromLinks(solved.id, solved.traceability),
  );
  assert.ok(provenance);
  assert.equal(provenance.sourceRequirement, 'REQUIRED');
  assert.equal(provenance.missingRequiredEvidence, false);
  assert.equal(provenance.complete, true);
  assert.deepEqual(provenance.sources, ['TIMO-SHELLS-1959']);
});

test('a source-backed result without sources is incomplete, not silently complete', () => {
  const bundle = traceabilityBundleFromLinks('p', [
    {
      calculationId: 'SA-ROW-WEIGHT-001',
      method: 'Statics — weight from volume and density',
      formula: 'W = ρ · V · g',
      sourceIds: [],
      inputs: ['GEO-001', 'MAT-001'],
      assumptions: ['Homogeneous compacted density per row.'],
      validationStatus: 'SOURCE_VALIDATED',
      confidence: 'HIGH',
      reviewRequirement: 'NONE',
      sourceRequirement: 'REQUIRED',
    },
  ]);

  const provenance = traceResultProvenance(
    {
      id: 'SA-ROW-WEIGHT-001',
      value: 42,
      unit: 'kN',
      status: 'SOURCE_VALIDATED',
      confidence: 'HIGH',
      assumptions: ['Homogeneous compacted density per row.'],
      sources: [],
      reviewerRequired: false,
    },
    bundle,
  );

  assert.ok(provenance);
  assert.equal(provenance.sourceRequirement, 'REQUIRED');
  assert.equal(provenance.missingRequiredEvidence, true);
  assert.equal(provenance.complete, false);
});

test('provenance without required source evidence flags the gap explicitly', () => {
  const bundle = traceabilityBundleFromLinks('p', [
    {
      calculationId: 'SA-GEOM-001',
      method: 'Deterministic geometry solver',
      formula: 'r_i(z) dome profile',
      sourceIds: [],
      inputs: ['GEO-001'],
      assumptions: ['Rows are annular slices.'],
      validationStatus: 'ANALYTICALLY_VALIDATED',
      confidence: 'HIGH',
      reviewRequirement: 'NONE',
      sourceRequirement: 'OPTIONAL',
    },
  ]);

  const provenance = traceResultProvenance(
    {
      id: 'SA-GEOM-001',
      value: 0,
      unit: 'm³',
      status: 'CALCULATED',
      confidence: 'HIGH',
      assumptions: ['Rows are annular slices.'],
      sources: [],
      reviewerRequired: false,
    },
    bundle,
  );

  assert.ok(provenance);
  assert.equal(provenance.sourceRequirement, 'OPTIONAL');
  assert.equal(provenance.missingRequiredEvidence, false);
  assert.equal(provenance.complete, true);
});

test('incomplete evidence cannot become complete provenance', () => {
  const bundle = traceabilityBundleFromLinks('p', [
    {
      calculationId: 'SA-PARTIAL-001',
      method: 'Method',
      formula: 'V = f(x)',
      sourceIds: ['TIMO-SHELLS-1959'],
      inputs: [],
      assumptions: [],
      validationStatus: 'SOURCE_VALIDATED',
      confidence: 'HIGH',
      reviewRequirement: 'NONE',
      sourceRequirement: 'REQUIRED',
    },
  ]);

  const provenance = traceResultProvenance(
    {
      id: 'SA-PARTIAL-001',
      value: 1,
      unit: 'kN',
      status: 'SOURCE_VALIDATED',
      confidence: 'HIGH',
      assumptions: [],
      sources: ['TIMO-SHELLS-1959'],
      reviewerRequired: false,
    },
    bundle,
  );

  assert.ok(provenance);
  assert.ok(provenance.requiredEvidence.includes('SOURCES'));
  assert.deepEqual(
    provenance.missingEvidence,
    ['INPUTS', 'ASSUMPTIONS'],
  );
  assert.equal(provenance.missingEvidence.includes('SOURCES'), false);
  assert.equal(provenance.missingRequiredEvidence, false);
  assert.equal(provenance.complete, false);
});