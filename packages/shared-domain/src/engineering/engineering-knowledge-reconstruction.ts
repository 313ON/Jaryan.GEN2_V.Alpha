import {
  type EngineeringKnowledgePackage,
  type EngineeringKnowledgePackageDefinition,
  type EngineeringKnowledgePackageProvenanceInput,
  createEngineeringKnowledgePackage,
  ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION,
  engineeringKnowledgePackageFingerprint,
  validateEngineeringKnowledgePackageAuthoritatively,
} from './engineering-knowledge-package.ts';
import {
  ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION,
  type EngineeringKnowledgeRegistry,
  createEngineeringKnowledgeRegistry,
} from './knowledge-package-registry.ts';
import type { EngineeringSourceAuthority } from './source-authority.ts';
import type { EngineeringArtifactIdentity } from './artifact-identity.ts';
import type { EngineeringCalculationResult } from './engineering-result.ts';
import type { PrimitiveInput } from './structural-primitives.ts';
import type { EngineeringDependencyGraph } from './dependency-graph.ts';

export interface SerializedEngineeringKnowledgePackageContent {
  readonly formatVersion: string;
  readonly identity: EngineeringArtifactIdentity;
  readonly definition: EngineeringKnowledgePackageDefinition;
  readonly inputs: Readonly<Record<string, PrimitiveInput>>;
  readonly result: EngineeringCalculationResult;
  readonly provenance: EngineeringKnowledgePackageProvenanceInput & {
    readonly requiredEvidence?: unknown;
    readonly missingEvidence?: unknown;
    readonly complete?: unknown;
  };
  readonly dependencies: EngineeringDependencyGraph;
}

export interface EngineeringKnowledgeRegistrySerializationVerification {
  readonly structurallyValid: boolean;
  readonly authoritativelyVerified: false;
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class EngineeringKnowledgeReconstructionError extends Error {
  readonly code = 'ENGINEERING_KNOWLEDGE_RECONSTRUCTION_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'EngineeringKnowledgeReconstructionError';
  }
}

/**
 * Reconstructs a package from its serialized content and separately stored
 * fingerprint. The creation path remains the owner of normalization,
 * canonical dependency graph construction, evidence derivation, validation,
 * fingerprinting, and deep freezing.
 */
export function engineeringKnowledgePackageFromContent(
  content: unknown,
  fingerprint: unknown,
): EngineeringKnowledgePackage {
  try {
    const cloned = parseSerializedValue(content);
    assertPackageContentShape(cloned);
    if (typeof fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(fingerprint)) {
      throw new EngineeringKnowledgeReconstructionError(
        'Serialized package fingerprint must be a SHA-256 hexadecimal string.',
      );
    }

    const packageInput = cloned as SerializedEngineeringKnowledgePackageContent;
    if (
      packageInput.formatVersion !==
      ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION
    ) {
      throw new EngineeringKnowledgeReconstructionError(
        `Unsupported package format version: ${String(packageInput.formatVersion)}.`,
      );
    }
    const reconstructed = createEngineeringKnowledgePackage({
      identity: packageInput.identity,
      definition: packageInput.definition,
      inputs: packageInput.inputs,
      result: packageInput.result,
      provenance: {
        sources: packageInput.provenance.sources,
        primitive: packageInput.provenance.primitive,
        calculation: packageInput.provenance.calculation,
        result: packageInput.provenance.result,
      },
      dependencies: packageInput.dependencies,
    });
    const recomputed = engineeringKnowledgePackageFingerprint(reconstructed);
    if (recomputed !== fingerprint || reconstructed.fingerprint !== fingerprint) {
      throw new EngineeringKnowledgeReconstructionError(
        `Serialized package fingerprint mismatch: expected ${fingerprint}, recomputed ${recomputed}.`,
      );
    }
    return reconstructed;
  } catch (error) {
    if (error instanceof EngineeringKnowledgeReconstructionError) {
      throw error;
    }
    throw new EngineeringKnowledgeReconstructionError(
      `Invalid serialized engineering knowledge package: ${errorMessage(error)}.`,
    );
  }
}

/**
 * Reconstructs a registry through the existing registration state machine.
 * An authority is optional and is deliberately consulted only after
 * structural reconstruction has succeeded.
 */
export function deserializeEngineeringKnowledgeRegistry(
  serialized: unknown,
  authority?: EngineeringSourceAuthority,
): EngineeringKnowledgeRegistry {
  try {
    const parsed = parseSerializedValue(serialized);
    assertRegistryShape(parsed);
    const registryContent = parsed as RegistrySerializationContent;
    let registry = createEngineeringKnowledgeRegistry();
    for (const entry of registryContent.packages) {
      assertRegistryEntryShape(entry);
      const packageContent = entry.package;
      assertPackageIndexReconciliation(entry, packageContent);
      const pkg = engineeringKnowledgePackageFromContent(
        packageContent,
        entry.fingerprint,
      );
      registry = registry.register(pkg);
      if (authority) {
        const errors = validateEngineeringKnowledgePackageAuthoritatively(
          pkg,
          authority,
        );
        if (errors.length > 0) {
          throw new EngineeringKnowledgeReconstructionError(
            `Authoritative package validation failed for ${pkg.identity.id}: ${errors.join('; ')}.`,
          );
        }
      }
    }
    return registry;
  } catch (error) {
    if (error instanceof EngineeringKnowledgeReconstructionError) {
      throw error;
    }
    throw new EngineeringKnowledgeReconstructionError(
      `Invalid serialized engineering knowledge registry: ${errorMessage(error)}.`,
    );
  }
}

/**
 * Performs deterministic, authority-free integrity verification. A true
 * structural result intentionally carries `authoritativelyVerified: false`.
 */
export function verifyEngineeringKnowledgeRegistrySerialization(
  serialized: unknown,
): EngineeringKnowledgeRegistrySerializationVerification {
  try {
    deserializeEngineeringKnowledgeRegistry(serialized);
    return Object.freeze({
      structurallyValid: true,
      authoritativelyVerified: false,
      valid: true,
      errors: Object.freeze([]),
    });
  } catch (error) {
    return Object.freeze({
      structurallyValid: false,
      authoritativelyVerified: false,
      valid: false,
      errors: Object.freeze([errorMessage(error)]),
    });
  }
}

interface RegistrySerializationEntry {
  readonly identityId: string;
  readonly baseId: string;
  readonly version: string;
  readonly fingerprint: string;
  readonly package: SerializedEngineeringKnowledgePackageContent;
}

interface RegistrySerializationContent {
  readonly formatVersion: string;
  readonly packages: readonly RegistrySerializationEntry[];
}

function parseSerializedValue(serialized: unknown): unknown {
  if (typeof serialized === 'string') {
    try {
      return JSON.parse(serialized);
    } catch (error) {
      throw new EngineeringKnowledgeReconstructionError(
        `Malformed serialized JSON: ${errorMessage(error)}`,
      );
    }
  }
  return cloneSerializedValue(serialized);
}

function assertPackageContentShape(value: unknown): asserts value is SerializedEngineeringKnowledgePackageContent {
  if (!isRecord(value)) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized package content must be an object.',
    );
  }
  const required = [
    'formatVersion',
    'identity',
    'definition',
    'inputs',
    'result',
    'provenance',
    'dependencies',
  ];
  for (const key of required) {
    if (!(key in value)) {
      throw new EngineeringKnowledgeReconstructionError(
        `Serialized package content is missing ${key}.`,
      );
    }
  }
  if (!isRecord(value.provenance) || !isRecord(value.dependencies)) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized package provenance and dependencies must be objects.',
    );
  }
}

function assertRegistryShape(value: unknown): asserts value is RegistrySerializationContent {
  if (!isRecord(value)) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized registry must be an object.',
    );
  }
  if (value.formatVersion !== ENGINEERING_KNOWLEDGE_REGISTRY_FORMAT_VERSION) {
    throw new EngineeringKnowledgeReconstructionError(
      `Unsupported registry format version: ${String(value.formatVersion)}.`,
    );
  }
  if (!Array.isArray(value.packages)) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized registry packages must be an array.',
    );
  }
}

function assertRegistryEntryShape(
  value: unknown,
): asserts value is RegistrySerializationEntry {
  if (
    !isRecord(value) ||
    typeof value.identityId !== 'string' ||
    typeof value.baseId !== 'string' ||
    typeof value.version !== 'string' ||
    typeof value.fingerprint !== 'string' ||
    !isRecord(value.package)
  ) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized registry entry has an invalid shape.',
    );
  }
}

function assertPackageIndexReconciliation(
  entry: RegistrySerializationEntry,
  content: SerializedEngineeringKnowledgePackageContent,
): void {
  const identity = content.identity;
  if (!isRecord(identity)) {
    throw new EngineeringKnowledgeReconstructionError(
      `Registry entry ${entry.identityId} contains invalid package identity.`,
    );
  }
  const checks: readonly [string, unknown, unknown][] = [
    ['identityId', entry.identityId, identity.id],
    ['baseId', entry.baseId, identity.baseId],
    ['version', entry.version, identity.version],
  ];
  for (const [field, indexed, embedded] of checks) {
    if (indexed !== embedded) {
      throw new EngineeringKnowledgeReconstructionError(
        `Registry entry ${entry.identityId} ${field} does not match embedded package content.`,
      );
    }
  }
}

function cloneSerializedValue(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    throw new EngineeringKnowledgeReconstructionError(
      'Serialized input must not contain circular references.',
    );
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => cloneSerializedValue(item, seen));
  }
  const source = value as Record<string, unknown>;
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    Object.defineProperty(clone, key, {
      configurable: true,
      enumerable: true,
      value: cloneSerializedValue(source[key], seen),
      writable: true,
    });
  }
  return clone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
