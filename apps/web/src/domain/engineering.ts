export type SoilType =
  | 'clay-rich'
  | 'sandy'
  | 'silty'
  | 'gravelly'
  | 'mixed-unknown';

export type MountingMode = 'roof' | 'ground';

export interface SoilProfile {
  value: SoilType;
  label: string;
  engineeringMeaning: string;
  stabilizerAssumption: string;
  qualityNote: string;
  compactedDensityKgM3: number;
  materialAllowanceFactor: number;
}

export const SOIL_PROFILES: Record<SoilType, SoilProfile> = {
  'clay-rich': {
    value: 'clay-rich',
    label: 'Clay-rich',
    engineeringMeaning:
      'Cohesive source soil; shrinkage, moisture sensitivity, and cracking require screening.',
    stabilizerAssumption:
      'No stabilizer quantity is designed. Compatibility trials are required.',
    qualityNote:
      'Field classification is insufficient: confirm gradation, moisture, compaction, and strength.',
    compactedDensityKgM3: 1750,
    materialAllowanceFactor: 1.12,
  },
  sandy: {
    value: 'sandy',
    label: 'Sandy',
    engineeringMeaning:
      'Granular source soil with limited cohesion; fines content and confinement are critical.',
    stabilizerAssumption:
      'No favorable cement/lime response is assumed without mix trials.',
    qualityNote:
      'Confirm particle-size distribution, fines plasticity, moisture, and compacted strength.',
    compactedDensityKgM3: 1850,
    materialAllowanceFactor: 1.1,
  },
  silty: {
    value: 'silty',
    label: 'Silty',
    engineeringMeaning:
      'Fine-grained soil that may be erosion-prone and moisture-sensitive.',
    stabilizerAssumption:
      'Stabilizer type and dosage remain undetermined pending compatibility testing.',
    qualityNote:
      'Laboratory classification and wet/dry durability testing are required.',
    compactedDensityKgM3: 1700,
    materialAllowanceFactor: 1.14,
  },
  gravelly: {
    value: 'gravelly',
    label: 'Gravelly',
    engineeringMeaning:
      'Coarse material may improve drainage but can be difficult to compact uniformly in bags.',
    stabilizerAssumption:
      'Oversize limits and binder demand are not estimated by this model.',
    qualityNote:
      'Confirm maximum particle size, gradation, bag compatibility, and achieved density.',
    compactedDensityKgM3: 1950,
    materialAllowanceFactor: 1.1,
  },
  'mixed-unknown': {
    value: 'mixed-unknown',
    label: 'Mixed / unknown',
    engineeringMeaning:
      'Unclassified source material. The result is a conservative quantity screen, not a mix design.',
    stabilizerAssumption:
      'No stabilizer system or structural suitability is assumed.',
    qualityNote:
      'Lowest confidence: classification, gradation, moisture, compaction, strength, and compatibility tests are required.',
    compactedDensityKgM3: 1900,
    materialAllowanceFactor: 1.18,
  },
};

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

export interface EngineeringInputs {
  latitudeDeg: number;
  longitudeDeg: number;
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

  return [...numericErrors, ...categoricalErrors];
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
      outputs: null,
      errors: [{ field: 'panelWattage', message: 'Solar area could not be calculated.' }],
    };
  }

  // Spherical-cap curved surface. Openings are deducted only from quantities,
  // not treated as proof that arch/ring continuity is structurally adequate.
  const grossEnvelopeAreaM2 =
    Math.PI * (inputs.domeRadiusM ** 2 + inputs.domeHeightM ** 2);
  const netEnvelopeAreaM2 = Math.max(
    grossEnvelopeAreaM2 - inputs.openingAreaM2,
    0,
  );
  const openingRatio = inputs.openingAreaM2 / grossEnvelopeAreaM2;
  const soilProfile = SOIL_PROFILES[inputs.soilType];
  const estimatedWallMaterialM3 =
    netEnvelopeAreaM2 *
    inputs.wallThicknessM *
    soilProfile.materialAllowanceFactor;
  const geometryRatio = inputs.domeHeightM / (inputs.domeRadiusM * 2);
  const structuralWarnings = [
    ...(geometryRatio < 0.55 || geometryRatio > 0.85
      ? ['Height-to-diameter ratio is outside the concept screening band.']
      : []),
    ...(openingRatio > 0.2
      ? ['Openings exceed 20% of modeled envelope area; ring and arch continuity require review.']
      : []),
    ...(inputs.soilType === 'mixed-unknown'
      ? ['Soil is unclassified; material mass and allowance are low-confidence estimates.']
      : []),
  ];

  const dailyWaterUseL =
    inputs.occupants * ENGINEERING_ASSUMPTIONS.waterUsePerPersonL;
  const designReserveL = dailyWaterUseL * inputs.storageDays;
  const recommendedTankL = Math.max(
    designReserveL,
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
      grossEnvelopeAreaM2: round(grossEnvelopeAreaM2, 1),
      netEnvelopeAreaM2: round(netEnvelopeAreaM2, 1),
      estimatedWallMaterialM3: round(estimatedWallMaterialM3, 1),
      estimatedWallMassT: round(
        (estimatedWallMaterialM3 * soilProfile.compactedDensityKgM3) / 1000,
        1,
      ),
      geometryRatio: round(geometryRatio, 2),
      openingRatio: round(openingRatio, 3),
      geometryStatus:
        structuralWarnings.length === 0 ? 'screened' : 'review',
      structuralWarnings,
      dailyWaterUseL,
      designReserveL,
      recommendedTankL,
      recommendedTankM3: round(recommendedTankL / 1000, 2),
      storageMeetsPracticalMinimum:
        designReserveL >= ENGINEERING_ASSUMPTIONS.minimumPracticalTankL,
      soilProfile,
      dataQualityStatus:
        inputs.soilType === 'mixed-unknown' ? 'limited' : 'screening',
    },
  };
}
