import type { EngineeringInputs, FieldError, MountingMode } from './engineering.ts';

export const round = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const ENGINEERING_ASSUMPTIONS = {
  solarPerformanceRatio: 0.78,
  batteryUsableDepth: 0.8,
  batteryRoundTripEfficiency: 0.9,
  waterUsePerPersonL: 50,
  minimumPracticalTankL: 500,
  modulePowerDensityWm2: 205,
  roofInstallationFootprintFactor: 1.35,
  groundInstallationFootprintFactor: 1.75,
} as const;

export interface SolarCoverage {
  expectedDailyGenerationKwh: number;
  demandCovered: boolean;
  generationMarginKwh: number;
}

export interface SolarInstallationEstimate {
  panelCount: number;
  panelFaceAreaM2: number;
  moduleAreaM2: number;
  installationFootprintM2: number;
  installationFootprintFactor: number;
}

export function estimatePeakSunHours(latitudeDeg: number): number {
  const hours = 6.5 - (Math.abs(latitudeDeg) / 60) * 4.2;
  return round(clamp(hours, 1, 8), 1);
}

export function calculateSolarInstallation(
  panelCount: number,
  panelWattage: number,
  mountingMode: MountingMode,
): SolarInstallationEstimate | null {
  if (
    !Number.isInteger(panelCount) ||
    panelCount < 0 ||
    !Number.isFinite(panelWattage) ||
    panelWattage <= 0
  ) {
    return null;
  }

  const panelFaceAreaM2 =
    panelWattage / ENGINEERING_ASSUMPTIONS.modulePowerDensityWm2;
  const moduleAreaM2 = panelCount * panelFaceAreaM2;
  const installationFootprintFactor =
    mountingMode === 'ground'
      ? ENGINEERING_ASSUMPTIONS.groundInstallationFootprintFactor
      : ENGINEERING_ASSUMPTIONS.roofInstallationFootprintFactor;

  return {
    panelCount,
    panelFaceAreaM2: round(panelFaceAreaM2, 2),
    moduleAreaM2: round(moduleAreaM2, 1),
    installationFootprintM2: round(
      moduleAreaM2 * installationFootprintFactor,
      1,
    ),
    installationFootprintFactor,
  };
}

export function assessSolarCoverage(
  dailyDemandKwh: number,
  panelCount: number,
  panelWattage: number,
  peakSunHours: number,
  shadingFactor: number,
): SolarCoverage {
  const expectedDailyGenerationKwh =
    panelCount *
    (panelWattage / 1000) *
    peakSunHours *
    ENGINEERING_ASSUMPTIONS.solarPerformanceRatio *
    shadingFactor;
  const generationMarginKwh = expectedDailyGenerationKwh - dailyDemandKwh;

  return {
    expectedDailyGenerationKwh: round(expectedDailyGenerationKwh, 1),
    demandCovered: generationMarginKwh >= -0.05,
    generationMarginKwh: round(generationMarginKwh, 1),
  };
}

export interface EnergyCalculation {
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
}

export type EnergyCalculationResult =
  | { ok: true; outputs: EnergyCalculation }
  | { ok: false; error: FieldError };

export function calculateEnergy(
  inputs: EngineeringInputs,
): EnergyCalculationResult {
  const peakSunHours = estimatePeakSunHours(inputs.latitudeDeg);
  const panelKw = inputs.panelWattage / 1000;
  const recommendedPanelCount = Math.ceil(
    inputs.dailyDemandKwh /
      (peakSunHours *
        ENGINEERING_ASSUMPTIONS.solarPerformanceRatio *
        inputs.shadingFactor *
        panelKw),
  );
  const installedSolarCapacityKw = recommendedPanelCount * panelKw;
  const batteryCapacityKwh =
    (inputs.dailyDemandKwh * inputs.autonomyDays) /
    (ENGINEERING_ASSUMPTIONS.batteryUsableDepth *
      ENGINEERING_ASSUMPTIONS.batteryRoundTripEfficiency);
  const solarCoverage = assessSolarCoverage(
    inputs.dailyDemandKwh,
    recommendedPanelCount,
    inputs.panelWattage,
    peakSunHours,
    inputs.shadingFactor,
  );
  const solarInstallation = calculateSolarInstallation(
    recommendedPanelCount,
    inputs.panelWattage,
    inputs.mountingMode,
  );

  if (!solarInstallation) {
    return {
      ok: false,
      error: {
        field: 'panelWattage',
        message: 'Solar area could not be calculated.',
      },
    };
  }

  return {
    ok: true,
    outputs: {
      peakSunHours,
      recommendedPanelCount,
      installedSolarCapacityKw: round(installedSolarCapacityKw, 1),
      batteryCapacityKwh: round(batteryCapacityKwh, 1),
      nominalBatteryCapacityAh: round(
        (batteryCapacityKwh * 1000) / inputs.systemVoltageV,
        0,
      ),
      estimatedDailySolarYieldKwh:
        solarCoverage.expectedDailyGenerationKwh,
      solarDemandCovered: solarCoverage.demandCovered,
      solarGenerationMarginKwh: solarCoverage.generationMarginKwh,
      panelFaceAreaM2: solarInstallation.panelFaceAreaM2,
      pvModuleAreaM2: solarInstallation.moduleAreaM2,
      pvInstallationFootprintM2:
        solarInstallation.installationFootprintM2,
      installationFootprintFactor:
        solarInstallation.installationFootprintFactor,
    },
  };
}
