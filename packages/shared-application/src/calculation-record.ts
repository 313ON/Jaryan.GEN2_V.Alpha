import type { StructuralSystem } from '@jaryan/shared-domain';

export type CalculationStatus = 'completed' | 'failed';

export interface CalculationAssumptionSnapshot {
  readonly id: string;
  readonly value: string | number | boolean;
  readonly unit?: string;
  readonly sourceId?: string;
}

export interface CalculationKnowledgeReference {
  readonly sourceIds: readonly string[];
  readonly knowledgeVersion?: string;
}

export interface CalculationRecord<TInput, TOutput, TError> {
  readonly id: string;
  readonly projectId: string;
  readonly system: StructuralSystem;
  readonly inputs: TInput;
  readonly outputs: TOutput | null;
  readonly assumptions: readonly CalculationAssumptionSnapshot[];
  readonly errors?: readonly TError[];
  readonly status: CalculationStatus;
  readonly knowledge: CalculationKnowledgeReference;
  readonly modelVersion?: string;
  readonly calculatedAt?: string;
}
