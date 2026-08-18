import assert from 'node:assert/strict';
import test from 'node:test';
import {
  solveSuperAdobe,
  traceResultProvenance,
  traceabilityBundleFromLinks,
  buildEngineeringArtifactChain,
  engineeringSourceArtifactIdentity,
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

test('artifact identities connect the result, calculation, primitive, assumption and source chain', () => {
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

  const chain = buildEngineeringArtifactChain(provenance);
  assert.ok(chain);

  assert.equal(chain.result.identity.type, 'RESULT');
  assert.equal(chain.result.identity.id, 'RESULT-SA-ROW-WEIGHT-001-v1');
  assert.equal(chain.result.identity.baseId, 'RESULT-SA-ROW-WEIGHT-001');
  assert.equal(chain.calculation.identity.type, 'CALCULATION');
  assert.equal(chain.calculation.identity.id, 'CALC-SA-ROW-WEIGHT-001-v1');
  assert.equal(chain.primitive.identity.type, 'PRIMITIVE');
  assert.equal(chain.primitive.identity.id, 'PRIM-SA-ROW-WEIGHT-001-v1');
  assert.ok(chain.assumptions.length > 0);
  assert.equal(chain.assumptions[0].text.length > 0, true);
  assert.ok(chain.sources.length > 0);
  assert.equal(chain.sources[0].identity.type, 'SOURCE');
  assert.equal(chain.sources[0].label, 'TIMO-SHELLS-1959');
});

test('artifact chains are deterministic across runs', () => {
  const build = () => {
    const solved = solveSuperAdobe({ projectId: 'p', inputs });
    assert.ok(solved);
    const compression = solved.calculations.find(
      (calculation) => calculation.calculationId === 'SA-COMPRESSION-CHECK-001',
    );
    assert.ok(compression);
    const provenance = traceResultProvenance(
      toEngineeringCalculationResult(compression),
      traceabilityBundleFromLinks(solved.id, solved.traceability),
    );
    assert.ok(provenance);
    return buildEngineeringArtifactChain(provenance);
  };

  assert.deepEqual(build(), build());
});

test('source artifact identities are stable and type-validated', () => {
  const first = engineeringSourceArtifactIdentity('TIMO-SHELLS-1959');
  const second = engineeringSourceArtifactIdentity('TIMO-SHELLS-1959');

  assert.deepEqual(first, second);
  assert.equal(first.type, 'SOURCE');
  assert.equal(first.name, 'TIMO-SHELLS-1959');
  assert.ok(first.id.startsWith('SRC-TIMO-SHELLS-1959-'));
});

test('artifact chains include the calculation method and formula', () => {
  const solved = solveSuperAdobe({ projectId: 'p', inputs });
  assert.ok(solved);

  const accumulated = solved.calculations.find(
    (calculation) => calculation.calculationId === 'SA-ACC-WEIGHT-001',
  );
  assert.ok(accumulated);

  const provenance = traceResultProvenance(
    toEngineeringCalculationResult(accumulated),
    traceabilityBundleFromLinks(solved.id, solved.traceability),
  );
  assert.ok(provenance);

  const chain = buildEngineeringArtifactChain(provenance);
  assert.ok(chain);
  assert.equal(chain.calculation.label, accumulated.method);
  assert.equal(chain.primitive.label, accumulated.formula);
});