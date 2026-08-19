import {
  engineeringCalculationIdentityFromLegacyId,
  engineeringPrimitiveIdentityFromLegacyId,
  engineeringResultIdentityFromLegacyId,
  engineeringSourceIdentityFromSourceId,
  type EngineeringArtifactIdentity,
  type EngineeringCalculationResult,
  type RequiredEvidence,
} from '@jaryan/shared-domain';
import type {
  SourceRequirement,
  TraceabilityBundle,
  TraceabilityLink,
} from './traceability.ts';

export type { RequiredEvidence };

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
  readonly sourceRequirement: SourceRequirement;
  readonly requiredEvidence: readonly RequiredEvidence[];
  readonly missingEvidence: readonly RequiredEvidence[];
  readonly missingRequiredEvidence: boolean;
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
  const requiredEvidence: RequiredEvidence[] = [
    'METHOD',
    'FORMULA',
    'INPUTS',
    'ASSUMPTIONS',
  ];
  if (link.sourceRequirement === 'REQUIRED') {
    requiredEvidence.push('SOURCES');
  }
  const missingEvidence: RequiredEvidence[] = [];
  if (link.method.length === 0) {
    missingEvidence.push('METHOD');
  }
  if (link.formula.length === 0) {
    missingEvidence.push('FORMULA');
  }
  if (link.inputs.length === 0) {
    missingEvidence.push('INPUTS');
  }
  if (link.assumptions.length === 0) {
    missingEvidence.push('ASSUMPTIONS');
  }
  if (link.sourceRequirement === 'REQUIRED' && link.sourceIds.length === 0) {
    missingEvidence.push('SOURCES');
  }
  const missingRequiredEvidence = missingEvidence.includes('SOURCES');
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
    sourceRequirement: link.sourceRequirement,
    requiredEvidence,
    missingEvidence,
    missingRequiredEvidence,
    complete: missingEvidence.length === 0,
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
  return engineeringResultIdentityFromLegacyId(legacyId, '1');
}

export function engineeringCalculationArtifactIdentity(
  legacyId: string,
): EngineeringArtifactIdentity | null {
  return engineeringCalculationIdentityFromLegacyId(legacyId, '1');
}

export function engineeringPrimitiveArtifactIdentity(
  legacyId: string,
): EngineeringArtifactIdentity | null {
  return engineeringPrimitiveIdentityFromLegacyId(legacyId, '1');
}

export function engineeringSourceArtifactIdentity(
  sourceId: string,
): EngineeringArtifactIdentity {
  return engineeringSourceIdentityFromSourceId(sourceId, '1');
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