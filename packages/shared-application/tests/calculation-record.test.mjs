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
    knowledge: { sourceIds: [], knowledgeVersion: '0.1.0' },
  };

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.equal(record.inputs.latitudeDeg, 91);
});

test('domain calculation behavior is unchanged', () => {
  const result = calculateEngineeringModel(DEFAULT_ENGINEERING_INPUTS);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.outputs.geometryStatus, 'review');
  assert.equal(result.outputs.dataQualityStatus, 'limited');
});