import {
  calculateEngineeringModel,
  ENGINEERING_ASSUMPTION_METADATA,
  ENGINEERING_ASSUMPTIONS,
} from '@jaryan/shared-domain';
import type {
  EngineeringInputs,
  EngineeringOutputs,
  FieldError,
} from '@jaryan/shared-domain';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge';
import type {
  CalculationAssumptionSnapshot,
  CalculationRecord,
} from './calculation-record.ts';

export type EngineeringCalculationRecord = CalculationRecord<
  EngineeringInputs,
  EngineeringOutputs,
  FieldError
>;

export interface CalculateEngineeringRequest {
  readonly projectId: string;
  readonly inputs: EngineeringInputs;
}

function snapshotAssumptions(): CalculationAssumptionSnapshot[] {
  return ENGINEERING_ASSUMPTION_METADATA.map(({ key, id, unit, sourceId }) => ({
    id,
    value: ENGINEERING_ASSUMPTIONS[key],
    ...(unit === undefined ? {} : { unit }),
    ...(sourceId === undefined ? {} : { sourceId }),
  }));
}

export function calculateEngineering(
  request: CalculateEngineeringRequest,
): EngineeringCalculationRecord {
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();
  const result = calculateEngineeringModel(request.inputs);

  if (!result.ok) {
    return {
      id,
      projectId: request.projectId,
      system: request.inputs.structuralSystem,
      inputs: request.inputs,
      outputs: null,
      assumptions: snapshotAssumptions(),
      errors: result.errors,
      status: 'failed',
      knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
      calculatedAt,
    };
  }

  return {
    id,
    projectId: request.projectId,
    system: request.inputs.structuralSystem,
    inputs: request.inputs,
    outputs: result.outputs,
    assumptions: snapshotAssumptions(),
    status: 'completed',
    knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
    calculatedAt,
  };
}
