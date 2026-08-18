import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUTHORITY_LEVELS,
  AUTHORITY_MODEL,
  authorityRank,
  AUTHORITY_APPLICABILITY,
  ENGINEERING_POLICY,
  ENGINEERING_SOURCES,
  getEngineeringSource,
  getEngineeringSourcesByDomain,
  hasEngineeringSource,
  isHigherAuthority,
  POLICY_RULE_IDS,
  REFERENCE_BASIS,
  REFERENCES,
  RESEARCH_GAPS,
} from '@jaryan/shared-knowledge';

test('engineering source registry uses unique source IDs', () => {
  const ids = ENGINEERING_SOURCES.map((source) => source.sourceId);
  assert.equal(new Set(ids).size, ids.length);
});

test('every existing reference basis source ID resolves in the engineering registry', () => {
  for (const sourceId of [...REFERENCE_BASIS.sourceIds, ...REFERENCES.map((r) => r.id)]) {
    assert.ok(hasEngineeringSource(sourceId), `missing registry entry: ${sourceId}`);
  }
});

test('every engineering source carries the full provenance contract', () => {
  for (const source of ENGINEERING_SOURCES) {
    assert.ok(source.sourceId.length > 0);
    assert.ok(source.title.length > 0);
    assert.ok(source.publisher.length > 0);
    assert.ok(source.jurisdiction.length > 0);
    assert.ok(source.domain.length > 0);
    assert.ok(source.edition.length > 0);
    assert.ok(AUTHORITY_LEVELS.includes(source.authorityLevel));
    assert.ok(
      [
        'ACTIVE',
        'SUPERSEDED',
        'DRAFT',
        'REFERENCE_ONLY',
        'EXPERIMENTAL',
        'SITE_SPECIFIC',
        'UNKNOWN',
      ].includes(source.status),
    );
    assert.ok(source.applicability.length > 0);
  }
});

test('Iranian codes are registered as ACTIVE P0 and their rules as unverified', () => {
  const iranian = ENGINEERING_SOURCES.filter((source) =>
    source.sourceId.startsWith('IRN-'),
  );
  assert.ok(iranian.length >= 13);
  for (const source of iranian) {
    assert.equal(source.authorityLevel, 'P0');
    assert.equal(source.status, 'ACTIVE');
    assert.match(source.notes, /UNVERIFIED|Registered/);
  }
});

test('Canadell 2016 and ICC-ES ESR-4126 are registered as references, not Iranian code', () => {
  const canadell = getEngineeringSource('SA-CAN-2016');
  const esr = getEngineeringSource('ICC-ESR-4126');

  assert.ok(canadell);
  assert.ok(esr);
  assert.equal(canadell?.authorityLevel, 'P3');
  assert.equal(esr?.authorityLevel, 'P2');
  assert.equal(canadell?.status, 'REFERENCE_ONLY');
  assert.equal(esr?.status, 'REFERENCE_ONLY');
  assert.notEqual(canadell?.jurisdiction, 'Iran');
  assert.notEqual(esr?.jurisdiction, 'Iran');
});

test('authority model ranks P0 highest and distinguishes authority from applicability', () => {
  assert.equal(authorityRank('P0'), 0);
  assert.equal(authorityRank('P6'), 6);
  assert.equal(isHigherAuthority('P0', 'P3'), true);
  assert.equal(isHigherAuthority('P6', 'P0'), false);
  assert.match(
    AUTHORITY_APPLICABILITY.statement,
    /Authority level does NOT automatically mean applicability/,
  );
  assert.equal(Object.keys(AUTHORITY_MODEL).length, 7);
});

test('policy exposes all 15 engineering rules with stable IDs', () => {
  assert.equal(ENGINEERING_POLICY.length, 15);
  assert.equal(POLICY_RULE_IDS.length, 15);
  assert.equal(new Set(POLICY_RULE_IDS).size, 15);
  for (const rule of ENGINEERING_POLICY) {
    assert.match(rule.id, /^POL-\d{2}$/);
    assert.ok(rule.rule.length > 0);
  }
});

test('research gaps are explicitly documented as gaps, not implementation failures', () => {
  assert.ok(RESEARCH_GAPS.length >= 11);
  const domains = RESEARCH_GAPS.map((gap) => gap.domain);
  assert.equal(new Set(domains).size, domains.length);
  for (const gap of RESEARCH_GAPS) {
    assert.ok(gap.title.length > 0);
    assert.ok(gap.description.length > 0);
    assert.ok(gap.requiredEvidence.length > 0);
  }
});

test('domain lookup returns sources filtered by engineering domain', () => {
  const structural = getEngineeringSourcesByDomain('structural');
  assert.ok(structural.some((source) => source.sourceId === 'SA-CAN-2016'));
  assert.ok(structural.some((source) => source.sourceId === 'IRN-STD-2800'));
});

test('every source ID referenced by domain and application code resolves in the registry', () => {
  const referenced = [
    'TIMO-SHELLS-1959',
    'TERZAGHI-1943',
    'IRN-CH-06',
    'IRN-STD-2800',
    'ICC-ESR-4126',
    'SOILGRIDS-ISRIC',
    'COP-DEM',
    'GSA',
    'SA-CAN-2016',
  ];
  for (const sourceId of referenced) {
    assert.ok(hasEngineeringSource(sourceId), `missing registry entry: ${sourceId}`);
  }
});