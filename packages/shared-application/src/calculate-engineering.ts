import {
  calculateEngineeringModel,
  ENGINEERING_ASSUMPTIONS,
} from '@jaryan/shared-domain';
import type { EngineeringInputs } from '@jaryan/shared-domain';
import { REFERENCE_BASIS } from '@jaryan/shared-knowledge';
import type {
  CalculationAssumptionSnapshot,
  CalculationRecord,
} from './calculation-record.ts';

export interface CalculateEngineeringRequest {
  readonly projectId: string;
  readonly inputs: EngineeringInputs;
}

interface AssumptionSpec {
  readonly key: keyof typeof ENGINEERING_ASSUMPTIONS;
  readonly id: string;
  readonly unit?: string;
}

const ASSUMPTION_SPEC: readonly AssumptionSpec[] = [
  { key: 'solarPerformanceRatio', id: 'solar-performance-ratio' },
  { key: 'batteryUsableDepth', id: 'battery-usable-depth' },
  {
    key: 'batteryRoundTripEfficiency',
    id: 'battery-round-trip-efficiency',
  },
  {
    key: 'waterUsePerPersonL',
    id: 'water-use-per-person',
    unit: 'L/person/day',
  },
  { key: 'minimumPracticalTankL', id: 'minimum-practical-tank', unit: 'L' },
  { key: 'modulePowerDensityWm2', id: 'module-power-density', unit: 'W/m²' },
  {
    key: 'roofInstallationFootprintFactor',
    id: 'roof-installation-footprint-factor',
  },
  {
    key: 'groundInstallationFootprintFactor',
    id: 'ground-installation-footprint-factor',
  },
];

function snapshotAssumptions(): CalculationAssumptionSnapshot[] {
  return ASSUMPTION_SPEC.map(({ key, id, unit }) =>
    unit === undefined
      ? { id, value: ENGINEERING_ASSUMPTIONS[key] }
      : { id, value: ENGINEERING_ASSUMPTIONS[key], unit },
  );
}

export function calculateEngineering(
  request: CalculateEngineeringRequest,
): CalculationRecord {
  const id = crypto.randomUUID();
  const calculatedAt = new Date().toISOString();
  const result = calculateEngineeringModel(request.inputs);

  if (!result.ok) {
    return {
      id,
      projectId: request.projectId,
      system: request.inputs.structuralSystem,
      inputs: request.inputs,
      outputs: null,
      assumptions: [],
      errors: result.errors,
      status: 'failed',
      knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
      calculatedAt,
    };
  }

  return {
    id,
    projectId: request.projectId,
    system: request.inputs.structuralSystem,
    inputs: request.inputs,
    outputs: result.outputs,
    assumptions: snapshotAssumptions(),
    status: 'completed',
    knowledge: { sourceIds: REFERENCE_BASIS.sourceIds },
    calculatedAt,
  };
}
