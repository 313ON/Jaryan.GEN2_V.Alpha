# 08 — Validation Model

Authoritative code: `packages/shared-domain/src/engineering/validation.ts`.

## Validation statuses

`SOURCE_VALIDATED`, `ANALYTICALLY_VALIDATED`, `NUMERICALLY_VALIDATED`,
`LAB_VALIDATED`, `FIELD_VALIDATED`, `PROFESSIONAL_REVIEW`, `UNKNOWN`.

## Confidence levels

`HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`.

## Consequence levels

`HIGH`, `MODERATE`, `LOW`.

## Human-review gate

```
LOW/UNKNOWN confidence  +  HIGH consequence  =  HUMAN_REVIEW_REQUIRED
HIGH consequence (any confidence)            =  ENGINEER_REVIEW
HIGH confidence + MODERATE/LOW consequence   =  NONE
```

Unvalidated results are never presented as final structural approval (POL-14).
Missing critical inputs produce `HUMAN_REVIEW_REQUIRED` (POL-13).

## Example flow

A SuperAdobe compression check without a lab-tested allowable compressive
strength returns `UNVERIFIED` with `UNKNOWN` confidence and
`HUMAN_REVIEW_REQUIRED`. Adding a `REPORTED` lab or evaluated-report value
(ICC-ES ESR-4126) upgrades the status to `ANALYTICALLY_VALIDATED` with `MEDIUM`
confidence, and the review requirement falls to `ENGINEER_REVIEW` (HIGH
consequence).