import {
  type EngineeringArtifactIdentity,
  engineeringArtifactVersionOf,
} from './artifact-identity.ts';
import {
  type EngineeringKnowledgePackage,
  engineeringKnowledgePackageContent,
  validateEngineeringKnowledgePackage,
} from './engineering-knowledge-package.ts';
import { stableSerialize } from './content-fingerprint.ts';

export const ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION = '1';

/**
 * A pure, deterministic, immutable registry of validated
 * EngineeringKnowledgePackage instances.
 *
 * Identity vs baseId:
 * - `identity.baseId` is the stable artifact series identity
 *   (e.g. `RESULT-SA-STRESS-001`).
 * - `identity.id` is the versioned artifact identity
 *   (e.g. `RESULT-SA-STRESS-001-v1`).
 *
 * Version coexistence:
 * - All registered versions of a baseId remain addressable.
 *   Registration never replaces a previous version.
 *
 * latest semantics:
 * - `latest(baseId)` returns the package whose artifact version is
 *   numerically greatest (see `compareEngineeringArtifactVersions`).
 *   It never depends on insertion order.
 *
 * Immutability:
 * - Every operation returns a new registry; existing registries and
 *   stored packages are never mutated.
 *
 * Deterministic serialization:
 * - `serialize()` output is canonical and independent of registration
 *   order (packages are sorted by identity id, versions numerically).
 */
export interface EngineeringKnowledgeRegistry {
  readonly formatVersion: string;
  register(pkg: EngineeringKnowledgePackage): EngineeringKnowledgeRegistry;
  get(identityId: string): EngineeringKnowledgePackage | null;
  getByIdentity(
    identity: EngineeringArtifactIdentity,
  ): EngineeringKnowledgePackage | null;
  getByFingerprint(
    fingerprint: string,
  ): readonly EngineeringKnowledgePackage[];
  getVersion(baseId: string, version: string): EngineeringKnowledgePackage | null;
  listVersions(baseId: string): readonly string[];
  latest(baseId: string): EngineeringKnowledgePackage | null;
  contains(identityId: string): boolean;
  size(): number;
  serialize(): string;
}

interface EngineeringKnowledgeRegistryState {
  readonly packages: readonly EngineeringKnowledgePackage[];
  readonly byIdentityId: ReadonlyMap<string, EngineeringKnowledgePackage>;
  readonly byFingerprint: ReadonlyMap<
    string,
    readonly EngineeringKnowledgePackage[]
  >;
  readonly byBaseId: ReadonlyMap<string, readonly EngineeringKnowledgePackage[]>;
}

export function createEngineeringKnowledgeRegistry(
  packages: readonly EngineeringKnowledgePackage[] = [],
): EngineeringKnowledgeRegistry {
  let state = createState([]);
  for (const pkg of packages) {
    state = registerPackage(state, pkg);
  }
  return buildRegistry(state);
}

/**
 * Registration checks for a single package: package validity, a RESULT
 * artifact identity, and a versioned id consistent with baseId plus
 * version. State-dependent conflicts (duplicate identity, fingerprint
 * collision) are checked at register time.
 */
export function validateEngineeringKnowledgePackageRegistration(
  pkg: EngineeringKnowledgePackage,
): readonly string[] {
  const errors = [...validateEngineeringKnowledgePackage(pkg)];
  if (pkg.identity.type !== 'RESULT') {
    errors.push('Package identity must be a RESULT artifact.');
  }
  if (
    pkg.identity.id !==
    engineeringArtifactVersionOf(pkg.identity.baseId, pkg.identity.version)
  ) {
    errors.push('Package identity id must equal the base id plus version.');
  }
  return errors;
}

/**
 * Deterministic total order over artifact version strings
 * (`^[0-9]+(\.[0-9]+)*$`). Components are compared numerically with
 * zero-padding, so `2 > 10` and `1.10 > 1.9` evaluate correctly. On a
 * numeric tie, more components ranks greater (`1 < 1.0 < 1.0.0`), and an
 * exact string comparison breaks remaining ties, preserving exact version
 * identity. Never lexical.
 */
export function compareEngineeringArtifactVersions(
  a: string,
  b: string,
): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const length = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < length; i += 1) {
    const difference = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  const lengthDifference = aParts.length - bParts.length;
  if (lengthDifference !== 0) {
    return lengthDifference;
  }
  return a.localeCompare(b);
}

function buildRegistry(
  state: EngineeringKnowledgeRegistryState,
): EngineeringKnowledgeRegistry {
  return Object.freeze({
    formatVersion: ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION,
    register(pkg: EngineeringKnowledgePackage): EngineeringKnowledgeRegistry {
      return buildRegistry(registerPackage(state, pkg));
    },
    get(identityId: string): EngineeringKnowledgePackage | null {
      return state.byIdentityId.get(identityId) ?? null;
    },
    getByIdentity(
      identity: EngineeringArtifactIdentity,
    ): EngineeringKnowledgePackage | null {
      return state.byIdentityId.get(identity.id) ?? null;
    },
    getByFingerprint(
      fingerprint: string,
    ): readonly EngineeringKnowledgePackage[] {
      return state.byFingerprint.get(fingerprint) ?? [];
    },
    getVersion(baseId: string, version: string): EngineeringKnowledgePackage | null {
      const basePackages = state.byBaseId.get(baseId) ?? [];
      return (
        basePackages.find((pkg) => pkg.identity.version === version) ?? null
      );
    },
    listVersions(baseId: string): readonly string[] {
      const basePackages = state.byBaseId.get(baseId) ?? [];
      return basePackages
        .map((pkg) => pkg.identity.version)
        .sort(compareEngineeringArtifactVersions);
    },
    latest(baseId: string): EngineeringKnowledgePackage | null {
      const basePackages = state.byBaseId.get(baseId) ?? [];
      if (basePackages.length === 0) {
        return null;
      }
      return basePackages.reduce((best, pkg) =>
        compareEngineeringArtifactVersions(
          pkg.identity.version,
          best.identity.version,
        ) > 0
          ? pkg
          : best,
      );
    },
    contains(identityId: string): boolean {
      return state.byIdentityId.has(identityId);
    },
    size(): number {
      return state.packages.length;
    },
    serialize(): string {
      return stableSerialize(engineeringKnowledgeRegistryContent(state));
    },
  });
}

function registerPackage(
  state: EngineeringKnowledgeRegistryState,
  pkg: EngineeringKnowledgePackage,
): EngineeringKnowledgeRegistryState {
  const errors = validateEngineeringKnowledgePackageRegistration(pkg);
  if (errors.length > 0) {
    throw new Error(
      `Cannot register engineering knowledge package: ${errors.join('; ')}.`,
    );
  }
  const existing = state.byIdentityId.get(pkg.identity.id);
  if (existing !== undefined) {
    if (isIdenticalPackage(existing, pkg)) {
      return state;
    }
    throw new Error(
      `Cannot register engineering knowledge package: duplicate versioned identity ${pkg.identity.id} with a different fingerprint.`,
    );
  }
  const fingerprintMatches = state.byFingerprint.get(pkg.fingerprint);
  if (fingerprintMatches !== undefined && fingerprintMatches.length > 0) {
    throw new Error(
      `Cannot register engineering knowledge package: fingerprint ${pkg.fingerprint} collides with different package content.`,
    );
  }
  const frozen = deepFreeze(pkg);
  return createState([...state.packages, frozen]);
}

function createState(
  packages: readonly EngineeringKnowledgePackage[],
): EngineeringKnowledgeRegistryState {
  const sorted = [...packages].sort((a, b) =>
    a.identity.id.localeCompare(b.identity.id),
  );
  const byIdentityId = new Map<string, EngineeringKnowledgePackage>();
  const byFingerprint = new Map<
    string,
    EngineeringKnowledgePackage[]
  >();
  const byBaseId = new Map<string, EngineeringKnowledgePackage[]>();
  for (const pkg of sorted) {
    byIdentityId.set(pkg.identity.id, pkg);
    const fingerprintList = byFingerprint.get(pkg.fingerprint) ?? [];
    fingerprintList.push(pkg);
    byFingerprint.set(pkg.fingerprint, fingerprintList);
    const baseList = byBaseId.get(pkg.identity.baseId) ?? [];
    baseList.push(pkg);
    byBaseId.set(pkg.identity.baseId, baseList);
  }
  return { packages: sorted, byIdentityId, byFingerprint, byBaseId };
}

function isIdenticalPackage(
  a: EngineeringKnowledgePackage,
  b: EngineeringKnowledgePackage,
): boolean {
  if (a.fingerprint !== b.fingerprint) {
    return false;
  }
  return (
    stableSerialize(engineeringKnowledgePackageContent(a)) ===
    stableSerialize(engineeringKnowledgePackageContent(b))
  );
}

function engineeringKnowledgeRegistryContent(
  state: EngineeringKnowledgeRegistryState,
): unknown {
  return {
    formatVersion: ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION,
    packages: state.packages.map((pkg) => ({
      identityId: pkg.identity.id,
      baseId: pkg.identity.baseId,
      version: pkg.identity.version,
      fingerprint: pkg.fingerprint,
      package: engineeringKnowledgePackageContent(pkg),
    })),
  };
}

function parseVersionParts(version: string): readonly number[] {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error(
      'Cannot compare engineering artifact version: version must be a non-empty string.',
    );
  }
  return version.split('.').map((part) => {
    if (!/^[0-9]+$/.test(part)) {
      throw new Error(
        `Cannot compare engineering artifact version: invalid component "${part}".`,
      );
    }
    return Number(part);
  });
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}