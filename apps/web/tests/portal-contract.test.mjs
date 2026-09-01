import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const componentPath = new URL(
  '../src/components/EngineeringPortal.tsx',
  import.meta.url,
);
const mapPath = new URL('../src/components/SiteMap.tsx', import.meta.url);
const stylesheetPath = new URL('../app/globals.css', import.meta.url);

test('portal consumes the deterministic field collection worklist as read-only presentation', async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentPath, 'utf8'),
    readFile(stylesheetPath, 'utf8'),
  ]);

  assert.match(component, /buildFieldCollectionWorklist\(STUDY_BASIS\)/);
  assert.match(component, /Required field measurements/);
  assert.match(
    component,
    /field measurements declared as required by the current engineering basis/,
  );
  assert.match(component, /item\.groupTitle/);
  assert.match(component, /item\.label/);
  assert.match(component, /field-worklist__groups/);
  assert.doesNotMatch(component, /field-worklist[\s\S]{0,1200}(checkbox|completed|verified|pending evidence|satisfied)/i);
  assert.match(stylesheet, /\.field-worklist__groups\s*\{/);
  assert.match(stylesheet, /\.field-worklist__group\s*\{/);
});

test('portal exposes an honest browser print-to-PDF report', async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentPath, 'utf8'),
    readFile(stylesheetPath, 'utf8'),
  ]);

  assert.match(component, /window\.print\(\)/);
  assert.match(component, /Print \/ Save as PDF/);
  assert.match(component, /Concept estimate — not certified engineering design/);
  assert.match(stylesheet, /@media print/);
  assert.match(stylesheet, /\.print-report\s*\{\s*display: block/);
});

test('printable report consumes the same grouped field worklist without adding state', async () => {
  const [component, stylesheet] = await Promise.all([
    readFile(componentPath, 'utf8'),
    readFile(stylesheetPath, 'utf8'),
  ]);
  const printReport = component.slice(component.indexOf('className="print-report"'));

  assert.equal(
    (component.match(/buildFieldCollectionWorklist\(STUDY_BASIS\)/g) ?? [])
      .length,
    1,
  );
  assert.match(printReport, /className="print-field-worklist"/);
  assert.match(printReport, /FIELD_COLLECTION_GROUPS\.map/);
  assert.match(printReport, /group\.title/);
  assert.match(printReport, /item\.label/);
  assert.match(printReport, /Required field measurements/);
  assert.doesNotMatch(
    printReport,
    /checkbox|completed|measurement value|evidence|verified|review|approved|requirement id/i,
  );
  assert.match(stylesheet, /\.print-field-worklist\s*\{/);
  assert.match(stylesheet, /\.print-field-worklist__groups\s*\{/);
});

test('responsive CSS keeps the cockpit full-width and supplies mobile breakpoints', async () => {
  const stylesheet = await readFile(stylesheetPath, 'utf8');

  assert.match(stylesheet, /\.portal-shell\s*\{[^}]*width: 100%/s);
  assert.match(stylesheet, /@media \(max-width: 1120px\)/);
  assert.match(stylesheet, /@media \(max-width: 760px\)/);
  assert.match(stylesheet, /@media \(max-width: 520px\)/);
  assert.match(stylesheet, /minmax\(0, 1fr\)/);
  assert.match(stylesheet, /overflow-x: hidden/);
});

test('map is opt-in, uses OSM attribution, and reports tile failure', async () => {
  const [component, map] = await Promise.all([
    readFile(componentPath, 'utf8'),
    readFile(mapPath, 'utf8'),
  ]);

  assert.match(component, /Load interactive map/);
  assert.match(component, /Manual coordinates remain the primary accessible control/);
  assert.match(map, /https:\/\/tile\.openstreetmap\.org/);
  assert.match(map, /OpenStreetMap/);
  assert.match(map, /tileerror/);
  assert.match(map, /onCoordinateChangeRef\.current/);
});
