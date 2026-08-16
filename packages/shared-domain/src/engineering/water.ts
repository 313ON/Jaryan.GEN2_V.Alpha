export interface WaterAssumptions {
  waterUsePerPersonL: number;
  minimumPracticalTankL: number;
}

export interface WaterCalculation {
  dailyWaterUseL: number;
  designReserveL: number;
  recommendedTankL: number;
  storageMeetsPracticalMinimum: boolean;
}

export function calculateWater(
  inputs: { occupants: number; storageDays: number },
  assumptions: WaterAssumptions,
): WaterCalculation {
  const dailyWaterUseL =
    inputs.occupants * assumptions.waterUsePerPersonL;
  const designReserveL = dailyWaterUseL * inputs.storageDays;
  const recommendedTankL = Math.max(
    designReserveL,
    assumptions.minimumPracticalTankL,
  );

  return {
    dailyWaterUseL,
    designReserveL,
    recommendedTankL,
    storageMeetsPracticalMinimum:
      designReserveL >= assumptions.minimumPracticalTankL,
  };
}
