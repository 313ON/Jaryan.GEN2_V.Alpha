import type {
  ConfidenceLevel,
  ValidationReview,
  ValidationStatus,
} from './validation.ts';
import {
  evaluateValidation,
  isHumanReviewRequired,
} from './validation.ts';

export type PrimitiveStatus =
  | 'OK'
  | 'FAIL'
  | 'UNVERIFIED'
  | 'NOT_APPLICABLE';

export interface PrimitiveInput {
  readonly value: number;
  readonly unit: string;
}

export interface PrimitiveResult {
  readonly calculationId: string;
  readonly method: string;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly inputs: Record<string, PrimitiveInput>;
  readonly result: { readonly value: number; readonly unit: string };
  readonly capacity?: { readonly value: number; readonly unit: string };
  readonly utilization?: number;
  readonly status: PrimitiveStatus;
  readonly confidence: ConfidenceLevel;
  readonly validationStatus: ValidationStatus;
  readonly validationRequirements: readonly string[];
  readonly review: ValidationReview;
}

export function isUnverified(result: PrimitiveResult): boolean {
  return result.status === 'UNVERIFIED' || isHumanReviewRequired(result.review);
}

export interface WeightedRow {
  readonly weightKn: number;
  readonly elevationM: number;
}

const GRAVITY_M_S2 = 9.81;

export function rowWeightPrimitive(inputs: {
  readonly volumeM3: number;
  readonly densityKgM3: number;
}): PrimitiveResult {
  const weightKn = (inputs.volumeM3 * inputs.densityKgM3 * GRAVITY_M_S2) / 1000;
  return {
    calculationId: 'SA-ROW-WEIGHT-001',
    method: 'Statics — weight from volume and density',
    formula: 'W = ρ · V · g',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      volumeM3: { value: inputs.volumeM3, unit: 'm³' },
      densityKgM3: { value: inputs.densityKgM3, unit: 'kg/m³' },
      gravity: { value: GRAVITY_M_S2, unit: 'm/s²' },
    },
    result: { value: round3(weightKn), unit: 'kN' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };
}

export function accumulatedWeightPrimitive(rows: readonly WeightedRow[]): PrimitiveResult {
  const totalKn = rows.reduce((sum, row) => sum + row.weightKn, 0);
  return {
    calculationId: 'SA-ACC-WEIGHT-001',
    method: 'Statics — sum of row weights',
    formula: 'W_total = Σ W_i',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      rowCount: { value: rows.length, unit: '—' },
    },
    result: { value: round3(totalKn), unit: 'kN' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };
}

export function centerOfGravityPrimitive(rows: readonly WeightedRow[]): PrimitiveResult {
  const totalKn = rows.reduce((sum, row) => sum + row.weightKn, 0);
  const moment = rows.reduce(
    (sum, row) => sum + row.weightKn * row.elevationM,
    0,
  );
  const cgM = totalKn > 0 ? moment / totalKn : 0;
  return {
    calculationId: 'SA-CG-001',
    method: 'Statics — weighted moment balance',
    formula: 'z̄ = Σ(W_i · z_i) / Σ W_i',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      totalWeightKn: { value: round3(totalKn), unit: 'kN' },
    },
    result: { value: round4(cgM), unit: 'm' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };
}

export function kernLimitsPrimitive(inputs: {
  readonly section: 'rectangle' | 'circle';
  readonly dimensionM: number;
}): PrimitiveResult {
  const eccentricityM =
    inputs.section === 'rectangle'
      ? inputs.dimensionM / 6
      : inputs.dimensionM / 8;
  return {
    calculationId: 'SA-KERN-001',
    method:
      'Mechanics — kern point of a section (middle-third for rectangle, middle-eighth for solid circle)',
    formula:
      inputs.section === 'rectangle'
        ? 'e = d / 6'
        : 'e = d / 8',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      dimensionM: { value: inputs.dimensionM, unit: 'm' },
    },
    result: { value: round4(eccentricityM), unit: 'm' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };
}

export function effectiveContactAreaPrimitive(inputs: {
  readonly perimeterM: number;
  readonly contactWidthM: number;
}): PrimitiveResult {
  const areaM2 = Math.max(0, inputs.perimeterM * inputs.contactWidthM);
  return {
    calculationId: 'SA-CONTACT-AREA-001',
    method: 'Model — contact band as perimeter × bag width',
    formula: 'A_c = P · w_contact',
    sourceIds: [],
    inputs: {
      perimeterM: { value: inputs.perimeterM, unit: 'm' },
      contactWidthM: { value: inputs.contactWidthM, unit: 'm' },
    },
    result: { value: round4(areaM2), unit: 'm²' },
    status: 'UNVERIFIED',
    confidence: 'LOW',
    validationStatus: 'UNKNOWN',
    validationRequirements: [
      'Verify effective contact width against Canadell 2016 methodology and assembly tests (SA-CAN-2016).',
    ],
    review: evaluateValidation('LOW', 'HIGH', 'UNKNOWN'),
  };
}

export function verticalStressPrimitive(inputs: {
  readonly forceKn: number;
  readonly areaM2: number;
}): PrimitiveResult {
  const stressKpa =
    inputs.areaM2 > 0 ? (inputs.forceKn * 1000) / inputs.areaM2 / 1000 : 0;
  return {
    calculationId: 'SA-VERT-STRESS-001',
    method: 'Statics — normal stress on a horizontal area',
    formula: 'σ = N / A',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      forceKn: { value: inputs.forceKn, unit: 'kN' },
      areaM2: { value: inputs.areaM2, unit: 'm²' },
    },
    result: { value: round2(stressKpa), unit: 'kPa' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'SOURCE_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'SOURCE_VALIDATED'),
  };
}

export function membraneForcesPrimitive(inputs: {
  readonly sphereRadiusM: number;
  readonly phiRad: number;
  readonly surfaceLoadPa: number;
  readonly thicknessM: number;
}): PrimitiveResult {
  const phi = inputs.phiRad;
  const r = inputs.sphereRadiusM;
  const w = inputs.surfaceLoadPa;
  const denominator = 1 + Math.cos(phi);
  const meridionalNPerM = denominator > 0 ? -(w * r) / denominator : 0;
  const hoopNPerM =
    denominator > 0 ? w * r * (Math.cos(phi) - 1 / denominator) : 0;
  const meridionalStressPa =
    inputs.thicknessM > 0 ? meridionalNPerM / inputs.thicknessM : 0;
  const hoopStressPa = inputs.thicknessM > 0 ? hoopNPerM / inputs.thicknessM : 0;
  return {
    calculationId: 'SA-MEMBRANE-001',
    method:
      'Thin-shell membrane theory for a spherical dome under uniform vertical load',
    formula:
      'N_φ = −w·R/(1+cosφ); N_θ = w·R·(cosφ − 1/(1+cosφ)); σ = N / t',
    sourceIds: ['TIMO-SHELLS-1959'],
    inputs: {
      sphereRadiusM: { value: inputs.sphereRadiusM, unit: 'm' },
      phiRad: { value: inputs.phiRad, unit: 'rad' },
      surfaceLoadPa: { value: inputs.surfaceLoadPa, unit: 'Pa' },
      thicknessM: { value: inputs.thicknessM, unit: 'm' },
    },
    result: {
      value: round2(meridionalStressPa / 1000),
      unit: 'kPa',
    },
    capacity: {
      value: round2(hoopStressPa / 1000),
      unit: 'kPa',
    },
    status: 'UNVERIFIED',
    confidence: 'LOW',
    validationStatus: 'UNKNOWN',
    validationRequirements: [
      'Membrane theory assumes a thin continuous shell; applicability to the thick SuperAdobe layered assembly is unverified.',
      'Verify against Canadell 2016 simplified method (SA-CAN-2016).',
    ],
    review: evaluateValidation('LOW', 'HIGH', 'UNKNOWN'),
  };
}

export function compressionCheckPrimitive(inputs: {
  readonly axialStressKpa: number;
  readonly allowableCompressiveKpa: number | undefined;
}): PrimitiveResult {
  const utilization =
    inputs.allowableCompressiveKpa === undefined ||
    inputs.allowableCompressiveKpa <= 0
      ? undefined
      : inputs.axialStressKpa / inputs.allowableCompressiveKpa;
  return {
    calculationId: 'SA-COMPRESSION-CHECK-001',
    method: 'Capacity check — demand over allowable capacity',
    formula: 'U = σ_demand / σ_allowable',
    sourceIds: [],
    inputs: {
      axialStressKpa: { value: inputs.axialStressKpa, unit: 'kPa' },
      allowableCompressiveKpa:
        inputs.allowableCompressiveKpa === undefined
          ? { value: Number.NaN, unit: 'kPa' }
          : { value: inputs.allowableCompressiveKpa, unit: 'kPa' },
    },
    result: { value: round3(inputs.axialStressKpa), unit: 'kPa' },
    ...(utilization === undefined
      ? {}
      : { capacity: { value: round2(inputs.allowableCompressiveKpa ?? 0), unit: 'kPa' }, utilization: round3(utilization) }),
    status:
      utilization === undefined ? 'UNVERIFIED' : utilization <= 1 ? 'OK' : 'FAIL',
    confidence: utilization === undefined ? 'UNKNOWN' : 'MEDIUM',
    validationStatus: utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    validationRequirements:
      utilization === undefined
        ? [
            'Allowable compressive capacity of the stabilized earthbag assembly is required (lab or evaluated report, e.g., ICC-ES ESR-4126).',
          ]
        : [],
    review: evaluateValidation(
      utilization === undefined ? 'UNKNOWN' : 'MEDIUM',
      'HIGH',
      utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    ),
  };
}

export function shearCheckPrimitive(inputs: {
  readonly shearStressKpa: number;
  readonly allowableShearKpa: number | undefined;
}): PrimitiveResult {
  const utilization =
    inputs.allowableShearKpa === undefined || inputs.allowableShearKpa <= 0
      ? undefined
      : inputs.shearStressKpa / inputs.allowableShearKpa;
  return {
    calculationId: 'SA-SHEAR-CHECK-001',
    method: 'Capacity check — shear demand over allowable capacity',
    formula: 'U = τ_demand / τ_allowable',
    sourceIds: [],
    inputs: {
      shearStressKpa: { value: inputs.shearStressKpa, unit: 'kPa' },
      allowableShearKpa:
        inputs.allowableShearKpa === undefined
          ? { value: Number.NaN, unit: 'kPa' }
          : { value: inputs.allowableShearKpa, unit: 'kPa' },
    },
    result: { value: round3(inputs.shearStressKpa), unit: 'kPa' },
    ...(utilization === undefined
      ? {}
      : { capacity: { value: round2(inputs.allowableShearKpa ?? 0), unit: 'kPa' }, utilization: round3(utilization) }),
    status:
      utilization === undefined ? 'UNVERIFIED' : utilization <= 1 ? 'OK' : 'FAIL',
    confidence: utilization === undefined ? 'UNKNOWN' : 'MEDIUM',
    validationStatus: utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    validationRequirements:
      utilization === undefined
        ? [
            'Allowable joint shear capacity of the bag/soil/wire interface is required (interface tests or evaluated report).',
          ]
        : [],
    review: evaluateValidation(
      utilization === undefined ? 'UNKNOWN' : 'MEDIUM',
      'HIGH',
      utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    ),
  };
}

export function slidingCheckPrimitive(inputs: {
  readonly lateralForceKn: number;
  readonly normalForceKn: number;
  readonly frictionCoefficient: number | undefined;
}): PrimitiveResult {
  const capacityKn =
    inputs.frictionCoefficient === undefined
      ? undefined
      : inputs.normalForceKn * inputs.frictionCoefficient;
  const utilization =
    capacityKn === undefined || capacityKn <= 0
      ? undefined
      : inputs.lateralForceKn / capacityKn;
  return {
    calculationId: 'SA-SLIDING-CHECK-001',
    method: 'Friction equilibrium — sliding demand over frictional capacity',
    formula: 'F_capacity = μ · N; U = H / (μ · N)',
    sourceIds: [],
    inputs: {
      lateralForceKn: { value: inputs.lateralForceKn, unit: 'kN' },
      normalForceKn: { value: inputs.normalForceKn, unit: 'kN' },
      frictionCoefficient:
        inputs.frictionCoefficient === undefined
          ? { value: Number.NaN, unit: '—' }
          : { value: inputs.frictionCoefficient, unit: '—' },
    },
    result: { value: round3(inputs.lateralForceKn), unit: 'kN' },
    ...(capacityKn === undefined
      ? {}
      : { capacity: { value: round2(capacityKn), unit: 'kN' }, utilization: round3(utilization!) }),
    status:
      capacityKn === undefined ? 'UNVERIFIED' : utilization! <= 1 ? 'OK' : 'FAIL',
    confidence: capacityKn === undefined ? 'UNKNOWN' : 'LOW',
    validationStatus: capacityKn === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    validationRequirements:
      capacityKn === undefined
        ? [
            'Bag-to-bag friction coefficient for the specific soil/wire assembly is required (test or evaluated report).',
          ]
        : [],
    review: evaluateValidation(
      capacityKn === undefined ? 'UNKNOWN' : 'LOW',
      'HIGH',
      capacityKn === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    ),
  };
}

export function overturningCheckPrimitive(inputs: {
  readonly overturningMomentKnM: number;
  readonly resistingMomentKnM: number | undefined;
}): PrimitiveResult {
  const utilization =
    inputs.resistingMomentKnM === undefined || inputs.resistingMomentKnM <= 0
      ? undefined
      : inputs.overturningMomentKnM / inputs.resistingMomentKnM;
  return {
    calculationId: 'SA-OVERTURNING-CHECK-001',
    method: 'Moment equilibrium — overturning demand over resisting capacity',
    formula: 'M_resist = W · e_resist; U = M_OT / M_resist',
    sourceIds: [],
    inputs: {
      overturningMomentKnM: { value: inputs.overturningMomentKnM, unit: 'kN·m' },
      resistingMomentKnM:
        inputs.resistingMomentKnM === undefined
          ? { value: Number.NaN, unit: 'kN·m' }
          : { value: inputs.resistingMomentKnM, unit: 'kN·m' },
    },
    result: { value: round3(inputs.overturningMomentKnM), unit: 'kN·m' },
    ...(utilization === undefined
      ? {}
      : { capacity: { value: round2(inputs.resistingMomentKnM ?? 0), unit: 'kN·m' }, utilization: round3(utilization) }),
    status:
      utilization === undefined ? 'UNVERIFIED' : utilization <= 1 ? 'OK' : 'FAIL',
    confidence: utilization === undefined ? 'UNKNOWN' : 'LOW',
    validationStatus: utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    validationRequirements:
      utilization === undefined
        ? [
            'Resisting moment requires structural weight and geometry (W · e_resist) plus any base restraint; verify for the SuperAdobe assembly.',
          ]
        : [],
    review: evaluateValidation(
      utilization === undefined ? 'UNKNOWN' : 'LOW',
      'HIGH',
      utilization === undefined ? 'UNKNOWN' : 'ANALYTICALLY_VALIDATED',
    ),
  };
}

export function rolloverCheckPrimitive(inputs: {
  readonly stabilizingMomentKnM: number;
  readonly destabilizingMomentKnM: number | undefined;
}): PrimitiveResult {
  const utilization =
    inputs.destabilizingMomentKnM === undefined ||
    inputs.destabilizingMomentKnM <= 0
      ? undefined
      : inputs.destabilizingMomentKnM / inputs.stabilizingMomentKnM;
  return {
    calculationId: 'SA-ROLLOVER-CHECK-001',
    method: 'Local course stability — moment balance about the outer course edge',
    formula: 'U = M_destabilizing / M_stabilizing',
    sourceIds: [],
    inputs: {
      stabilizingMomentKnM: { value: inputs.stabilizingMomentKnM, unit: 'kN·m' },
      destabilizingMomentKnM:
        inputs.destabilizingMomentKnM === undefined
          ? { value: Number.NaN, unit: 'kN·m' }
          : { value: inputs.destabilizingMomentKnM, unit: 'kN·m' },
    },
    result: { value: round3(inputs.stabilizingMomentKnM), unit: 'kN·m' },
    ...(utilization === undefined
      ? {}
      : { capacity: { value: round2(inputs.stabilizingMomentKnM), unit: 'kN·m' }, utilization: round3(utilization) }),
    status:
      utilization === undefined ? 'UNVERIFIED' : utilization <= 1 ? 'OK' : 'FAIL',
    confidence: 'UNKNOWN',
    validationStatus: 'UNKNOWN',
    validationRequirements: [
      'Local rollover methodology for SuperAdobe courses must be verified against Canadell 2016 (SA-CAN-2016).',
    ],
    review: evaluateValidation('UNKNOWN', 'HIGH', 'UNKNOWN'),
  };
}

export function localStabilityCheckPrimitive(): PrimitiveResult {
  return {
    calculationId: 'SA-LOCAL-STABILITY-001',
    method: 'Local stability — framework pending source-backed methodology',
    formula: 'Not specified',
    sourceIds: [],
    inputs: {},
    result: { value: Number.NaN, unit: '—' },
    status: 'UNVERIFIED',
    confidence: 'UNKNOWN',
    validationStatus: 'UNKNOWN',
    validationRequirements: [
      'Local stability method must be verified against Canadell 2016 (SA-CAN-2016) and FEM calibration.',
    ],
    review: evaluateValidation('UNKNOWN', 'HIGH', 'UNKNOWN'),
  };
}

export function globalStabilityCheckPrimitive(): PrimitiveResult {
  return {
    calculationId: 'SA-GLOBAL-STABILITY-001',
    method: 'Global stability — framework pending source-backed methodology',
    formula: 'Not specified',
    sourceIds: [],
    inputs: {},
    result: { value: Number.NaN, unit: '—' },
    status: 'UNVERIFIED',
    confidence: 'UNKNOWN',
    validationStatus: 'UNKNOWN',
    validationRequirements: [
      'Global stability method must be verified against Canadell 2016 (SA-CAN-2016) and FEM calibration.',
    ],
    review: evaluateValidation('UNKNOWN', 'HIGH', 'UNKNOWN'),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}