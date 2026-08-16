export type BasisStatus =
  | 'modeled'
  | 'user input'
  | 'required field measurement'
  | 'external professional review'
  | 'future capability';

export interface BasisGroup {
  title: string;
  items: Array<{ label: string; status: BasisStatus }>;
}

export const BASIS_STATUSES: BasisStatus[] = [
  'modeled',
  'user input',
  'required field measurement',
  'external professional review',
  'future capability',
];

export const STUDY_BASIS: BasisGroup[] = [
  {
    title: 'Site',
    items: [
      { label: 'Latitude / longitude', status: 'user input' },
      { label: 'Exact survey and topography', status: 'required field measurement' },
      { label: 'Access and construction logistics', status: 'external professional review' },
      { label: 'Slope and drainage paths', status: 'required field measurement' },
      { label: 'Flood and erosion risk', status: 'external professional review' },
      { label: 'Groundwater conditions', status: 'required field measurement' },
      { label: 'Local climate and wildfire exposure', status: 'external professional review' },
      { label: 'Seismic, wind, and snow hazards', status: 'external professional review' },
    ],
  },
  {
    title: 'Soil & foundation',
    items: [
      { label: 'User soil category', status: 'user input' },
      { label: 'Soil classification and gradation', status: 'required field measurement' },
      { label: 'Moisture content and compaction', status: 'required field measurement' },
      { label: 'Bearing capacity', status: 'required field measurement' },
      { label: 'Stabilizer compatibility and dosage', status: 'required field measurement' },
      { label: 'Foundation type and detailing', status: 'external professional review' },
      { label: 'Capillary break and waterproofing', status: 'external professional review' },
      { label: 'Drainage and frost / heave response', status: 'external professional review' },
    ],
  },
  {
    title: 'Dome / SuperAdobe',
    items: [
      { label: 'Envelope quantity and mass', status: 'modeled' },
      { label: 'Opening area', status: 'user input' },
      { label: 'Opening geometry and arch continuity', status: 'external professional review' },
      { label: 'Wall thickness and course height', status: 'external professional review' },
      { label: 'Barbed wire / tensile reinforcement', status: 'external professional review' },
      { label: 'Buttressing and bond beams', status: 'external professional review' },
      { label: 'Roof and weatherproofing system', status: 'external professional review' },
      { label: 'Gravity, seismic, wind, and snow loads', status: 'external professional review' },
      { label: 'Construction quality control', status: 'required field measurement' },
      { label: 'Local code and permit review', status: 'external professional review' },
    ],
  },
  {
    title: 'Energy',
    items: [
      { label: 'Daily demand and autonomy', status: 'user input' },
      { label: 'Latitude solar heuristic', status: 'modeled' },
      { label: 'Panel count, capacity, and area', status: 'modeled' },
      { label: 'Measured load schedule and surge loads', status: 'required field measurement' },
      { label: 'Seasonal solar resource and shading', status: 'required field measurement' },
      { label: 'Tilt, azimuth, and temperature losses', status: 'external professional review' },
      { label: 'Inverter and MPPT/controller selection', status: 'external professional review' },
      { label: 'Battery chemistry and usable depth', status: 'external professional review' },
      { label: 'Cable sizing, grounding, and protection', status: 'external professional review' },
      { label: 'Backup source integration', status: 'future capability' },
    ],
  },
  {
    title: 'Water',
    items: [
      { label: 'Occupancy demand and reserve', status: 'modeled' },
      { label: 'Water source reliability', status: 'required field measurement' },
      { label: 'Potable treatment and disinfection', status: 'external professional review' },
      { label: 'Rainfall and catchment area', status: 'future capability' },
      { label: 'First-flush and seasonal drought', status: 'external professional review' },
      { label: 'Fire reserve', status: 'external professional review' },
      { label: 'Irrigation and process demand', status: 'future capability' },
      { label: 'Filtration and distribution design', status: 'external professional review' },
    ],
  },
  {
    title: 'Safety',
    items: [
      { label: 'Emergency egress and accessibility', status: 'external professional review' },
      { label: 'Fire safety', status: 'external professional review' },
      { label: 'Ventilation and indoor air quality', status: 'external professional review' },
      { label: 'Electrical protection', status: 'external professional review' },
      { label: 'Lightning and grounding', status: 'external professional review' },
      { label: 'Construction hazards and work plan', status: 'external professional review' },
    ],
  },
];
