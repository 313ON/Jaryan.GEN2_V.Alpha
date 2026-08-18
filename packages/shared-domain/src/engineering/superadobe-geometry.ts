import { round } from './energy.ts';

export type DomeProfile = 'circular' | 'pointed' | 'parabolic';

export const DOME_PROFILES: readonly DomeProfile[] = [
  'circular',
  'pointed',
  'parabolic',
];

export interface SuperAdobeGeometryInputs {
  readonly innerDiameterM: number;
  readonly wallThicknessM: number;
  readonly bagWidthM: number;
  readonly rowHeightM: number;
  readonly domeHeightM: number;
  readonly geometryType: DomeProfile;
  readonly compactedDensityKgM3: number;
}

export interface SuperAdobeRow {
  readonly rowIndex: number;
  readonly bottomElevationM: number;
  readonly topElevationM: number;
  readonly centerElevationM: number;
  readonly innerRadiusM: number;
  readonly centerRadiusM: number;
  readonly outerRadiusM: number;
  readonly perimeterM: number;
  readonly effectiveContactWidthM: number;
  readonly effectiveContactAreaM2: number;
  readonly rowVolumeM3: number;
  readonly rowMassKg: number;
  readonly rowMassT: number;
  readonly accumulatedMassT: number;
  readonly centerOfGravityM: number;
}

export type SuperAdobeProfileParameters =
  | { readonly profile: 'circular'; readonly sphereRadiusM: number }
  | {
      readonly profile: 'pointed';
      readonly arcRadiusM: number;
      readonly centerOffsetM: number;
    }
  | {
      readonly profile: 'parabolic';
      readonly curvatureParameterM: number;
    };

export interface SuperAdobeGeometry {
  readonly inputs: SuperAdobeGeometryInputs;
  readonly profileParameters: SuperAdobeProfileParameters;
  readonly rows: readonly SuperAdobeRow[];
  readonly rowCount: number;
  readonly totalMassT: number;
  readonly centerOfGravityM: number;
}

export interface SuperAdobeGeometryFieldError {
  readonly field: keyof SuperAdobeGeometryInputs;
  readonly message: string;
}

function innerRadiusAt(
  zM: number,
  inputs: SuperAdobeGeometryInputs,
  parameters: SuperAdobeProfileParameters,
): number {
  const innerRadiusBaseM = inputs.innerDiameterM / 2;
  switch (parameters.profile) {
    case 'circular': {
      const { sphereRadiusM } = parameters;
      const sphereCenterM = inputs.domeHeightM - sphereRadiusM;
      const offset = sphereRadiusM ** 2 - (zM - sphereCenterM) ** 2;
      return offset > 0 ? Math.sqrt(offset) : 0;
    }
    case 'pointed': {
      const { arcRadiusM, centerOffsetM } = parameters;
      const z = Math.min(zM, inputs.domeHeightM);
      const radial = arcRadiusM ** 2 - z ** 2;
      if (radial <= 0) return 0;
      const root = Math.sqrt(radial);
      return z < arcRadiusM ? centerOffsetM + root : centerOffsetM - root;
    }
    case 'parabolic': {
      const z = Math.min(zM, inputs.domeHeightM);
      return innerRadiusBaseM * Math.sqrt(1 - z / inputs.domeHeightM);
    }
  }
}

function profileParameters(
  inputs: SuperAdobeGeometryInputs,
): SuperAdobeProfileParameters {
  const innerRadiusBaseM = inputs.innerDiameterM / 2;
  switch (inputs.geometryType) {
    case 'circular': {
      const sphereRadiusM =
        (innerRadiusBaseM ** 2 + inputs.domeHeightM ** 2) /
        (2 * inputs.domeHeightM);
      return { profile: 'circular', sphereRadiusM };
    }
    case 'pointed': {
      const centerOffsetM =
        (innerRadiusBaseM ** 2 - inputs.domeHeightM ** 2) /
        (2 * innerRadiusBaseM);
      const arcRadiusM = innerRadiusBaseM - centerOffsetM;
      return { profile: 'pointed', arcRadiusM, centerOffsetM };
    }
    case 'parabolic': {
      return {
        profile: 'parabolic',
        curvatureParameterM: innerRadiusBaseM ** 2 / inputs.domeHeightM,
      };
    }
  }
}

export function validateSuperAdobeGeometryInputs(
  inputs: SuperAdobeGeometryInputs,
): SuperAdobeGeometryFieldError[] {
  const errors: SuperAdobeGeometryFieldError[] = [];
  type NumericField = Exclude<keyof SuperAdobeGeometryInputs, 'geometryType'>;
  const positive = (field: NumericField, label: string) => {
    const value = inputs[field] as number;
    if (!Number.isFinite(value) || value <= 0) {
      errors.push({ field, message: `${label} must be a positive number.` });
    }
  };
  positive('innerDiameterM', 'Inner diameter');
  positive('wallThicknessM', 'Wall thickness');
  positive('bagWidthM', 'Bag width');
  positive('rowHeightM', 'Row height');
  positive('domeHeightM', 'Dome height');
  positive('compactedDensityKgM3', 'Compacted density');

  if (!DOME_PROFILES.includes(inputs.geometryType)) {
    errors.push({
      field: 'geometryType',
      message: 'Select a supported dome profile.',
    });
  }

  if (inputs.geometryType === 'pointed') {
    const innerRadiusBaseM = inputs.innerDiameterM / 2;
    if (inputs.domeHeightM > innerRadiusBaseM) {
      errors.push({
        field: 'domeHeightM',
        message:
          'Pointed profile requires dome height not to exceed the inner base radius.',
      });
    }
  }
  return errors;
}

export function calculateSuperAdobeGeometry(
  inputs: SuperAdobeGeometryInputs,
):
  | { ok: true; geometry: SuperAdobeGeometry }
  | { ok: false; errors: SuperAdobeGeometryFieldError[] } {
  const errors = validateSuperAdobeGeometryInputs(inputs);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const parameters = profileParameters(inputs);
  const rowCount = Math.max(
    1,
    Math.ceil(inputs.domeHeightM / inputs.rowHeightM),
  );
  const wallThicknessM = inputs.wallThicknessM;

  const rows: SuperAdobeRow[] = [];
  let accumulatedMassKg = 0;
  let momentKgM = 0;

  for (let index = 1; index <= rowCount; index += 1) {
    const bottomM = (index - 1) * inputs.rowHeightM;
    const topM = Math.min(index * inputs.rowHeightM, inputs.domeHeightM);
    const centerElevationM = (bottomM + topM) / 2;
    const innerRadiusM = Math.max(
      0,
      innerRadiusAt(centerElevationM, inputs, parameters),
    );
    const centerRadiusM = innerRadiusM + wallThicknessM / 2;
    const outerRadiusM = innerRadiusM + wallThicknessM;
    const perimeterM = 2 * Math.PI * centerRadiusM;
    const effectiveContactWidthM = inputs.bagWidthM;
    const effectiveContactAreaM2 = perimeterM * effectiveContactWidthM;
    const rowVolumeM3 =
      Math.PI * (outerRadiusM ** 2 - innerRadiusM ** 2) * (topM - bottomM);
    const rowMassKg = rowVolumeM3 * inputs.compactedDensityKgM3;
    accumulatedMassKg += rowMassKg;
    momentKgM += rowMassKg * centerElevationM;

    rows.push({
      rowIndex: index,
      bottomElevationM: round(bottomM, 4),
      topElevationM: round(topM, 4),
      centerElevationM: round(centerElevationM, 4),
      innerRadiusM: round(innerRadiusM, 4),
      centerRadiusM: round(centerRadiusM, 4),
      outerRadiusM: round(outerRadiusM, 4),
      perimeterM: round(perimeterM, 4),
      effectiveContactWidthM: round(effectiveContactWidthM, 4),
      effectiveContactAreaM2: round(effectiveContactAreaM2, 4),
      rowVolumeM3: round(rowVolumeM3, 4),
      rowMassKg: round(rowMassKg, 2),
      rowMassT: round(rowMassKg / 1000, 4),
      accumulatedMassT: round(accumulatedMassKg / 1000, 4),
      centerOfGravityM:
        accumulatedMassKg > 0 ? round(momentKgM / accumulatedMassKg, 4) : 0,
    });
  }

  const totalMassKg = accumulatedMassKg;
  return {
    ok: true,
    geometry: {
      inputs,
      profileParameters: parameters,
      rows,
      rowCount: rows.length,
      totalMassT: round(totalMassKg / 1000, 4),
      centerOfGravityM:
        totalMassKg > 0 ? round(momentKgM / totalMassKg, 4) : 0,
    },
  };
}