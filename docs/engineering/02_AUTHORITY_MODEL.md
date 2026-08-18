# 02 — Authority Model

Authoritative code: `packages/shared-knowledge/src/authority/authority-model.ts`.

## Levels

| Level | Meaning |
| --- | --- |
| P0 | Applicable mandatory Iranian regulation/code |
| P1 | Site-specific laboratory / field test |
| P2 | Official evaluation/certification |
| P3 | Peer-reviewed engineering research |
| P4 | Recognized international standard |
| P5 | Manufacturer/system documentation |
| P6 | Engineering assumption |

## The applicability rule

**Authority level does NOT automatically mean applicability.**

A P0 Iranian code only governs when it applies to the project. A P3 paper does
not become more applicable because it is ranked higher than an unrelated code.
Applicability is decided by jurisdiction, domain, document type, and project
context — never by authority rank alone.

For example, ICC-ES ESR-4126 (P2) is an *evaluated system reference*, not Iranian
code; it supplements Iranian requirements (POL-10) but does not replace them.

## Ordering between levels

Within a project, site-specific field/lab tests (P1) override remote or generic
estimates for the tested property. Iranian requirements (P0) have priority for
projects in Iran (POL-09).