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

export function engineeringPrimitiveRequiredEvidence(
  primitive: PrimitiveResult,
): readonly RequiredEvidence[] {
  const evidence: RequiredEvidence[] = [
    'METHOD',
    'FORMULA',
    'INPUTS',
    'ASSUMPTIONS',
  ];
  if (primitive.validationStatus === 'SOURCE_VALIDATED') {
    evidence.push('SOURCES');
  }
  return evidence;
}

export function engineeringPrimitiveMissingEvidence(
  primitive: PrimitiveResult,
): readonly RequiredEvidence[] {
  const missing: RequiredEvidence[] = [];
  if (primitive.method.length === 0) {
    missing.push('METHOD');
  }
  if (primitive.formula.length === 0) {
    missing.push('FORMULA');
  }
  if (Object.keys(primitive.inputs).length === 0) {
    missing.push('INPUTS');
  }
  if (primitive.assumptions.length === 0) {
    missing.push('ASSUMPTIONS');
  }
  if (
    primitive.validationStatus === 'SOURCE_VALIDATED' &&
    primitive.sourceIds.length === 0
  ) {
    missing.push('SOURCES');
  }
  return missing;
}