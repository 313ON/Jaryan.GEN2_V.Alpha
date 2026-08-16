import { round, ENGINEERING_ASSUMPTIONS, calculateEnergy } from './energy.ts';
import { SOIL_PROFILES, calculateStructural } from './structural.ts';
import type { SoilProfile, StructuralSystem } from './structural.ts';
import { calculateWater } from './water.ts';

export { SOIL_PROFILES } from './structural.ts';
export type { SoilProfile, StructuralSystem } from './structural.ts';
export {
  ENGINEERING_ASSUMPTIONS,
  estimatePeakSunHours,
  calculateSolarInstallation,
  assessSolarCoverage,
} from './energy.ts';
export type { SolarCoverage, SolarInstallationEstimate } from './energy.ts';

export type SoilType =
  | 'clay-rich'
  | 'sandy'
  | 'silty'
  | 'gravelly'
  | 'mixed-unknown';

export type MountingMode = 'roof' | 'ground';

export interface EngineeringInputs {
  latitudeDeg: number;
  longitudeDeg: number;
  structuralSystem: StructuralSystem;
  soilType: SoilType;
  domeRadiusM: number;
  domeHeightM: number;
  wallThicknessM: number;
  openingAreaM2: number;
  dailyDemandKwh: number;
  autonomyDays: number;
  panelWattage: number;
  systemVoltageV: number;
  shadingFactor: number;
  mountingMode: MountingMode;
  occupants: number;
  storageDays: number;
}

export const DEFAULT_ENGINEERING_INPUTS: EngineeringInputs = {
  latitudeDeg: 34,
  longitudeDeg: 52,
  structuralSystem: 'superadobe',
  soilType: 'mixed-unknown',
  domeRadiusM: 3,
  domeHeightM: 3.6,
  wallThicknessM: 0.4,
  openingAreaM2: 3,
  dailyDemandKwh: 15,
  autonomyDays: 2,
  panelWattage: 400,
  systemVoltageV: 48,
  shadingFactor: 0.9,
  mountingMode: 'ground',
  occupants: 4,
  storageDays: 3,
};

export type NumericInputField = {
  [K in keyof EngineeringInputs]: EngineeringInputs[K] extends number ? K : never;
}[keyof EngineeringInputs];

export interface FieldError {
  field: keyof EngineeringInputs;
  message: string;
}

export interface EngineeringOutputs {
  peakSunHours: number;
  recommendedPanelCount: number;
  installedSolarCapacityKw: number;
  batteryCapacityKwh: number;
  nominalBatteryCapacityAh: number;
  estimatedDailySolarYieldKwh: number;
  solarDemandCovered: boolean;
  solarGenerationMarginKwh: number;
  panelFaceAreaM2: number;
  pvModuleAreaM2: number;
  pvInstallationFootprintM2: number;
  installationFootprintFactor: number;
  grossEnvelopeAreaM2: number;
  netEnvelopeAreaM2: number;
  estimatedWallMaterialM3: number;
  estimatedWallMassT: number;
  geometryRatio: number;
  openingRatio: number;
  geometryStatus: 'screened' | 'review';
  structuralWarnings: string[];
  dailyWaterUseL: number;
  designReserveL: number;
  recommendedTankL: number;
  recommendedTankM3: number;
  storageMeetsPracticalMinimum: boolean;
  soilProfile: SoilProfile;
  dataQualityStatus: 'limited' | 'screening';
}

export type EngineeringResult =
  | { ok: true; outputs: EngineeringOutputs; errors: [] }
  | { ok: false; outputs: null; errors: FieldError[] };

interface Range {
  min: number;
  max: number;
  label: string;
}

export const INPUT_RANGES: Record<NumericInputField, Range> = {
  latitudeDeg: { min: -90, max: 90, label: 'Latitude' },
  longitudeDeg: { min: -180, max: 180, label: 'Longitude' },
  domeRadiusM: { min: 1.5, max: 8, label: 'Dome radius' },
  domeHeightM: { min: 2, max: 8, label: 'Dome height' },
  wallThicknessM: { min: 0.3, max: 0.7, label: 'Wall thickness' },
  openingAreaM2: { min: 0, max: 40, label: 'Opening area' },
  dailyDemandKwh: { min: 2, max: 80, label: 'Daily energy demand' },
  autonomyDays: { min: 0.5, max: 5, label: 'Battery autonomy' },
  panelWattage: { min: 250, max: 700, label: 'Panel rating' },
  systemVoltageV: { min: 12, max: 400, label: 'System voltage' },
  shadingFactor: { min: 0.5, max: 1, label: 'Solar access factor' },
  occupants: { min: 1, max: 20, label: 'Occupants' },
  storageDays: { min: 1, max: 30, label: 'Water storage' },
};

export function validateEngineeringInputs(
  inputs: EngineeringInputs,
): FieldError[] {
  const numericErrors = (Object.keys(INPUT_RANGES) as NumericInputField[]).flatMap(
    (field) => {
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
    },
  );

  const categoricalErrors: FieldError[] = [];
  if (!(inputs.soilType in SOIL_PROFILES)) {
    categoricalErrors.push({
      field: 'soilType',
      message: 'Select a supported soil classification.',
    });
  }
  if (inputs.mountingMode !== 'roof' && inputs.mountingMode !== 'ground') {
    categoricalErrors.push({
      field: 'mountingMode',
      message: 'Select roof or ground mounting.',
    });
  }
  if (inputs.structuralSystem !== 'superadobe') {
    categoricalErrors.push({
      field: 'structuralSystem',
      message: 'Select a supported structural system.',
    });
  }

  return [...numericErrors, ...categoricalErrors];
}

export function calculateEngineeringModel(
  inputs: EngineeringInputs,
): EngineeringResult {
  const errors = validateEngineeringInputs(inputs);

  if (errors.length > 0) {
    return { ok: false, outputs: null, errors };
  }

  const structural = calculateStructural({
    domeRadiusM: inputs.domeRadiusM,
    domeHeightM: inputs.domeHeightM,
    wallThicknessM: inputs.wallThicknessM,
    openingAreaM2: inputs.openingAreaM2,
    soilType: inputs.soilType,
  });

  const energy = calculateEnergy(inputs);

  if (!energy.ok) {
    return { ok: false, outputs: null, errors: [energy.error] };
  }

  const water = calculateWater(
    { occupants: inputs.occupants, storageDays: inputs.storageDays },
    ENGINEERING_ASSUMPTIONS,
  );

  return {
    ok: true,
    errors: [],
    outputs: {
      ...energy.outputs,
      grossEnvelopeAreaM2: round(structural.grossEnvelopeAreaM2, 1),
      netEnvelopeAreaM2: round(structural.netEnvelopeAreaM2, 1),
      estimatedWallMaterialM3: round(structural.estimatedWallMaterialM3, 1),
      estimatedWallMassT: round(structural.estimatedWallMassT, 1),
      geometryRatio: round(structural.geometryRatio, 2),
      openingRatio: round(structural.openingRatio, 3),
      geometryStatus: structural.geometryStatus,
      structuralWarnings: structural.structuralWarnings,
      dailyWaterUseL: water.dailyWaterUseL,
      designReserveL: water.designReserveL,
      recommendedTankL: water.recommendedTankL,
      recommendedTankM3: round(water.recommendedTankL / 1000, 2),
      storageMeetsPracticalMinimum: water.storageMeetsPracticalMinimum,
      soilProfile: structural.soilProfile,
      dataQualityStatus:
        inputs.soilType === 'mixed-unknown' ? 'limited' : 'screening',
    },
  };
}
