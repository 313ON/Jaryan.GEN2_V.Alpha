export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type ValidationStatus =
  | 'SOURCE_VALIDATED'
  | 'ANALYTICALLY_VALIDATED'
  | 'NUMERICALLY_VALIDATED'
  | 'LAB_VALIDATED'
  | 'FIELD_VALIDATED'
  | 'PROFESSIONAL_REVIEW'
  | 'UNKNOWN';

export type ConsequenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

export type ReviewRequirement = 'HUMAN_REVIEW_REQUIRED' | 'ENGINEER_REVIEW' | 'NONE';

export const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = [
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNKNOWN',
];

export const VALIDATION_STATUSES: readonly ValidationStatus[] = [
  'SOURCE_VALIDATED',
  'ANALYTICALLY_VALIDATED',
  'NUMERICALLY_VALIDATED',
  'LAB_VALIDATED',
  'FIELD_VALIDATED',
  'PROFESSIONAL_REVIEW',
  'UNKNOWN',
];

export const CONSEQUENCE_LEVELS: readonly ConsequenceLevel[] = [
  'HIGH',
  'MODERATE',
  'LOW',
];

export interface ValidationReview {
  readonly confidence: ConfidenceLevel;
  readonly consequence: ConsequenceLevel;
  readonly validationStatus: ValidationStatus;
  readonly reviewRequirement: ReviewRequirement;
}

export function evaluateReviewRequirement(
  confidence: ConfidenceLevel,
  consequence: ConsequenceLevel,
): ReviewRequirement {
  if ((confidence === 'LOW' || confidence === 'UNKNOWN') && consequence === 'HIGH') {
    return 'HUMAN_REVIEW_REQUIRED';
  }
  if (confidence === 'UNKNOWN' || consequence === 'HIGH') {
    return 'ENGINEER_REVIEW';
  }
  return 'NONE';
}

export function evaluateValidation(
  confidence: ConfidenceLevel,
  consequence: ConsequenceLevel,
  validationStatus: ValidationStatus,
): ValidationReview {
  return {
    confidence,
    consequence,
    validationStatus,
    reviewRequirement: evaluateReviewRequirement(confidence, consequence),
  };
}

export function isHumanReviewRequired(review: ValidationReview): boolean {
  return review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED';
}