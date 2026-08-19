import {
  calculationContentFingerprint,
  contentFingerprint,
  stableSerialize,
} from './content-fingerprint.ts';
import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';
import {
  type EngineeringCalculationResult,
  toEngineeringCalculationResult,
} from './engineering-result.ts';
import {
  type PrimitiveInput,
  type PrimitiveResult,
} from './structural-primitives.ts';
import {
  type EngineeringDependencyGraph,
  createEngineeringDependencyGraph,
} from './dependency-graph.ts';
import {
  engineeringCalculationIdentityFromLegacyId,
  engineeringPrimitiveIdentityFromLegacyId,
  engineeringResultIdentityFromLegacyId,
  engineeringSourceIdentityFromSourceId,
} from './legacy-artifact-identity.ts';
import {
  type RequiredEvidence,
  engineeringPrimitiveMissingEvidence,
  engineeringPrimitiveRequiredEvidence,
} from './evidence.ts';

export interface EngineeringKnowledgePackageDefinition {
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly method: string;
  readonly formula: string;
  readonly assumptions: readonly string[];
  readonly requiredEvidence: readonly RequiredEvidence[];
}

export interface EngineeringKnowledgePackageProvenance {
  readonly sources: readonly EngineeringArtifactIdentity[];
  readonly primitive: EngineeringArtifactIdentity;
  readonly calculation: EngineeringArtifactIdentity;
  readonly result: EngineeringArtifactIdentity;
  readonly requiredEvidence: readonly RequiredEvidence[];
  readonly missingEvidence: readonly RequiredEvidence[];
  readonly complete: boolean;
}

export interface EngineeringKnowledgePackage {
  readonly identity: EngineeringArtifactIdentity;
  readonly definition: EngineeringKnowledgePackageDefinition;
  readonly inputs: Readonly<Record<string, PrimitiveInput>>;
  readonly result: EngineeringCalculationResult;
  readonly provenance: EngineeringKnowledgePackageProvenance;
  readonly dependencies: EngineeringDependencyGraph;
  readonly fingerprint: string;
}

export interface EngineeringKnowledgePackageInput {
  readonly identity: EngineeringArtifactIdentity;
  readonly definition: EngineeringKnowledgePackageDefinition;
  readonly inputs: Readonly<Record<string, PrimitiveInput>>;
  readonly result: EngineeringCalculationResult;
  readonly provenance: EngineeringKnowledgePackageProvenance;
  readonly dependencies?: EngineeringDependencyGraph;
}

export function createEngineeringKnowledgePackage(
  input: EngineeringKnowledgePackageInput,
): EngineeringKnowledgePackage {
  const pkg: EngineeringKnowledgePackage = {
    identity: { ...input.identity, metadata: { ...input.identity.metadata } },
    definition: {
      calculationIdentity: {
        ...input.definition.calculationIdentity,
        metadata: { ...input.definition.calculationIdentity.metadata },
      },
      method: input.definition.method,
      formula: input.definition.formula,
      assumptions: [...input.definition.assumptions],
      requiredEvidence: [...input.definition.requiredEvidence],
    },
    inputs: Object.fromEntries(
      Object.entries(input.inputs).map(([key, value]) => [
        key,
        { value: value.value, unit: value.unit },
      ]),
    ),
    result: {
      ...input.result,
      assumptions: [...input.result.assumptions],
      sources: [...input.result.sources],
    },
    provenance: {
      sources: input.provenance.sources.map((source) => ({
        ...source,
        metadata: { ...source.metadata },
      })),
      primitive: {
        ...input.provenance.primitive,
        metadata: { ...input.provenance.primitive.metadata },
      },
      calculation: {
        ...input.provenance.calculation,
        metadata: { ...input.provenance.calculation.metadata },
      },
      result: {
        ...input.provenance.result,
        metadata: { ...input.provenance.result.metadata },
      },
      requiredEvidence: [...input.provenance.requiredEvidence],
      missingEvidence: [...input.provenance.missingEvidence],
      complete: input.provenance.complete,
    },
    dependencies: input.dependencies
      ? canonicalDependencyGraph(input.dependencies)
      : createEngineeringDependencyGraph(),
    fingerprint: '',
  };
  const fingerprint = engineeringKnowledgePackageFingerprint(pkg);
  const complete = deepFreeze<EngineeringKnowledgePackage>({
    ...pkg,
    fingerprint,
  });
  const errors = validateEngineeringKnowledgePackage(complete);
  if (errors.length > 0) {
    throw new Error(
      `Invalid engineering knowledge package: ${errors.join('; ')}`,
    );
  }
  return complete;
}

export function createEngineeringKnowledgePackageFromPrimitive(
  primitive: PrimitiveResult,
  options: {
    readonly version?: string;
    readonly dependencies?: EngineeringDependencyGraph;
  } = {},
): EngineeringKnowledgePackage {
  const version = options.version ?? '1';
  const result = toEngineeringCalculationResult(primitive, { version });
  const calculationIdentity = engineeringCalculationIdentityFromLegacyId(
    primitive.calculationId,
    version,
  );
  const primitiveIdentity = engineeringPrimitiveIdentityFromLegacyId(
    primitive.calculationId,
    version,
  );
  const resultIdentity = engineeringResultIdentityFromLegacyId(
    primitive.calculationId,
    version,
  );
  if (!calculationIdentity || !primitiveIdentity || !resultIdentity) {
    throw new Error(
      `Cannot derive package identities from primitive ${primitive.calculationId}.`,
    );
  }
  const sources = primitive.sourceIds.map((sourceId) =>
    engineeringSourceIdentityFromSourceId(sourceId, version),
  );
  const requiredEvidence = engineeringPrimitiveRequiredEvidence(primitive);
  const missingEvidence = engineeringPrimitiveMissingEvidence(primitive);
  return createEngineeringKnowledgePackage({
    identity: resultIdentity,
    definition: {
      calculationIdentity,
      method: primitive.method,
      formula: primitive.formula,
      assumptions: [...primitive.assumptions],
      requiredEvidence,
    },
    inputs: Object.fromEntries(
      Object.entries(primitive.inputs).map(([key, value]) => [
        key,
        { value: value.value, unit: value.unit },
      ]),
    ),
    result,
    provenance: {
      sources,
      primitive: primitiveIdentity,
      calculation: calculationIdentity,
      result: resultIdentity,
      requiredEvidence,
      missingEvidence,
      complete: missingEvidence.length === 0,
    },
    dependencies: options.dependencies,
  });
}

export function validateEngineeringKnowledgePackage(
  pkg: EngineeringKnowledgePackage,
): readonly string[] {
  const errors: string[] = [];
  if (!pkg.identity) {
    errors.push('Package must have an identity.');
    return errors;
  }
  errors.push(
    ...validateEngineeringArtifactIdentity(pkg.identity).map(
      (message) => `Identity is invalid: ${message}`,
    ),
  );
  if (!pkg.definition) {
    errors.push('Package must have a definition.');
  } else {
    if ((pkg.definition.method?.length ?? 0) === 0) {
      errors.push('Definition method must not be empty.');
    }
    if ((pkg.definition.formula?.length ?? 0) === 0) {
      errors.push('Definition formula must not be empty.');
    }
    if (!pkg.definition.calculationIdentity) {
      errors.push('Definition must reference a calculation identity.');
    } else {
      errors.push(
        ...validateEngineeringArtifactIdentity(
          pkg.definition.calculationIdentity,
        ).map((message) => `Calculation identity is invalid: ${message}`),
      );
      if (pkg.definition.calculationIdentity.type !== 'CALCULATION') {
        errors.push('Calculation identity must be a CALCULATION artifact.');
      }
    }
  }
  if (!pkg.result) {
    errors.push('Package must have a result.');
    return errors;
  }
  if (pkg.identity.id !== pkg.result.identityId) {
    errors.push('Package identity must equal the result identity id.');
  }
  const calculationBaseId =
    pkg.definition?.calculationIdentity?.baseId ?? '';
  const calculationVersion =
    pkg.definition?.calculationIdentity?.version ?? '';
  const recomputedResultFingerprint = calculationContentFingerprint({
    definition: calculationBaseId,
    version: calculationVersion,
    formula: pkg.definition?.formula ?? '',
    assumptions: pkg.definition?.assumptions ?? [],
    inputs: pkg.inputs,
  });
  if (recomputedResultFingerprint !== pkg.result.contentFingerprint) {
    errors.push(
      'Result content fingerprint does not match the package definition and inputs.',
    );
  }
  if (!pkg.provenance) {
    errors.push('Package must have provenance.');
  } else {
    if (pkg.provenance.result?.id !== pkg.identity.id) {
      errors.push('Provenance result must equal the package identity.');
    }
    validatePresentArtifactIdentity(
      pkg.provenance.result,
      'result',
      errors,
    );
    validatePresentArtifactIdentity(
      pkg.provenance.calculation,
      'calculation',
      errors,
    );
    if (pkg.provenance.calculation?.type !== 'CALCULATION') {
      errors.push('Provenance calculation must be a CALCULATION artifact.');
    }
    if (
      pkg.provenance.calculation?.id !==
      pkg.definition?.calculationIdentity?.id
    ) {
      errors.push(
        'Provenance calculation must match the definition calculation identity.',
      );
    }
    validatePresentArtifactIdentity(
      pkg.provenance.primitive,
      'primitive',
      errors,
    );
    if (pkg.provenance.primitive?.type !== 'PRIMITIVE') {
      errors.push('Provenance primitive must be a PRIMITIVE artifact.');
    }
    for (const source of pkg.provenance.sources ?? []) {
      validatePresentArtifactIdentity(source, 'source', errors);
      if (source?.type !== 'SOURCE') {
        errors.push('Provenance sources must be SOURCE artifacts.');
      }
    }
    if (pkg.provenance.complete !== true) {
      errors.push('Provenance must mark evidence as complete.');
    }
    if ((pkg.provenance.missingEvidence?.length ?? 0) > 0) {
      errors.push(
        `Required evidence is incomplete; missing: ${pkg.provenance.missingEvidence.join(', ')}.`,
      );
    }
  }
  if (
    pkg.definition &&
    pkg.provenance &&
    JSON.stringify(pkg.definition.requiredEvidence) !==
      JSON.stringify(pkg.provenance.requiredEvidence)
  ) {
    errors.push(
      'Definition and provenance must declare the same required evidence.',
    );
  }
  if (!pkg.dependencies) {
    errors.push('Package must have a dependency graph.');
  } else {
    const nodes = new Set(pkg.dependencies.nodes);
    for (const edge of pkg.dependencies.edges) {
      if (!nodes.has(edge.fromId)) {
        errors.push(`Dependency edge fromId ${edge.fromId} is not a graph node.`);
      }
      if (!nodes.has(edge.toId)) {
        errors.push(`Dependency edge toId ${edge.toId} is not a graph node.`);
      }
    }
  }
  if (pkg.fingerprint !== engineeringKnowledgePackageFingerprint(pkg)) {
    errors.push('Package fingerprint does not match the package content.');
  }
  return errors;
}

export function engineeringKnowledgePackageContent(
  pkg: EngineeringKnowledgePackage,
): unknown {
  return {
    identity: pkg.identity,
    definition: pkg.definition,
    inputs: pkg.inputs,
    result: pkg.result,
    provenance: pkg.provenance,
    dependencies: pkg.dependencies,
  };
}

export function engineeringKnowledgePackageFingerprint(
  pkg: EngineeringKnowledgePackage,
): string {
  return contentFingerprint({
    kind: 'ENGINEERING_KNOWLEDGE_PACKAGE',
    ...(engineeringKnowledgePackageContent(pkg) as Record<string, unknown>),
  });
}

export function serializeEngineeringKnowledgePackage(
  pkg: EngineeringKnowledgePackage,
): string {
  return stableSerialize(engineeringKnowledgePackageContent(pkg));
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

function validatePresentArtifactIdentity(
  identity: EngineeringArtifactIdentity | undefined,
  label: string,
  errors: string[],
): void {
  if (!identity) {
    errors.push(`Provenance ${label} identity is missing.`);
    return;
  }
  errors.push(
    ...validateEngineeringArtifactIdentity(identity).map(
      (message) => `Provenance ${label} identity is invalid: ${message}`,
    ),
  );
}

function canonicalDependencyGraph(
  graph: EngineeringDependencyGraph,
): EngineeringDependencyGraph {
  const nodes = [...graph.nodes].sort();
  const edges = [...graph.edges]
    .map((edge) => ({ fromId: edge.fromId, toId: edge.toId }))
    .sort(
      (a, b) =>
        a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
    );
  return { nodes, edges, version: graph.version };
}