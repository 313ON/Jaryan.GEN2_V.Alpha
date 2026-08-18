import type { ConfidenceLevel } from './validation.ts';
import { evaluateValidation } from './validation.ts';

export type SeismicZone =
  | 'ZONE_1'
  | 'ZONE_2'
  | 'ZONE_3'
  | 'ZONE_4'
  | 'UNKNOWN';

export type SoilSiteClass =
  | 'TYPE_I'
  | 'TYPE_II'
  | 'TYPE_III'
  | 'TYPE_IV'
  | 'UNKNOWN';

export type ImportanceCategory =
  | 'IMPORTANCE_I'
  | 'IMPORTANCE_II'
  | 'IMPORTANCE_III'
  | 'IMPORTANCE_IV'
  | 'UNKNOWN';

export interface SeismicSite {
  readonly coordinates?: { readonly latitudeDeg: number; readonly longitudeDeg: number };
  readonly zone: SeismicZone;
  readonly siteClass: SoilSiteClass;
  readonly importance: ImportanceCategory;
}

export interface SpectrumParameter {
  readonly value: number;
  readonly unit: string;
  readonly sourceId: string;
  readonly status: 'VERIFIED' | 'UNVERIFIED';
}

export interface SeismicDesignSpectrum {
  readonly zoneDesignAcceleration?: SpectrumParameter;
  readonly siteSoilFactor?: SpectrumParameter;
  readonly importanceFactor?: SpectrumParameter;
  readonly behaviorFactor?: SpectrumParameter;
}

export interface SeismicDemand {
  readonly method: string;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly designAccelerationG?: number;
  readonly baseShearKn?: number;
  readonly responseCoefficientCs?: number;
  readonly spectrumComplete: boolean;
  readonly status: 'COMPUTED' | 'UNVERIFIED';
  readonly confidence: ConfidenceLevel;
  readonly validationRequirements: readonly string[];
}

export interface SeismicAssessmentStep {
  readonly step:
    | 'coordinates'
    | 'zone'
    | 'site_class'
    | 'importance'
    | 'spectrum'
    | 'demand'
    | 'superadobe_verification';
  readonly status: 'KNOWN' | 'UNKNOWN' | 'COMPUTED' | 'UNVERIFIED';
  readonly note: string;
}

export interface SeismicAssessment {
  readonly site: SeismicSite;
  readonly steps: readonly SeismicAssessmentStep[];
  readonly demand: SeismicDemand;
  readonly humanReviewRequired: boolean;
}

export function assessSeismicSite(
  site: SeismicSite,
  spectrum: SeismicDesignSpectrum | undefined,
  structuralWeightKn: number | undefined,
): SeismicAssessment {
  const steps: SeismicAssessmentStep[] = [
    {
      step: 'coordinates',
      status: site.coordinates ? 'KNOWN' : 'UNKNOWN',
      note: site.coordinates
        ? `${site.coordinates.latitudeDeg.toFixed(4)}, ${site.coordinates.longitudeDeg.toFixed(4)}`
        : 'Coordinates missing; zone assignment cannot be confirmed.',
    },
    {
      step: 'zone',
      status: site.zone === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN',
      note: `Seismic zone ${site.zone}; map value requires Iranian Standard 2800 source.`,
    },
    {
      step: 'site_class',
      status: site.siteClass === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN',
      note: `Soil/site class ${site.siteClass}; site characterization required.`,
    },
    {
      step: 'importance',
      status: site.importance === 'UNKNOWN' ? 'UNKNOWN' : 'KNOWN',
      note: `Importance category ${site.importance}.`,
    },
  ];

  const spectrumComplete =
    spectrum !== undefined &&
    spectrum.zoneDesignAcceleration !== undefined &&
    spectrum.siteSoilFactor !== undefined &&
    spectrum.importanceFactor !== undefined &&
    spectrum.behaviorFactor !== undefined;

  steps.push({
    step: 'spectrum',
    status: spectrumComplete ? 'COMPUTED' : 'UNKNOWN',
    note: spectrumComplete
      ? 'Design spectrum parameters supplied.'
      : 'Design spectrum incomplete; no seismic coefficient is hardcoded. Parameters must come from Iranian Standard 2800 (edition 4).',
  });

  const demand = deriveSeismicDemand(spectrum, structuralWeightKn);

  steps.push({
    step: 'demand',
    status: demand.status === 'COMPUTED' ? 'COMPUTED' : 'UNVERIFIED',
    note:
      demand.status === 'COMPUTED'
        ? `Base shear ${demand.baseShearKn} kN computed from supplied spectrum.`
        : 'Seismic demand cannot be computed without a complete sourced spectrum.',
  });

  steps.push({
    step: 'superadobe_verification',
    status: 'UNVERIFIED',
    note: 'SuperAdobe seismic verification requires Iranian Standard 2800 plus seismic response validation; no default applies.',
  });

  const humanReviewRequired =
    demand.status === 'UNVERIFIED' ||
    site.zone === 'UNKNOWN' ||
    site.siteClass === 'UNKNOWN' ||
    site.importance === 'UNKNOWN';

  return {
    site,
    steps,
    demand,
    humanReviewRequired,
  };
}

export function deriveSeismicDemand(
  spectrum: SeismicDesignSpectrum | undefined,
  structuralWeightKn: number | undefined,
): SeismicDemand {
  const spectrumParameters = spectrum
    ? [
        spectrum.zoneDesignAcceleration,
        spectrum.siteSoilFactor,
        spectrum.importanceFactor,
        spectrum.behaviorFactor,
      ]
    : [];

  const missing =
    spectrum === undefined ||
    spectrumParameters.length < 4 ||
    spectrumParameters.some((parameter) => parameter === undefined);
  const unverifiedSource =
    !missing &&
    spectrumParameters.some((parameter) => parameter!.status !== 'VERIFIED');

  if (missing || unverifiedSource || structuralWeightKn === undefined) {
    return {
      method: 'Pseudo-static seismic base shear',
      formula: 'Cs = A·I·N / B; V = Cs·W',
      sourceIds: [],
      spectrumComplete: false,
      status: 'UNVERIFIED',
      confidence: 'UNKNOWN',
      validationRequirements: [
        'Supply zone design acceleration, soil factor, importance factor, behavior factor, and structural weight from Iranian Standard 2800 (edition 4) or a verified site study.',
        'Every spectrum parameter must carry status VERIFIED from a sourced reference; UNVERIFIED parameters are never used as coefficients.',
      ],
    };
  }

  const a = spectrum!.zoneDesignAcceleration!.value;
  const i = spectrum!.importanceFactor!.value;
  const n = spectrum!.siteSoilFactor!.value;
  const b = spectrum!.behaviorFactor!.value;
  const cs = (a * i * n) / b;
  const baseShearKn = cs * structuralWeightKn;

  return {
    method: 'Pseudo-static seismic base shear',
    formula: 'Cs = A·I·N / B; V = Cs·W',
    sourceIds: ['IRN-STD-2800'],
    designAccelerationG: a,
    responseCoefficientCs: round3(cs),
    baseShearKn: round2(baseShearKn),
    spectrumComplete: true,
    status: 'COMPUTED',
    confidence: 'MEDIUM',
    validationRequirements: [
      'Response coefficient formula must be verified against the exact Iranian Standard 2800 expression.',
    ],
  };
}

export function seismicDemandReview(demand: SeismicDemand) {
  return evaluateValidation(
    demand.confidence,
    'HIGH',
    demand.status === 'COMPUTED' ? 'ANALYTICALLY_VALIDATED' : 'UNKNOWN',
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}