# 05 — Structural Domain

Authoritative code: `packages/shared-domain/src/engineering/` — `superadobe-geometry.ts`,
`structural-primitives.ts`, `loads.ts`, `seismic.ts`, `soil-foundation.ts`.

## Geometry engine

Deterministic row-by-row generation for a SuperAdobe dome. Inputs: inner
diameter, wall thickness, bag width, row height, dome height, dome profile, and
compacted density.

Supported profiles:
- **circular** — spherical cap; sphere radius derived as
  `R = (r₀² + H²) / (2H)`, ring radius `r(z) = √(R² − (z − zc)²)`.
- **pointed** — two-arc lancet; arc radius and center offset derived from base
  radius and rise. Valid only when rise ≤ inner base radius.
- **parabolic** — paraboloid of revolution, `r(z) = r₀·√(1 − z/H)`.

Per row: inner/center/outer radius, row height, perimeter, effective contact
width and area, row volume, row mass, accumulated mass, and running center of
gravity. Profile formulas are explicit **geometric model definitions** and are
documented as such; they are not attributed to an external source.

## Calculation primitives

Each primitive exposes `calculationId`, method, formula, sourceIds, inputs with
units, result with unit, capacity/limit, utilization, status, confidence,
validation status, validation requirements, and a review requirement.

Implemented primitives (in `structural-primitives.ts`):
`row-weight`, `accumulated-weight`, `center-of-gravity`, `kern-limits`,
`effective-contact-area`, `vertical-stress`, `membrane-forces`,
`compression-check`, `shear-check`, `sliding-check`, `overturning-check`,
`rollover-check`, `local-stability`, `global-stability`.

Provenance:
- Basic statics primitives (weight, CG, kern, vertical stress) are
  `SOURCE_VALIDATED`, HIGH confidence, sourced to `TIMO-SHELLS-1959`.
- `membrane-forces` uses thin-shell spherical-dome membrane theory
  (TIMO-SHELLS-1959); its applicability to the **thick** SuperAdobe assembly is
  UNVERIFIED (LOW confidence).
- SuperAdobe-specific capacities (compressive strength of the stabilized
  earthbag assembly, joint shear, bag friction, resisting moment) are **not
  assumed**. Checks that depend on them return `UNVERIFIED` and require
  `HUMAN_REVIEW_REQUIRED` until laboratory or evaluated-report evidence is
  supplied.
- `rollover`, `local-stability`, and `global-stability` remain explicit
  frameworks pending source-backed methodology (Canadell 2016).

## Load engine

`loads.ts` defines load types G/Q/W/S/R/E/F/H/T/U, load cases, load
combinations, load effects, and structural demand (`N, V, M, T`, bearing
pressure, sliding demand, overturning demand, uplift).

Iranian Chapter 6 load combinations are registered but their factors are
**UNVERIFIED** — the code text has not been ingested, so no combination factors
are fabricated.

## Seismic engine

`seismic.ts` implements the pipeline: site coordinates → zone → soil/site class
→ importance → design spectrum → structural weight → demand → SuperAdobe
verification.

No seismic coefficient is hardcoded. The design spectrum must be supplied from a
sourced reference (Iranian Standard 2800, edition 4). An incomplete spectrum
yields `UNVERIFIED` demand and `HUMAN_REVIEW_REQUIRED`.

## Soil / foundation

`soil-foundation.ts` models soil layers/materials, geotechnical profiles,
foundations, and Terzaghi shallow-foundation bearing capacity (TERZAGHI-1943).
Remote or assumed soil data is `PRELIMINARY` and cannot be promoted to verified
engineering data (`promoteToVerified` refuses). Final foundation design requires
site-specific geotechnical evidence (POL-08, Iranian Chapter 7).