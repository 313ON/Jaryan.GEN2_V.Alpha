import {
  calculateStructural,
  SOIL_PROFILES,
  validateStructuralInputs,
} from '@jaryan/shared-domain';
import type {
  StructuralCalculation,
  StructuralFieldError,
  StructuralInputs,
} from '@jaryan/shared-domain';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge';
import type {
  CalculationAssumptionSnapshot,
  CalculationRecord,
} from './calculation-record.ts';

export interface CalculateStructuralScreenRequest {
  readonly projectId: string;
  readonly inputs: StructuralInputs;
}

export type StructuralScreenCalculationRecord = CalculationRecord<
  StructuralInputs,
  StructuralCalculation,
  StructuralFieldError
>;

function snapshotStructuralAssumptions(
  inputs: StructuralInputs,
): CalculationAssumptionSnapshot[] {
  const profile = calculateStructural(inputs).soilProfile;
  return [
    {
      id: 'soil-compacted-density',
      value: profile.compactedDensityKgM3,
      unit: 'kg/m³',
    },
    {
      id: 'soil-material-allowance-factor',
      value: profile.materialAllowanceFactor,
    },
  ];
}

export function calculateStructuralScreen(
  request: CalculateStructuralScreenRequest,
): StructuralScreenCalculationRecord {
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();
  const errors = validateStructuralInputs(request.inputs);
  const assumptions =
    request.inputs.soilType in SOIL_PROFILES
      ? snapshotStructuralAssumptions(request.inputs)
      : [];

  if (errors.length > 0) {
    return {
      id,
      projectId: request.projectId,
      system: 'superadobe',
      inputs: request.inputs,
      outputs: null,
      assumptions,
      errors,
      status: 'failed',
      knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
      calculatedAt,
    };
  }

  return {
    id,
    projectId: request.projectId,
    system: 'superadobe',
    inputs: request.inputs,
    outputs: calculateStructural(request.inputs),
    assumptions,
    status: 'completed',
    knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
    calculatedAt,
  };
}
