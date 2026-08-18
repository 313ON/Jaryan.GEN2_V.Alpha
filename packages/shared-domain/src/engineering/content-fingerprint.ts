import { createHash } from 'node:crypto';

export interface CalculationContentPayload {
  readonly definition: string;
  readonly version: string;
  readonly formula: string;
  readonly assumptions: readonly string[];
  readonly inputs: Readonly<Record<string, unknown>>;
}

export function stableSerialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return '"__nan__"';
    }
    if (Object.is(value, -0)) {
      return '"__neg_zero__"';
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}

export function contentFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(stableSerialize(value), 'utf8')
    .digest('hex');
}

export function calculationContentFingerprint(
  payload: CalculationContentPayload,
): string {
  return contentFingerprint({
    kind: 'CALCULATION',
    definition: payload.definition,
    version: payload.version,
    formula: payload.formula,
    assumptions: payload.assumptions,
    inputs: payload.inputs,
  });
}