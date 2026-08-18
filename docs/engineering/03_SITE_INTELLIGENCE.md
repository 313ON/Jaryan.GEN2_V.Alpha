# 03 — Site Intelligence

Authoritative code: `packages/shared-domain/src/engineering/site-intelligence.ts`.

## Model

`SiteIntelligence` covers latitude/longitude plus optional factors:

- elevation, slope, aspect, terrain
- soil, groundwater, seismic, climate, wind, solar, flood, landslide, hydrology

Each factor is a `SiteFactorEvidence<T>` with a value and a
`RemoteDatasetEvidence` carrying `sourceId`, `resolution`, `timestamp`,
`confidence`, `limitations`, and `status` (`PRELIMINARY` | `VERIFIED` | `UNKNOWN`).

## Rule: remote data is preliminary

Remote datasets (SoilGrids, Copernicus DEM, Global Solar Atlas, Global Wind
Atlas, etc.) are **preliminary evidence only** (POL-06). They are never silently
promoted to verified engineering data. The assessment aggregates factor statuses:

- all factors verified → `VERIFIED`
- any preliminary factor → `PRELIMINARY`
- no factors → `UNKNOWN`

## How evidence becomes verified

Field or laboratory measurement (site survey, geotechnical investigation, local
measurement) upgrades a factor to `VERIFIED`. The same rule applies to soil data
in `soil-foundation.ts` via `classifySoilEvidence` and `promoteToVerified`, which
refuses to promote remote or assumed soil evidence.