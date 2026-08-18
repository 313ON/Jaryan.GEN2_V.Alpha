import type { ConfidenceLevel } from './validation.ts';
import { evaluateValidation } from './validation.ts';

export interface HvacSystem {
  readonly id: string;
  readonly heating?: { readonly designHeatingLoadKw: number };
  readonly cooling?: { readonly designCoolingLoadKw: number };
  readonly ventilation?: { readonly designFlowM3Hr: number };
}

export interface WaterSystem {
  readonly id: string;
  readonly dailyDemandL: number;
  readonly storageL: number;
}

export interface WastewaterSystem {
  readonly id: string;
  readonly dailyFlowL: number;
  readonly treatment: 'SEPTIC' | 'CONSTRUCTED_WETLAND' | 'UNKNOWN';
}

export interface ElectricalSystem {
  readonly id: string;
  readonly peakLoadKw: number;
  readonly voltageV: number;
}

export interface PvSystem {
  readonly id: string;
  readonly installedCapacityKw: number;
  readonly panelCount: number;
}

export interface BatterySystem {
  readonly id: string;
  readonly usableCapacityKwh: number;
  readonly nominalVoltageV: number;
}

export interface ThermalEnvelope {
  readonly id: string;
  readonly areaM2: number;
  readonly uValueWm2K?: number;
  readonly rValueM2KW?: number;
}

export interface EnergyModel {
  readonly id: string;
  readonly hvac?: HvacSystem;
  readonly water?: WaterSystem;
  readonly wastewater?: WastewaterSystem;
  readonly electrical?: ElectricalSystem;
  readonly pv?: PvSystem;
  readonly battery?: BatterySystem;
  readonly envelope?: ThermalEnvelope;
}

export interface HeatLossResult {
  readonly heatLossKw: number;
  readonly inputs: { readonly areaM2: number; readonly uValueWm2K: number; readonly deltaTK: number };
  readonly confidence: ConfidenceLevel;
  readonly humanReviewRequired: boolean;
}

export function heatLossPrimitive(inputs: {
  readonly areaM2: number;
  readonly uValueWm2K: number;
  readonly deltaTK: number;
}): HeatLossResult {
  const heatLossKw = (inputs.areaM2 * inputs.uValueWm2K * inputs.deltaTK) / 1000;
  const review = evaluateValidation('MEDIUM', 'MODERATE', 'SOURCE_VALIDATED');
  return {
    heatLossKw: round2(heatLossKw),
    inputs,
    confidence: 'MEDIUM',
    humanReviewRequired: review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED',
  };
}

export function envelopeUValue(rValueM2KW: number): number {
  return rValueM2KW > 0 ? 1 / rValueM2KW : Number.NaN;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}