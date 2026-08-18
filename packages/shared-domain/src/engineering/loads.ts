export type LoadType =
  | 'G'
  | 'Q'
  | 'W'
  | 'S'
  | 'R'
  | 'E'
  | 'F'
  | 'H'
  | 'T'
  | 'U';

export const LOAD_TYPES: readonly LoadType[] = [
  'G',
  'Q',
  'W',
  'S',
  'R',
  'E',
  'F',
  'H',
  'T',
  'U',
];

export const LOAD_TYPE_LABELS: Record<LoadType, string> = {
  G: 'Dead load',
  Q: 'Live load',
  W: 'Wind',
  S: 'Snow',
  R: 'Rain',
  E: 'Earthquake',
  F: 'Flood',
  H: 'Hydrostatic / soil pressure',
  T: 'Thermal',
  U: 'Uplift',
};

export interface LoadCase {
  readonly id: string;
  readonly name: string;
  readonly type: LoadType;
  readonly description: string;
  readonly sourceId?: string;
  readonly status: 'ACTIVE' | 'UNVERIFIED' | 'REFERENCE_ONLY';
}

export type CombinationStatus = 'VERIFIED' | 'UNVERIFIED' | 'UNKNOWN';

export interface LoadCombination {
  readonly id: string;
  readonly name: string;
  readonly factors: Partial<Record<LoadType, number>>;
  readonly sourceId?: string;
  readonly status: CombinationStatus;
  readonly notes: string;
}

export interface LoadEffect {
  readonly loadCaseId: string;
  readonly axialForceKn: number;
  readonly shearForceKn: number;
  readonly momentKnM: number;
  readonly torsionalMomentKnM: number;
  readonly bearingPressureKpa: number;
  readonly slidingDemandKn: number;
  readonly overturningDemandKnM: number;
  readonly upliftKn: number;
}

export interface StructuralDemand {
  readonly combination: LoadCombination;
  readonly axialForceKn: number;
  readonly shearForceKn: number;
  readonly momentKnM: number;
  readonly torsionalMomentKnM: number;
  readonly bearingPressureKpa: number;
  readonly slidingDemandKn: number;
  readonly overturningDemandKnM: number;
  readonly upliftKn: number;
}

export const IRANIAN_CHAPTER_6_LOAD_COMBINATIONS: readonly LoadCombination[] = [
  {
    id: 'IRN-CH6-COMBO-001',
    name: 'Iranian Chapter 6 gravity combination',
    factors: {},
    sourceId: 'IRN-CH-06',
    status: 'UNVERIFIED',
    notes:
      'Combination factors not verified against Iranian Chapter 6 (edition 1398) source text; UNVERIFIED until the code text is available.',
  },
  {
    id: 'IRN-CH6-COMBO-002',
    name: 'Iranian Chapter 6 seismic combination',
    factors: {},
    sourceId: 'IRN-CH-06',
    status: 'UNVERIFIED',
    notes:
      'Seismic combination factors not verified against Iranian Chapter 6 source text; UNVERIFIED until the code text is available.',
  },
];

export function evaluateLoadCombination(
  combination: LoadCombination,
  effectsByCase: readonly LoadEffect[],
): StructuralDemand {
  const factorOf = (type: LoadType) => combination.factors[type] ?? 0;
  const effectOf = (type: LoadType): LoadEffect | undefined =>
    effectsByCase.find((effect) => effect.loadCaseId === type);

  const combine = (pick: (effect: LoadEffect) => number): number =>
    LOAD_TYPES.reduce((sum, type) => {
      const effect = effectOf(type);
      if (!effect) return sum;
      return sum + factorOf(type) * pick(effect);
    }, 0);

  return {
    combination,
    axialForceKn: round3(combine((effect) => effect.axialForceKn)),
    shearForceKn: round3(combine((effect) => effect.shearForceKn)),
    momentKnM: round3(combine((effect) => effect.momentKnM)),
    torsionalMomentKnM: round3(combine((effect) => effect.torsionalMomentKnM)),
    bearingPressureKpa: round2(combine((effect) => effect.bearingPressureKpa)),
    slidingDemandKn: round3(combine((effect) => effect.slidingDemandKn)),
    overturningDemandKnM: round3(combine((effect) => effect.overturningDemandKnM)),
    upliftKn: round3(combine((effect) => effect.upliftKn)),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}