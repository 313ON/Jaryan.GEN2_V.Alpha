export const HARDCODED_ASSUMPTIONS = [
  'PV performance',
  'module power density',
  'battery losses',
  'water use',
  'material density',
  'layout factors',
] as const;

export const MODEL_BOUNDARY = {
  eyebrow: 'Model boundary',
  heading: 'Concept estimate only',
  description:
    'Not certified engineering design, a soil mix design, a permit package, or a construction instruction.',
} as const;
