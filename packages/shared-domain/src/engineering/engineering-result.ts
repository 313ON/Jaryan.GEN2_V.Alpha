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
  const id = identityId;
  const contentFingerprint = calculationContentFingerprint({
    definition: calculationIdentity?.baseId ?? primitive.calculationId,
    version,
    formula: primitive.formula,
    assumptions: [...primitive.assumptions],
    inputs: primitive.inputs,
  });
  return {
    id,
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

export function validateEngineeringCalculationResult(
  result: EngineeringCalculationResult,
): readonly string[] {
  const errors: string[] = [];
  if (!result || typeof result !== 'object') {
    return ['Engineering calculation result must be provided.'];
  }
  if (result.id !== result.identityId) {
    errors.push('Result id must equal the result identity id.');
  }
  if (
    typeof result.identityId !== 'string' ||
    !/^RESULT-[A-Z][A-Z0-9]*-[A-Z][A-Z0-9-]*-\d{3}-v[0-9]+(\.[0-9]+)*$/.test(
      result.identityId,
    )
  ) {
    errors.push('Result identity id must be a canonical versioned RESULT identity.');
  }
  return errors;
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
