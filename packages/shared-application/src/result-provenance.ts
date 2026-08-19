import {
  deriveEngineeringEvidence,
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
    (entry) =>
      entry.calculationId === result.id ||
      engineeringResultIdentityFromLegacyId(entry.calculationId, '1')?.id ===
        result.identityId,
  );
  if (!link) {
    return null;
  }
  const evidence = deriveEngineeringEvidence({
    method: link.method,
    formula: link.formula,
    inputs: link.inputs,
    assumptions: link.assumptions,
    sources: link.sourceIds,
    sourceRequired: link.sourceRequirement === 'REQUIRED',
  });
  const missingEvidence = evidence.missingEvidence;
  const missingRequiredEvidence = missingEvidence.includes('SOURCES');
  return {
    // Preserve the existing provenance output shape: traceability bundles are
    // keyed by legacy calculation ids even when result.id is canonical.
    resultId: link.calculationId,
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
    requiredEvidence: evidence.requiredEvidence,
    missingEvidence,
    missingRequiredEvidence,
    complete: evidence.complete,
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
