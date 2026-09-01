import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFieldCollectionWorklist,
} from '@jaryan/shared-application';

const basis = [
  {
    title: 'Site',
    items: [
      { label: 'User coordinate', status: 'user input' },
      { label: 'Survey', status: 'required field measurement' },
      { label: 'Review access', status: 'external professional review' },
    ],
  },
  {
    title: 'Energy',
    items: [
      { label: 'Solar heuristic', status: 'modeled' },
      { label: 'Load schedule', status: 'required field measurement' },
      { label: 'Backup source', status: 'future capability' },
    ],
  },
];

test('returns only required field measurement items', () => {
  assert.deepEqual(buildFieldCollectionWorklist(basis), [
    {
      groupTitle: 'Site',
      label: 'Survey',
      basisStatus: 'required field measurement',
    },
    {
      groupTitle: 'Energy',
      label: 'Load schedule',
      basisStatus: 'required field measurement',
    },
  ]);
});

test('preserves group titles and labels', () => {
  const result = buildFieldCollectionWorklist(basis);

  assert.deepEqual(
    result.map(({ groupTitle, label }) => ({ groupTitle, label })),
    [
      { groupTitle: 'Site', label: 'Survey' },
      { groupTitle: 'Energy', label: 'Load schedule' },
    ],
  );
});

test('preserves group and item declaration order', () => {
  const orderedBasis = [
    {
      title: 'First',
      items: [
        { label: 'First item', status: 'required field measurement' },
        { label: 'Second item', status: 'required field measurement' },
      ],
    },
    {
      title: 'Second',
      items: [
        { label: 'Third item', status: 'required field measurement' },
      ],
    },
  ];

  assert.deepEqual(
    buildFieldCollectionWorklist(orderedBasis).map(
      ({ groupTitle, label }) => `${groupTitle}:${label}`,
    ),
    ['First:First item', 'First:Second item', 'Second:Third item'],
  );
});

test('excludes modeled, user-input, professional-review, and future-capability items', () => {
  const result = buildFieldCollectionWorklist(basis);

  assert.equal(result.some(({ label }) => label === 'User coordinate'), false);
  assert.equal(result.some(({ label }) => label === 'Solar heuristic'), false);
  assert.equal(result.some(({ label }) => label === 'Review access'), false);
  assert.equal(result.some(({ label }) => label === 'Backup source'), false);
});

test('returns an empty immutable result for empty input', () => {
  const result = buildFieldCollectionWorklist([]);

  assert.deepEqual(result, []);
  assert.equal(Object.isFrozen(result), true);
});

test('does not generate identifiers or evidence state', () => {
  const result = buildFieldCollectionWorklist(basis);

  assert.deepEqual(Object.keys(result[0]), [
    'groupTitle',
    'label',
    'basisStatus',
  ]);
  assert.equal(Object.isFrozen(result[0]), true);
  assert.equal('id' in result[0], false);
  assert.equal('evidenceState' in result[0], false);
  assert.equal('status' in result[0], false);
});

test('produces deterministic output for the same declaration', () => {
  assert.deepEqual(
    buildFieldCollectionWorklist(basis),
    buildFieldCollectionWorklist(basis),
  );
});
