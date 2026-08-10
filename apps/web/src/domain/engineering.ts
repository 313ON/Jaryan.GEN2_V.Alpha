export const ENGINEERING_ASSUMPTIONS = {
  solarPerformanceRatio: 0.78,
  batteryUsableDepth: 0.8,
  batteryRoundTripEfficiency: 0.9,
  waterUsePerPersonL: 50,
  minimumPracticalTankL: 500,
  envelopeWasteFactor: 1.1,
  compactedEarthDensityKgM3: 1800,
} as const;

export interface EngineeringInputs {
  latitudeDeg: number;
  domeRadiusM: number;
  domeHeightM: number;
  wallThicknessM: number;
  dailyDemandKwh: number;
  autonomyDays: number;
  panelWattage: number;
  occupants: number;
  storageDays: number;
}

export const DEFAULT_ENGINEERING_INPUTS: EngineeringInputs = {
  latitudeDeg: 34,
  domeRadiusM: 3,
  domeHeightM: 3.6,
  wallThicknessM: 0.4,
  dailyDemandKwh: 15,
  autonomyDays: 2,
  panelWattage: 400,
  occupants: 4,
  storageDays: 3,
};

export type InputField = keyof EngineeringInputs;

export interface FieldError {
  field: InputField;
  message: string;
}

export interface EngineeringOutputs {
  peakSunHours: number;
  recommendedPanelCount: number;
  installedSolarCapacityKw: number;
  batteryCapacityKwh: number;
  estimatedDailySolarYieldKwh: number;
  domeEnvelopeAreaM2: number;
  estimatedWallMaterialM3: number;
  estimatedWallMassT: number;
  geometryRatio: number;
  geometryStatus: 'balanced' | 'review';
  dailyWaterUseL: number;
  recommendedTankL: number;
  recommendedTankM3: number;
  storageMeetsPracticalMinimum: boolean;
}

export type EngineeringResult =
  | { ok: true; outputs: EngineeringOutputs; errors: [] }
  | { ok: false; outputs: null; errors: FieldError[] };

interface Range {
  min: number;
  max: number;
  label: string;
}

export const INPUT_RANGES: Record<InputField, Range> = {
  latitudeDeg: { min: -90, max: 90, label: 'Latitude' },
  domeRadiusM: { min: 1.5, max: 8, label: 'Dome radius' },
  domeHeightM: { min: 2, max: 8, label: 'Dome height' },
  wallThicknessM: { min: 0.3, max: 0.7, label: 'Wall thickness' },
  dailyDemandKwh: { min: 2, max: 80, label: 'Daily energy demand' },
  autonomyDays: { min: 0.5, max: 5, label: 'Battery autonomy' },
  panelWattage: { min: 300, max: 700, label: 'Panel rating' },
  occupants: { min: 1, max: 20, label: 'Occupants' },
  storageDays: { min: 1, max: 14, label: 'Water storage' },
};

const round = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function estimatePeakSunHours(latitudeDeg: number): number {
  const hours = 6.5 - (Math.abs(latitudeDeg) / 60) * 4.2;
  return round(clamp(hours, 1, 8), 1);
}

export function validateEngineeringInputs(
  inputs: EngineeringInputs,
): FieldError[] {
  return (Object.keys(INPUT_RANGES) as InputField[]).flatMap((field) => {
    const value = inputs[field];
    const range = INPUT_RANGES[field];

    if (!Number.isFinite(value)) {
      return [{ field, message: `${range.label} requires a numeric value.` }];
    }

    if (value < range.min || value > range.max) {
      return [
        {
          field,
          message: `${range.label} must be between ${range.min} and ${range.max}.`,
        },
      ];
    }

    return [];
  });
}

export function calculateEngineeringModel(
  inputs: EngineeringInputs,
): EngineeringResult {
  const errors = validateEngineeringInputs(inputs);

  if (errors.length > 0) {
    return { ok: false, outputs: null, errors };
  }

  const peakSunHours = estimatePeakSunHours(inputs.latitudeDeg);
  const panelKw = inputs.panelWattage / 1000;
  const recommendedPanelCount = Math.ceil(
    inputs.dailyDemandKwh /
      (peakSunHours *
        ENGINEERING_ASSUMPTIONS.solarPerformanceRatio *
        panelKw),
  );
  const installedSolarCapacityKw = recommendedPanelCount * panelKw;
  const batteryCapacityKwh =
    (inputs.dailyDemandKwh * inputs.autonomyDays) /
    (ENGINEERING_ASSUMPTIONS.batteryUsableDepth *
      ENGINEERING_ASSUMPTIONS.batteryRoundTripEfficiency);

  // Spherical-cap surface area. This is a material envelope estimate only.
  const domeEnvelopeAreaM2 =
    Math.PI *
    (inputs.domeRadiusM ** 2 + inputs.domeHeightM ** 2);
  const estimatedWallMaterialM3 =
    domeEnvelopeAreaM2 *
    inputs.wallThicknessM *
    ENGINEERING_ASSUMPTIONS.envelopeWasteFactor;
  const geometryRatio = inputs.domeHeightM / (inputs.domeRadiusM * 2);

  const dailyWaterUseL =
    inputs.occupants * ENGINEERING_ASSUMPTIONS.waterUsePerPersonL;
  const calculatedTankL = dailyWaterUseL * inputs.storageDays;
  const recommendedTankL = Math.max(
    calculatedTankL,
    ENGINEERING_ASSUMPTIONS.minimumPracticalTankL,
  );

  return {
    ok: true,
    errors: [],
    outputs: {
      peakSunHours,
      recommendedPanelCount,
      installedSolarCapacityKw: round(installedSolarCapacityKw, 1),
      batteryCapacityKwh: round(batteryCapacityKwh, 1),
      estimatedDailySolarYieldKwh: round(
        installedSolarCapacityKw *
          peakSunHours *
          ENGINEERING_ASSUMPTIONS.solarPerformanceRatio,
        1,
      ),
      domeEnvelopeAreaM2: round(domeEnvelopeAreaM2, 1),
      estimatedWallMaterialM3: round(estimatedWallMaterialM3, 1),
      estimatedWallMassT: round(
        (estimatedWallMaterialM3 *
          ENGINEERING_ASSUMPTIONS.compactedEarthDensityKgM3) /
          1000,
        1,
      ),
      geometryRatio: round(geometryRatio, 2),
      geometryStatus:
        geometryRatio >= 0.55 && geometryRatio <= 0.85
          ? 'balanced'
          : 'review',
      dailyWaterUseL,
      recommendedTankL,
      recommendedTankM3: round(recommendedTankL / 1000, 2),
      storageMeetsPracticalMinimum:
        calculatedTankL >=
        ENGINEERING_ASSUMPTIONS.minimumPracticalTankL,
    },
  };
}
