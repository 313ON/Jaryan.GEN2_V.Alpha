import type { SoilType } from './engineering.ts';

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

export interface StructuralCalculation {
  grossEnvelopeAreaM2: number;
  netEnvelopeAreaM2: number;
  estimatedWallMaterialM3: number;
  estimatedWallMassT: number;
  geometryRatio: number;
  openingRatio: number;
  geometryStatus: 'screened' | 'review';
  structuralWarnings: string[];
  soilProfile: SoilProfile;
}

export function calculateStructural(inputs: {
  domeRadiusM: number;
  domeHeightM: number;
  wallThicknessM: number;
  openingAreaM2: number;
  soilType: SoilType;
}): StructuralCalculation {
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

  return {
    grossEnvelopeAreaM2,
    netEnvelopeAreaM2,
    estimatedWallMaterialM3,
    estimatedWallMassT:
      (estimatedWallMaterialM3 * soilProfile.compactedDensityKgM3) / 1000,
    geometryRatio,
    openingRatio,
    geometryStatus:
      structuralWarnings.length === 0 ? 'screened' : 'review',
    structuralWarnings,
    soilProfile,
  };
}
