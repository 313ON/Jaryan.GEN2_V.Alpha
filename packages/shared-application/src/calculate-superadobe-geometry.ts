import {
  calculateSuperAdobeGeometry,
  type SuperAdobeGeometry,
  type SuperAdobeGeometryFieldError,
  type SuperAdobeGeometryInputs,
} from '@jaryan/shared-domain';
import type { CalculationRecord } from './calculation-record.ts';

export type SuperAdobeGeometryCalculationRecord = CalculationRecord<
  SuperAdobeGeometryInputs,
  SuperAdobeGeometry,
  SuperAdobeGeometryFieldError
>;

export interface CalculateSuperAdobeGeometryRequest {
  readonly projectId: string;
  readonly inputs: SuperAdobeGeometryInputs;
}

export function calculateSuperAdobeGeometryRecord(
  request: CalculateSuperAdobeGeometryRequest,
): SuperAdobeGeometryCalculationRecord {
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();
  const result = calculateSuperAdobeGeometry(request.inputs);

  if (!result.ok) {
    return {
      id,
      projectId: request.projectId,
      system: 'superadobe',
      inputs: request.inputs,
      outputs: null,
      assumptions: [],
      errors: result.errors,
      status: 'failed',
      knowledge: { sourceIds: [] },
      calculatedAt,
    };
  }

  return {
    id,
    projectId: request.projectId,
    system: 'superadobe',
    inputs: request.inputs,
    outputs: result.geometry,
    assumptions: [
      {
        id: 'effective-contact-width',
        value: request.inputs.bagWidthM,
        unit: 'm',
      },
      {
        id: 'row-midpoint-volume-rule',
        value: 'annular slice at row mid-height',
      },
    ],
    status: 'completed',
    knowledge: { sourceIds: [] },
    calculatedAt,
  };
}