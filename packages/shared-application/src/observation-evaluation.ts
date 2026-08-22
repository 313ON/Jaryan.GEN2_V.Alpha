import type {
  Observation,
} from '@jaryan/shared-domain';

export type CaptureContext = Readonly<Record<string, unknown>>;
export type EvaluationRequest = Readonly<Record<string, unknown>>;

export type EvaluationStatus =
  | 'COMPLETED'
  | 'UNAVAILABLE'
  | 'FAILED';

export interface EvaluationOutcome {
  readonly status: EvaluationStatus;
  readonly assessment?: unknown;
  readonly diagnostics: readonly string[];
}

export interface ObservationEvaluationInput {
  readonly observation: Observation;
  readonly captureContext: CaptureContext;
  readonly evaluationRequest: EvaluationRequest;
}

export interface ObservationEvaluator {
  evaluate(
    input: ObservationEvaluationInput,
  ): EvaluationOutcome | Promise<EvaluationOutcome>;
}
