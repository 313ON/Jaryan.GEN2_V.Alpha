export type FemStatus =
  | 'NOT_CONFIGURED'
  | 'MODEL_READY'
  | 'SOLVED'
  | 'PARSED'
  | 'VERIFIED';

export interface FemModel {
  readonly id: string;
  readonly generator: string;
  readonly sourceModelId: string;
  readonly solver: string;
  readonly status: FemStatus;
}

export interface FemSolverOutput {
  readonly solver: string;
  readonly solved: boolean;
  readonly resultsAvailable: boolean;
}

export interface FemVerificationResult {
  readonly model: FemModel;
  readonly benchmark: 'SA-CAN-2016' | 'CUSTOM';
  readonly verified: boolean;
  readonly note: string;
}

export interface FemIntegrationBoundary {
  readonly buildModel: (sourceModelId: string) => FemModel;
  readonly solve: (model: FemModel) => FemSolverOutput;
  readonly parse: (output: FemSolverOutput) => unknown[];
  readonly verify: (parsed: unknown[]) => FemVerificationResult;
}

export function buildFemIntegrationBoundary(): FemIntegrationBoundary {
  return {
    buildModel: (sourceModelId: string): FemModel => ({
      id: `fem-${sourceModelId}`,
      generator: 'Jaryan FEM Model Generator',
      sourceModelId,
      solver: 'external',
      status: 'MODEL_READY',
    }),
    solve: (model: FemModel): FemSolverOutput => ({
      solver: model.solver,
      solved: false,
      resultsAvailable: false,
    }),
    parse: (output: FemSolverOutput): unknown[] => {
      if (!output.resultsAvailable) return [];
      return [];
    },
    verify: (parsed: unknown[]): FemVerificationResult => ({
      model: {
        id: 'fem-unsolved',
        generator: 'Jaryan FEM Model Generator',
        sourceModelId: 'unsolved',
        solver: 'external',
        status: 'NOT_CONFIGURED',
      },
      benchmark: 'SA-CAN-2016',
      verified: false,
      note: 'FEM integration is a boundary only; no FEM results are fabricated in-repository.',
    }),
  };
}