export type EngineeringPolicyRuleId =
  | 'POL-01'
  | 'POL-02'
  | 'POL-03'
  | 'POL-04'
  | 'POL-05'
  | 'POL-06'
  | 'POL-07'
  | 'POL-08'
  | 'POL-09'
  | 'POL-10'
  | 'POL-11'
  | 'POL-12'
  | 'POL-13'
  | 'POL-14'
  | 'POL-15';

export interface EngineeringPolicyRule {
  readonly id: EngineeringPolicyRuleId;
  readonly rule: string;
}

export const ENGINEERING_POLICY: readonly EngineeringPolicyRule[] = [
  { id: 'POL-01', rule: 'Never treat an assumption as a fact.' },
  { id: 'POL-02', rule: 'Every engineering value must have a source.' },
  { id: 'POL-03', rule: 'Every calculation must expose its method and formula.' },
  { id: 'POL-04', rule: 'Every formula must define its units.' },
  { id: 'POL-05', rule: 'Every structural result must expose its validation status.' },
  {
    id: 'POL-06',
    rule: 'Remote geospatial data is preliminary unless validated.',
  },
  {
    id: 'POL-07',
    rule: 'SuperAdobe is a distinct structural system, not conventional masonry.',
  },
  {
    id: 'POL-08',
    rule: 'Final foundation design requires site-specific geotechnical evidence.',
  },
  {
    id: 'POL-09',
    rule: 'Iranian requirements have priority for projects in Iran.',
  },
  {
    id: 'POL-10',
    rule: 'Foreign standards and research supplement rather than silently replace Iranian requirements.',
  },
  {
    id: 'POL-11',
    rule: 'AI may select, orchestrate and explain calculations but must not invent formulas.',
  },
  {
    id: 'POL-12',
    rule: 'Deterministic engines perform numerical calculations.',
  },
  {
    id: 'POL-13',
    rule: 'Missing critical inputs produce HUMAN_REVIEW_REQUIRED.',
  },
  {
    id: 'POL-14',
    rule: 'Unvalidated results cannot be presented as final structural approval.',
  },
  {
    id: 'POL-15',
    rule: 'Every result must remain reproducible from stored inputs and method.',
  },
];

export const POLICY_RULE_IDS: readonly EngineeringPolicyRuleId[] =
  ENGINEERING_POLICY.map(({ id }) => id);

export function getPolicyRule(id: EngineeringPolicyRuleId): EngineeringPolicyRule {
  const rule = ENGINEERING_POLICY.find((entry) => entry.id === id);
  if (!rule) {
    throw new Error(`Unknown policy rule id: ${id}`);
  }
  return rule;
}
