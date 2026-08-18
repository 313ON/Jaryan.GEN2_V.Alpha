import type { ConfidenceLevel } from './validation.ts';
import { evaluateValidation } from './validation.ts';

export type SoilEvidenceKind =
  | 'REMOTE'
  | 'FIELD_TEST'
  | 'LAB_TEST'
  | 'ASSUMPTION';

export type SoilEvidenceStatus = 'PRELIMINARY' | 'VERIFIED' | 'UNKNOWN';

export interface SoilMaterial {
  readonly id: string;
  readonly name: string;
  readonly evidenceKind: SoilEvidenceKind;
  readonly status: SoilEvidenceStatus;
  readonly densityKgM3?: number;
  readonly cohesionKpa?: number;
  readonly frictionAngleDeg?: number;
  readonly unconfinedCompressiveStrengthKpa?: number;
  readonly moistureContentPercent?: number;
  readonly sourceId?: string;
  readonly notes: string;
}

export interface SoilLayer {
  readonly topDepthM: number;
  readonly bottomDepthM: number;
  readonly material: SoilMaterial;
}

export interface GeotechnicalProfile {
  readonly id: string;
  readonly layers: readonly SoilLayer[];
  readonly groundwaterDepthM?: number;
  readonly evidenceStatus: SoilEvidenceStatus;
}

export interface FoundationModel {
  readonly id: string;
  readonly type: 'strip' | 'mat' | 'pad' | 'unknown';
  readonly widthM: number;
  readonly depthM: number;
  readonly bearingLayer: SoilMaterial;
}

export interface FoundationCheckInputs {
  readonly cohesionKpa: number;
  readonly frictionAngleDeg: number;
  readonly unitWeightKnM3: number;
  readonly depthM: number;
  readonly widthM: number;
  readonly factorOfSafety: number;
}

export interface TerzaghiFactors {
  readonly nc: number;
  readonly nq: number;
  readonly ngamma: number;
}

export function terzaghiFactors(frictionAngleDeg: number): TerzaghiFactors {
  const phi = (frictionAngleDeg * Math.PI) / 180;
  if (frictionAngleDeg === 0) {
    return { nc: 5.14, nq: 1, ngamma: 0 };
  }
  const nq = Math.exp(Math.PI * Math.tan(phi)) * Math.tan(Math.PI / 4 + phi / 2) ** 2;
  const nc = (nq - 1) / Math.tan(phi);
  const ngamma = 2 * (nq + 1) * Math.tan(phi);
  return { nc: round2(nc), nq: round2(nq), ngamma: round2(ngamma) };
}

export function terzaghiBearingCapacity(
  inputs: FoundationCheckInputs,
): { ultimateKpa: number; allowableKpa: number } {
  const { nc, nq, ngamma } = terzaghiFactors(inputs.frictionAngleDeg);
  const ultimateKpa =
    inputs.cohesionKpa * nc +
    inputs.unitWeightKnM3 * inputs.depthM * nq +
    0.5 * inputs.unitWeightKnM3 * inputs.widthM * ngamma;
  return {
    ultimateKpa: round1(ultimateKpa),
    allowableKpa: round1(ultimateKpa / inputs.factorOfSafety),
  };
}

export interface FoundationCheckResult {
  readonly method: string;
  readonly formula: string;
  readonly sourceIds: readonly string[];
  readonly inputs: FoundationCheckInputs;
  readonly factors: TerzaghiFactors;
  readonly ultimateBearingKpa: number;
  readonly allowableBearingKpa: number;
  readonly appliedBearingKpa: number;
  readonly utilization: number;
  readonly status: 'OK' | 'FAIL' | 'PRELIMINARY';
  readonly confidence: ConfidenceLevel;
  readonly validationRequirements: readonly string[];
  readonly review: ReturnType<typeof evaluateValidation>;
}

export function foundationCheck(
  inputs: FoundationCheckInputs,
  appliedBearingKpa: number,
  soilStatus: SoilEvidenceStatus,
): FoundationCheckResult {
  const { ultimateKpa, allowableKpa } = terzaghiBearingCapacity(inputs);
  const utilization = allowableKpa > 0 ? appliedBearingKpa / allowableKpa : Number.NaN;
  const verified = soilStatus === 'VERIFIED';

  return {
    method: 'Terzaghi shallow-foundation bearing capacity',
    formula:
      'q_u = c·Nc + γ·Df·Nq + 0.5·γ·B·Nγ; q_a = q_u / FOS',
    sourceIds: ['TERZAGHI-1943'],
    inputs,
    factors: terzaghiFactors(inputs.frictionAngleDeg),
    ultimateBearingKpa: ultimateKpa,
    allowableBearingKpa: allowableKpa,
    appliedBearingKpa: round1(appliedBearingKpa),
    utilization: round2(utilization),
    status: !verified ? 'PRELIMINARY' : utilization <= 1 ? 'OK' : 'FAIL',
    confidence: verified ? 'MEDIUM' : 'LOW',
    validationRequirements:
      soilStatus === 'VERIFIED'
        ? []
        : [
            'Final foundation design requires site-specific geotechnical evidence (Iranian Chapter 7); remote or assumed soil data is PRELIMINARY only.',
          ],
    review: evaluateValidation(
      verified ? 'MEDIUM' : 'LOW',
      'HIGH',
      verified ? 'SOURCE_VALIDATED' : 'UNKNOWN',
    ),
  };
}

export function classifySoilEvidence(
  evidenceKind: SoilEvidenceKind,
): SoilEvidenceStatus {
  if (evidenceKind === 'FIELD_TEST' || evidenceKind === 'LAB_TEST') {
    return 'VERIFIED';
  }
  if (evidenceKind === 'REMOTE' || evidenceKind === 'ASSUMPTION') {
    return 'PRELIMINARY';
  }
  return 'UNKNOWN';
}

export function promoteToVerified(material: SoilMaterial): SoilMaterial {
  if (material.evidenceKind !== 'FIELD_TEST' && material.evidenceKind !== 'LAB_TEST') {
    throw new Error(
      'Remote or assumed soil data cannot be promoted to verified engineering data.',
    );
  }
  return { ...material, status: 'VERIFIED' };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}