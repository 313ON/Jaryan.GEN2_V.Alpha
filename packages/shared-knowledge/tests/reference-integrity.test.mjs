import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REFERENCE_BASIS,
  REFERENCES,
} from '@jaryan/shared-knowledge';

test('reference basis source IDs resolve to actual references', () => {
  const referenceIds = new Set(REFERENCES.map((reference) => reference.id));
  assert.ok(
    REFERENCE_BASIS.sourceIds.every((sourceId) => referenceIds.has(sourceId)),
  );
});
