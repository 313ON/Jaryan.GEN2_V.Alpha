import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureObservation,
} from '@jaryan/shared-application';
import {
  observation,
  physicalReferentIdentity,
} from '@jaryan/shared-domain';

const subject = {
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physicalReferentIdentity({
    referentKey: 'governed:CAPTURE:ASSET-001',
  }),
};

const assertion = (overrides = {}) => ({
  subject,
  observedValue: { condition: 'visible' },
  observedAt: '2026-08-22T10:05:00Z',
  temporalValidity: {
    validFrom: '2026-08-22T10:05:00Z',
    recordedAt: '2026-08-22T10:05:00Z',
  },
  location: {
    status: 'UNRESOLVED',
    referenceKey: 'field:zone-a',
  },
  measurement: {
    subject,
    value: 12.5,
    unit: 'mm',
    temporalValidity: {
      validFrom: '2026-08-22T10:05:00Z',
      recordedAt: '2026-08-22T10:05:00Z',
    },
    uncertainty: 'KNOWN',
  },
  evidenceReferences: [],
  ...overrides,
});

test('invalid assertions fail deterministically before evaluation', async () => {
  let evaluations = 0;
  const evaluator = {
    evaluate() {
      evaluations += 1;
      return { status: 'COMPLETED', diagnostics: [] };
    },
  };

  await assert.rejects(
    () =>
      captureObservation(
        {
          assertion: assertion({ observedAt: 'not-a-timestamp' }),
          captureContext: { operator: 'operator-001' },
          evaluationRequest: { policy: 'field-check' },
        },
        evaluator,
      ),
    /Observation observedAt must be an ISO-8601 timestamp/,
  );
  assert.equal(evaluations, 0);
});

test('valid assertions are normalized with deterministic fingerprints', async () => {
  const first = await captureObservation({
    assertion: assertion(),
    captureContext: { operator: 'operator-001' },
  });
  const second = await captureObservation({
    assertion: assertion(),
    captureContext: { operator: 'operator-001' },
  });

  assert.deepEqual(first.observation, second.observation);
  assert.equal(first.observation.fingerprint, second.observation.fingerprint);
  assert.equal(Object.isFrozen(first.observation), true);
  assert.equal(first.evaluation, null);
});

test('nested measurements are normalized by the observation constructor', async () => {
  const result = await captureObservation({
    assertion: assertion({ measurement: { ...assertion().measurement } }),
    captureContext: {},
  });

  assert.equal(typeof result.observation.measurement.fingerprint, 'string');
  assert.equal(result.observation.measurement.value, 12.5);
  assert.equal(result.observation.measurement.unit, 'mm');
});

test('evaluation is explicitly absent when no request exists', async () => {
  let invoked = false;
  const result = await captureObservation(
    { assertion: assertion(), captureContext: { device: 'device-001' } },
    {
      evaluate() {
        invoked = true;
        return { status: 'COMPLETED', diagnostics: [] };
      },
    },
  );

  assert.equal(result.evaluation, null);
  assert.equal(invoked, false);
});

test('evaluator receives normalized observation and separate capture context', async () => {
  let received;
  const captureContext = { operator: 'operator-001', device: 'device-001' };
  const rawAssertion = assertion();
  const result = await captureObservation(
    {
      assertion: rawAssertion,
      captureContext,
      evaluationRequest: { policy: 'field-check' },
    },
    {
      evaluate(input) {
        received = input;
        return {
          status: 'COMPLETED',
          assessment: { quality: 'UNASSESSED' },
          diagnostics: [],
        };
      },
    },
  );

  assert.equal(received.observation, result.observation);
  assert.notEqual(received.observation, rawAssertion);
  assert.equal(received.captureContext, captureContext);
  assert.deepEqual(received.evaluationRequest, { policy: 'field-check' });
  assert.equal('captureContext' in received.observation, false);
});

test('evaluator cannot replace or mutate the assertion', async () => {
  const result = await captureObservation(
    {
      assertion: assertion(),
      captureContext: {},
      evaluationRequest: { policy: 'field-check' },
    },
    {
      evaluate(input) {
        assert.equal(Object.isFrozen(input.observation), true);
        assert.throws(() => {
          input.observation.observedValue = 'rewritten';
        }, TypeError);
        return {
          status: 'COMPLETED',
          assessment: { replacement: observation(assertion()) },
          diagnostics: [],
        };
      },
    },
  );

  assert.equal(result.observation.observedValue.condition, 'visible');
  assert.notEqual(result.observation, result.evaluation.assessment.replacement);
});

test('evaluator failures remain explicit and do not mutate the assertion', async () => {
  const result = await captureObservation(
    {
      assertion: assertion(),
      captureContext: {},
      evaluationRequest: { policy: 'field-check' },
    },
    {
      evaluate() {
        throw new Error('evaluator unavailable');
      },
    },
  );

  assert.equal(result.evaluation.status, 'FAILED');
  assert.deepEqual(result.evaluation.diagnostics, ['evaluator unavailable']);
  assert.equal(result.observation.observedValue.condition, 'visible');
});

test('requested evaluation without an evaluator is explicit and non-authoritative', async () => {
  const result = await captureObservation({
    assertion: assertion(),
    captureContext: {},
    evaluationRequest: { policy: 'field-check' },
  });

  assert.equal(result.evaluation.status, 'UNAVAILABLE');
  assert.match(result.evaluation.diagnostics[0], /no evaluator/i);
  assert.equal(result.observation.lifecycleState, undefined);
  assert.equal('current' in result.observation, false);
  assert.equal('latest' in result.observation, false);
  assert.equal('supersedes' in result.observation, false);
});
