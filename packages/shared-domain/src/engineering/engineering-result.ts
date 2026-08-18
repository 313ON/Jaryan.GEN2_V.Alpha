import type { ConfidenceLevel } from './validation.ts';
import type { PrimitiveResult } from './structural-primitives.ts';
import { calculationContentFingerprint } from './content-fingerprint.ts';
import {
  engineeringCalculationIdentityFromLegacyId,
  engineeringResultIdentityFromLegacyId,
} from './legacy-artifact-identity.ts';

export type EngineeringResultStatus =
  | 'CALCULATED'
  | 'SOURCE_VALIDATED'
  | 'UNVERIFIED'
  | 'REVIEW_REQUIRED';

export const ENGINEERING_RESULT_STATUSES: readonly EngineeringResultStatus[] = [
  'CALCULATED',
  'SOURCE_VALIDATED',
  'UNVERIFIED',
  'REVIEW_REQUIRED',
];

export interface EngineeringCalculationResult {
  readonly id: string;
  readonly identityId: string;
  readonly contentFingerprint: string;
  readonly value: number;
  readonly unit: string;
  readonly status: EngineeringResultStatus;
  readonly confidence: ConfidenceLevel;
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly reviewerRequired: boolean;
}

export function toEngineeringCalculationResult(
  primitive: PrimitiveResult,
  options: { readonly version?: string } = {},
): EngineeringCalculationResult {
  const version = options.version ?? '1';
  let status = mapEngineeringResultStatus(primitive);
  if (
    status === 'SOURCE_VALIDATED' &&
    (primitive.sourceIds.length === 0 || primitive.assumptions.length === 0)
  ) {
    status = 'UNVERIFIED';
  }
  const calculationIdentity = engineeringCalculationIdentityFromLegacyId(
    primitive.calculationId,
    version,
  );
  const resultIdentity = engineeringResultIdentityFromLegacyId(
    primitive.calculationId,
    version,
  );
  const identityId = resultIdentity?.id ?? primitive.calculationId;
  const contentFingerprint = calculationContentFingerprint({
    definition: calculationIdentity?.baseId ?? primitive.calculationId,
    version,
    formula: primitive.formula,
    assumptions: [...primitive.assumptions],
    inputs: primitive.inputs,
  });
  return {
    id: primitive.calculationId,
    identityId,
    contentFingerprint,
    value: primitive.result.value,
    unit: primitive.result.unit,
    status,
    confidence: primitive.confidence,
    assumptions: [...primitive.assumptions],
    sources: [...primitive.sourceIds],
    reviewerRequired: primitive.review.reviewRequirement !== 'NONE',
  };
}

export function engineeringCalculationResultsFrom(
  primitives: readonly PrimitiveResult[],
): readonly EngineeringCalculationResult[] {
  return primitives.map((primitive) => toEngineeringCalculationResult(primitive));
}

export function serializeEngineeringCalculationResult(
  result: EngineeringCalculationResult,
): string {
  return JSON.stringify(result);
}

export function isEngineeringCalculationResultValidated(
  result: EngineeringCalculationResult,
): boolean {
  return result.status === 'SOURCE_VALIDATED';
}

function mapEngineeringResultStatus(
  primitive: PrimitiveResult,
): EngineeringResultStatus {
  if (primitive.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED') {
    return 'REVIEW_REQUIRED';
  }
  if (primitive.status === 'UNVERIFIED') {
    return 'UNVERIFIED';
  }
  if (primitive.validationStatus === 'SOURCE_VALIDATED') {
    return 'SOURCE_VALIDATED';
  }
  return 'CALCULATED';
}