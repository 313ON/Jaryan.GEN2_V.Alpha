import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEngineeringModel, DEFAULT_ENGINEERING_INPUTS } from '@jaryan/shared-domain';

test('completed calculation record reuses shared-domain inputs and outputs', () => {
  const inputs = { ...DEFAULT_ENGINEERING_INPUTS };
  const result = calculateEngineeringModel(inputs);
  assert.equal(result.ok, true);

  const record = {
    id: 'calc-1',
    projectId: 'project-1',
    system: 'superadobe',
    inputs,
    outputs: result.ok ? result.outputs : null,
    status: 'completed',
    assumptions: [],
    knowledge: {
      sourceIds: ['calearth-builder-resources', 'doe-nrel-pv-performance'],
      knowledgeVersion: '0.1.0',
    },
  };

  assert.equal(record.projectId, 'project-1');
  assert.equal(record.system, 'superadobe');
  assert.equal(record.status, 'completed');
  assert.equal(record.inputs, inputs);
  assert.equal(record.outputs, result.outputs);
  assert.equal(record.inputs.structuralSystem, 'superadobe');
  assert.deepEqual(record.knowledge.sourceIds, [
    'calearth-builder-resources',
    'doe-nrel-pv-performance',
  ]);
  assert.equal(record.knowledge.knowledgeVersion, '0.1.0');
});

test('failed calculation record carries null outputs', () => {
  const record = {
    id: 'calc-2',
    projectId: 'project-1',
    system: 'superadobe',
    inputs: { ...DEFAULT_ENGINEERING_INPUTS, latitudeDeg: 91 },
    outputs: null,
    status: 'failed',
    assumptions: [],
    knowledge: { sourceIds: [], knowledgeVersion: '0.1.0' },
  };

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.equal(record.inputs.latitudeDeg, 91);
});

test('completed calculation record carries an assumption snapshot', () => {
  const inputs = { ...DEFAULT_ENGINEERING_INPUTS };
  const result = calculateEngineeringModel(inputs);
  assert.equal(result.ok, true);

  const record = {
    id: 'calc-3',
    projectId: 'project-1',
    system: 'superadobe',
    inputs,
    outputs: result.ok ? result.outputs : null,
    status: 'completed',
    assumptions: [
      { id: 'solar-performance-ratio', value: 0.78 },
      {
        id: 'water-use-per-person',
        value: 50,
        unit: 'L/person/day',
        sourceId: 'doe-nrel-pv-performance',
      },
    ],
    knowledge: { sourceIds: ['calearth-builder-resources'] },
  };

  assert.equal(record.status, 'completed');
  assert.equal(record.assumptions.length, 2);
  assert.deepEqual(record.assumptions[0], {
    id: 'solar-performance-ratio',
    value: 0.78,
  });
  assert.equal(record.assumptions[1].value, 50);
  assert.equal(record.assumptions[1].unit, 'L/person/day');
  assert.equal(record.assumptions[1].sourceId, 'doe-nrel-pv-performance');
});

test('assumption snapshot supports string, number, and boolean values', () => {
  const assumptions = [
    { id: 'max-occupancy', value: 20 },
    { id: 'solar-covered', value: true },
    { id: 'soil-uncertainty', value: 'limited' },
  ];

  assert.equal(typeof assumptions[0].value, 'number');
  assert.equal(typeof assumptions[1].value, 'boolean');
  assert.equal(typeof assumptions[2].value, 'string');
});

test('failed calculation record preserves errors', () => {
  const record = {
    id: 'calc-4',
    projectId: 'project-1',
    system: 'superadobe',
    inputs: { ...DEFAULT_ENGINEERING_INPUTS, latitudeDeg: 91 },
    outputs: null,
    status: 'failed',
    assumptions: [],
    errors: [{ field: 'latitudeDeg', message: 'Latitude must be between -90 and 90.' }],
    knowledge: { sourceIds: [] },
  };

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.deepEqual(record.errors, [
    { field: 'latitudeDeg', message: 'Latitude must be between -90 and 90.' },
  ]);
});

test('calculation record leaves version metadata optional and preserves calculated at metadata', () => {
  const record = {
    id: 'calc-5',
    projectId: 'project-1',
    system: 'superadobe',
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
    outputs: null,
    status: 'failed',
    assumptions: [],
    errors: [],
    calculatedAt: '2026-08-16T12:00:00.000Z',
    knowledge: { sourceIds: [] },
  };

  assert.equal(record.modelVersion, undefined);
  assert.equal(record.calculatedAt, '2026-08-16T12:00:00.000Z');
});

test('domain calculation behavior is unchanged', () => {
  const result = calculateEngineeringModel(DEFAULT_ENGINEERING_INPUTS);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.geometryStatus, 'review');
  assert.equal(result.outputs.dataQualityStatus, 'limited');
});
