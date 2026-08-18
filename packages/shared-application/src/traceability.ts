import type { ConfidenceLevel, ValidationStatus } from '@jaryan/shared-domain';

export interface TraceabilityLink {
  readonly calculationId: string;
  readonly method: string;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly inputs: readonly string[];
  readonly assumptions: readonly string[];
  readonly validationStatus: ValidationStatus;
  readonly confidence: ConfidenceLevel;
  readonly reviewRequirement: string;
}

export interface TraceabilityBundle {
  readonly resultId: string;
  readonly links: readonly TraceabilityLink[];
}

export function buildTraceabilityLink(inputs: {
  readonly calculationId: string;
  readonly method: string;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly inputIds: readonly string[];
  readonly assumptions: readonly string[];
  readonly validationStatus: ValidationStatus;
  readonly confidence: ConfidenceLevel;
  readonly reviewRequirement: string;
}): TraceabilityLink {
  return {
    calculationId: inputs.calculationId,
    method: inputs.method,
    formula: inputs.formula,
    sourceIds: [...inputs.sourceIds],
    inputs: [...inputs.inputIds],
    assumptions: [...inputs.assumptions],
    validationStatus: inputs.validationStatus,
    confidence: inputs.confidence,
    reviewRequirement: inputs.reviewRequirement,
  };
}