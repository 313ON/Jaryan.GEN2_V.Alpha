import {
  observation,
  type Observation,
  type ObservationInput,
} from '@jaryan/shared-domain';
import type {
  CaptureContext,
  EvaluationOutcome,
  EvaluationRequest,
  ObservationEvaluator,
} from './observation-evaluation.ts';

export interface CaptureObservationCommand {
  readonly assertion: ObservationInput;
  readonly captureContext: CaptureContext;
  readonly evaluationRequest?: EvaluationRequest;
}

export interface CaptureObservationOutcome {
  readonly observation: Observation;
  readonly evaluation: EvaluationOutcome | null;
}

export async function captureObservation(
  command: CaptureObservationCommand,
  evaluator: ObservationEvaluator | null = null,
): Promise<CaptureObservationOutcome> {
  const normalizedObservation = observation(command.assertion);

  if (command.evaluationRequest === undefined) {
    return Object.freeze({
      observation: normalizedObservation,
      evaluation: null,
    });
  }

  if (evaluator === null) {
    return Object.freeze({
      observation: normalizedObservation,
      evaluation: unavailableEvaluation(
        'Evaluation was requested, but no evaluator was provided.',
      ),
    });
  }

  try {
    const evaluation = await evaluator.evaluate({
      observation: normalizedObservation,
      captureContext: command.captureContext,
      evaluationRequest: command.evaluationRequest,
    });
    return Object.freeze({
      observation: normalizedObservation,
      evaluation: freezeEvaluation(evaluation),
    });
  } catch (error) {
    return Object.freeze({
      observation: normalizedObservation,
      evaluation: failedEvaluation(error),
    });
  }
}

function unavailableEvaluation(diagnostic: string): EvaluationOutcome {
  return Object.freeze({
    status: 'UNAVAILABLE',
    diagnostics: Object.freeze([diagnostic]),
  });
}

function failedEvaluation(error: unknown): EvaluationOutcome {
  const diagnostic =
    error instanceof Error ? error.message : 'External evaluation failed.';
  return Object.freeze({
    status: 'FAILED',
    diagnostics: Object.freeze([diagnostic]),
  });
}

function freezeEvaluation(
  evaluation: EvaluationOutcome,
): EvaluationOutcome {
  return Object.freeze({
    ...evaluation,
    diagnostics: Object.freeze([...evaluation.diagnostics]),
  });
}
