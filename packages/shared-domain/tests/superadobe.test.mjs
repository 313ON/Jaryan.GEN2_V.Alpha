import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SUPERADOBE_COMPONENT_MODELS,
  SUPERADOBE_COMPONENTS,
  SUPERADOBE_FAILURE_MODELS,
  failureModesByDomain,
  getFailureModel,
  getSuperAdobeComponent,
} from '@jaryan/shared-domain';

test('SuperAdobe is modeled as its own component system', () => {
  assert.deepEqual(SUPERADOBE_COMPONENTS, [
    'soil-fill',
    'stabilization',
    'bag',
    'compaction',
    'inter-row-contact',
    'barbed-wire',
    'geometry',
    'openings',
    'foundation',
    'environmental-protection',
  ]);
  assert.equal(SUPERADOBE_COMPONENT_MODELS.length, 10);
  for (const component of SUPERADOBE_COMPONENT_MODELS) {
    assert.ok(component.role.length > 0);
    assert.ok(component.governingFailureModes.length > 0);
  }
});

test('every component resolves with a governing failure mode', () => {
  const bag = getSuperAdobeComponent('bag');
  assert.equal(bag.component, 'bag');
  assert.ok(bag.governingFailureModes.includes('bag-failure'));
});

test('failure modes are grouped into global, local and system domains', () => {
  const global = failureModesByDomain('GLOBAL');
  const local = failureModesByDomain('LOCAL');
  const system = failureModesByDomain('SYSTEM');

  assert.ok(global.some((mode) => mode.mode === 'collapse'));
  assert.ok(global.some((mode) => mode.mode === 'overturning'));
  assert.ok(global.some((mode) => mode.mode === 'sliding'));
  assert.ok(local.some((mode) => mode.mode === 'contact-failure'));
  assert.ok(local.some((mode) => mode.mode === 'joint-shear'));
  assert.ok(local.some((mode) => mode.mode === 'hoop-failure'));
  assert.ok(system.some((mode) => mode.mode === 'bag-failure'));
  assert.ok(system.some((mode) => mode.mode === 'barbed-wire-failure'));
  assert.ok(system.some((mode) => mode.mode === 'foundation-failure'));
  assert.ok(system.some((mode) => mode.mode === 'water-intrusion'));
  assert.ok(system.some((mode) => mode.mode === 'erosion'));
});

test('no failure mode claims validation without supporting evidence', () => {
  for (const mode of SUPERADOBE_FAILURE_MODELS) {
    assert.equal(mode.validated, false, `mode claims validation: ${mode.mode}`);
  }
});

test('failure model lookup returns the requested mode', () => {
  const hoop = getFailureModel('hoop-failure');
  assert.equal(hoop.domain, 'LOCAL');
  assert.equal(hoop.validated, false);
});