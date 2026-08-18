export type AuthorityLevel =
  | 'P0'
  | 'P1'
  | 'P2'
  | 'P3'
  | 'P4'
  | 'P5'
  | 'P6';

export type SourceStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'DRAFT'
  | 'REFERENCE_ONLY'
  | 'EXPERIMENTAL'
  | 'SITE_SPECIFIC'
  | 'UNKNOWN';

export type SourceDocumentType =
  | 'research_paper'
  | 'evaluation_report'
  | 'building_code'
  | 'standard'
  | 'regulation'
  | 'manufacturer_documentation'
  | 'vendor_documentation'
  | 'guide'
  | 'dataset'
  | 'report'
  | 'unknown';

export interface EngineeringSource {
  readonly sourceId: string;
  readonly title: string;
  readonly publisher: string;
  readonly jurisdiction: string;
  readonly domain: string;
  readonly documentType: SourceDocumentType;
  readonly edition: string;
  readonly publicationDate?: string;
  readonly effectiveDate?: string;
  readonly status: SourceStatus;
  readonly authorityLevel: AuthorityLevel;
  readonly url?: string;
  readonly applicability: string;
  readonly notes: string;
}

export const ENGINEERING_SOURCES: readonly EngineeringSource[] = [
  {
    sourceId: 'SA-CAN-2016',
    title:
      'Comprehensive design method for earthbag and superadobe structures',
    publisher: 'Materials & Design (Elsevier), vol. 96, pp. 270–282',
    jurisdiction: 'International',
    domain: 'structural',
    documentType: 'research_paper',
    edition: 'Materials & Design 96',
    publicationDate: '2016',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P3',
    url: 'https://www.sciencedirect.com/science/article/pii/S0264127516301769',
    applicability:
      'Rational design methodology for earthbag and SuperAdobe walls and domes; simplified method validated against finite element analysis.',
    notes:
      'Proposes a rational design methodology and validates the simplified method with FEM. Use as design-methodology basis, not as Iranian building code.',
  },
  {
    sourceId: 'ICC-ESR-4126',
    title: 'SuperAdobe Cement Stabilized Earthbags',
    publisher: 'ICC Evaluation Service',
    jurisdiction: 'United States (evaluation report)',
    domain: 'structural',
    documentType: 'evaluation_report',
    edition: 'ESR-4126',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P2',
    url: 'https://icc-es.org/wp-content/uploads/report-directory/ESR-4126.pdf',
    applicability:
      'Evaluated system reference for cement-stabilized earthbag construction under the IBC evaluation framework.',
    notes:
      'An evaluated system reference, not Iranian code. Applicability to Iranian projects must be assessed under Iranian requirements.',
  },
  {
    sourceId: 'IRN-CH-04',
    title: 'Iranian National Building Code, Chapter 4 — General Building Requirements',
    publisher: 'Iranian Ministry of Roads and Urban Development (National Building Regulations)',
    jurisdiction: 'Iran',
    domain: 'building_administration',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'General building administration and requirements for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-05',
    title: 'Iranian National Building Code, Chapter 5 — Building Materials and Products',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'materials',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Material requirements for building construction in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-06',
    title: 'Iranian National Building Code, Chapter 6 — Loads Applied to Buildings',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'structural',
    documentType: 'building_code',
    edition: '1398',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Design loads and load combinations for buildings in Iran.',
    notes: 'Edition 1398. Specific load combination factors not verified against source text; combination rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-07',
    title: 'Iranian National Building Code, Chapter 7 — Soil and Foundation',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'geotechnical',
    documentType: 'building_code',
    edition: '1400',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Soil investigation and foundation design for buildings in Iran.',
    notes: 'Edition 1400. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-08',
    title: 'Iranian National Building Code, Chapter 8 — Design and Construction of Masonry Structures',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'structural',
    documentType: 'building_code',
    edition: '1398',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Masonry design and construction requirements in Iran.',
    notes:
      'Edition 1398. SuperAdobe is a distinct structural system and MUST NOT be silently treated as conventional masonry under this chapter. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-13',
    title: 'Iranian National Building Code, Chapter 13 — Electrical Installations',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'electrical',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Electrical installations for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-14',
    title: 'Iranian National Building Code, Chapter 14 — Heating, Ventilation and Air Conditioning',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'mep',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'HVAC design and installation requirements for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-16',
    title: 'Iranian National Building Code, Chapter 16 — Plumbing',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'mep',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Plumbing requirements for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-17',
    title: 'Iranian National Building Code, Chapter 17 — Sanitary and Wastewater',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'mep',
    documentType: 'building_code',
    edition: '1403',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Sanitary and wastewater requirements for buildings in Iran.',
    notes: 'Edition 1403. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-19',
    title: 'Iranian National Building Code, Chapter 19 — Energy Conservation in Buildings',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'energy',
    documentType: 'building_code',
    edition: '1404',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Building energy performance requirements in Iran.',
    notes: 'Edition 1404. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-21',
    title: 'Iranian National Building Code, Chapter 21 — Passive Defense',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'building_administration',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Passive defense requirements for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-CH-22',
    title: 'Iranian National Building Code, Chapter 22 — Mechanical Installations and Maintenance',
    publisher: 'Iranian Ministry of Roads and Urban Development',
    jurisdiction: 'Iran',
    domain: 'mep',
    documentType: 'building_code',
    edition: 'Current published edition',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Mechanical installation requirements for buildings in Iran.',
    notes: 'Registered. Specific clauses not verified against source text; rules referencing this code are UNVERIFIED until text is available.',
  },
  {
    sourceId: 'IRN-STD-2800',
    title: 'Iranian Code of Practice for Seismic Resistant Design of Buildings',
    publisher: 'Road, Housing and Urban Development Research Center (BHRC)',
    jurisdiction: 'Iran',
    domain: 'structural',
    documentType: 'standard',
    edition: 'Edition 4',
    status: 'ACTIVE',
    authorityLevel: 'P0',
    applicability: 'Seismic design requirements for buildings in Iran.',
    notes:
      'Edition 4. Specific design coefficients, zone map values, and spectrum parameters not verified against source text; seismic rules referencing this code are UNVERIFIED until text is available. Applicable amendments to be registered when available.',
  },
  {
    sourceId: 'calearth-builder-resources',
    title: 'CalEarth builder resources',
    publisher: 'Cal-Earth Institute',
    jurisdiction: 'International',
    domain: 'construction',
    documentType: 'guide',
    edition: 'Web resource',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P5',
    url: 'https://calearth.org/pages/resources-for-builders',
    applicability: 'General SuperAdobe construction guidance.',
    notes: 'Manufacturer/vendor-style documentation; not a code or evaluated system.',
  },
  {
    sourceId: 'calearth-superadobe-overview',
    title: 'CalEarth SuperAdobe overview',
    publisher: 'Cal-Earth Institute',
    jurisdiction: 'International',
    domain: 'construction',
    documentType: 'guide',
    edition: 'Web resource',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P5',
    url: 'https://calearth.org/pages/what-is-superadobe',
    applicability: 'General SuperAdobe system overview.',
    notes: 'Manufacturer/vendor-style documentation; not a code or evaluated system.',
  },
  {
    sourceId: 'doe-nrel-pv-performance',
    title: 'PV performance report',
    publisher: 'U.S. Department of Energy / NREL',
    jurisdiction: 'United States',
    domain: 'energy',
    documentType: 'report',
    edition: '2022-02',
    publicationDate: '2022',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://www.energy.gov/sites/default/files/2022-02/understanding-solar-photovoltaic-system-performance.pdf',
    applicability: 'Photovoltaic system performance estimation assumptions.',
    notes: 'Recognized international reference for PV performance modeling assumptions.',
  },
  {
    sourceId: 'TIMO-SHELLS-1959',
    title: 'Theory of Plates and Shells',
    publisher: 'McGraw-Hill (Timoshenko & Woinowsky-Krieger)',
    jurisdiction: 'International',
    domain: 'structural',
    documentType: 'report',
    edition: '2nd edition, 1959',
    publicationDate: '1959',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    applicability:
      'Thin-shell membrane theory used for spherical-dome force and stress primitives.',
    notes:
      'Recognized international reference for shell membrane theory. SuperAdobe thick-shell applicability remains unverified.',
  },
  {
    sourceId: 'TERZAGHI-1943',
    title: 'Theoretical Soil Mechanics',
    publisher: 'John Wiley & Sons (K. Terzaghi)',
    jurisdiction: 'International',
    domain: 'geotechnical',
    documentType: 'report',
    edition: '1943',
    publicationDate: '1943',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    applicability:
      'Classical bearing-capacity methodology for shallow foundations.',
    notes: 'Recognized international reference for foundation bearing-capacity primitives.',
  },
  {
    sourceId: 'SOILGRIDS-ISRIC',
    title: 'SoilGrids global soil data',
    publisher: 'ISRIC — World Soil Information',
    jurisdiction: 'Global',
    domain: 'geotechnical',
    documentType: 'dataset',
    edition: 'Current release',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://docs.isric.org/globaldata/soilgrids/',
    applicability: 'Remote soil information for site screening.',
    notes: 'Remote dataset output is PRELIMINARY evidence only and must not be promoted to verified engineering data.',
  },
  {
    sourceId: 'COP-DEM',
    title: 'Copernicus DEM',
    publisher: 'European Space Agency / Copernicus',
    jurisdiction: 'Global',
    domain: 'geospatial',
    documentType: 'dataset',
    edition: 'Current release',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://dataspace.copernicus.eu/',
    applicability: 'Digital elevation data for site intelligence.',
    notes: 'Remote elevation data is PRELIMINARY evidence only until validated by survey.',
  },
  {
    sourceId: 'GSA',
    title: 'Global Solar Atlas',
    publisher: 'World Bank Group / ESMAP',
    jurisdiction: 'Global',
    domain: 'energy',
    documentType: 'dataset',
    edition: 'Current release',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://globalsolaratlas.info/',
    applicability: 'Solar resource estimation for site intelligence.',
    notes: 'Remote solar data is PRELIMINARY evidence only.',
  },
  {
    sourceId: 'GWA',
    title: 'Global Wind Atlas',
    publisher: 'World Bank Group / DTU',
    jurisdiction: 'Global',
    domain: 'energy',
    documentType: 'dataset',
    edition: 'Current release',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://globalwindatlas.info/',
    applicability: 'Wind resource estimation for site intelligence.',
    notes: 'Remote wind data is PRELIMINARY evidence only.',
  },
  {
    sourceId: 'ENERGYPLUS',
    title: 'EnergyPlus',
    publisher: 'U.S. Department of Energy / LBNL',
    jurisdiction: 'International',
    domain: 'energy',
    documentType: 'report',
    edition: 'Current release',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://energyplus.net/',
    applicability: 'Whole-building energy simulation boundary.',
    notes: 'Simulation boundary reference; not an in-repository simulation engine.',
  },
  {
    sourceId: 'EPANET',
    title: 'EPANET 2.2',
    publisher: 'U.S. Environmental Protection Agency',
    jurisdiction: 'International',
    domain: 'mep',
    documentType: 'report',
    edition: '2.2',
    status: 'REFERENCE_ONLY',
    authorityLevel: 'P4',
    url: 'https://github.com/USEPA/EPANET2.2',
    applicability: 'Water distribution hydraulic simulation boundary.',
    notes: 'Simulation boundary reference; not an in-repository simulation engine.',
  },
];

const SOURCE_INDEX = new Map(
  ENGINEERING_SOURCES.map((source) => [source.sourceId, source]),
);

export function getEngineeringSource(sourceId: string): EngineeringSource | undefined {
  return SOURCE_INDEX.get(sourceId);
}

export function getEngineeringSourcesByDomain(domain: string): readonly EngineeringSource[] {
  return ENGINEERING_SOURCES.filter((source) => source.domain === domain);
}

export function hasEngineeringSource(sourceId: string): boolean {
  return SOURCE_INDEX.has(sourceId);
}
