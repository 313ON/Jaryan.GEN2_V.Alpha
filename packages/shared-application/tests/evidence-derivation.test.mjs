import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTraceabilityLink,
  traceResultProvenance,
  traceabilityBundleFromLinks,
} from '@jaryan/shared-application';
import {
  deriveEngineeringEvidence,
  rowWeightPrimitive,
  toEngineeringCalculationResult,
} from '@jaryan/shared-domain';

test('H: required evidence derivation is identical between result provenance and the domain contract', () => {
  const link = buildTraceabilityLink({
    calculationId: 'SA-ROW-WEIGHT-001',
    method: 'Statics — weight from volume and density',
    formula: 'W = ρ · V · g',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputIds: ['GEO-001', 'MAT-001'],
    assumptions: ['Homogeneous compacted density per row.'],
    validationStatus: 'SOURCE_VALIDATED',
    confidence: 'HIGH',
    reviewRequirement: 'NONE',
    sourceRequirement: 'REQUIRED',
  });

  const result = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const provenance = traceResultProvenance(
    result,
    traceabilityBundleFromLinks('SA-ROW-WEIGHT-001', [link]),
  );
  assert.ok(provenance);

  const derived = deriveEngineeringEvidence({
    method: link.method,
    formula: link.formula,
    inputs: link.inputs,
    assumptions: link.assumptions,
    sources: link.sourceIds,
    sourceRequired: link.sourceRequirement === 'REQUIRED',
  });

  assert.deepEqual(provenance.requiredEvidence, [...derived.requiredEvidence]);
  assert.deepEqual(provenance.missingEvidence, [...derived.missingEvidence]);
  assert.equal(provenance.complete, derived.complete);
});