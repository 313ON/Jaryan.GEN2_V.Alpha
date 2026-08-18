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

export interface EngineeringArtifactIdentity {
  readonly id: string;
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

export function engineeringArtifactIdentity(
  input: EngineeringArtifactIdentityInput,
): EngineeringArtifactIdentity {
  return {
    id: engineeringArtifactId(
      input.type,
      input.systemCode,
      input.slug,
      input.sequence,
    ),
    type: input.type,
    name: input.name,
    version: input.version,
    metadata: { ...input.metadata },
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
  return errors;
}