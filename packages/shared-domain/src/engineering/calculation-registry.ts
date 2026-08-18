import type { EngineeringArtifactIdentity } from './artifact-identity.ts';
import { engineeringArtifactVersionOf } from './artifact-identity.ts';
import { legacyCalculationArtifactBaseId } from './legacy-artifact-identity.ts';

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
  readonly registerOrThrow: (
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

export function validateEngineeringCalculationEntry(
  entry: EngineeringCalculationEntry,
): readonly string[] {
  const errors: string[] = [];
  if (entry.identity.type !== 'CALCULATION') {
    errors.push('Only CALCULATION artifact identities may be registered.');
  }
  const expectedBaseId = legacyCalculationArtifactBaseId(entry.calculationId);
  if (expectedBaseId === null) {
    errors.push(
      `calculationId ${entry.calculationId} is not a valid legacy calculation id.`,
    );
  } else if (entry.identity.baseId !== expectedBaseId) {
    errors.push(
      `identity ${entry.identity.baseId} does not match calculationId ${entry.calculationId}.`,
    );
  }
  const expectedVersionedId = engineeringArtifactVersionOf(
    entry.identity.baseId,
    entry.identity.version,
  );
  if (entry.identity.id !== expectedVersionedId) {
    errors.push(
      `identity id ${entry.identity.id} is not consistent with baseId ${entry.identity.baseId} and version ${entry.identity.version}.`,
    );
  }
  if (entry.method.length === 0) {
    errors.push('Method must not be empty.');
  }
  if (entry.formula.length === 0) {
    errors.push('Formula must not be empty.');
  }
  return errors;
}

export function createEngineeringCalculationRegistry(
  entries: readonly EngineeringCalculationEntry[] = [],
): EngineeringCalculationRegistry {
  return {
    entries,
    register: (entry) => {
      if (validateEngineeringCalculationEntry(entry).length > 0) {
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
    registerOrThrow: (entry) => {
      const errors = validateEngineeringCalculationEntry(entry);
      if (errors.length > 0) {
        throw new Error(
          `Cannot register engineering calculation: ${errors.join('; ')}`,
        );
      }
      if (
        entries.some(
          (existing) => existing.calculationId === entry.calculationId,
        )
      ) {
        throw new Error(
          `Cannot register engineering calculation: calculationId ${entry.calculationId} is already registered.`,
        );
      }
      return createEngineeringCalculationRegistry([...entries, entry]);
    },
    get: (calculationId) =>
      entries.find((entry) => entry.calculationId === calculationId),
    getByIdentity: (artifactId) =>
      entries.find(
        (entry) =>
          entry.identity.id === artifactId ||
          entry.identity.baseId === artifactId,
      ),
    list: () => [...entries],
  };
}