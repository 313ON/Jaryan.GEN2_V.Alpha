import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessSiteIntelligence,
  remoteEvidence,
} from '@jaryan/shared-domain';

test('remote evidence is PRELIMINARY by policy', () => {
  const evidence = remoteEvidence('SOILGRIDS-ISRIC', '250 m', 'Gridded estimate, not a site test.');
  assert.equal(evidence.status, 'PRELIMINARY');
  assert.equal(evidence.confidence, 'LOW');
  assert.equal(evidence.sourceId, 'SOILGRIDS-ISRIC');
});

test('site intelligence with no factors is UNKNOWN', () => {
  const assessment = assessSiteIntelligence({ latitudeDeg: 35, longitudeDeg: 51 });
  assert.equal(assessment.overallStatus, 'UNKNOWN');
  assert.match(assessment.statement, /no site intelligence factors/i);
});

test('site intelligence with only remote factors stays PRELIMINARY', () => {
  const assessment = assessSiteIntelligence({
    latitudeDeg: 35,
    longitudeDeg: 51,
    elevationM: {
      value: 1200,
      evidence: remoteEvidence('COP-DEM', '30 m', 'DEM, not a survey.'),
    },
    solar: {
      value: 4.8,
      evidence: remoteEvidence('GSA', '1 km', 'Satellite solar resource.'),
    },
  });

  assert.equal(assessment.overallStatus, 'PRELIMINARY');
  assert.equal(assessment.preliminaryFactorCount, 2);
  assert.equal(assessment.verifiedFactorCount, 0);
  assert.match(assessment.statement, /preliminary/);
});

test('site intelligence with verified evidence is promoted', () => {
  const assessment = assessSiteIntelligence({
    latitudeDeg: 35,
    longitudeDeg: 51,
    soil: {
      value: 'CL',
      evidence: { ...remoteEvidence('lab-report', 'site test', 'Lab classification.'), status: 'VERIFIED', confidence: 'HIGH' },
    },
  });

  assert.equal(assessment.overallStatus, 'VERIFIED');
  assert.equal(assessment.verifiedFactorCount, 1);
});