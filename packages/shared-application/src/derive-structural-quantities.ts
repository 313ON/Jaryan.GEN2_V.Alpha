import type { StructuralCalculation } from '@jaryan/shared-domain';
import {
  calculateStructuralScreen,
  type CalculateStructuralScreenRequest,
  type StructuralScreenCalculationRecord,
} from './calculate-structural-screen.ts';
import type { Quantity } from './quantity.ts';

export interface DeriveStructuralQuantitiesRequest
  extends CalculateStructuralScreenRequest {}

export interface StructuralQuantitiesResult {
  readonly calculation: StructuralScreenCalculationRecord;
  readonly quantities: readonly Quantity[];
}

export function deriveStructuralQuantities(
  request: DeriveStructuralQuantitiesRequest,
): StructuralQuantitiesResult {
  const calculation = calculateStructuralScreen(request);

  if (calculation.status !== 'completed' || calculation.outputs === null) {
    return { calculation, quantities: [] };
  }

  return {
    calculation,
    quantities: quantitiesFromStructuralCalculation(
      calculation.id,
      calculation.outputs,
    ),
  };
}

function quantitiesFromStructuralCalculation(
  calculationId: string,
  output: StructuralCalculation,
): readonly Quantity[] {
  return [
    Object.freeze({
      id: `${calculationId}:net-envelope-area`,
      quantity: output.netEnvelopeAreaM2,
      unit: 'm2',
      source: Object.freeze({
        calculationId,
        output: 'netEnvelopeAreaM2',
      }),
    }),
    Object.freeze({
      id: `${calculationId}:wall-material-volume`,
      quantity: output.estimatedWallMaterialM3,
      unit: 'm3',
      source: Object.freeze({
        calculationId,
        output: 'estimatedWallMaterialM3',
      }),
    }),
    Object.freeze({
      id: `${calculationId}:wall-mass`,
      quantity: output.estimatedWallMassT,
      unit: 't',
      source: Object.freeze({
        calculationId,
        output: 'estimatedWallMassT',
      }),
    }),
  ];
}
