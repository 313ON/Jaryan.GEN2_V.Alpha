import type { ConfidenceLevel } from './validation.ts';

export type SiteFactorStatus = 'PRELIMINARY' | 'VERIFIED' | 'UNKNOWN';

export interface RemoteDatasetEvidence {
  readonly sourceId: string;
  readonly resolution: string;
  readonly timestamp?: string;
  readonly confidence: ConfidenceLevel;
  readonly limitations: string;
  readonly status: SiteFactorStatus;
}

export interface SiteFactorEvidence<T> {
  readonly value: T;
  readonly evidence: RemoteDatasetEvidence;
}

export interface SiteIntelligence {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly elevationM?: SiteFactorEvidence<number>;
  readonly slope?: SiteFactorEvidence<number>;
  readonly aspect?: SiteFactorEvidence<number>;
  readonly terrain?: SiteFactorEvidence<string>;
  readonly soil?: SiteFactorEvidence<string>;
  readonly groundwater?: SiteFactorEvidence<string>;
  readonly seismic?: SiteFactorEvidence<string>;
  readonly climate?: SiteFactorEvidence<string>;
  readonly wind?: SiteFactorEvidence<number>;
  readonly solar?: SiteFactorEvidence<number>;
  readonly flood?: SiteFactorEvidence<string>;
  readonly landslide?: SiteFactorEvidence<string>;
  readonly hydrology?: SiteFactorEvidence<string>;
}

export interface SiteIntelligenceAssessment {
  readonly site: SiteIntelligence;
  readonly factorCount: number;
  readonly preliminaryFactorCount: number;
  readonly verifiedFactorCount: number;
  readonly unknownFactorCount: number;
  readonly overallStatus: SiteFactorStatus;
  readonly statement: string;
}

export function remoteEvidence(
  sourceId: string,
  resolution: string,
  limitations: string,
): RemoteDatasetEvidence {
  return {
    sourceId,
    resolution,
    confidence: 'LOW',
    limitations,
    status: 'PRELIMINARY',
  };
}

export function assessSiteIntelligence(
  site: SiteIntelligence,
): SiteIntelligenceAssessment {
  const factors = Object.values(site).filter(
    (value): value is SiteFactorEvidence<unknown> =>
      value !== null && typeof value === 'object' && 'evidence' in (value as object),
  );
  const preliminary = factors.filter(
    (factor) => factor.evidence.status === 'PRELIMINARY',
  ).length;
  const verified = factors.filter(
    (factor) => factor.evidence.status === 'VERIFIED',
  ).length;
  const unknown = factors.length - preliminary - verified;

  const overallStatus: SiteFactorStatus =
    verified === factors.length && factors.length > 0
      ? 'VERIFIED'
      : factors.length === 0
        ? 'UNKNOWN'
        : 'PRELIMINARY';

  return {
    site,
    factorCount: factors.length,
    preliminaryFactorCount: preliminary,
    verifiedFactorCount: verified,
    unknownFactorCount: unknown,
    overallStatus,
    statement:
      overallStatus === 'PRELIMINARY'
        ? 'Site intelligence is preliminary; remote datasets must not be promoted to verified engineering data.'
        : overallStatus === 'VERIFIED'
          ? 'Site intelligence factors are supported by field or laboratory evidence.'
          : 'No site intelligence factors are registered.',
  };
}