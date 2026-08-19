import type { PrimitiveResult } from './structural-primitives.ts';

export type RequiredEvidence =
  | 'METHOD'
  | 'FORMULA'
  | 'INPUTS'
  | 'ASSUMPTIONS'
  | 'SOURCES';

export const REQUIRED_EVIDENCE_TYPES: readonly RequiredEvidence[] = [
  'METHOD',
  'FORMULA',
  'INPUTS',
  'ASSUMPTIONS',
  'SOURCES',
];

export interface EngineeringEvidenceInput {
  readonly method: string;
  readonly formula: string;
  readonly inputs: Readonly<Record<string, unknown>> | readonly unknown[];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly sourceRequired: boolean;
}

export interface EngineeringEvidenceState {
  readonly requiredEvidence: readonly RequiredEvidence[];
  readonly missingEvidence: readonly RequiredEvidence[];
  readonly complete: boolean;
}

export function deriveEngineeringRequiredEvidence(
  input: EngineeringEvidenceInput,
): readonly RequiredEvidence[] {
  const evidence: RequiredEvidence[] = [
    'METHOD',
    'FORMULA',
    'INPUTS',
    'ASSUMPTIONS',
  ];
  if (input.sourceRequired) {
    evidence.push('SOURCES');
  }
  return evidence;
}

export function deriveEngineeringMissingEvidence(
  input: EngineeringEvidenceInput,
): readonly RequiredEvidence[] {
  const missing: RequiredEvidence[] = [];
  if ((input.method?.length ?? 0) === 0) {
    missing.push('METHOD');
  }
  if ((input.formula?.length ?? 0) === 0) {
    missing.push('FORMULA');
  }
  if (!hasEvidenceInputs(input.inputs)) {
    missing.push('INPUTS');
  }
  if ((input.assumptions?.length ?? 0) === 0) {
    missing.push('ASSUMPTIONS');
  }
  if (input.sourceRequired && (input.sources?.length ?? 0) === 0) {
    missing.push('SOURCES');
  }
  return missing;
}

export function deriveEngineeringEvidence(
  input: EngineeringEvidenceInput,
): EngineeringEvidenceState {
  const requiredEvidence = deriveEngineeringRequiredEvidence(input);
  const missingEvidence = deriveEngineeringMissingEvidence(input);
  return {
    requiredEvidence,
    missingEvidence,
    complete: missingEvidence.length === 0,
  };
}

export function engineeringPrimitiveRequiredEvidence(
  primitive: PrimitiveResult,
): readonly RequiredEvidence[] {
  return deriveEngineeringRequiredEvidence(
    engineeringEvidenceFromPrimitive(primitive),
  );
}

export function engineeringPrimitiveMissingEvidence(
  primitive: PrimitiveResult,
): readonly RequiredEvidence[] {
  return deriveEngineeringMissingEvidence(
    engineeringEvidenceFromPrimitive(primitive),
  );
}

function engineeringEvidenceFromPrimitive(
  primitive: PrimitiveResult,
): EngineeringEvidenceInput {
  return {
    method: primitive.method,
    formula: primitive.formula,
    inputs: primitive.inputs,
    assumptions: primitive.assumptions,
    sources: primitive.sourceIds,
    sourceRequired: primitive.validationStatus === 'SOURCE_VALIDATED',
  };
}

function hasEvidenceInputs(
  inputs: Readonly<Record<string, unknown>> | readonly unknown[],
): boolean {
  if (Array.isArray(inputs)) {
    return inputs.length > 0;
  }
  return Object.keys(inputs ?? {}).length > 0;
}
