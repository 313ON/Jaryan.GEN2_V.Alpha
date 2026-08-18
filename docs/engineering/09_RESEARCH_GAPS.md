# 09 — Research Gaps

Authoritative code: `packages/shared-knowledge/src/gaps/research-gaps.ts`.

These are research gaps, not implementation failures. Each gap records the
domain, title, description, and the required evidence to close it.

| Domain | Title | Required evidence |
| --- | --- | --- |
| iranian_code_applicability | Iranian code applicability to SuperAdobe | Official interpretation or professional opinion on classification, permitting, and applicable load/seismic clauses |
| site_soil_behavior | Site-specific soil behavior | Laboratory classification, compaction, moisture, strength, stabilizer compatibility tests per site |
| bag_mechanical_properties | Bag mechanical properties | Manufacturer data sheets or lab tests for the specific bag product (ESR-4126 as evaluated reference) |
| wire_interface_behavior | Wire / interface behavior | Interface friction tests for the specific wire and compaction method |
| environmental_durability | Environmental durability | Accelerated aging and field exposure studies |
| seismic_behavior | Seismic behavior | Shake-table/dynamic testing and code-backed response assumptions |
| opening_effects | Opening effects | FEM parametric studies or validated simplified rules |
| foundation_interaction | Foundation interaction | Geotechnical investigation and foundation design per Iranian Chapter 7 |
| water_erosion_durability | Water / erosion durability | Durability and waterproofing system validation |
| fem_calibration | FEM calibration | FEM calibration studies following Canadell 2016 as benchmark |
| experimental_validation | Experimental validation | Laboratory and field validation of dome assemblies |

## Consequence

Where a required source or numerical parameter cannot be verified, the specific
calculation is stopped and marked **UNVERIFIED**, the missing evidence is
documented in the primitive's `validationRequirements`, and the rest of the
implementation proceeds. This is enforced by the code and tests.