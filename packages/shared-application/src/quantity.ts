export type QuantityUnit = 'm2' | 'm3' | 't';

export interface QuantitySource {
  readonly calculationId: string;
  readonly output: string;
}

export interface Quantity {
  readonly id: string;
  readonly quantity: number;
  readonly unit: QuantityUnit;
  readonly source: QuantitySource;
}
