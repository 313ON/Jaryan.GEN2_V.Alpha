export type EngineeringArtifactType =
  | 'SOURCE'
  | 'PRIMITIVE'
  | 'CALCULATION'
  | 'RESULT'
  | 'BENCHMARK';

export const ENGINEERING_ARTIFACT_TYPES: readonly EngineeringArtifactType[] = [
  'SOURCE',
  'PRIMITIVE',
  'CALCULATION',
  'RESULT',
  'BENCHMARK',
];

export const ENGINEERING_ARTIFACT_TYPE_PREFIXES: Record<EngineeringArtifactType, string> = {
  SOURCE: 'SRC',
  PRIMITIVE: 'PRIM',
  CALCULATION: 'CALC',
  RESULT: 'RESULT',
  BENCHMARK: 'BENCH',
};

export const ENGINEERING_ARTIFACT_VERSION_PATTERN = '^[0-9]+(\\.[0-9]+)*$';

export interface EngineeringArtifactIdentity {
  readonly id: string;
  readonly baseId: string;
  readonly type: EngineeringArtifactType;
  readonly name: string;
  readonly version: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface EngineeringArtifactIdentityInput {
  readonly type: EngineeringArtifactType;
  readonly systemCode: string;
  readonly slug: string;
  readonly sequence: number;
  readonly name: string;
  readonly version: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export function isEngineeringArtifactType(
  value: unknown,
): value is EngineeringArtifactType {
  return ENGINEERING_ARTIFACT_TYPES.includes(value as EngineeringArtifactType);
}

export function engineeringArtifactId(
  type: EngineeringArtifactType,
  systemCode: string,
  slug: string,
  sequence: number,
): string {
  const prefix = ENGINEERING_ARTIFACT_TYPE_PREFIXES[type];
  const normalizedSystem = systemCode.toUpperCase();
  const normalizedSlug = slug.toUpperCase();
  const paddedSequence = String(sequence).padStart(3, '0');
  return `${prefix}-${normalizedSystem}-${normalizedSlug}-${paddedSequence}`;
}

export function engineeringArtifactVersionedId(
  type: EngineeringArtifactType,
  systemCode: string,
  slug: string,
  sequence: number,
  version: string,
): string {
  return `${engineeringArtifactId(
    type,
    systemCode,
    slug,
    sequence,
  )}-v${version}`;
}

export function engineeringArtifactVersionOf(
  baseId: string,
  version: string,
): string {
  return `${baseId}-v${version}`;
}

export function engineeringArtifactLineageKey(
  identity: EngineeringArtifactIdentity,
): string | null {
  const prefix = ENGINEERING_ARTIFACT_TYPE_PREFIXES[identity.type];
  const baseId = identity.baseId;
  if (typeof baseId !== 'string' || !baseId.startsWith(`${prefix}-`)) {
    return null;
  }
  const stem = baseId.slice(prefix.length + 1);
  if (!/^[A-Z][A-Z0-9-]*-\d{3}$/.test(stem)) {
    return null;
  }
  return stem;
}

export function engineeringArtifactIdentity(
  input: EngineeringArtifactIdentityInput,
): EngineeringArtifactIdentity {
  const normalized: EngineeringArtifactIdentityInput = {
    ...input,
    systemCode: input.systemCode.toUpperCase(),
    slug: input.slug.toUpperCase(),
  };
  const errors = validateEngineeringArtifactIdentityInput(normalized);
  if (errors.length > 0) {
    throw new Error(
      `Invalid engineering artifact identity: ${errors.join('; ')}`,
    );
  }
  return {
    id: engineeringArtifactVersionedId(
      normalized.type,
      normalized.systemCode,
      normalized.slug,
      normalized.sequence,
      normalized.version,
    ),
    baseId: engineeringArtifactId(
      normalized.type,
      normalized.systemCode,
      normalized.slug,
      normalized.sequence,
    ),
    type: normalized.type,
    name: normalized.name,
    version: normalized.version,
    metadata: { ...normalized.metadata },
  };
}

export function validateEngineeringArtifactIdentityInput(
  input: EngineeringArtifactIdentityInput,
): readonly string[] {
  const errors: string[] = [];
  if (!isEngineeringArtifactType(input.type)) {
    errors.push(`Unsupported artifact type: ${String(input.type)}`);
  }
  if (!/^[A-Z][A-Z0-9]*$/.test(input.systemCode)) {
    errors.push('System code must match ^[A-Z][A-Z0-9]*$.');
  }
  if (!/^[A-Z][A-Z0-9-]*$/.test(input.slug)) {
    errors.push('Slug must match ^[A-Z][A-Z0-9-]*$.');
  }
  if (
    !Number.isInteger(input.sequence) ||
    input.sequence < 1 ||
    input.sequence > 999
  ) {
    errors.push('Sequence must be an integer from 1 to 999.');
  }
  if (input.name.length === 0) {
    errors.push('Name must not be empty.');
  }
  if (input.version.length === 0) {
    errors.push('Version must not be empty.');
  }
  if (!new RegExp(ENGINEERING_ARTIFACT_VERSION_PATTERN).test(input.version)) {
    errors.push(
      'Version must match ^[0-9]+(\\.[0-9]+)*$ (numeric, dot-separated).',
    );
  }
  return errors;
}

export function validateEngineeringArtifactIdentity(
  identity: EngineeringArtifactIdentity,
): readonly string[] {
  const errors: string[] = [];
  if (!isEngineeringArtifactType(identity.type)) {
    errors.push(`Unsupported artifact type: ${String(identity.type)}`);
  }
  if ((identity.name?.length ?? 0) === 0) {
    errors.push('Name must not be empty.');
  }
  if ((identity.version?.length ?? 0) === 0) {
    errors.push('Version must not be empty.');
  }
  if (
    identity.version &&
    !new RegExp(ENGINEERING_ARTIFACT_VERSION_PATTERN).test(identity.version)
  ) {
    errors.push(
      'Version must match ^[0-9]+(\\.[0-9]+)*$ (numeric, dot-separated).',
    );
  }
  const prefix = ENGINEERING_ARTIFACT_TYPE_PREFIXES[identity.type];
  if (!identity.baseId?.startsWith(`${prefix}-`)) {
    errors.push(`Base id must start with the ${prefix} type prefix.`);
  }
  if (!/-\d{3}$/.test(identity.baseId ?? '')) {
    errors.push('Base id must end with a three-digit sequence.');
  }
  if (
    identity.id !==
    engineeringArtifactVersionOf(identity.baseId ?? '', identity.version ?? '')
  ) {
    errors.push('Id must equal the base id plus version.');
  }
  return errors;
}