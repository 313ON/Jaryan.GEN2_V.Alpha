# ADR-027: Physical Reality Semantic Model Design

## Status

Proposed — created for Phase 12B architecture review.

## Problem statement

Jaryan has a governed engineering-knowledge foundation, but its semantic
center is still the artifact and calculation chain:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

That chain is necessary for deterministic reconstruction, but it does not
identify the real-world engineering things to which a calculation, geometry
representation, inspection, document, or decision applies.

The missing bridge is:

```text
Physical Asset
        |
Engineering Object
        |
Geometry
        |
Calculation
        |
Evidence
        |
Decision
        |
Document
        |
Revision History
```

Without this bridge, Jaryan can preserve relationships among engineering
artifacts while remaining unable to reconstruct which physical object was
designed, installed, observed, inspected, changed, or affected. The platform
also risks allowing document presence, imported geometry, calculation output,
or AI suggestions to acquire authority they do not possess.

This ADR defines architecture decisions only. It introduces no production
code, schema, database model, API, UI, or persistence behavior.

## Architecture

Jaryan will add a physical-reality semantic layer around the existing
engineering-knowledge foundation:

```text
physical asset / engineering object
        |
        | existing KnowledgeGraph relationships
        v
geometry, calculations, evidence, decisions, documents
        |
        v
EngineeringArtifactIdentity
        |
        v
EngineeringKnowledgeRegistry
        |
        v
authorityEvidenceProvider
```

The layer has five architectural properties:

1. A physical asset is a real-world referent, not a document or calculation.
2. Engineering objects provide a minimal, cross-discipline vocabulary for
   describing physical reality and its boundaries.
3. Geometry is a typed representation of an object or state, not an
   authority source.
4. All cross-domain relationships use the existing `KnowledgeGraph`
   principles and resolution states.
5. Identity, registration, graph resolution, evidence, authority, and trust
   remain separate concerns.

The physical-reality layer must preserve the existing reconstruction path:

```text
physical referent
  -> engineering object and geometry
  -> canonical artifact relationship
  -> evidence and decision context
  -> deterministic knowledge reconstruction
```

No object may be treated as authoritative merely because it is present in the
physical model. Authority remains provider-backed and evidence-linked.

## Concepts

### 1. Physical Asset Identity

A real-world engineering object is a bounded thing, place, assembly, system,
or material instance that exists, is intended to exist, or is asserted to
have existed in an engineering context. It has an identity independent of
any particular document, geometry representation, calculation, or software
export.

Examples include a site, a building, a floor, a structural wall, a pump, a
pipe assembly, or a batch of material installed in a defined location.

An asset identity identifies the referent across its lifecycle. It does not
identify one description of that referent. A drawing, calculation, survey,
inspection, and as-built model may all refer to the same asset while having
different artifact identities and revisions.

#### Asset Identity versus `EngineeringArtifactIdentity`

| Concern | Physical asset identity | `EngineeringArtifactIdentity` |
| --- | --- | --- |
| What it identifies | A real-world or intended engineering referent | A versioned engineering knowledge artifact |
| Persistence | Endures across descriptions and revisions | Identifies one immutable artifact version |
| Examples | Building, beam, valve, material instance | Calculation, result, primitive, source |
| Change meaning | State, condition, location, ownership, or composition may change | A new artifact version is created |
| Authority | Requires evidence and existing authority rules | Canonical artifact identity and registry rules |
| Relationship | Is the subject or object of engineering relations | Is the evidence/knowledge side of those relations |

This distinction does not authorize a second identity authority. Asset Identity
is a semantic role within the same canonical identity-governance boundary.
Future asset-bearing identities must be created, validated, referenced, and
resolved through the existing `EngineeringArtifactIdentity` authority or an
explicitly governed extension of that authority. There must be no independent
asset-ID generator, `AssetRegistry`, asset graph, or competing canonical
resolution path.

The architecture distinguishes:

- stable referent identity: which physical thing is being discussed;
- temporal state: what was true about it during an interval;
- representation identity: which artifact or geometry version describes it;
- evidence state: what is observed, documented, calculated, or verified;
- authority state: what the provider-backed governance boundary accepts.

#### Asset attributes and temporal state

The model treats the following as claims about an asset, not as immutable
identity fields:

- lifecycle state;
- owner, operator, or responsible party;
- location and containment;
- condition, defect, or performance state;
- composition and membership in an assembly or system;
- installation, removal, replacement, or modification;
- applicability to a project, scenario, or time interval.

Each claim requires temporal semantics:

- valid time: when the claim is true in the engineering world;
- record time: when Jaryan recorded or reconstructed the claim;
- unknown interval: used when boundaries are not known;
- open interval: used for continuing or not-yet-closed states;
- supersession: a later claim may replace an earlier claim without erasing it.

Ownership, location, and condition are not inferred from the latest document or
geometry. If evidence does not establish them, they remain unknown,
unresolved, or conflicting.

### 2. Minimal Engineering Object Vocabulary

The following vocabulary is the minimum cross-discipline semantic layer. It
is intentionally smaller than a BIM, CAD, GIS, facilities-management, or
discipline-specific model.

| Concept | Purpose | Boundary | Relationships | Lifecycle meaning |
| --- | --- | --- | --- | --- |
| **Site** | Bounded project or land context | Geographic and administrative extent containing facilities or works | Contains facilities, buildings, zones, observations, and site evidence | Can be planned, acquired, developed, occupied, monitored, or retired |
| **Facility** | Managed engineering facility or campus-level unit | A coherent operational or project unit that may contain buildings and systems | Located in site; contains buildings, systems, equipment, and documents | Represents planned through operational and retired facility existence |
| **Building** | Built structure or building-level asset | A bounded constructed structure, including its envelope and primary internal organization | Part of facility; contains levels, spaces, elements, assemblies, and systems | Distinguishes intended, designed, constructed, occupied, maintained, and retired states |
| **Level** | Vertical or logical subdivision of a building | A floor, story, basement, roof level, or equivalent datum-bounded subdivision | Part of building; contains spaces, zones, elements, and equipment | Supports construction, access, inspection, and operational state by level |
| **Space** | Bounded usable or inspectable region | A physically or semantically bounded area; not merely a drawing room label | Located in level/building; may contain zones, equipment, elements, and observations | May be planned, defined, constructed, occupied, repurposed, or decommissioned |
| **Zone** | Functional, environmental, safety, or operational grouping | A grouping that may overlap spaces and need not be a physical enclosure | Groups spaces, elements, systems, or equipment; is governed by purpose | Exists for a defined operational, analytical, or control interval |
| **Element** | Individually addressable physical component | A component with a meaningful engineering boundary | Located in a space/level; part of assembly/system; designed by and verified by artifacts | May be designed, fabricated, installed, inspected, maintained, replaced, or removed |
| **Assembly** | Coherent composition of elements or material instances | A bounded composite whose members have meaningful whole/part semantics | Composes elements/material instances; may belong to system; affected by artifacts | Has formation, modification, disassembly, and replacement history |
| **System** | Functional network or coordinated set of components | A functional boundary, not necessarily a physical enclosure | Comprises elements/equipment/assemblies; serves spaces/facilities; interacts with other systems | Has design, commissioning, operation, maintenance, isolation, and retirement states |
| **Equipment** | Operationally managed machine, device, or apparatus | A replaceable or serviceable unit with an operational role | Located in space; part of or serves a system; inspected and maintained by evidence | Has procurement, installation, commissioning, operation, maintenance, and retirement history |
| **Material Instance** | Particular material quantity or installed batch | A traceable physical material occurrence, not a material specification | Part of element/assembly; characterized by evidence; affected by installation and condition | Supports receipt, placement, testing, service exposure, repair, and removal history |

These concepts are semantic categories, not commitments to one vendor format.
An object may participate in multiple relationships without being duplicated
into discipline-specific copies.

#### Boundary rules

- A **site** is a context of land, works, or facilities; it is not merely a
  latitude/longitude pair.
- A **facility** is an operational/project unit; it is not synonymous with a
  building.
- A **zone** may overlap spaces and therefore must not be modeled as simple
  physical containment.
- An **element** is addressable by engineering meaning; a mesh face, drawing
  symbol, or solver row is not automatically an element.
- An **assembly** expresses composition; a **system** expresses function.
- **Equipment** is an operational category and may also be an element or
  assembly participant.
- A **material instance** is an occurrence in reality; a material property
  artifact or specification is not the occurrence itself.

No concept is authoritative by type alone. A physical object may be
provisional, inferred, observed, verified, disputed, or unresolved.

### 3. Asset ↔ Engineering Artifact Relationship

Physical and knowledge domains are connected through the existing
`KnowledgeGraph`. These relationships are semantic edge roles, not a new
graph or a second provenance system.

The minimum relationship vocabulary is:

| Relationship | Meaning |
| --- | --- |
| **calculated-for** | A calculation or result addresses the behavior, quantity, or requirement of an asset/object |
| **designed-for** | A design artifact or decision specifies intended characteristics of an asset/object |
| **documented-by** | An asset/object is represented or discussed by a document artifact |
| **verified-by** | Evidence or review supports a stated property, status, or relationship of an asset/object |
| **observed-by** | An observation or measurement records a state or property of an asset/object |
| **inspected-by** | An inspection activity or report evaluates an asset/object |
| **affected-by** | A change, decision, condition, or event has an asserted impact on an asset/object |
| **located-in** | An asset/object has a spatial or containment relationship to a site, facility, building, level, or space |

Every edge must preserve the existing graph principles:

- canonical endpoint identities;
- explicit direction and relationship role;
- deterministic resolution;
- `RESOLVED`, `AMBIGUOUS`, `NOT_FOUND`, and `INVALID` outcomes where
  applicable;
- provenance, evidence, and temporal context;
- no silent latest-version resolution;
- no authority inference from structural presence.

Relationship labels must not be overloaded. For example, `documented-by` does
not mean verified-by, and `calculated-for` does not mean constructed or
operational. A relationship may be structurally valid while its authority or
temporal applicability remains unknown.

### 4. Geometry Semantic Boundary

Geometry is a representation of engineering reality, intent, observation, or
measurement. Geometry never creates identity, authority, lifecycle state, or
truth by itself.

The semantic layer distinguishes at least:

- **Design geometry** — intended form, position, dimensions, or arrangement
  produced by design activity.
- **Survey geometry** — geometry captured or derived from a survey process and
  tied to survey evidence and reference controls.
- **As-built geometry** — representation of the constructed or installed
  condition, supported by as-built evidence; it is not automatically verified.
- **Measured geometry** — geometry obtained from a measurement or inspection
  event, with method, uncertainty, and temporal context.
- **Imported geometry** — geometry brought from an external model, exchange
  format, or system; its semantic mapping and authority are initially
  unknown unless separately established.
- **Uncertain geometry** — geometry with incomplete provenance, insufficient
  precision, conflicting observations, unresolved coordinate context, or
  explicit uncertainty.

Geometry must be linked to the object or asset it represents and to the
artifact, observation, survey, calculation, or decision that produced or
supports it. It must retain coordinate/reference context, units, tolerances,
precision, uncertainty, and temporal applicability as semantic facts.

Geometry does not establish that an asset exists, is installed, is safe, is
approved, or is operational. A high-fidelity model may still be an imported
or unverified representation. Conversely, an asset may be known to exist when
its geometry is missing or uncertain.

### 5. Lifecycle Model

Lifecycle is a temporal state of an asset or object, not a global status field
that overwrites history. The vocabulary is:

```text
planned
  -> designed
  -> approved
  -> constructed
  -> installed
  -> operational
  -> inspected
  -> maintained
  -> retired
```

The sequence is a useful default, not a mandatory linear workflow.

#### Transition semantics

- **planned**: intended or proposed, with insufficient realization.
- **designed**: an engineering design exists for the intended asset or state.
- **approved**: an approval claim exists with an identified decision/evidence
  path; document issue alone is insufficient.
- **constructed**: physical construction is asserted or evidenced.
- **installed**: the asset is placed in its intended operational context.
- **operational**: the asset is available or used for its intended function.
- **inspected**: an inspection has occurred; this does not imply pass,
  safety, or continued operation.
- **maintained**: maintenance activity or maintained condition is recorded.
- **retired**: the asset is no longer intended for active service.

Transitions require an event, evidence, decision, or authority-backed fact.
They may skip states, overlap in time, or be reversed when reality changes.
For example, an installed asset may be returned to maintenance, and an
operational asset may be found to have never been correctly installed.

The model must support:

- unknown lifecycle state;
- partially known state intervals;
- conflicting state assertions;
- planned assets that were never constructed;
- constructed assets with unknown installation or operational state;
- historical states whose evidence is incomplete;
- retirement with retained historical identity.

An `inspected` or `maintained` observation is an event or state assertion, not
necessarily the current lifecycle state. Lifecycle conclusions must not be
derived from document status, geometry type, or calculation completion alone.

### 6. Reconstruction Integrity

The future model must preserve this chain without parallel authorities:

```text
Physical Reality
        |
        v
Engineering Model
        |
        v
Evidence
        |
        v
Decision
        |
        v
Knowledge
```

The preservation rules are:

1. Physical reality is represented by canonical asset/object referents and
   temporal claims.
2. Engineering models and geometry are representations linked to those
   referents; they are not replacements for them.
3. Evidence is carried by existing artifact identities and evidence
   relationships, with authority evaluated by `authorityEvidenceProvider`.
4. Decisions are explicit, versioned, evidence-linked engineering artifacts
   or governed domain objects; a recommendation is not an approved decision.
5. Knowledge reconstruction continues through
   `EngineeringArtifactIdentity`, `EngineeringKnowledgeRegistry`, and
   `KnowledgeGraph`.
6. Missing, ambiguous, invalid, conflicting, or temporally inapplicable
   links remain explicit and block stronger conclusions.

The model must be able to answer both:

- “What engineering knowledge was associated with this asset at a given
  time?”
- “Which physical assets and states were addressed by this exact artifact
  revision?”

Neither answer may be produced by searching documents heuristically,
selecting the latest artifact, or treating a geometry import as authoritative.

## Decisions

1. Jaryan will model physical assets as real-world referents distinct from
   engineering knowledge artifacts.
2. Asset Identity is a semantic identity role governed by the existing
   `EngineeringArtifactIdentity` authority. No second identity authority,
   asset registry, or parallel canonical ID format will be introduced.
3. The minimal cross-discipline vocabulary is Site, Facility, Building,
   Level, Space, Zone, Element, Assembly, System, Equipment, and Material
   Instance.
4. Physical objects, artifacts, geometry, evidence, decisions, and documents
   will be related through the existing `KnowledgeGraph`; no second graph or
   asset-specific provenance graph will be introduced.
5. The relationship vocabulary will include `calculated-for`,
   `designed-for`, `documented-by`, `verified-by`, `observed-by`,
   `inspected-by`, `affected-by`, and `located-in`.
6. Geometry will be semantically typed by representation origin or meaning,
   including design, survey, as-built, measured, imported, and uncertain
   geometry. Geometry will never create authority.
7. Lifecycle and asset attributes will be represented as temporally valid
   claims and events. Historical claims are retained; later claims do not
   erase earlier states.
8. Unknown, unresolved, conflicting, and inapplicable states are first-class
   reconstruction outcomes.
9. Documents remain evidence artifacts. A document can describe, support,
   contradict, or be superseded with respect to an asset, but document
   presence does not establish physical reality or authority.
10. AI output remains a suggestion until it is linked to evidence, reviewed
    through the existing governance path, and explicitly accepted as a
    decision or other governed fact.
11. This ADR authorizes architecture vocabulary and boundaries only. It does
    not authorize schemas, persistence, imports, APIs, UI, or production
    implementation.

## Non-goals

- Creating a second asset identity authority or asset registry.
- Creating a second graph, document graph, CAD graph, or BIM graph.
- Replacing `EngineeringArtifactIdentity`, `EngineeringKnowledgeRegistry`,
  `KnowledgeGraph`, or `authorityEvidenceProvider`.
- Defining a complete BIM, GIS, CAD, facilities-management, or discipline
  ontology.
- Defining geometry kernels, file formats, meshing, coordinate-transform
  algorithms, or rendering behavior.
- Treating documents, geometry, calculations, inspections, or AI output as
  authoritative by default.
- Defining database schemas, API contracts, UI workflows, or migration code.
- Solving all plan/drawing, decision/change, condition, maintenance, or
  external-system integration details in this ADR.

## Risks

### Identity drift

If future implementations create local asset IDs or map an asset to one
document revision, the same physical referent will fragment across systems.
The mitigation is strict reuse of the existing identity authority and explicit
separation of referent identity from representation identity.

### Geometry false confidence

Imported, generated, or high-precision geometry may be mistaken for verified
reality. Geometry origin, uncertainty, temporal validity, and evidence links
must remain visible in reconstruction and trust decisions.

### Document-reality conflict

A document may conflict with survey, inspection, or operational evidence.
The graph must preserve both claims, their temporal context, and their
resolution status. Conflict is not resolved by document recency alone.

### AI authority escalation

An AI proposal may be treated as a design change or approval without evidence
and human/governed review. AI output must remain an unverified suggestion
until it enters the existing evidence and decision path.

### Historical incompleteness

Legacy projects may lack asset identity, lifecycle events, geometry origin,
or temporal boundaries. Reconstruction must preserve unknown intervals and
confidence limitations rather than fabricate dates or states.

### Vocabulary inflation

Adding specialized types too early could recreate discipline silos. New
concepts should be introduced only when the existing vocabulary cannot express
a stable cross-discipline boundary.

### Relationship ambiguity

Words such as “designed,” “verified,” and “inspected” can be used loosely.
Relationship roles must remain distinct, directional, evidence-linked, and
temporally qualified.

### Authority boundary leakage

An asset model, geometry importer, document parser, or AI subsystem could
become an accidental trust source. All authority conclusions must continue to
flow through `authorityEvidenceProvider`.

## Migration implications

This ADR does not authorize implementation, but it constrains future
migration:

- Existing projects and scenarios must not be reinterpreted as physical
  assets merely because they contain site or geometry fields.
- Existing calculation, result, primitive, and source references must retain
  their canonical `EngineeringArtifactIdentity` and revision semantics.
- Legacy identifiers may be attached only as compatibility references and
  must never become canonical asset identity.
- Existing solver geometry must be classified by its semantic origin before
  being linked to physical objects; generated output is not automatically
  as-built or measured.
- Existing documents and source records must remain evidence references until
  their project applicability, revision, and relationship semantics are
  explicitly reconstructed.
- Historical gaps must migrate as unknown or unresolved claims, not guessed
  lifecycle transitions or locations.
- Any future extension of identity types must be reviewed as an extension of
  the existing identity authority, with registry and graph resolution
  implications assessed together.
- Migration must be additive and auditable. It must preserve old artifact
  versions, relationship provenance, and reconstruction outcomes.

## Next steps

1. Define the governed extension, if required, that allows physical
   referents to participate in `EngineeringArtifactIdentity` without creating
   a second identity authority.
2. Define canonical graph edge semantics, endpoint types, temporal validity,
   and resolution behavior for the eight asset-to-artifact relationships.
3. Define the asset/object claim model for ownership, location, condition,
   composition, lifecycle, and unknown/conflicting states.
4. Define the semantic geometry boundary, including coordinate context,
   uncertainty, measurement provenance, and representation classification.
5. Define decision, review, approval, supersession, and change semantics for
   asset-affecting engineering decisions.
6. Produce a migration inventory for current project, scenario, geometry,
   document, and calculation references.
7. Only after those decisions are approved, evaluate schemas, persistence,
   import pipelines, APIs, UI, and discipline-specific adapters.

## Related decisions

- ADR-007 — Authority Evidence and Revision Trust Boundary
- ADR-018 — Knowledge Identity Governance
- ADR-019 — Knowledge Identity Compliance Audit
- ADR-020 — Legacy Identity Reference Governance
- ADR-021 — Legacy Identity Resolution Safety
- ADR-022 — Knowledge Reconstruction Integrity Audit
- ADR-023 — Reconstruction Gap Prioritization
- ADR-024 — Canonical Provenance Reference Design
- ADR-025 — Revision-Sensitive Consumer Audit
- ADR-026 — Engineering Reality Foundation Audit
