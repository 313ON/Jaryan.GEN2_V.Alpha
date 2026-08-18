import type { AuthorityLevel } from '../sources/source-registry.ts';

export const AUTHORITY_LEVELS: readonly AuthorityLevel[] = [
  'P0',
  'P1',
  'P2',
  'P3',
  'P4',
  'P5',
  'P6',
];

export const AUTHORITY_MODEL: Record<
  AuthorityLevel,
  { readonly rank: number; readonly label: string; readonly note: string }
> = {
  P0: {
    rank: 0,
    label: 'Applicable mandatory Iranian regulation / code',
    note: 'Highest authority within Iran for the governed domain.',
  },
  P1: {
    rank: 1,
    label: 'Site-specific laboratory / field test',
    note: 'Overrides remote or generic estimates for the tested property.',
  },
  P2: {
    rank: 2,
    label: 'Official evaluation / certification',
    note: 'Evaluated system or product reports (e.g., ICC-ES evaluation reports).',
  },
  P3: {
    rank: 3,
    label: 'Peer-reviewed engineering research',
    note: 'Peer-reviewed publications and validated design methodologies.',
  },
  P4: {
    rank: 4,
    label: 'Recognized international standard',
    note: 'Standards and established references recognized internationally.',
  },
  P5: {
    rank: 5,
    label: 'Manufacturer / system documentation',
    note: 'Vendor and system-provider documentation.',
  },
  P6: {
    rank: 6,
    label: 'Engineering assumption',
    note: 'Explicit assumption; never promoted to fact.',
  },
};

export function authorityRank(level: AuthorityLevel): number {
  return AUTHORITY_MODEL[level].rank;
}

export function isHigherAuthority(
  candidate: AuthorityLevel,
  reference: AuthorityLevel,
): boolean {
  return authorityRank(candidate) < authorityRank(reference);
}

export const AUTHORITY_APPLICABILITY = {
  statement:
    'Authority level does NOT automatically mean applicability. A mandatory Iranian code (P0) only governs when it applies to the project; a peer-reviewed paper (P3) does not become more applicable by being higher ranked than an unrelated code. Applicability is decided by jurisdiction, domain, document type, and project context, not by authority rank alone.',
} as const;
