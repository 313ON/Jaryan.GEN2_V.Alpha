import type {
  EngineeringInputs,
  EngineeringOutputs,
  StructuralSystem,
} from '@jaryan/shared-domain';

export type CalculationStatus = 'completed' | 'failed';

export interface CalculationKnowledgeReference {
  readonly sourceIds: readonly string[];
  readonly knowledgeVersion?: string;
}

export interface CalculationRecord {
  readonly id: string;
  readonly projectId: string;
  readonly system: StructuralSystem;
  readonly inputs: EngineeringInputs;
  readonly outputs: EngineeringOutputs | null;
  readonly status: CalculationStatus;
  readonly knowledge: CalculationKnowledgeReference;
}