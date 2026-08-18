import type { EngineeringArtifactIdentity } from './artifact-identity.ts';

export interface EngineeringCalculationEntry {
  readonly identity: EngineeringArtifactIdentity;
  readonly calculationId: string;
  readonly method: string;
  readonly formula: string;
}

export interface EngineeringCalculationRegistry {
  readonly entries: readonly EngineeringCalculationEntry[];
  readonly register: (
    entry: EngineeringCalculationEntry,
  ) => EngineeringCalculationRegistry;
  readonly get: (
    calculationId: string,
  ) => EngineeringCalculationEntry | undefined;
  readonly getByIdentity: (
    artifactId: string,
  ) => EngineeringCalculationEntry | undefined;
  readonly list: () => readonly EngineeringCalculationEntry[];
}

export function createEngineeringCalculationRegistry(
  entries: readonly EngineeringCalculationEntry[] = [],
): EngineeringCalculationRegistry {
  return {
    entries,
    register: (entry) => {
      if (entry.identity.type !== 'CALCULATION') {
        return createEngineeringCalculationRegistry(entries);
      }
      if (
        entries.some(
          (existing) => existing.calculationId === entry.calculationId,
        )
      ) {
        return createEngineeringCalculationRegistry(entries);
      }
      return createEngineeringCalculationRegistry([...entries, entry]);
    },
    get: (calculationId) =>
      entries.find((entry) => entry.calculationId === calculationId),
    getByIdentity: (artifactId) =>
      entries.find((entry) => entry.identity.id === artifactId),
    list: () => [...entries],
  };
}