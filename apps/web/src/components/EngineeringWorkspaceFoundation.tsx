import type { ReactNode } from 'react';

export type EngineeringState =
  | 'UNKNOWN'
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'REVIEW_REQUIRED'
  | 'INVALID'
  | 'NON_AUTHORITATIVE'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'CURRENT'
  | 'HISTORICAL'
  | 'LOCAL_VERIFIED'
  | 'EXTERNAL_GATE';

const stateLabels: Record<EngineeringState, string> = {
  UNKNOWN: 'UNKNOWN',
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  REVIEW_REQUIRED: 'REVIEW REQUIRED',
  INVALID: 'INVALID',
  NON_AUTHORITATIVE: 'NON-AUTHORITATIVE',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
  CURRENT: 'CURRENT',
  HISTORICAL: 'HISTORICAL',
  LOCAL_VERIFIED: 'LOCAL VERIFIED',
  EXTERNAL_GATE: 'EXTERNAL GATE',
};

const stateSymbols: Record<EngineeringState, string> = {
  UNKNOWN: '?',
  VERIFIED: '✓',
  UNVERIFIED: '○',
  REVIEW_REQUIRED: '!',
  INVALID: '×',
  NON_AUTHORITATIVE: '≈',
  APPROVED: '✓',
  REJECTED: '×',
  SUPERSEDED: '↗',
  CURRENT: '●',
  HISTORICAL: '◌',
  LOCAL_VERIFIED: '✓',
  EXTERNAL_GATE: '◇',
};

export function StateBadge({
  state,
  detail,
}: {
  state: EngineeringState;
  detail?: string;
}) {
  return (
    <span
      className={`engineering-state engineering-state--${state.toLowerCase()}`}
      title={detail}
      aria-label={`${stateLabels[state]}${detail ? `: ${detail}` : ''}`}
    >
      <span aria-hidden="true">{stateSymbols[state]}</span>
      {stateLabels[state]}
    </span>
  );
}

export interface EvidenceChainNode {
  readonly label: string;
  readonly identity: string;
  readonly state: EngineeringState;
  readonly detail: string;
}

export function EvidenceChain({
  nodes,
  title = 'Evidence chain',
}: {
  nodes: readonly EvidenceChainNode[];
  title?: string;
}) {
  return (
    <section className="evidence-chain" aria-labelledby="evidence-chain-title">
      <div className="evidence-chain__heading">
        <div>
          <span className="eyebrow">Traceability</span>
          <h2 id="evidence-chain-title">{title}</h2>
        </div>
        <span className="evidence-chain__rule">identity → evidence → decision</span>
      </div>
      <ol className="evidence-chain__nodes">
        {nodes.map((node, index) => (
          <li className="evidence-chain__node" key={`${node.label}-${node.identity}`}>
            <div className="evidence-chain__node-top">
              <span className="evidence-chain__index">0{index + 1}</span>
              <StateBadge state={node.state} />
            </div>
            <strong>{node.label}</strong>
            <code>{node.identity}</code>
            <span>{node.detail}</span>
            {index < nodes.length - 1 && (
              <span className="evidence-chain__connector" aria-hidden="true">
                ↓
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

interface NavigationSection {
  readonly title: string;
  readonly items: readonly string[];
}

export const navigation: readonly NavigationSection[] = [
  { title: 'Command', items: ['Overview', 'Search'] },
  {
    title: 'Engineering',
    items: ['Assets', 'Models', 'Calculations', 'Evidence', 'Decisions', 'Documents', 'Revisions'],
  },
  { title: 'Knowledge', items: ['Knowledge', 'Graph', 'AI Analysis'] },
  { title: 'Operations', items: ['Runtime', 'Database', 'Releases', 'Audit'] },
  { title: 'System', items: ['Users', 'Permissions', 'Settings'] },
];

export function WorkspaceNavigation({
  active = 'Overview',
  onNavigate,
}: {
  active?: string;
  onNavigate?: (item: string) => void;
}) {
  return (
    <nav className="workspace-navigation" aria-label="Engineering workspace navigation">
      <div className="workspace-navigation__intro">
        <span className="eyebrow">Workspace map</span>
        <strong>Engineering intelligence</strong>
        <span>Projection only · application contracts remain authoritative</span>
      </div>
      {navigation.map((section) => (
        <div className="workspace-navigation__section" key={section.title}>
          <span className="workspace-navigation__section-title">{section.title}</span>
          {section.items.map((item) => (
            <button
              type="button"
              className={item === active ? 'workspace-navigation__item workspace-navigation__item--active' : 'workspace-navigation__item'}
              aria-current={item === active ? 'page' : undefined}
              onClick={() => onNavigate?.(item)}
              key={item}
            >
              <span aria-hidden="true">{item === active ? '●' : '·'}</span>
              {item}
              {['Assets', 'Calculations', 'Evidence', 'Decisions', 'Documents', 'Revisions'].includes(item) && (
                <StateBadge state="UNKNOWN" />
              )}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function IntegrityOverview() {
  const items: readonly [string, EngineeringState, string][] = [
    ['Identity', 'UNKNOWN', 'No persisted asset identity is connected to this local study.'],
    ['Provenance', 'LOCAL_VERIFIED', 'Inputs and model outputs are traceable within this session.'],
    ['Evidence', 'REVIEW_REQUIRED', 'Required field measurements are not attached.'],
    ['Revision', 'UNKNOWN', 'No revision lineage is available for this local session.'],
    ['Authority', 'NON_AUTHORITATIVE', 'Concept screening is not approved engineering design.'],
    ['Unknown states', 'UNKNOWN', 'Unknown is retained where the application has no fact.'],
  ];

  return (
    <section className="integrity-overview" aria-labelledby="integrity-overview-title">
      <div className="integrity-overview__heading">
        <span className="eyebrow">Command / Overview</span>
        <h2 id="integrity-overview-title">Engineering integrity</h2>
        <p>Every status below is a statement about available application evidence, not a fabricated KPI.</p>
      </div>
      <div className="integrity-overview__grid">
        {items.map(([label, state, detail]) => (
          <article className="integrity-card" key={label}>
            <div className="integrity-card__top">
              <span>{label}</span>
              <StateBadge state={state} />
            </div>
            <p>{detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function WorkspaceSection({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`workspace-foundation-section ${className}`}>{children}</section>;
}
