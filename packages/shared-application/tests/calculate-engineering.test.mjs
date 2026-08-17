import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateEngineering } from '@jaryan/shared-application';
import {
  calculateEngineeringModel,
  DEFAULT_ENGINEERING_INPUTS,
  ENGINEERING_ASSUMPTION_METADATA,
  ENGINEERING_ASSUMPTIONS,
} from '@jaryan/shared-domain';
import { REFERENCE_BASIS, REFERENCES } from '@jaryan/shared-knowledge';

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
  assert.equal(record.assumptions.length, ENGINEERING_ASSUMPTION_METADATA.length);
  assert.equal(
    record.assumptions.find((assumption) => assumption.id === 'solar-performance-ratio')?.value,
    ENGINEERING_ASSUMPTIONS.solarPerformanceRatio,
  );
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
  assert.equal(
    record.assumptions.find((assumption) => assumption.id === 'solar-performance-ratio')?.sourceId,
    'doe-nrel-pv-performance',
  );
});

test('domain-owned metadata covers each assumption exactly once', () => {
  assert.deepEqual(
    ENGINEERING_ASSUMPTION_METADATA.map((metadata) => metadata.key),
    Object.keys(ENGINEERING_ASSUMPTIONS),
  );
  assert.equal(
    new Set(ENGINEERING_ASSUMPTION_METADATA.map((metadata) => metadata.id)).size,
    ENGINEERING_ASSUMPTION_METADATA.length,
  );
  const referenceIds = new Set(REFERENCES.map((reference) => reference.id));
  assert.ok(
    ENGINEERING_ASSUMPTION_METADATA.every(
      (metadata) =>
        metadata.sourceId === undefined || referenceIds.has(metadata.sourceId),
    ),
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
  const referenceIds = new Set(REFERENCES.map((reference) => reference.id));
  assert.ok(REFERENCE_BASIS.sourceIds.every((sourceId) => referenceIds.has(sourceId)));
});

test('record is plain serializable data', () => {
  const record = calculateEngineering({
    projectId,
    inputs: { ...DEFAULT_ENGINEERING_INPUTS },
  });

  assert.deepEqual(JSON.parse(JSON.stringify(record)), record);
});
