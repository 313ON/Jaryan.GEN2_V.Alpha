# 04 — SuperAdobe Domain

Authoritative code: `packages/shared-domain/src/engineering/superadobe.ts`.

## Policy: SuperAdobe is not conventional masonry

SuperAdobe is modeled as a **distinct structural system** (POL-07). It is never
silently treated as conventional masonry under Iranian Chapter 8. The Iranian
Chapter 8 registry entry carries an explicit note to this effect.

## Components

A SuperAdobe assembly is modeled through ten components:

`soil-fill`, `stabilization`, `bag`, `compaction`, `inter-row-contact`,
`barbed-wire`, `geometry`, `openings`, `foundation`, `environmental-protection`.

Each component defines its role, its governing failure modes, and its
verification requirements (what evidence is needed before the component can be
relied on).

## Failure model

Failure modes are grouped by domain:

- **GLOBAL**: collapse, overturning, sliding, global-instability
- **LOCAL**: contact-failure, joint-shear, local-rollover,
  excessive-compression, tensile-failure, hoop-failure, instability-buckling
- **SYSTEM**: bag-failure, barbed-wire-failure, foundation-failure,
  water-intrusion, erosion, durability-degradation

Every failure mode is registered with `validated: false` and a `validationBasis`
only where supporting evidence exists. **No failure mode claims validation
without a source or test to support it.** All SuperAdobe failure modes are
currently registered as unvalidated, reflecting the documented research gaps.

## Geometry engine

Row-by-row deterministic geometry is implemented in
`packages/shared-domain/src/engineering/superadobe-geometry.ts`, supporting
circular (spherical cap), pointed (two-arc lancet), and parabolic profiles. See
`05_STRUCTURAL_DOMAIN.md` for details.