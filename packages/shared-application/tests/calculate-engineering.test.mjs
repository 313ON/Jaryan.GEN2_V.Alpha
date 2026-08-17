import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEngineering } from '@jaryan/shared-application';
import {
  calculateEngineeringModel,
  DEFAULT_ENGINEERING_INPUTS,
  ENGINEERING_ASSUMPTIONS,
} from '@jaryan/shared-domain';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge';

const projectId = 'project-1';

test('completed calculation returns a record matching the domain result', () => {
  const inputs = { ...DEFAULT_ENGINEERING_INPUTS };
  const record = calculateEngineering({ projectId, inputs });
  const domain = calculateEngineeringModel(inputs);

  assert.equal(record.status, 'completed');
  assert.ok(domain.ok);
  assert.deepEqual(record.outputs, domain.outputs);
  assert.equal(record.projectId, projectId);
  assert.equal(record.inputs, inputs);
  assert.equal(record.system, 'superadobe');
  assert.equal(typeof record.id, 'string');
  assert.ok(record.id.length > 0);
  assert.ok(Number.isFinite(Date.parse(record.calculatedAt ?? '')));
  assert.equal(record.errors, undefined);
  assert.equal(record.modelVersion, undefined);
  assert.equal(record.knowledge.knowledgeVersion, undefined);
});

test('failed calculation returns a record with null outputs and domain errors', () => {
  const inputs = { ...DEFAULT_ENGINEERING_INPUTS, latitudeDeg: 91 };
  const record = calculateEngineering({ projectId, inputs });
  const domain = calculateEngineeringModel(inputs);

  assert.equal(record.status, 'failed');
  assert.equal(record.outputs, null);
  assert.deepEqual(record.errors, domain.errors);
  assert.deepEqual(record.assumptions, []);
  assert.equal(record.projectId, projectId);
  assert.ok(Number.isFinite(Date.parse(record.calculatedAt ?? '')));
});

test('completed record snapshots every model assumption with stable ids', () => {
  const record = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });

  assert.equal(record.status, 'completed');
  assert.equal(
    record.assumptions.length,
    Object.keys(ENGINEERING_ASSUMPTIONS).length,
  );

  const byId = new Map(record.assumptions.map((assumption) => [assumption.id, assumption.value]));
  assert.equal(byId.get('solar-performance-ratio'), 0.78);
  assert.equal(byId.get('battery-usable-depth'), 0.8);
  assert.equal(byId.get('battery-round-trip-efficiency'), 0.9);
  assert.equal(byId.get('water-use-per-person'), 50);
  assert.equal(byId.get('minimum-practical-tank'), 500);
  assert.equal(byId.get('module-power-density'), 205);
  assert.equal(byId.get('roof-installation-footprint-factor'), 1.35);
  assert.equal(byId.get('ground-installation-footprint-factor'), 1.75);
  assert.equal(
    record.assumptions.find((assumption) => assumption.id === 'water-use-per-person')?.unit,
    'L/person/day',
  );
});

test('calculation is deterministic for identical inputs', () => {
  const a = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });
  const b = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });

  assert.deepEqual(a.outputs, b.outputs);
  assert.notEqual(a.id, b.id);
});

test('knowledge references use stable catalog identifiers, not array positions', () => {
  const record = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });

  assert.deepEqual(record.knowledge.sourceIds, REFERENCE_BASIS.sourceIds);
  assert.ok(REFERENCE_BASIS.sourceIds.length > 0);
});

test('record is plain serializable data', () => {
  const record = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
});