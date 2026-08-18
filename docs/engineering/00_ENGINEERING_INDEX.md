# Jaryan Engineering Knowledge — Index

This directory is the Engineering Knowledge foundation for Jaryan. It documents
the domain models, calculation primitives, sources, and validation rules, and it
points to the authoritative code locations. Code is the single source of truth;
these documents are the human-readable mirror.

## Authoritative locations

| Layer | Purpose | Path |
| --- | --- | --- |
| Knowledge / sources | Source registry, authority model, policy, research gaps | `packages/shared-knowledge/src/` |
| Domain models & engines | Deterministic engineering calculations | `packages/shared-domain/src/engineering/` |
| Application use cases | Calculation records, traceability, verification | `packages/shared-application/src/` |
| Tests | Deterministic test suites per package | `packages/*/tests/` |

## Documents

| Doc | Title | Contents |
| --- | --- | --- |
| 01 | Source registry | Registered sources, statuses, authority levels |
| 02 | Authority model | P0–P6 ranking and the authority ≠ applicability rule |
| 03 | Site intelligence | Remote vs verified evidence rules |
| 04 | SuperAdobe domain | Distinct component and failure model |
| 05 | Structural domain | Geometry engine, primitives, loads, seismic |
| 06 | Material domain | Property provenance contract |
| 07 | Calculation model | Deterministic primitive contract and traceability |
| 08 | Validation model | Confidence, consequence, human-review gate |
| 09 | Research gaps | Explicitly unverified engineering topics |
| 10 | Bibliography | Primary sources and standards |

## Core principles

1. Never treat an assumption as a fact.
2. Every engineering value has a source.
3. Every calculation exposes its method and formula with units.
4. Every structural result exposes its validation status.
5. SuperAdobe is a distinct structural system, not conventional masonry.
6. Remote geospatial/soil data is preliminary unless validated.
7. Iranian requirements have priority for projects in Iran.
8. Unvalidated results are never presented as final structural approval.

The full 15-rule policy is registered in code at
`packages/shared-knowledge/src/policy/engineering-policy.ts`.