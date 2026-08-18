export type SuperAdobeComponent =
  | 'soil-fill'
  | 'stabilization'
  | 'bag'
  | 'compaction'
  | 'inter-row-contact'
  | 'barbed-wire'
  | 'geometry'
  | 'openings'
  | 'foundation'
  | 'environmental-protection';

export type FailureDomain = 'GLOBAL' | 'LOCAL' | 'SYSTEM';

export type FailureMode =
  | 'collapse'
  | 'overturning'
  | 'sliding'
  | 'global-instability'
  | 'contact-failure'
  | 'joint-shear'
  | 'local-rollover'
  | 'excessive-compression'
  | 'tensile-failure'
  | 'hoop-failure'
  | 'instability-buckling'
  | 'bag-failure'
  | 'barbed-wire-failure'
  | 'foundation-failure'
  | 'water-intrusion'
  | 'erosion'
  | 'durability-degradation';

export const SUPERADOBE_COMPONENTS: readonly SuperAdobeComponent[] = [
  'soil-fill',
  'stabilization',
  'bag',
  'compaction',
  'inter-row-contact',
  'barbed-wire',
  'geometry',
  'openings',
  'foundation',
  'environmental-protection',
];

export interface SuperAdobeComponentModel {
  readonly component: SuperAdobeComponent;
  readonly role: string;
  readonly governingFailureModes: readonly FailureMode[];
  readonly verificationRequirements: readonly string[];
}

export interface SuperAdobeFailureModel {
  readonly domain: FailureDomain;
  readonly mode: FailureMode;
  readonly description: string;
  readonly validated: boolean;
  readonly validationBasis?: string;
}

export const SUPERADOBE_COMPONENT_MODELS: readonly SuperAdobeComponentModel[] = [
  {
    component: 'soil-fill',
    role: 'Primary structural and mass material; behavior depends on site soil.',
    governingFailureModes: [
      'excessive-compression',
      'contact-failure',
      'tensile-failure',
      'erosion',
    ],
    verificationRequirements: [
      'Site soil classification, gradation, moisture, compaction, and strength tests',
    ],
  },
  {
    component: 'stabilization',
    role: 'Binder where applicable; dosage requires compatibility trials.',
    governingFailureModes: [
      'excessive-compression',
      'durability-degradation',
      'erosion',
    ],
    verificationRequirements: [
      'Stabilizer compatibility and dosage testing for the site soil',
    ],
  },
  {
    component: 'bag',
    role: 'Confines the soil fill and provides inter-row friction surface.',
    governingFailureModes: ['bag-failure', 'joint-shear', 'sliding'],
    verificationRequirements: [
      'Bag tensile strength, UV resistance, and friction characterization (see ICC-ES ESR-4126)',
    ],
  },
  {
    component: 'compaction',
    role: 'Achieves target density and inter-row bonding.',
    governingFailureModes: [
      'contact-failure',
      'sliding',
      'excessive-compression',
    ],
    verificationRequirements: [
      'Achieved density and compaction quality-control records',
    ],
  },
  {
    component: 'inter-row-contact',
    role: 'Transfers vertical and shear forces between courses.',
    governingFailureModes: ['contact-failure', 'joint-shear', 'local-rollover'],
    verificationRequirements: [
      'Interface friction and contact-area characterization for the bag/soil assembly',
    ],
  },
  {
    component: 'barbed-wire',
    role: 'Tensile reinforcement between courses and anti-slip interface.',
    governingFailureModes: ['barbed-wire-failure', 'sliding', 'tensile-failure'],
    verificationRequirements: [
      'Wire tensile capacity, corrosion resistance, and placement verification',
    ],
  },
  {
    component: 'geometry',
    role: 'Dome profile and thickness distribution drive stress state.',
    governingFailureModes: [
      'instability-buckling',
      'hoop-failure',
      'local-rollover',
    ],
    verificationRequirements: [
      'As-built geometry survey against design profile',
    ],
  },
  {
    component: 'openings',
    role: 'Openings interrupt ring and arch continuity.',
    governingFailureModes: ['collapse', 'tensile-failure', 'local-rollover'],
    verificationRequirements: [
      'Opening detailing and stress redistribution review',
    ],
  },
  {
    component: 'foundation',
    role: 'Distributes dome load to the ground.',
    governingFailureModes: ['foundation-failure', 'collapse', 'overturning'],
    verificationRequirements: [
      'Site-specific geotechnical investigation and foundation design',
    ],
  },
  {
    component: 'environmental-protection',
    role: 'Waterproofing and protection from water and erosion.',
    governingFailureModes: ['water-intrusion', 'erosion', 'durability-degradation'],
    verificationRequirements: [
      'Waterproofing system validation and durability testing',
    ],
  },
];

export const SUPERADOBE_FAILURE_MODELS: readonly SuperAdobeFailureModel[] = [
  {
    domain: 'GLOBAL',
    mode: 'collapse',
    description: 'General loss of structural stability of the dome.',
    validated: false,
  },
  {
    domain: 'GLOBAL',
    mode: 'overturning',
    description: 'Rotation of the structure about its base.',
    validated: false,
  },
  {
    domain: 'GLOBAL',
    mode: 'sliding',
    description: 'Lateral translation along the base interface.',
    validated: false,
  },
  {
    domain: 'GLOBAL',
    mode: 'global-instability',
    description: 'Loss of overall equilibrium or stability.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'contact-failure',
    description: 'Local crushing or deformation at inter-row contact.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'joint-shear',
    description: 'Shear failure along the inter-row joint.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'local-rollover',
    description: 'Local rotation of individual courses.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'excessive-compression',
    description: 'Compressive stress exceeding the soil/bag assembly capacity.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'tensile-failure',
    description: 'Tensile demand exceeding the assembly capacity.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'hoop-failure',
    description: 'Hoops (circumferential) tension capacity exceeded in the dome.',
    validated: false,
  },
  {
    domain: 'LOCAL',
    mode: 'instability-buckling',
    description: 'Local buckling of the shell where applicable.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'bag-failure',
    description: 'Bag material rupture or loss of confinement.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'barbed-wire-failure',
    description: 'Wire rupture or loss of tensile reinforcement.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'foundation-failure',
    description: 'Bearing or settlement failure of the foundation.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'water-intrusion',
    description: 'Water ingress through the envelope.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'erosion',
    description: 'Surface or internal erosion of the earth material.',
    validated: false,
  },
  {
    domain: 'SYSTEM',
    mode: 'durability-degradation',
    description: 'Long-term environmental degradation of materials.',
    validated: false,
  },
];

export function getSuperAdobeComponent(
  component: SuperAdobeComponent,
): SuperAdobeComponentModel {
  const model = SUPERADOBE_COMPONENT_MODELS.find(
    (entry) => entry.component === component,
  );
  if (!model) {
    throw new Error(`Unknown SuperAdobe component: ${component}`);
  }
  return model;
}

export function getFailureModel(mode: FailureMode): SuperAdobeFailureModel {
  const model = SUPERADOBE_FAILURE_MODELS.find((entry) => entry.mode === mode);
  if (!model) {
    throw new Error(`Unknown failure mode: ${mode}`);
  }
  return model;
}

export function failureModesByDomain(
  domain: FailureDomain,
): readonly SuperAdobeFailureModel[] {
  return SUPERADOBE_FAILURE_MODELS.filter((model) => model.domain === domain);
}