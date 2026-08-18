import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateValidation,
  engineeringCalculationResultsFrom,
  rowWeightPrimitive,
  compressionCheckPrimitive,
  slidingCheckPrimitive,
  toEngineeringCalculationResult,
  serializeEngineeringCalculationResult,
  isEngineeringCalculationResultValidated,
  ENGINEERING_RESULT_STATUSES,
} from '@jaryan/shared-domain';

test('source-validated primitive maps to a source-validated engineering result', () => {
  const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const result = toEngineeringCalculationResult(primitive);

  assert.equal(result.id, 'SA-ROW-WEIGHT-001');
  assert.equal(result.value, 19.62);
  assert.equal(result.unit, 'kN');
  assert.equal(result.status, 'SOURCE_VALIDATED');
  assert.equal(result.confidence, 'HIGH');
  assert.ok(result.assumptions.length > 0);
  assert.deepEqual(result.sources, ['TIMO-SHELLS-1959']);
  assert.equal(result.reviewerRequired, false);
});

test('unverified capacity check maps to REVIEW_REQUIRED', () => {
  const primitive = compressionCheckPrimitive({
    axialStressKpa: 100,
    allowableCompressiveKpa: undefined,
  });
  const result = toEngineeringCalculationResult(primitive);

  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.reviewerRequired, true);
});

test('unverified sliding check without friction maps to REVIEW_REQUIRED', () => {
  const primitive = slidingCheckPrimitive({
    lateralForceKn: 10,
    normalForceKn: 20,
    frictionCoefficient: undefined,
  });
  const result = toEngineeringCalculationResult(primitive);

  assert.equal(result.status, 'REVIEW_REQUIRED');
  assert.equal(result.reviewerRequired, true);
});

test('missing assumptions cannot silently become a validated result', () => {
  const validatedWithNoSources = {
    calculationId: 'SA-ILL-001',
    method: 'Method',
    formula: 'V = f(x)',
    sourceIds: [],
    inputs: { x: { value: 1, unit: 'm' } },
    assumptions: [],
    result: { value: 1, unit: 'kN' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };

  const result = toEngineeringCalculationResult(validatedWithNoSources);
  assert.equal(result.status, 'UNVERIFIED');
  assert.equal(isEngineeringCalculationResultValidated(result), false);
});

test('engineering results are deterministic and serializable', () => {
  const primitive = rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 });
  const first = toEngineeringCalculationResult(primitive);
  const second = toEngineeringCalculationResult(primitive);
  assert.deepEqual(first, second);
  assert.equal(serializeEngineeringCalculationResult(first), serializeEngineeringCalculationResult(second));
  const parsed = JSON.parse(serializeEngineeringCalculationResult(first));
  assert.equal(parsed.id, 'SA-ROW-WEIGHT-001');
  assert.equal(parsed.value, 19.62);
});

test('engineeringCalculationResultsFrom maps a primitive list in order', () => {
  const results = engineeringCalculationResultsFrom([
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    compressionCheckPrimitive({ axialStressKpa: 100, allowableCompressiveKpa: undefined }),
  ]);

  assert.equal(results.length, 2);
  assert.equal(results[0].id, 'SA-ROW-WEIGHT-001');
  assert.equal(results[1].status, 'REVIEW_REQUIRED');
});

test('statuses enumerate the canonical engineering result states', () => {
  assert.deepEqual(ENGINEERING_RESULT_STATUSES, [
    'CALCULATED',
    'SOURCE_VALIDATED',
    'UNVERIFIED',
    'REVIEW_REQUIRED',
  ]);
});

test('identical engineering results have identical fingerprints', () => {
  const first = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const second = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(first.contentFingerprint, second.contentFingerprint);
  assert.equal(first.identityId, second.identityId);
});

test('changed inputs change the content fingerprint', () => {
  const baseline = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  const changed = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 2, densityKgM3: 2000 }),
  );
  assert.notEqual(baseline.contentFingerprint, changed.contentFingerprint);
});

test('changed version changes the content fingerprint', () => {
  const v1 = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    { version: '1' },
  );
  const v2 = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    { version: '2' },
  );
  assert.notEqual(v1.contentFingerprint, v2.contentFingerprint);
});

test('results carry a canonical artifact identity reference and fingerprint', () => {
  const result = toEngineeringCalculationResult(
    rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
  );
  assert.equal(result.identityId, 'RESULT-SA-ROW-WEIGHT-001-v1');
  assert.match(result.contentFingerprint, /^[0-9a-f]{64}$/);
});

test('result fingerprints contain no timestamps or random values', () => {
  const build = () =>
    toEngineeringCalculationResult(
      rowWeightPrimitive({ volumeM3: 1, densityKgM3: 2000 }),
    );
  assert.deepEqual(build(), build());
  assert.ok(!build().contentFingerprint.includes('T'));
  assert.ok(!build().contentFingerprint.includes('Z'));
});