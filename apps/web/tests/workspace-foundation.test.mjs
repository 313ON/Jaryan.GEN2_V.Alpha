import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentPath = new URL(
  '../src/components/EngineeringWorkspaceFoundation.tsx',
  import.meta.url,
);
const portalPath = new URL(
  '../src/components/EngineeringPortal.tsx',
  import.meta.url,
);
const layoutPath = new URL('../app/layout.tsx', import.meta.url);
const stylesheetPath = new URL('../app/globals.css', import.meta.url);

test('workspace foundation preserves explicit engineering state semantics', async () => {
  const component = await readFile(componentPath, 'utf8');

  for (const state of [
    'UNKNOWN',
    'VERIFIED',
    'REVIEW_REQUIRED',
    'INVALID',
    'NON_AUTHORITATIVE',
    'HISTORICAL',
    'LOCAL_VERIFIED',
    'EXTERNAL_GATE',
  ]) {
    assert.match(component, new RegExp(`\\b${state}\\b`));
  }
  assert.match(component, /aria-label=\{`\$\{stateLabels\[state\]\}/);
  assert.match(component, /EvidenceChain/);
  assert.match(component, /WorkspaceNavigation/);
});

test('portal projects existing application output without fabricating engineering records', async () => {
  const portal = await readFile(portalPath, 'utf8');

  assert.match(portal, /IntegrityOverview/);
  assert.match(portal, /EvidenceChain/);
  assert.match(portal, /ASSET-UNKNOWN/);
  assert.match(portal, /DECISION-UNKNOWN/);
  assert.match(portal, /NON_AUTHORITATIVE/);
  assert.doesNotMatch(portal, /P-204|CALC-204|REV-03/);
});

test('document shell declares Persian RTL and technical isolation is styled', async () => {
  const [layout, stylesheet] = await Promise.all([
    readFile(layoutPath, 'utf8'),
    readFile(stylesheetPath, 'utf8'),
  ]);

  assert.match(layout, /lang="fa" dir="rtl"/);
  assert.match(stylesheet, /unicode-bidi: isolate/);
  assert.match(stylesheet, /--state-unknown/);
  assert.match(stylesheet, /@media \(max-width: 760px\)/);
});
