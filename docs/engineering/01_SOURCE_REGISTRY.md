# 01 — Source Registry

Authoritative registry: `packages/shared-knowledge/src/sources/source-registry.ts`.

Every source carries: `sourceId`, `title`, `publisher`, `jurisdiction`, `domain`,
`documentType`, `edition`, `publicationDate` (if known), `effectiveDate` (if known),
`status`, `authorityLevel`, `url` (if available), `applicability`, `notes`.

## Statuses

`ACTIVE`, `SUPERSEDED`, `DRAFT`, `REFERENCE_ONLY`, `EXPERIMENTAL`,
`SITE_SPECIFIC`, `UNKNOWN`.

## Primary sources

| sourceId | Source | Status | Authority | Domain |
| --- | --- | --- | --- | --- |
| SA-CAN-2016 | Canadell, Blanco & Cavalaro (2016), *Comprehensive design method for earthbag and superadobe structures*, Materials & Design 96, 270–282 | REFERENCE_ONLY | P3 | structural |
| ICC-ESR-4126 | ICC Evaluation Service, *SuperAdobe Cement Stabilized Earthbags* | REFERENCE_ONLY | P2 | structural |
| IRN-CH-04 … IRN-CH-22 | Iranian National Building Code chapters 4, 5, 6 (1398), 7 (1400), 8 (1398), 13, 14, 16, 17 (1403), 19 (1404), 21, 22 | ACTIVE | P0 | per chapter |
| IRN-STD-2800 | Iranian Standard 2800, *Seismic Resistant Design*, edition 4 | ACTIVE | P0 | structural |
| TIMO-SHELLS-1959 | Timoshenko & Woinowsky-Krieger, *Theory of Plates and Shells* | REFERENCE_ONLY | P4 | structural |
| TERZAGHI-1943 | Terzaghi, *Theoretical Soil Mechanics* | REFERENCE_ONLY | P4 | geotechnical |
| SOILGRIDS-ISRIC / COP-DEM / GSA / GWA | Remote datasets (SoilGrids, Copernicus DEM, Global Solar Atlas, Global Wind Atlas) | REFERENCE_ONLY | P4 | geospatial/geotechnical/energy |
| ENERGYPLUS / EPANET | Simulation boundaries | REFERENCE_ONLY | P4 | energy/mep |
| calearth-* / doe-nrel-pv-performance | Existing CalEarth and DOE/NREL references | REFERENCE_ONLY | P4–P5 | construction/energy |

## Iranian code rule verification policy

Iranian code documents are registered as **ACTIVE / P0** because they are
applicable regulations in Iran. However, the specific clauses and numerical
values (load combinations, seismic coefficients, material limits) have **not
been verified against the source text** in this repository. Any rule that
references an Iranian code is therefore **UNVERIFIED** until the code text is
ingested and the clause is confirmed.

Per the mission brief: *"If a code document is unavailable, register the source
and mark the relevant rule as UNVERIFIED."*