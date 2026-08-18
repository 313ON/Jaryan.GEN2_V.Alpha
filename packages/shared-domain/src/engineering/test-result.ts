export type TestResultStatus =
  | 'PENDING'
  | 'REPORTED'
  | 'REJECTED'
  | 'REFERENCE_ONLY';

export interface TestResult {
  readonly testId: string;
  readonly materialId: string;
  readonly standard: string;
  readonly specimen: string;
  readonly condition: string;
  readonly measuredProperty: string;
  readonly value: number;
  readonly unit: string;
  readonly uncertainty?: string;
  readonly laboratory?: string;
  readonly date?: string;
  readonly status: TestResultStatus;
}

export interface TestResultContract {
  readonly testId: string;
  readonly materialId: string;
  readonly standard: string;
  readonly specimen: string;
  readonly condition: string;
  readonly measuredProperty: string;
  readonly value: number;
  readonly unit: string;
  readonly status: TestResultStatus;
}

export const TEST_RESULT_STATUSES: readonly TestResultStatus[] = [
  'PENDING',
  'REPORTED',
  'REJECTED',
  'REFERENCE_ONLY',
];

export function isUsableTestResult(result: TestResult): boolean {
  return (
    result.status === 'REPORTED' &&
    Number.isFinite(result.value) &&
    result.unit.length > 0
  );
}