import assert from 'node:assert/strict';
import test from 'node:test';

test('project is represented with id, name, site, and calculationIds', () => {
  const project = {
    id: 'project-1',
    name: 'Off-grid shelter study',
    site: { latitude: 34, longitude: 52 },
    calculationIds: ['calc-1', 'calc-2'],
  };

  assert.equal(project.id, 'project-1');
  assert.equal(project.name, 'Off-grid shelter study');
  assert.deepEqual(project.site, { latitude: 34, longitude: 52 });
  assert.deepEqual(project.calculationIds, ['calc-1', 'calc-2']);
});

test('project site is minimal and serializable', () => {
  const project = {
    id: 'project-1',
    name: 'Test shelter',
    site: { latitude: -90, longitude: 180 },
    calculationIds: [],
  };

  assert.deepEqual(JSON.parse(JSON.stringify(project)), project);
});