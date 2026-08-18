import type { ConfidenceLevel } from './validation.ts';

export type MaterialStatus =
  | 'KNOWN'
  | 'UNKNOWN'
  | 'REFERENCE_ONLY'
  | 'ASSUMPTION';

export type MaterialCategory =
  | 'soil'
  | 'bag'
  | 'wire'
  | 'binder'
  | 'plaster'
  | 'waterproofing';

export interface MaterialProperty {
  readonly value: number | string;
  readonly unit: string;
  readonly sourceId?: string;
  readonly testMethod?: string;
  readonly confidence: ConfidenceLevel;
  readonly applicability: string;
  readonly status: MaterialStatus;
}

export interface EngineeringMaterial {
  readonly id: string;
  readonly name: string;
  readonly category: MaterialCategory;
  readonly properties: Readonly<Record<string, MaterialProperty>>;
}

export const SOIL_PROPERTY_POLICY = {
  statement:
    'There are no universal SuperAdobe soil properties. Soil parameters are site-specific and require laboratory or field testing; screening categories are estimates, never mix designs.',
} as const;

export function materialProperty(inputs: {
  readonly value: number | string;
  readonly unit: string;
  readonly sourceId?: string;
  readonly testMethod?: string;
  readonly confidence: ConfidenceLevel;
  readonly applicability: string;
  readonly status: MaterialStatus;
}): MaterialProperty {
  return {
    value: inputs.value,
    unit: inputs.unit,
    ...(inputs.sourceId === undefined ? {} : { sourceId: inputs.sourceId }),
    ...(inputs.testMethod === undefined ? {} : { testMethod: inputs.testMethod }),
    confidence: inputs.confidence,
    applicability: inputs.applicability,
    status: inputs.status,
  };
}

export function defineMaterial(
  id: string,
  name: string,
  category: MaterialCategory,
  properties: Readonly<Record<string, MaterialProperty>>,
): EngineeringMaterial {
  return { id, name, category, properties };
}

export function getMaterialProperty(
  material: EngineeringMaterial,
  property: string,
): MaterialProperty | undefined {
  return material.properties[property];
}