import {
  type EngineeringArtifactIdentity,
  validateEngineeringArtifactIdentity,
} from './artifact-identity.ts';

export const SEMANTIC_BACKBONE_GRAPH_AUTHORITY = 'KnowledgeGraph' as const;

export type SemanticBackboneResolutionStatus =
  | 'RESOLVED'
  | 'AMBIGUOUS'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'UNKNOWN'
  | 'CONFLICTING'
  | 'NOT_APPLICABLE';

export const SEMANTIC_BACKBONE_RESOLUTION_STATUSES: readonly SemanticBackboneResolutionStatus[] =
  [
    'RESOLVED',
    'AMBIGUOUS',
    'NOT_FOUND',
    'INVALID',
    'UNKNOWN',
    'CONFLICTING',
    'NOT_APPLICABLE',
  ];

/**
 * These are semantic roles, not a second identity system. The canonical
 * identity reference remains an EngineeringArtifactIdentity until a governed
 * extension of that authority is approved.
 */
export type PhysicalAssetKind =
  | 'SITE'
  | 'FACILITY'
  | 'BUILDING'
  | 'LEVEL'
  | 'SPACE'
  | 'PHYSICAL_ELEMENT'
  | 'ENGINEERING_SYSTEM'
  | 'EQUIPMENT';

export const PHYSICAL_ASSET_KINDS: readonly PhysicalAssetKind[] = [
  'SITE',
  'FACILITY',
  'BUILDING',
  'LEVEL',
  'SPACE',
  'PHYSICAL_ELEMENT',
  'ENGINEERING_SYSTEM',
  'EQUIPMENT',
];

export type LifecycleState =
  | 'DESIGNED'
  | 'ISSUED'
  | 'INSTALLED'
  | 'INSPECTED'
  | 'MAINTAINED'
  | 'UNKNOWN';

export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  'DESIGNED',
  'ISSUED',
  'INSTALLED',
  'INSPECTED',
  'MAINTAINED',
  'UNKNOWN',
];

export type UncertaintyState =
  | 'KNOWN'
  | 'ESTIMATED'
  | 'UNCERTAIN'
  | 'CONFLICTING'
  | 'UNKNOWN';

export const UNCERTAINTY_STATES: readonly UncertaintyState[] = [
  'KNOWN',
  'ESTIMATED',
  'UNCERTAIN',
  'CONFLICTING',
  'UNKNOWN',
];

export interface TemporalValidity {
  /** An omitted boundary is explicitly unknown, not inferred. */
  readonly validFrom?: string;
  /** An omitted end boundary is open or unknown and must not be closed implicitly. */
  readonly validTo?: string;
  readonly recordedAt: string;
}

export interface PhysicalAssetSemanticIdentity {
  readonly identityAuthority: typeof SEMANTIC_BACKBONE_IDENTITY_AUTHORITY;
  readonly canonicalIdentity: EngineeringArtifactIdentity;
  readonly kind: PhysicalAssetKind;
  readonly lifecycleState: LifecycleState;
  readonly temporalValidity: TemporalValidity;
  readonly uncertainty: UncertaintyState;
  readonly relatedArtifactIdentities: readonly EngineeringArtifactIdentity[];
}

export const SEMANTIC_BACKBONE_IDENTITY_AUTHORITY =
  'EngineeringArtifactIdentity' as const;

export interface PhysicalAssetSemanticIdentityInput
  extends Omit<PhysicalAssetSemanticIdentity, 'identityAuthority'> {
  readonly identityAuthority?: typeof SEMANTIC_BACKBONE_IDENTITY_AUTHORITY;
}

export interface EngineeringObjectReference {
  readonly identity: PhysicalAssetSemanticIdentity;
  readonly objectKind: PhysicalAssetKind;
}

export type SemanticRelationshipType =
  | 'calculated-for'
  | 'designed-for'
  | 'observed-at'
  | 'verified-by'
  | 'supported-by'
  | 'affects'
  | 'located-in';

export const SEMANTIC_RELATIONSHIP_TYPES: readonly SemanticRelationshipType[] = [
  'calculated-for',
  'designed-for',
  'observed-at',
  'verified-by',
  'supported-by',
  'affects',
  'located-in',
];

export type SemanticBackboneEndpoint =
  | {
      readonly kind: 'physical-asset';
      readonly identity: PhysicalAssetSemanticIdentity;
    }
  | {
      readonly kind: 'engineering-artifact';
      readonly identity: EngineeringArtifactIdentity;
    }
  | {
      readonly kind: 'engineering-object';
      readonly identity: EngineeringObjectReference;
    };

export interface SemanticBackboneRelationship {
  readonly graphAuthority: typeof SEMANTIC_BACKBONE_GRAPH_AUTHORITY;
  readonly type: SemanticRelationshipType;
  readonly from: SemanticBackboneEndpoint;
  readonly to: SemanticBackboneEndpoint;
  readonly temporalValidity: TemporalValidity;
  readonly resolution: SemanticBackboneResolutionStatus;
  readonly evidenceReference: EngineeringArtifactIdentity | null;
}

export type GeometryRepresentationType =
  | 'DESIGN'
  | 'SURVEY'
  | 'INSTALLED'
  | 'MEASURED'
  | 'IMPORTED'
  | 'UNCERTAIN';

export const GEOMETRY_REPRESENTATION_TYPES: readonly GeometryRepresentationType[] = [
  'DESIGN',
  'SURVEY',
  'INSTALLED',
  'MEASURED',
  'IMPORTED',
  'UNCERTAIN',
];

export type GeometryState = 'DESIGNED' | 'SURVEYED' | 'INSTALLED' | 'UNKNOWN';

export const GEOMETRY_STATES: readonly GeometryState[] = [
  'DESIGNED',
  'SURVEYED',
  'INSTALLED',
  'UNKNOWN',
];

export interface GeometrySemanticMetadata {
  readonly representationType: GeometryRepresentationType;
  readonly state: GeometryState;
  readonly coordinateReference: string | null;
  readonly units: string | null;
  /** Opaque semantic description of how the representation was produced. */
  readonly productionMethod: string | null;
  readonly uncertainty: UncertaintyState;
  readonly temporalValidity: TemporalValidity;
  readonly evidenceReference: EngineeringArtifactIdentity | null;
}

export interface GeometrySemanticMetadataInput
  extends Omit<GeometrySemanticMetadata, 'productionMethod'> {
  readonly productionMethod?: string | null;
}

export function physicalAssetSemanticIdentity(
  input: PhysicalAssetSemanticIdentityInput,
): PhysicalAssetSemanticIdentity {
  const errors = validatePhysicalAssetSemanticIdentity(input);
  if (errors.length > 0) {
    throw new Error(`Invalid physical asset semantic identity: ${errors.join('; ')}`);
  }
  return deepFreeze({
    identityAuthority: SEMANTIC_BACKBONE_IDENTITY_AUTHORITY,
    canonicalIdentity: input.canonicalIdentity,
    kind: input.kind,
    lifecycleState: input.lifecycleState,
    temporalValidity: { ...input.temporalValidity },
    uncertainty: input.uncertainty,
    relatedArtifactIdentities: [...input.relatedArtifactIdentities].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  });
}

export function semanticBackboneRelationship(
  input: Omit<SemanticBackboneRelationship, 'graphAuthority'> & {
    readonly graphAuthority?: typeof SEMANTIC_BACKBONE_GRAPH_AUTHORITY;
  },
): SemanticBackboneRelationship {
  const errors = validateSemanticBackboneRelationship(input);
  if (errors.length > 0) {
    throw new Error(`Invalid semantic backbone relationship: ${errors.join('; ')}`);
  }
  return deepFreeze({
    graphAuthority: SEMANTIC_BACKBONE_GRAPH_AUTHORITY,
    type: input.type,
    from: input.from,
    to: input.to,
    temporalValidity: { ...input.temporalValidity },
    resolution: input.resolution,
    evidenceReference: input.evidenceReference,
  });
}

export function geometrySemanticMetadata(
  input: GeometrySemanticMetadataInput,
): GeometrySemanticMetadata {
  const errors = validateGeometrySemanticMetadata(input);
  if (errors.length > 0) {
    throw new Error(`Invalid geometry semantic metadata: ${errors.join('; ')}`);
  }
  return deepFreeze({
    ...input,
    productionMethod: input.productionMethod ?? null,
    temporalValidity: { ...input.temporalValidity },
  });
}

export function validatePhysicalAssetSemanticIdentity(
  input: PhysicalAssetSemanticIdentityInput,
): readonly string[] {
  const errors = [
    ...validateArtifactIdentity(input.canonicalIdentity, 'Canonical identity'),
    ...validateTemporalValidity(input.temporalValidity, 'Temporal validity'),
  ];
  if (input.identityAuthority !== undefined) {
    if (input.identityAuthority !== SEMANTIC_BACKBONE_IDENTITY_AUTHORITY) {
      errors.push('Identity authority must be EngineeringArtifactIdentity.');
    }
  }
  if (!PHYSICAL_ASSET_KINDS.includes(input.kind)) {
    errors.push(`Unsupported physical asset kind: ${String(input.kind)}.`);
  }
  if (!LIFECYCLE_STATES.includes(input.lifecycleState)) {
    errors.push(`Unsupported lifecycle state: ${String(input.lifecycleState)}.`);
  }
  if (!UNCERTAINTY_STATES.includes(input.uncertainty)) {
    errors.push(`Unsupported uncertainty state: ${String(input.uncertainty)}.`);
  }
  if (!Array.isArray(input.relatedArtifactIdentities)) {
    errors.push('Related artifact identities must be an array.');
  } else {
    input.relatedArtifactIdentities.forEach((identity, index) => {
      errors.push(
        ...validateArtifactIdentity(identity, `Related artifact identity ${index}`),
      );
    });
  }
  return errors;
}

export function validateSemanticBackboneRelationship(
  input: Omit<SemanticBackboneRelationship, 'graphAuthority'> & {
    readonly graphAuthority?: typeof SEMANTIC_BACKBONE_GRAPH_AUTHORITY;
  },
): readonly string[] {
  const errors = [
    ...validateTemporalValidity(input.temporalValidity, 'Temporal validity'),
  ];
  if (
    input.graphAuthority !== undefined &&
    input.graphAuthority !== SEMANTIC_BACKBONE_GRAPH_AUTHORITY
  ) {
    errors.push('Graph authority must be KnowledgeGraph.');
  }
  if (!SEMANTIC_RELATIONSHIP_TYPES.includes(input.type)) {
    errors.push(`Unsupported semantic relationship type: ${String(input.type)}.`);
  }
  if (!SEMANTIC_BACKBONE_RESOLUTION_STATUSES.includes(input.resolution)) {
    errors.push(`Unsupported relationship resolution: ${String(input.resolution)}.`);
  }
  errors.push(...validateEndpoint(input.from, 'From endpoint'));
  errors.push(...validateEndpoint(input.to, 'To endpoint'));
  if (input.evidenceReference !== null) {
    errors.push(...validateArtifactIdentity(input.evidenceReference, 'Evidence reference'));
  }
  return errors;
}

export function validateGeometrySemanticMetadata(
  input: GeometrySemanticMetadataInput,
): readonly string[] {
  const errors = [
    ...validateTemporalValidity(input.temporalValidity, 'Temporal validity'),
  ];
  if (!GEOMETRY_REPRESENTATION_TYPES.includes(input.representationType)) {
    errors.push(
      `Unsupported geometry representation type: ${String(input.representationType)}.`,
    );
  }
  if (!GEOMETRY_STATES.includes(input.state)) {
    errors.push(`Unsupported geometry state: ${String(input.state)}.`);
  }
  if (!UNCERTAINTY_STATES.includes(input.uncertainty)) {
    errors.push(`Unsupported geometry uncertainty: ${String(input.uncertainty)}.`);
  }
  if (input.coordinateReference !== null && input.coordinateReference.trim() === '') {
    errors.push('Coordinate reference must be non-empty or null.');
  }
  if (input.units !== null && input.units.trim() === '') {
    errors.push('Units must be non-empty or null.');
  }
  if (
    input.productionMethod !== undefined &&
    input.productionMethod !== null &&
    (typeof input.productionMethod !== 'string' ||
      input.productionMethod.trim() === '')
  ) {
    errors.push('Production method must be non-empty or null.');
  }
  if (input.evidenceReference !== null) {
    errors.push(...validateArtifactIdentity(input.evidenceReference, 'Evidence reference'));
  }
  return errors;
}

export function validateTemporalValidity(
  value: TemporalValidity,
  label = 'Temporal validity',
): readonly string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return [`${label} must be provided.`];
  }
  for (const [name, timestamp] of [
    ['validFrom', value.validFrom],
    ['validTo', value.validTo],
    ['recordedAt', value.recordedAt],
  ] as const) {
    if (timestamp !== undefined && !isIsoTimestamp(timestamp)) {
      errors.push(`${label} ${name} must be an ISO-8601 timestamp.`);
    }
  }
  if (
    value.validFrom !== undefined &&
    value.validTo !== undefined &&
    isIsoTimestamp(value.validFrom) &&
    isIsoTimestamp(value.validTo) &&
    Date.parse(value.validFrom) > Date.parse(value.validTo)
  ) {
    errors.push(`${label} validFrom must not be after validTo.`);
  }
  return errors;
}

function validateEndpoint(
  endpoint: SemanticBackboneEndpoint,
  label: string,
): readonly string[] {
  if (!endpoint || typeof endpoint !== 'object') {
    return [`${label} must be provided.`];
  }
  if (
    endpoint.kind !== 'physical-asset' &&
    endpoint.kind !== 'engineering-artifact' &&
    endpoint.kind !== 'engineering-object'
  ) {
    return [`${label} has an unsupported kind.`];
  }
  if (endpoint.kind === 'physical-asset') {
    return validatePhysicalAssetSemanticIdentity(endpoint.identity).map(
      (error) => `${label}: ${error}`,
    );
  }
  if (endpoint.kind === 'engineering-artifact') {
    return validateArtifactIdentity(endpoint.identity, label);
  }
  const errors = validatePhysicalAssetSemanticIdentity(endpoint.identity.identity).map(
    (error) => `${label}: ${error}`,
  );
  if (endpoint.identity.objectKind !== endpoint.identity.identity.kind) {
    errors.push(`${label} object kind must match its identity kind.`);
  }
  return errors;
}

function validateArtifactIdentity(
  identity: EngineeringArtifactIdentity,
  label: string,
): readonly string[] {
  if (!identity || typeof identity !== 'object') {
    return [`${label} must be provided.`];
  }
  return validateEngineeringArtifactIdentity(identity).map((error) => `${label}: ${error}`);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value)) &&
    /T/.test(value)
  );
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
