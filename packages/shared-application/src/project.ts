export interface SiteLocation {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Project {
  readonly id: string;
  readonly name: string;
  readonly site: SiteLocation;
  readonly calculationIds: readonly string[];
}