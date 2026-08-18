import {
  engineeringArtifactId,
  engineeringArtifactIdentity,
  type EngineeringArtifactIdentity,
} from './artifact-identity.ts';

export interface LegacyCalculationIdParts {
  readonly systemCode: string;
  readonly slug: string;
  readonly sequence: number;
}

export function parseLegacyCalculationId(
  legacyId: string,
): LegacyCalculationIdParts | null {
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

export function legacyCalculationArtifactBaseId(
  legacyId: string,
): string | null {
  const parsed = parseLegacyCalculationId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactId(
    'CALCULATION',
    parsed.systemCode,
    parsed.slug,
    parsed.sequence,
  );
}

export function engineeringCalculationIdentityFromLegacyId(
  legacyId: string,
  version = '1',
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyCalculationId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'CALCULATION',
    ...parsed,
    name: legacyId,
    version,
  });
}

export function engineeringPrimitiveIdentityFromLegacyId(
  legacyId: string,
  version = '1',
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyCalculationId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'PRIMITIVE',
    ...parsed,
    name: legacyId,
    version,
  });
}

export function engineeringResultIdentityFromLegacyId(
  legacyId: string,
  version = '1',
): EngineeringArtifactIdentity | null {
  const parsed = parseLegacyCalculationId(legacyId);
  if (!parsed) {
    return null;
  }
  return engineeringArtifactIdentity({
    type: 'RESULT',
    ...parsed,
    name: legacyId,
    version,
  });
}

export function engineeringSourceIdentityFromSourceId(
  sourceId: string,
  version = '1',
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
    sequence: stableHashSequence(sourceId),
    name: sourceId,
    version,
    metadata: { sourceId },
  });
}

function stableHashSequence(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return (hash % 999) + 1;
}