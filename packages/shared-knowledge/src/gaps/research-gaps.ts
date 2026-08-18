export type ResearchGapDomain =
  | 'iranian_code_applicability'
  | 'site_soil_behavior'
  | 'bag_mechanical_properties'
  | 'wire_interface_behavior'
  | 'environmental_durability'
  | 'seismic_behavior'
  | 'opening_effects'
  | 'foundation_interaction'
  | 'water_erosion_durability'
  | 'fem_calibration'
  | 'experimental_validation';

export interface ResearchGap {
  readonly domain: ResearchGapDomain;
  readonly title: string;
  readonly description: string;
  readonly requiredEvidence: string;
}

export const RESEARCH_GAPS: readonly ResearchGap[] = [
  {
    domain: 'iranian_code_applicability',
    title: 'Iranian code applicability to SuperAdobe',
    description:
      'SuperAdobe is not explicitly classified by Iranian National Building Codes or Standard 2800.',
    requiredEvidence:
      'Official interpretation or professional opinion on classification, permitting, and applicable load/seismic clauses.',
  },
  {
    domain: 'site_soil_behavior',
    title: 'Site-specific soil behavior',
    description:
      'SuperAdobe performance depends on the source soil; screening categories are not a mix design.',
    requiredEvidence:
      'Laboratory classification, compaction, moisture, strength, and stabilizer compatibility tests per site.',
  },
  {
    domain: 'bag_mechanical_properties',
    title: 'Bag mechanical properties',
    description:
      'Polypropylene bag tensile strength, UV degradation, elongation, and frictional response are not fully characterized in-repository.',
    requiredEvidence:
      'Manufacturer data sheets or laboratory tests for the specific bag product (see ICC-ES ESR-4126 as evaluated reference).',
  },
  {
    domain: 'wire_interface_behavior',
    title: 'Wire / interface behavior',
    description:
      'Barbed-wire friction and inter-row interface behavior govern sliding and shear checks but lack in-repository characterization.',
    requiredEvidence:
      'Interface friction tests and assembly tests for the specific wire and compaction method.',
  },
  {
    domain: 'environmental_durability',
    title: 'Environmental durability',
    description:
      'Long-term weathering, UV exposure, and environmental degradation of bag and plaster systems are unverified.',
    requiredEvidence:
      'Accelerated aging and field exposure studies for the chosen systems.',
  },
  {
    domain: 'seismic_behavior',
    title: 'Seismic behavior',
    description:
      'SuperAdobe dome response under Iranian seismic demand is not validated; masonry rules do not apply by default.',
    requiredEvidence:
      'Shake-table or dynamic testing and code-backed response modification assumptions.',
  },
  {
    domain: 'opening_effects',
    title: 'Opening effects',
    description:
      'Openings interrupt ring and arch continuity; stress redistribution is not modeled.',
    requiredEvidence:
      'FEM parametric studies or validated simplified rules for openings in SuperAdobe domes.',
  },
  {
    domain: 'foundation_interaction',
    title: 'Foundation interaction',
    description:
      'Dome-foundation interaction, bearing, and settlement behavior require site-specific geotechnical evidence.',
    requiredEvidence:
      'Geotechnical investigation and foundation design per Iranian Chapter 7.',
  },
  {
    domain: 'water_erosion_durability',
    title: 'Water / erosion durability',
    description:
      'Capillary rise, water intrusion, and erosion behavior of earthbag walls are unverified.',
    requiredEvidence:
      'Durability testing and waterproofing system validation.',
  },
  {
    domain: 'fem_calibration',
    title: 'FEM calibration',
    description:
      'The in-repository deterministic checks are not calibrated against a finite element analysis for SuperAdobe domes.',
    requiredEvidence:
      'FEM calibration studies following the Canadell 2016 methodology as benchmark.',
  },
  {
    domain: 'experimental_validation',
    title: 'Experimental validation',
    description:
      'The structural primitives lack published benchmark values for SuperAdobe-specific assemblies.',
    requiredEvidence:
      'Laboratory tests and field validation of dome assemblies.',
  },
];

export const RESEARCH_GAP_DOMAINS: readonly ResearchGapDomain[] =
  RESEARCH_GAPS.map(({ domain }) => domain);
