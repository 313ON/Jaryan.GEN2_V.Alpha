export interface KnowledgeSource {
  id: string;
  label: string;
  url: string;
}

export const REFERENCES: KnowledgeSource[] = [
  {
    id: 'calearth-builder-resources',
    label: 'CalEarth builder resources',
    url: 'https://calearth.org/pages/resources-for-builders',
  },
  {
    id: 'calearth-superadobe-overview',
    label: 'CalEarth SuperAdobe overview',
    url: 'https://calearth.org/pages/what-is-superadobe',
  },
  {
    id: 'doe-nrel-pv-performance',
    label: 'PV performance report',
    url: 'https://www.energy.gov/sites/default/files/2022-02/understanding-solar-photovoltaic-system-performance.pdf',
  },
];
