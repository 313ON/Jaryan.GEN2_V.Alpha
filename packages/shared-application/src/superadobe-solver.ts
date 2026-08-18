import {
  accumulatedWeightPrimitive,
  calculateSuperAdobeGeometry,
  centerOfGravityPrimitive,
  compressionCheckPrimitive,
  effectiveContactAreaPrimitive,
  evaluateValidation,
  overturningCheckPrimitive,
  rowWeightPrimitive,
  slidingCheckPrimitive,
  verticalStressPrimitive,
  type LoadCase,
  type LoadEffect,
  type PrimitiveResult,
  type SuperAdobeGeometry,
  type SuperAdobeGeometryInputs,
  type WeightedRow,
} from '@jaryan/shared-domain';
import type { TraceabilityLink } from './traceability.ts';
import { buildTraceabilityLink } from './traceability.ts';

export interface SuperAdobeSolverRequest {
  readonly projectId: string;
  readonly inputs: SuperAdobeGeometryInputs;
  readonly lateralDemandKn?: number;
  readonly overturningMomentKnM?: number;
}

export interface GravityRowLoad {
  readonly rowIndex: number;
  readonly elevationM: number;
  readonly weightKn: number;
  readonly weightUnit: string;
}

export interface GravityLoadModel {
  readonly loadCase: LoadCase;
  readonly rows: readonly GravityRowLoad[];
  readonly rowCount: number;
  readonly totalWeightKn: number;
  readonly centerOfGravityM: number;
  readonly loadEffect: LoadEffect;
}

export interface SuperAdobeSolverSummary {
  readonly totalMassT: number;
  readonly totalWeightKn: number;
  readonly centerOfGravityM: number;
  readonly baseVerticalStressKpa: number;
  readonly lateralDemandKn: number;
  readonly overturningDemandKnM: number;
}

export interface SuperAdobeSolverResult {
  readonly id: string;
  readonly projectId: string;
  readonly system: 'superadobe';
  readonly inputs: SuperAdobeGeometryInputs;
  readonly assumptions: readonly string[];
  readonly geometry: SuperAdobeGeometry;
  readonly loads: GravityLoadModel;
  readonly calculations: readonly PrimitiveResult[];
  readonly summary: SuperAdobeSolverSummary;
  readonly unverifiedCalculationIds: readonly string[];
  readonly humanReviewRequired: boolean;
  readonly status: 'SCREENED' | 'REVIEW_REQUIRED';
  readonly traceability: readonly TraceabilityLink[];
  readonly calculatedAt: string;
}

const GRAVITY_LOAD_CASE: LoadCase = {
  id: 'LC-G-001',
  name: 'Self weight (dead load)',
  type: 'G',
  description:
    'Dead load from SuperAdobe self weight computed deterministically from geometry and compacted density; combination factors require Iranian Chapter 6 (IRN-CH-06) verification.',
  status: 'ACTIVE',
};

function geometrySummaryPrimitive(
  inputs: SuperAdobeGeometryInputs,
  geometry: SuperAdobeGeometry,
): PrimitiveResult {
  const totalVolumeM3 = geometry.rows.reduce(
    (sum, row) => sum + row.rowVolumeM3,
    0,
  );
  const profileLabel =
    inputs.geometryType === 'circular'
      ? 'spherical'
      : inputs.geometryType === 'pointed'
        ? 'pointed-arc'
        : 'parabolic';
  return {
    calculationId: 'SA-GEOM-001',
    method:
      'Deterministic geometry solver — dome profile, row slicing, volume, mass, center of gravity and contact',
    formula:
      'r_i(z) dome profile; V_i = π·(r_o² − r_i²)·Δz; M = Σ ρ·V_i; z̄ = Σ M_i·z_i / Σ M_i; A_c = P·w_b',
    sourceIds: [],
    inputs: {
      innerDiameterM: { value: inputs.innerDiameterM, unit: 'm' },
      wallThicknessM: { value: inputs.wallThicknessM, unit: 'm' },
      bagWidthM: { value: inputs.bagWidthM, unit: 'm' },
      rowHeightM: { value: inputs.rowHeightM, unit: 'm' },
      domeHeightM: { value: inputs.domeHeightM, unit: 'm' },
      compactedDensityKgM3: {
        value: inputs.compactedDensityKgM3,
        unit: 'kg/m³',
      },
    },
    assumptions: [
      `Dome profile: ${inputs.geometryType} (classical ${profileLabel} geometry).`,
      'Rows are annular slices evaluated at row mid-height; wall thickness is constant over height.',
      'Compacted density is uniform over the whole dome.',
    ],
    result: { value: round3(totalVolumeM3), unit: 'm³' },
    status: 'OK',
    confidence: 'HIGH',
    validationStatus: 'ANALYTICALLY_VALIDATED',
    validationRequirements: [],
    review: evaluateValidation('HIGH', 'MODERATE', 'ANALYTICALLY_VALIDATED'),
  };
}

function inputIdsFor(calculationId: string): readonly string[] {
  switch (calculationId) {
    case 'SA-GEOM-001':
      return ['GEO-001'];
    case 'SA-ROW-WEIGHT-001':
      return ['GEO-001', 'MAT-001'];
    case 'SA-ACC-WEIGHT-001':
      return ['LC-G-001'];
    case 'SA-CG-001':
      return ['LC-G-001'];
    case 'SA-CONTACT-AREA-001':
      return ['GEO-001', 'MAT-001'];
    case 'SA-VERT-STRESS-001':
      return ['LC-G-001', 'GEO-001'];
    case 'SA-COMPRESSION-CHECK-001':
      return ['LC-G-001', 'GEO-001', 'MAT-001'];
    case 'SA-SLIDING-CHECK-001':
      return ['LC-G-001', 'DEMAND-LAT-001'];
    case 'SA-OVERTURNING-CHECK-001':
      return ['LC-G-001', 'DEMAND-OT-001'];
    default:
      return [];
  }
}

function linkFor(
  primitive: PrimitiveResult,
  inputIds: readonly string[],
): TraceabilityLink {
  return buildTraceabilityLink({
    calculationId: primitive.calculationId,
    method: primitive.method,
    formula: primitive.formula,
    sourceIds: primitive.sourceIds,
    inputIds,
    assumptions: primitive.assumptions,
    validationStatus: primitive.validationStatus,
    confidence: primitive.confidence,
    reviewRequirement: primitive.review.reviewRequirement,
    sourceRequirement:
      primitive.validationStatus === 'SOURCE_VALIDATED' ? 'REQUIRED' : 'OPTIONAL',
  });
}

export function solveSuperAdobe(
  request: SuperAdobeSolverRequest,
): SuperAdobeSolverResult | null {
  const geometryResult = calculateSuperAdobeGeometry(request.inputs);
  if (!geometryResult.ok) {
    return null;
  }
  const geometry = geometryResult.geometry;
  const inputs = request.inputs;
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();

  const geometrySummary = geometrySummaryPrimitive(inputs, geometry);

  const rowWeightCalculations: PrimitiveResult[] = [];
  const weightedRows: WeightedRow[] = [];
  for (const row of geometry.rows) {
    const weight = rowWeightPrimitive({
      volumeM3: row.rowVolumeM3,
      densityKgM3: inputs.compactedDensityKgM3,
    });
    rowWeightCalculations.push(weight);
    weightedRows.push({ weightKn: weight.result.value, elevationM: row.centerElevationM });
  }

  const accumulated = accumulatedWeightPrimitive(weightedRows);
  const cg = centerOfGravityPrimitive(weightedRows);

  const baseRow = geometry.rows[0];
  const contact = effectiveContactAreaPrimitive({
    perimeterM: baseRow.perimeterM,
    contactWidthM: inputs.bagWidthM,
  });
  const verticalStress = verticalStressPrimitive({
    forceKn: accumulated.result.value,
    areaM2: contact.result.value,
  });
  const compression = compressionCheckPrimitive({
    axialStressKpa: verticalStress.result.value,
    allowableCompressiveKpa: undefined,
  });

  const lateralDemandKn = request.lateralDemandKn ?? 0;
  const sliding = slidingCheckPrimitive({
    lateralForceKn: lateralDemandKn,
    normalForceKn: accumulated.result.value,
    frictionCoefficient: undefined,
  });

  const overturningDemandKnM =
    request.overturningMomentKnM ?? round3(lateralDemandKn * cg.result.value);
  const overturning = overturningCheckPrimitive({
    overturningMomentKnM: overturningDemandKnM,
    resistingMomentKnM: undefined,
  });

  const gravityRows = geometry.rows.map((row, index) => ({
    rowIndex: row.rowIndex,
    elevationM: row.centerElevationM,
    weightKn: rowWeightCalculations[index].result.value,
    weightUnit: 'kN',
  }));

  const loads: GravityLoadModel = {
    loadCase: GRAVITY_LOAD_CASE,
    rows: gravityRows,
    rowCount: gravityRows.length,
    totalWeightKn: accumulated.result.value,
    centerOfGravityM: cg.result.value,
    loadEffect: {
      loadCaseId: GRAVITY_LOAD_CASE.id,
      axialForceKn: accumulated.result.value,
      shearForceKn: 0,
      momentKnM: 0,
      torsionalMomentKnM: 0,
      bearingPressureKpa: 0,
      slidingDemandKn: 0,
      overturningDemandKnM: 0,
      upliftKn: 0,
    },
  };

  const calculations: PrimitiveResult[] = [
    geometrySummary,
    ...rowWeightCalculations,
    accumulated,
    cg,
    contact,
    verticalStress,
    compression,
    sliding,
    overturning,
  ];

  const unverifiedCalculationIds = [
    ...new Set(
      calculations
        .filter(
          (calculation) =>
            calculation.status === 'UNVERIFIED' ||
            calculation.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED',
        )
        .map((calculation) => calculation.calculationId),
    ),
  ];

  const humanReviewRequired = calculations.some(
    (calculation) =>
      calculation.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED',
  );

  const traceability = calculations.map((calculation) =>
    linkFor(calculation, inputIdsFor(calculation.calculationId)),
  );

  const summary: SuperAdobeSolverSummary = {
    totalMassT: geometry.totalMassT,
    totalWeightKn: accumulated.result.value,
    centerOfGravityM: cg.result.value,
    baseVerticalStressKpa: verticalStress.result.value,
    lateralDemandKn,
    overturningDemandKnM,
  };

  return {
    id,
    projectId: request.projectId,
    system: 'superadobe',
    inputs,
    assumptions: [
      'Lateral demand, when not supplied explicitly, is applied at the structure center of gravity (overturning demand = H × z̄).',
      'All SuperAdobe capacity assumptions remain UNVERIFIED; this pipeline does not claim final structural safety.',
    ],
    geometry,
    loads,
    calculations,
    summary,
    unverifiedCalculationIds,
    humanReviewRequired,
    status: humanReviewRequired ? 'REVIEW_REQUIRED' : 'SCREENED',
    traceability,
    calculatedAt,
  };
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}