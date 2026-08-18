# 06 — Material Domain

Authoritative code: `packages/shared-domain/src/engineering/materials.ts`,
`packages/shared-domain/src/engineering/soil-foundation.ts`,
`packages/shared-domain/src/engineering/test-result.ts`.

## Property contract

Every material property carries:
`value`, `unit`, `sourceId` (optional), `testMethod` (optional), `confidence`,
`applicability`, `status` (`KNOWN` | `UNKNOWN` | `REFERENCE_ONLY` | `ASSUMPTION`).

## Material categories

`soil`, `bag`, `wire`, `binder`, `plaster`, `waterproofing`.

## No universal soil properties

There are **no universal SuperAdobe soil properties**. Soil parameters are
site-specific and require laboratory or field testing; the screening categories
in `structural.ts` are estimates, never mix designs. This rule is registered in
`SOIL_PROPERTY_POLICY`.

## Test results

`test-result.ts` defines the `TestResult` model: `testId`, `materialId`,
`standard`, `specimen`, `condition`, `measuredProperty`, `value`, `unit`,
`uncertainty`, `laboratory`, `date`, `status`. Only `REPORTED` results with
finite values and units are usable (`isUsableTestResult`). No test results are
fabricated in the repository.

## Evidence status

Soil and material evidence is classified as `REMOTE`, `FIELD_TEST`, `LAB_TEST`,
or `ASSUMPTION`. Field/lab tests produce `VERIFIED` status; remote data and
assumptions remain `PRELIMINARY` and cannot be promoted automatically.