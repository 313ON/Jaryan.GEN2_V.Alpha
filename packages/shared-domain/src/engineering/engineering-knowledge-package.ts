import {
  calculationContentFingerprint,
  contentFingerprint,
  stableSerialize,
} from './content-fingerprint.ts';
import {
  engineeringArtifactLineageKey,
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';
import {
  type EngineeringCalculationResult,
  toEngineeringCalculationResult,
  validateEngineeringCalculationResult,
} from './engineering-result.ts';
import {
  type PrimitiveInput,
  type PrimitiveResult,
} from './structural-primitives.ts';
import {
  type EngineeringDependencyGraph,
  createEngineeringDependencyGraph,
  isEngineeringDependencyGraphAcyclic,
} from './dependency-graph.ts';
import {
  engineeringCalculationIdentityFromLegacyId,
  engineeringPrimitiveIdentityFromLegacyId,
  engineeringResultIdentityFromLegacyId,
  engineeringSourceIdentityFromSourceId,
} from './legacy-artifact-identity.ts';
import {
  type RequiredEvidence,
  deriveEngineeringEvidence,
} from './evidence.ts';
import {
  type EngineeringSourceAuthority,
  isValidEngineeringSourceReference,
} from './source-authority.ts';

export const ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION = '1';

export interface EngineeringKnowledgePackageDefinition {
  readonly calculationIdentity: EngineeringArtifactIdentity;
  readonly method: string;
  readonly formula: string;
  readonly assumptions: readonly string[];
}

export interface EngineeringKnowledgePackageProvenanceInput {
  readonly sources: readonly EngineeringArtifactIdentity[];
  readonly primitive: EngineeringArtifactIdentity;
  readonly calculation: EngineeringArtifactIdentity;
  readonly result: EngineeringArtifactIdentity;
}

export interface EngineeringKnowledgePackageProvenance
  extends EngineeringKnowledgePackageProvenanceInput {
  readonly requiredEvidence: readonly RequiredEvidence[];
  readonly missingEvidence: readonly RequiredEvidence[];
  readonly complete: boolean;
}

export interface EngineeringKnowledgePackage {
  readonly formatVersion: string;
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
  readonly provenance: EngineeringKnowledgePackageProvenanceInput;
  readonly dependencies?: EngineeringDependencyGraph;
}

export interface EngineeringKnowledgePackageChain {
  readonly result: EngineeringArtifactIdentity;
  readonly calculation: EngineeringArtifactIdentity;
  readonly primitive: EngineeringArtifactIdentity;
  readonly sources: readonly EngineeringArtifactIdentity[];
}

export function engineeringKnowledgePackageChainEdges(
  chain: EngineeringKnowledgePackageChain,
): readonly { readonly fromId: string; readonly toId: string }[] {
  const edges: { fromId: string; toId: string }[] = [
    { fromId: chain.result.id, toId: chain.calculation.id },
    { fromId: chain.calculation.id, toId: chain.primitive.id },
  ];
  for (const source of chain.sources ?? []) {
    edges.push({ fromId: chain.primitive.id, toId: source.id });
  }
  return edges;
}

export function createEngineeringKnowledgePackage(
  input: EngineeringKnowledgePackageInput,
): EngineeringKnowledgePackage {
  const identity: EngineeringArtifactIdentity = {
    ...input.identity,
    metadata: { ...input.identity.metadata },
  };
  const definition: EngineeringKnowledgePackageDefinition = {
    calculationIdentity: {
      ...input.definition.calculationIdentity,
      metadata: { ...input.definition.calculationIdentity.metadata },
    },
    method: input.definition.method,
    formula: input.definition.formula,
    assumptions: [...input.definition.assumptions],
  };
  const inputs = Object.fromEntries(
    Object.entries(input.inputs).map(([key, value]) => [
      key,
      { value: value.value, unit: value.unit },
    ]),
  );
  const result: EngineeringCalculationResult = {
    ...input.result,
    assumptions: [...input.result.assumptions],
    sources: [...input.result.sources],
  };
  const provenanceInput: EngineeringKnowledgePackageProvenanceInput = {
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
  };

  const evidence = deriveEngineeringEvidence({
    method: definition.method,
    formula: definition.formula,
    inputs,
    assumptions: definition.assumptions,
    sources: result.sources,
    sourceRequired: result.status === 'SOURCE_VALIDATED',
  });

  const chain: EngineeringKnowledgePackageChain = {
    result: provenanceInput.result,
    calculation: provenanceInput.calculation,
    primitive: provenanceInput.primitive,
    sources: provenanceInput.sources,
  };
  const baseGraph = input.dependencies ?? createEngineeringDependencyGraph();
  const dependencies = canonicalDependencyGraph(
    mergeRequiredChain(baseGraph, chain),
  );

  const pkg: EngineeringKnowledgePackage = {
    formatVersion: ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION,
    identity,
    definition,
    inputs,
    result,
    provenance: {
      ...provenanceInput,
      requiredEvidence: evidence.requiredEvidence,
      missingEvidence: evidence.missingEvidence,
      complete: evidence.complete,
    },
    dependencies,
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
  return createEngineeringKnowledgePackage({
    identity: resultIdentity,
    definition: {
      calculationIdentity,
      method: primitive.method,
      formula: primitive.formula,
      assumptions: [...primitive.assumptions],
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
  if (pkg.formatVersion !== ENGINEERING_KNOWLEDGE_PACKAGE_FORMAT_VERSION) {
    errors.push(
      `Unsupported package format version: ${String(pkg.formatVersion)}.`,
    );
  }
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
  errors.push(...validateEngineeringCalculationResult(pkg.result));
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
    validatePresentArtifactIdentity(pkg.provenance.result, 'result', errors);
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

    const identityLineage = engineeringArtifactLineageKey(pkg.identity);
    const calculationLineage = pkg.provenance.calculation
      ? engineeringArtifactLineageKey(pkg.provenance.calculation)
      : null;
    const primitiveLineage = pkg.provenance.primitive
      ? engineeringArtifactLineageKey(pkg.provenance.primitive)
      : null;
    if (
      identityLineage === null ||
      calculationLineage === null ||
      primitiveLineage === null
    ) {
      errors.push(
        'Provenance chain identities must resolve to a canonical base lineage.',
      );
    } else if (
      identityLineage !== calculationLineage ||
      identityLineage !== primitiveLineage
    ) {
      errors.push(
        'Result, calculation and primitive identities must share the same base lineage.',
      );
    }
    if (
      pkg.provenance.result?.version !== pkg.provenance.calculation?.version ||
      pkg.provenance.result?.version !== pkg.provenance.primitive?.version ||
      pkg.provenance.result?.version !== pkg.identity.version
    ) {
      errors.push(
        'Provenance chain identities must share the same artifact version.',
      );
    }

    const provenanceSourceIds: string[] = [];
    for (const source of pkg.provenance.sources ?? []) {
      validatePresentArtifactIdentity(source, 'source', errors);
      if (source?.type !== 'SOURCE') {
        errors.push('Provenance sources must be SOURCE artifacts.');
      }
      const sourceId = source?.metadata?.sourceId;
      if (typeof sourceId !== 'string' || sourceId.length === 0) {
        errors.push(
          'Provenance source identities must carry a resolvable sourceId in metadata.',
        );
      } else {
        if (!isValidEngineeringSourceReference(sourceId)) {
          errors.push(
            `Provenance source reference is invalid: ${sourceId}.`,
          );
        }
        provenanceSourceIds.push(sourceId);
      }
    }
    const resultSourceIds = [...(pkg.result?.sources ?? [])].sort();
    const sortedProvenanceSourceIds = [...provenanceSourceIds].sort();
    if (
      JSON.stringify(resultSourceIds) !==
      JSON.stringify(sortedProvenanceSourceIds)
    ) {
      errors.push(
        'Result sources and provenance sources must correspond one-to-one.',
      );
    }
  }

  if (pkg.definition && pkg.result && pkg.provenance) {
    const derived = deriveEngineeringEvidence({
      method: pkg.definition.method ?? '',
      formula: pkg.definition.formula ?? '',
      inputs: pkg.inputs,
      assumptions: pkg.definition.assumptions ?? [],
      sources: pkg.result.sources ?? [],
      sourceRequired: pkg.result.status === 'SOURCE_VALIDATED',
    });
    if (
      JSON.stringify(derived.requiredEvidence) !==
      JSON.stringify(pkg.provenance.requiredEvidence)
    ) {
      errors.push(
        'Provenance required evidence must match the derived evidence contract.',
      );
    }
    if (
      JSON.stringify(derived.missingEvidence) !==
      JSON.stringify(pkg.provenance.missingEvidence)
    ) {
      errors.push(
        'Provenance missing evidence must match the derived evidence contract.',
      );
    }
    if (derived.complete !== pkg.provenance.complete) {
      errors.push(
        'Provenance completeness must match the derived evidence contract.',
      );
    }
    if (derived.missingEvidence.length > 0) {
      errors.push(
        `Required evidence is incomplete; missing: ${derived.missingEvidence.join(', ')}.`,
      );
    }
    if (derived.complete !== true) {
      errors.push('Provenance must mark evidence as complete.');
    }
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
    if (!isEngineeringDependencyGraphAcyclic(pkg.dependencies)) {
      errors.push('Dependency graph must be acyclic.');
    }
    if (
      JSON.stringify(canonicalDependencyGraph(pkg.dependencies)) !==
      JSON.stringify(pkg.dependencies)
    ) {
      errors.push('Dependency graph must be canonical.');
    }
    if (
      pkg.provenance?.result &&
      pkg.provenance?.calculation &&
      pkg.provenance?.primitive
    ) {
      const chain: EngineeringKnowledgePackageChain = {
        result: pkg.provenance.result,
        calculation: pkg.provenance.calculation,
        primitive: pkg.provenance.primitive,
        sources: pkg.provenance.sources ?? [],
      };
      for (const requiredEdge of engineeringKnowledgePackageChainEdges(chain)) {
        if (
          !pkg.dependencies.edges.some(
            (edge) =>
              edge.fromId === requiredEdge.fromId &&
              edge.toId === requiredEdge.toId,
          )
        ) {
          errors.push(
            `Dependency graph must represent the calculation chain edge ${requiredEdge.fromId} -> ${requiredEdge.toId}.`,
          );
        }
      }
    }
  }
  if (pkg.fingerprint !== engineeringKnowledgePackageFingerprint(pkg)) {
    errors.push('Package fingerprint does not match the package content.');
  }
  return errors;
}

/**
 * Explicit registry-backed trust boundary. Structural package validation
 * remains pure and does not imply that source references exist authoritatively.
 */
export function validateEngineeringKnowledgePackageAuthoritatively(
  pkg: EngineeringKnowledgePackage,
  authority: EngineeringSourceAuthority,
): readonly string[] {
  const errors = [...validateEngineeringKnowledgePackage(pkg)];
  for (const source of pkg.provenance?.sources ?? []) {
    const sourceId = source.metadata?.sourceId;
    const resolution = authority.resolve(sourceId ?? '');
    if (resolution.status !== 'RESOLVED') {
      errors.push(
        `Provenance source ${sourceId ?? '<missing>'} is not authoritative: ${resolution.status}.`,
      );
    }
  }
  return errors;
}

export function engineeringKnowledgePackageContent(
  pkg: EngineeringKnowledgePackage,
): unknown {
  return {
    formatVersion: pkg.formatVersion,
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

function mergeRequiredChain(
  graph: EngineeringDependencyGraph,
  chain: EngineeringKnowledgePackageChain,
): EngineeringDependencyGraph {
  const nodes = [...graph.nodes];
  const edges = graph.edges.map((edge) => ({
    fromId: edge.fromId,
    toId: edge.toId,
  }));
  for (const requiredEdge of engineeringKnowledgePackageChainEdges(chain)) {
    if (!nodes.includes(requiredEdge.fromId)) {
      nodes.push(requiredEdge.fromId);
    }
    if (!nodes.includes(requiredEdge.toId)) {
      nodes.push(requiredEdge.toId);
    }
    if (
      !edges.some(
        (edge) =>
          edge.fromId === requiredEdge.fromId &&
          edge.toId === requiredEdge.toId,
      )
    ) {
      edges.push({ fromId: requiredEdge.fromId, toId: requiredEdge.toId });
    }
  }
  return { nodes, edges, version: graph.version };
}

function canonicalDependencyGraph(
  graph: EngineeringDependencyGraph,
): EngineeringDependencyGraph {
  const nodes = [...new Set(graph.nodes)].sort();
  const edgeSet = new Map<string, { fromId: string; toId: string }>();
  for (const edge of graph.edges) {
    edgeSet.set(`${edge.fromId}\u0000${edge.toId}`, {
      fromId: edge.fromId,
      toId: edge.toId,
    });
  }
  const edges = [...edgeSet.values()].sort(
    (a, b) =>
      a.fromId.localeCompare(b.fromId) || a.toId.localeCompare(b.toId),
  );
  return { nodes, edges, version: graph.version };
}
