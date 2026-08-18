import {
  assessSiteIntelligence,
  type EngineeringMaterial,
  type PrimitiveResult,
  type SiteIntelligence,
  type SiteIntelligenceAssessment,
  type SuperAdobeGeometry,
  type SuperAdobeGeometryInputs,
} from '@jaryan/shared-domain';
import type { TraceabilityLink } from './traceability.ts';
import {
  solveSuperAdobe,
  type GravityLoadModel,
  type SuperAdobeSolverRequest,
  type SuperAdobeSolverSummary,
} from './superadobe-solver.ts';

export interface SuperAdobeScenarioSite {
  readonly latitudeDeg?: number;
  readonly longitudeDeg?: number;
  readonly siteIntelligence?: SiteIntelligence;
}

export interface SuperAdobeScenarioMaterial {
  readonly soil?: EngineeringMaterial;
  readonly bag?: EngineeringMaterial;
  readonly wire?: EngineeringMaterial;
  readonly frictionCoefficient?: number;
}

export interface SuperAdobeScenarioRequest {
  readonly projectId: string;
  readonly site: SuperAdobeScenarioSite;
  readonly structure: SuperAdobeGeometryInputs;
  readonly material: SuperAdobeScenarioMaterial;
  readonly lateralDemandKn?: number;
  readonly overturningMomentKnM?: number;
}

export interface SuperAdobeScenario {
  readonly id: string;
  readonly projectId: string;
  readonly system: 'superadobe';
  readonly site: {
    readonly assessment?: SiteIntelligenceAssessment;
    readonly statement: string;
  };
  readonly structure: SuperAdobeGeometry;
  readonly material: SuperAdobeScenarioMaterial;
  readonly loads: GravityLoadModel;
  readonly calculations: readonly PrimitiveResult[];
  readonly results: SuperAdobeSolverSummary;
  readonly validation: {
    readonly humanReviewRequired: boolean;
    readonly unverifiedCalculationIds: readonly string[];
    readonly status: 'SCREENED' | 'REVIEW_REQUIRED';
    readonly requirements: readonly string[];
  };
  readonly traceability: readonly TraceabilityLink[];
  readonly calculatedAt: string;
}

export function buildSuperAdobeScenario(
  request: SuperAdobeScenarioRequest,
): SuperAdobeScenario | null {
  const solverRequest: SuperAdobeSolverRequest = {
    projectId: request.projectId,
    inputs: request.structure,
    ...(request.lateralDemandKn === undefined
      ? {}
      : { lateralDemandKn: request.lateralDemandKn }),
    ...(request.overturningMomentKnM === undefined
      ? {}
      : { overturningMomentKnM: request.overturningMomentKnM }),
  };
  const solved = solveSuperAdobe(solverRequest);
  if (!solved) {
    return null;
  }

  const assessment =
    request.site.siteIntelligence === undefined
      ? undefined
      : assessSiteIntelligence(request.site.siteIntelligence);

  const requirements: string[] = [];
  if (assessment && assessment.overallStatus === 'PRELIMINARY') {
    requirements.push(
      'Site intelligence is PRELIMINARY; remote datasets must not be promoted to verified engineering data.',
    );
  }
  if (request.material.frictionCoefficient !== undefined) {
    requirements.push(
      'Friction coefficient is a user-supplied assumption and remains UNVERIFIED for SuperAdobe sliding; require interface tests or an evaluated report.',
    );
  }
  requirements.push(
    'SuperAdobe capacity assumptions (allowable compression, friction, resisting mechanism) remain UNVERIFIED; no final structural safety is claimed.',
  );

  return {
    id: solved.id,
    projectId: request.projectId,
    system: 'superadobe',
    site: {
      assessment,
      statement:
        assessment?.statement ??
        'No site intelligence registered for this scenario.',
    },
    structure: solved.geometry,
    material: request.material,
    loads: solved.loads,
    calculations: solved.calculations,
    results: solved.summary,
    validation: {
      humanReviewRequired: solved.humanReviewRequired,
      unverifiedCalculationIds: solved.unverifiedCalculationIds,
      status: solved.status,
      requirements,
    },
    traceability: solved.traceability,
    calculatedAt: solved.calculatedAt,
  };
}