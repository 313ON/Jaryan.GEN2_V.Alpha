import {
  analyzeRegisteredEngineeringImpact,
  directDependenciesOf,
  directDependentsOf,
  engineeringDependencyGraphOfResolvedGraph,
  resolveEngineeringArtifactReference,
  resolveEngineeringKnowledgeGraph,
  type EngineeringArtifactIdentity,
  type EngineeringArtifactReference,
  type EngineeringArtifactResolution,
  type EngineeringKnowledgePackage,
  type EngineeringKnowledgeRegistry,
  type RegisteredEngineeringImpact,
  type ResolvedEngineeringKnowledgeGraph,
} from '@jaryan/shared-domain';

export interface EngineeringKnowledgeQuery {
  getPackage(identityId: string): EngineeringKnowledgePackage | null;
  getPackageByIdentity(
    identity: EngineeringArtifactIdentity,
  ): EngineeringKnowledgePackage | null;
  getPackagesByFingerprint(
    fingerprint: string,
  ): readonly EngineeringKnowledgePackage[];
  getPackageForArtifact(
    reference: EngineeringArtifactReference,
  ): EngineeringKnowledgePackage | null;
  resolveArtifact(
    reference: EngineeringArtifactReference,
  ): EngineeringArtifactResolution;
  getGraph(): ResolvedEngineeringKnowledgeGraph;
  getDirectDependencies(artifactId: string): readonly string[];
  getDirectDependents(artifactId: string): readonly string[];
  analyzeImpact(targetId: string): RegisteredEngineeringImpact;
  getProvenance(
    identityId: string,
  ): EngineeringKnowledgePackage['provenance'] | null;
}

export function createEngineeringKnowledgeQuery(
  registry: EngineeringKnowledgeRegistry,
): EngineeringKnowledgeQuery {
  return Object.freeze({
    getPackage(identityId: string): EngineeringKnowledgePackage | null {
      return registry.get(identityId);
    },

    getPackageByIdentity(
      identity: EngineeringArtifactIdentity,
    ): EngineeringKnowledgePackage | null {
      return registry.getByIdentity(identity);
    },

    getPackagesByFingerprint(
      fingerprint: string,
    ): readonly EngineeringKnowledgePackage[] {
      return registry.getByFingerprint(fingerprint);
    },

    getPackageForArtifact(
      reference: EngineeringArtifactReference,
    ): EngineeringKnowledgePackage | null {
      const resolution = resolveEngineeringArtifactReference(
        registry,
        reference,
      );
      if (
        resolution.status !== 'RESOLVED' ||
        resolution.owningPackageIds.length !== 1
      ) {
        return null;
      }
      return registry.get(resolution.owningPackageIds[0]) ?? null;
    },

    resolveArtifact(
      reference: EngineeringArtifactReference,
    ): EngineeringArtifactResolution {
      return resolveEngineeringArtifactReference(registry, reference);
    },

    getGraph(): ResolvedEngineeringKnowledgeGraph {
      return resolveEngineeringKnowledgeGraph(registry);
    },

    getDirectDependencies(artifactId: string): readonly string[] {
      return directDependenciesOf(
        engineeringDependencyGraphOfResolvedGraph(
          resolveEngineeringKnowledgeGraph(registry),
        ),
        artifactId,
      );
    },

    getDirectDependents(artifactId: string): readonly string[] {
      return directDependentsOf(
        engineeringDependencyGraphOfResolvedGraph(
          resolveEngineeringKnowledgeGraph(registry),
        ),
        artifactId,
      );
    },

    analyzeImpact(targetId: string): RegisteredEngineeringImpact {
      return analyzeRegisteredEngineeringImpact(registry, targetId);
    },

    getProvenance(
      identityId: string,
    ): EngineeringKnowledgePackage['provenance'] | null {
      return registry.get(identityId)?.provenance ?? null;
    },
  });
}
