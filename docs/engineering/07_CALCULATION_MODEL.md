# 07 — Calculation Model

Authoritative code: `packages/shared-domain/src/engineering/structural-primitives.ts`,
`packages/shared-application/src/traceability.ts`,
`packages/shared-application/src/verify-superadobe-structure.ts`,
`packages/shared-application/src/calculate-superadobe-geometry.ts`.

## Deterministic primitive contract

Every calculation primitive (`PrimitiveResult`) exposes:

- `calculationId` — stable identifier, e.g. `SA-COMPRESSION-CHECK-001`
- `method` — human-readable method label
- `formula` — explicit equation, never hidden in opaque code
- `sourceIds` — provenance references
- `inputs` — each with a unit
- `result` — value and unit
- `capacity` / `utilization` — limit and demand-over-capacity ratio where applicable
- `status` — `OK` | `FAIL` | `UNVERIFIED` | `NOT_APPLICABLE`
- `confidence` — HIGH / MEDIUM / LOW / UNKNOWN
- `validationStatus` and `validationRequirements`
- `review` — the validation review requirement

Formulas always define units. Deterministic engines perform the arithmetic
(POL-12); AI selects, orchestrates, and explains but never invents formulas
(POL-11).

## Use cases

- `calculateSuperAdobeGeometryRecord` — wraps the geometry engine in a generic
  `CalculationRecord` (assumption snapshot, knowledge reference, status,
  timestamps).
- `verifySuperAdobeStructure` — orchestrates geometry + structural primitives +
  loads into a verification report with per-primitive traceability,
  `unverifiedCalculationIds`, `humanReviewRequired`, and an overall status of
  `SCREENED` | `FAILED` | `REVIEW_REQUIRED`.

## Traceability

Every result is reproducible from stored inputs and method (POL-15). The
`TraceabilityLink` records `calculationId → method → formula → sourceIds →
inputs → validationStatus → confidence → reviewRequirement`.

## Thermal / MEP / energy foundation

`mep.ts` defines extensible schemas for HVAC, water, wastewater, electrical, PV,
battery, and thermal envelope, plus minimal deterministic primitives (steady
state heat loss `Q = U·A·ΔT`, U-value = reciprocal of R-value). EnergyPlus and
EPANET are registered as simulation boundaries only.

## FEM integration boundary

`fem.ts` defines the boundary: Jaryan Model → FEM Model Generator → Solver →
Result Parser → Jaryan Verification. The boundary is implemented but produces no
fabricated FEM results; Canadell 2016 is the benchmark reference for future
calibration.