import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';
import {
  type EngineeringObjectSemanticReference,
  type EngineeringObjectSemanticReferenceInput,
  engineeringObjectSemanticReference,
} from './semantic-references.ts';
import {
  type PhysicalReferentIdentity,
  validatePhysicalReferentIdentity,
} from './physical-referent-identity.ts';

export type KnowledgeGraphEndpointKind = 'ARTIFACT' | 'PHYSICAL_REFERENT';

export type KnowledgeGraphEndpointIdentity =
  | EngineeringArtifactIdentity
  | PhysicalReferentIdentity;

export interface KnowledgeGraphEndpoint {
  readonly kind: KnowledgeGraphEndpointKind;
  readonly identity: KnowledgeGraphEndpointIdentity;
}

export function knowledgeGraphEndpoint(
  reference: EngineeringObjectSemanticReferenceInput | EngineeringObjectSemanticReference,
): KnowledgeGraphEndpoint {
  const errors = validateKnowledgeGraphEndpointReference(reference);
  if (errors.length > 0) {
    throw new Error(`Invalid KnowledgeGraph endpoint: ${errors.join('; ')}`);
  }
  const resolved = engineeringObjectSemanticReference(reference);
  return deepFreeze({
    kind: resolved.kind,
    identity: resolved.identity!,
  });
}

export function validateKnowledgeGraphEndpointReference(
  reference: EngineeringObjectSemanticReferenceInput | EngineeringObjectSemanticReference,
): readonly string[] {
  const errors: string[] = [];
  if (!reference || typeof reference !== 'object') {
    return ['Endpoint reference must be provided.'];
  }
  const identity = reference.identity ?? null;
  if (reference.status !== 'RESOLVED' || identity === null) {
    errors.push(
      `Endpoint reference must be RESOLVED; received ${String(reference.status)}.`,
    );
    return errors;
  }
  if (reference.kind === 'ARTIFACT') {
    if ('identityKind' in identity) {
      errors.push('ARTIFACT endpoints require EngineeringArtifactIdentity.');
    } else {
      errors.push(
        ...validateEngineeringArtifactIdentity(identity).map(
          (error) => `Artifact endpoint: ${error}`,
        ),
      );
    }
  } else if (reference.kind === 'PHYSICAL_REFERENT') {
    if (!('identityKind' in identity)) {
      errors.push('PHYSICAL_REFERENT endpoints require PhysicalReferentIdentity.');
    } else {
      errors.push(
        ...validatePhysicalReferentIdentity(identity).map(
          (error) => `Physical referent endpoint: ${error}`,
        ),
      );
    }
  } else {
    errors.push(`Unsupported KnowledgeGraph endpoint kind: ${String(reference.kind)}.`);
  }
  return errors;
}

export function validateKnowledgeGraphEndpoint(
  endpoint: KnowledgeGraphEndpoint,
): readonly string[] {
  if (!endpoint || typeof endpoint !== 'object') {
    return ['KnowledgeGraph endpoint must be provided.'];
  }
  if (endpoint.kind === 'ARTIFACT') {
    if ('identityKind' in endpoint.identity) {
      return ['ARTIFACT endpoints require EngineeringArtifactIdentity.'];
    }
    return validateEngineeringArtifactIdentity(endpoint.identity);
  }
  if (endpoint.kind === 'PHYSICAL_REFERENT') {
    if (!('identityKind' in endpoint.identity)) {
      return ['PHYSICAL_REFERENT endpoints require PhysicalReferentIdentity.'];
    }
    return validatePhysicalReferentIdentity(endpoint.identity);
  }
  return [`Unsupported KnowledgeGraph endpoint kind: ${String(endpoint.kind)}.`];
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
