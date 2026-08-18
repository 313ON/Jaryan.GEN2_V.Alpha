import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateLoadCombination,
  IRANIAN_CHAPTER_6_LOAD_COMBINATIONS,
  LOAD_TYPES,
  LOAD_TYPE_LABELS,
} from '@jaryan/shared-domain';

test('load model covers all ten load types with labels', () => {
  assert.equal(LOAD_TYPES.length, 10);
  assert.equal(LOAD_TYPE_LABELS.G, 'Dead load');
  assert.equal(LOAD_TYPE_LABELS.E, 'Earthquake');
  assert.equal(LOAD_TYPE_LABELS.U, 'Uplift');
});

test('load combination evaluation combines factored effects deterministically', () => {
  const combination = {
    id: 'test-combo',
    name: 'Gravity combination',
    factors: { G: 1.5, Q: 1.5 },
    status: 'UNVERIFIED',
    notes: '',
  };
  const effects = [
    { loadCaseId: 'G', axialForceKn: 100, shearForceKn: 0, momentKnM: 0, torsionalMomentKnM: 0, bearingPressureKpa: 50, slidingDemandKn: 0, overturningDemandKnM: 0, upliftKn: 0 },
    { loadCaseId: 'Q', axialForceKn: 20, shearForceKn: 5, momentKnM: 3, torsionalMomentKnM: 0, bearingPressureKpa: 10, slidingDemandKn: 5, overturningDemandKnM: 4, upliftKn: 0 },
  ];

  const demand = evaluateLoadCombination(combination, effects);

  assert.equal(demand.axialForceKn, 180);
  assert.equal(demand.shearForceKn, 7.5);
  assert.equal(demand.momentKnM, 4.5);
  assert.equal(demand.slidingDemandKn, 7.5);
});

test('Iranian Chapter 6 combinations are registered but UNVERIFIED', () => {
  assert.equal(IRANIAN_CHAPTER_6_LOAD_COMBINATIONS.length, 2);
  for (const combination of IRANIAN_CHAPTER_6_LOAD_COMBINATIONS) {
    assert.equal(combination.status, 'UNVERIFIED');
    assert.equal(combination.sourceId, 'IRN-CH-06');
    assert.deepEqual(combination.factors, {});
    assert.match(combination.notes, /UNVERIFIED/);
  }
});

test('an UNVERIFIED combination yields no fabricated demand', () => {
  const combination = IRANIAN_CHAPTER_6_LOAD_COMBINATIONS[0];
  const demand = evaluateLoadCombination(combination, [
    { loadCaseId: 'G', axialForceKn: 100, shearForceKn: 0, momentKnM: 0, torsionalMomentKnM: 0, bearingPressureKpa: 50, slidingDemandKn: 0, overturningDemandKnM: 0, upliftKn: 0 },
  ]);
  assert.equal(demand.axialForceKn, 0);
});