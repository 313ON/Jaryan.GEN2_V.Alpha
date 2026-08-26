import {
  accumulatedWeightPrimitive,
  calculateSuperAdobeGeometry,
  centerOfGravityPrimitive,
  compressionCheckPrimitive,
  effectiveContactAreaPrimitive,
  globalStabilityCheckPrimitive,
  localStabilityCheckPrimitive,
  membraneForcesPrimitive,
  overturningCheckPrimitive,
  rowWeightPrimitive,
  slidingCheckPrimitive,
  verticalStressPrimitive,
  type PrimitiveResult,
  type SuperAdobeGeometryInputs,
} from '@jaryan/shared-domain';
import type { TraceabilityLink } from './traceability.ts';
import { buildTraceabilityLink } from './traceability.ts';
import {
  captureDurableSnapshotsFromPrimitiveExecution,
} from './durable-calculation-snapshot.ts';
import type { DurableCalculationSnapshotStore } from '@jaryan/shared-infrastructure';

export interface SuperAdobeVerificationRequest {
  readonly projectId: string;
  readonly inputs: SuperAdobeGeometryInputs;
  readonly lateralSeismicDemandKn?: number;
  readonly overturningMomentKnM?: number;
  readonly durableSnapshotStore?: DurableCalculationSnapshotStore;
}

export interface SuperAdobeVerificationResult {
  readonly id: string;
  readonly projectId: string;
  readonly system: 'superadobe';
  readonly inputs: SuperAdobeGeometryInputs;
  readonly primitives: readonly PrimitiveResult[];
  readonly unverifiedCalculationIds: readonly string[];
  readonly humanReviewRequired: boolean;
  readonly traceability: readonly TraceabilityLink[];
  readonly status: 'SCREENED' | 'FAILED' | 'REVIEW_REQUIRED';
  readonly calculatedAt: string;
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

export function verifySuperAdobeStructure(
  request: SuperAdobeVerificationRequest & {
    readonly durableSnapshotStore: DurableCalculationSnapshotStore;
  },
): Promise<SuperAdobeVerificationResult | null>;
export function verifySuperAdobeStructure(
  request: SuperAdobeVerificationRequest,
): SuperAdobeVerificationResult | null;
export function verifySuperAdobeStructure(
  request: SuperAdobeVerificationRequest,
): Promise<SuperAdobeVerificationResult | null> | SuperAdobeVerificationResult | null {
  const geometryResult = calculateSuperAdobeGeometry(request.inputs);
  if (!geometryResult.ok) {
    return null;
  }
  const geometry = geometryResult.geometry;
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();

  const rows = geometry.rows.map((row) => ({
    weightKn: row.rowMassT * 9.81,
    elevationM: row.centerElevationM,
  }));
  const baseRow = geometry.rows[0];

  const weight = rowWeightPrimitive({
    volumeM3: baseRow.rowVolumeM3,
    densityKgM3: geometry.inputs.compactedDensityKgM3,
  });
  const accumulated = accumulatedWeightPrimitive(rows);
  const cg = centerOfGravityPrimitive(rows);
  const contact = effectiveContactAreaPrimitive({
    perimeterM: baseRow.perimeterM,
    contactWidthM: geometry.inputs.bagWidthM,
  });
  const verticalStress = verticalStressPrimitive({
    forceKn: accumulated.result.value,
    areaM2: contact.result.value,
  });
  const compression = compressionCheckPrimitive({
    axialStressKpa: verticalStress.result.value,
    allowableCompressiveKpa: undefined,
  });
  const sliding = slidingCheckPrimitive({
    lateralForceKn: request.lateralSeismicDemandKn ?? 0,
    normalForceKn: accumulated.result.value,
    frictionCoefficient: undefined,
  });
  const overturning = overturningCheckPrimitive({
    overturningMomentKnM: request.overturningMomentKnM ?? 0,
    resistingMomentKnM: undefined,
  });
  const localStability = localStabilityCheckPrimitive();
  const globalStability = globalStabilityCheckPrimitive();

  const primitives: PrimitiveResult[] = [
    weight,
    accumulated,
    cg,
    contact,
    verticalStress,
    compression,
    sliding,
    overturning,
    localStability,
    globalStability,
  ];

  if (
    geometry.profileParameters.profile === 'circular' &&
    verticalStress.result.value > 0
  ) {
    const phiBaseRad = Math.asin(
      Math.min(
        1,
        geometry.inputs.innerDiameterM / 2 /
          geometry.profileParameters.sphereRadiusM,
      ),
    );
    primitives.push(
      membraneForcesPrimitive({
        sphereRadiusM: geometry.profileParameters.sphereRadiusM,
        phiRad: phiBaseRad,
        surfaceLoadPa: verticalStress.result.value * 1000,
        thicknessM: geometry.inputs.wallThicknessM,
      }),
    );
  }

  const unverifiedCalculationIds = primitives
    .filter(
      (primitive) =>
        primitive.status === 'UNVERIFIED' ||
        primitive.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED',
    )
    .map((primitive) => primitive.calculationId);

  const humanReviewRequired = primitives.some(
    (primitive) =>
      primitive.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED',
  );
  const anyFailed = primitives.some((primitive) => primitive.status === 'FAIL');

  const traceability = primitives.map((primitive) =>
    linkFor(primitive, ['GEO-001', 'MAT-001', 'LC-001']),
  );

  const result: SuperAdobeVerificationResult = {
    id,
    projectId: request.projectId,
    system: 'superadobe',
    inputs: request.inputs,
    primitives,
    unverifiedCalculationIds: [...new Set(unverifiedCalculationIds)],
    humanReviewRequired,
    traceability,
    status: anyFailed ? 'FAILED' : humanReviewRequired ? 'REVIEW_REQUIRED' : 'SCREENED',
    calculatedAt,
  };
  if (request.durableSnapshotStore === undefined) return result;
  return captureDurableSnapshotsFromPrimitiveExecution(
    result.primitives.filter((primitive) => Object.keys(primitive.inputs).length > 0),
    {
      store: request.durableSnapshotStore,
      projectId: result.projectId,
      executionReference: result.id,
      snapshotIdPrefix: result.id,
      projectContext: { projectId: result.projectId },
      chronology: { calculatedAt: result.calculatedAt },
    },
  ).then(() => result);
}
