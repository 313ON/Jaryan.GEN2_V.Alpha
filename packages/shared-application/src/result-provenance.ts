import {
  engineeringArtifactIdentity,
  type EngineeringArtifactIdentity,
  type EngineeringCalculationResult,
} from '@jaryan/shared-domain';
import type { TraceabilityBundle, TraceabilityLink } from './traceability.ts';

export interface ResultProvenance {
  readonly resultId: string;
  readonly calculation: {
    readonly method: string;
    readonly formula: string;
    readonly validationStatus: string;
    readonly confidence: string;
  };
  readonly primitiveInputs: readonly string[];
  readonly assumptions: readonly string[];
  readonly sources: readonly string[];
  readonly complete: boolean;
}

export function traceResultProvenance(
  result: EngineeringCalculationResult,
  bundle: TraceabilityBundle,
): ResultProvenance | null {
  const link = bundle.links.find(
    (entry) => entry.calculationId === result.id,
  );
  if (!link) {
    return null;
  }
  return {
    resultId: result.id,
    calculation: {
      method: link.method,
      formula: link.formula,
      validationStatus: link.validationStatus,
      confidence: link.confidence,
    },
    primitiveInputs: [...link.inputs],
    assumptions: [...link.assumptions],
    sources: [...link.sourceIds],
    complete:
      link.method.length > 0 &&
      link.formula.length > 0 &&
      link.assumptions.length > 0 &&
      link.inputs.length > 0,
  };
}

export function traceabilityBundleFromLinks(
  resultId: string,
  links: readonly TraceabilityLink[],
): TraceabilityBundle {
  return { resultId, links };
}

export interface EngineeringProvenanceNode {
  readonly identity: EngineeringArtifactIdentity;
  readonly label: string;
}

export interface EngineeringAssumptionNode {
  readonly text: string;
}

export interface EngineeringArtifactProvenanceChain {
  readonly result: EngineeringProvenanceNode;
  readonly calculation: EngineeringProvenanceNode;
  readonly primitive: EngineeringProvenanceNode;
  readonly assumptions: readonly EngineeringAssumptionNode[];
  readonly sources: readonly EngineeringProvenanceNode[];
}

export function engineeringResultArtifactIdentity(
  legacyId: string,
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyArtifactId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'RESULT',
    ...parsed,
    name: legacyId,
    version: '1',
  });
}

export function engineeringCalculationArtifactIdentity(
  legacyId: string,
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyArtifactId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'CALCULATION',
    ...parsed,
    name: legacyId,
    version: '1',
  });
}

export function engineeringPrimitiveArtifactIdentity(
  legacyId: string,
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyArtifactId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'PRIMITIVE',
    ...parsed,
    name: legacyId,
    version: '1',
  });
}

export function engineeringSourceArtifactIdentity(
  sourceId: string,
): EngineeringArtifactIdentity {
  const parts = sourceId.split('-');
  const systemCode = parts[0].toUpperCase();
  const slug = parts
    .slice(1)
    .join('-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-');
  return engineeringArtifactIdentity({
    type: 'SOURCE',
    systemCode: systemCode.length > 0 ? systemCode : 'EXT',
    slug: slug.length > 0 ? slug : 'UNKNOWN',
    sequence: stableSequence(sourceId),
    name: sourceId,
    version: '1',
    metadata: { sourceId },
  });
}

export function buildEngineeringArtifactChain(
  provenance: ResultProvenance,
): EngineeringArtifactProvenanceChain | null {
  const result = engineeringResultArtifactIdentity(provenance.resultId);
  const calculation = engineeringCalculationArtifactIdentity(provenance.resultId);
  const primitive = engineeringPrimitiveArtifactIdentity(provenance.resultId);
  if (!result || !calculation || !primitive) {
    return null;
  }
  return {
    result: { identity: result, label: provenance.resultId },
    calculation: {
      identity: calculation,
      label: provenance.calculation.method,
    },
    primitive: { identity: primitive, label: provenance.calculation.formula },
    assumptions: provenance.assumptions.map((text) => ({ text })),
    sources: provenance.sources.map((sourceId) => ({
      identity: engineeringSourceArtifactIdentity(sourceId),
      label: sourceId,
    })),
  };
}

function parseLegacyArtifactId(
  legacyId: string,
): { systemCode: string; slug: string; sequence: number } | null {
  const parts = legacyId.split('-');
  if (parts.length < 3) {
    return null;
  }
  const sequenceText = parts[parts.length - 1];
  if (!/^[0-9]{3}$/.test(sequenceText)) {
    return null;
  }
  return {
    systemCode: parts[0],
    slug: parts.slice(1, -1).join('-'),
    sequence: Number(sequenceText),
  };
}

function stableSequence(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return (hash % 999) + 1;
}