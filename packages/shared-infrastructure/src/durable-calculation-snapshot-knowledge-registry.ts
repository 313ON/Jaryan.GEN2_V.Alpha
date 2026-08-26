import {
  createEngineeringKnowledgePackage,
  createEngineeringKnowledgeRegistry,
  type DurableCalculationSnapshot,
  type EngineeringKnowledgeRegistry,
  type EngineeringCalculationResult,
  type PrimitiveInput,
} from '@jaryan/shared-domain';

export function createEngineeringKnowledgeRegistryFromSnapshot(
  snapshot: DurableCalculationSnapshot,
): EngineeringKnowledgeRegistry {
  if (snapshot.outcome !== 'COMPLETED' || snapshot.completedOutputs === null) {
    return createEngineeringKnowledgeRegistry();
  }
  const pkg = createEngineeringKnowledgePackage({
    identity: snapshot.provenanceBindings.result,
    definition: {
      calculationIdentity: snapshot.calculationIdentity,
      method: snapshot.method,
      formula: snapshot.formula,
      assumptions: snapshot.effectiveAssumptions as readonly string[],
    },
    inputs: snapshot.inputs as Readonly<Record<string, PrimitiveInput>>,
    result: snapshot.completedOutputs as EngineeringCalculationResult,
    provenance: snapshot.provenanceBindings,
    dependencies: snapshot.provenanceGraph,
  });
  return createEngineeringKnowledgeRegistry([pkg]);
}
