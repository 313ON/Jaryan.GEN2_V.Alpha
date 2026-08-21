# ADR-028: Digital Twin Semantic Backbone Architecture Review

## Status

Proposed — created for Phase 12C architecture review.

## Problem statement

ADR-027 established the minimum physical-reality vocabulary required for
Jaryan to become an Engineering Digital Twin Platform. The remaining
architectural question is how that vocabulary becomes a durable semantic
backbone without fragmenting the existing knowledge architecture.

The target reconstruction path is:

```text
Physical Reality
        |
        v
Engineering Object
        |
        v
Geometry Representation
        |
        v
Engineering Artifact
        |
        v
Evidence
        |
        v
Decision
        |
        v
Revision History
```

Jaryan already has one governed engineering-knowledge path:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

through `EngineeringArtifactIdentity`,
`EngineeringKnowledgeRegistry`, `KnowledgeGraph`, and
`authorityEvidenceProvider`.

This review determines how physical objects, geometry, drawings, documents,
evidence, and decisions can participate in that path without creating an
`AssetRegistry`, `AssetGraph`, document-management product, or CAD/BIM
replacement.

This ADR contains architecture decisions only. It creates no production code,
database schema, API, UI, import pipeline, or persistence implementation.

## Architecture

The semantic backbone is one governed graph of canonical entities and typed
relationships:

```text
physical referent
  -> engineering object
  -> geometry / drawing representation
  -> canonical engineering artifact
  -> evidence and decision context
  -> authority and trust evaluation
```

The backbone is not a new subsystem with independent identity or graph
ownership. It is a cross-domain use of the existing authorities:

| Concern | Sole authority |
| --- | --- |
| Canonical identity | `EngineeringArtifactIdentity` |
| Artifact registration and historical lookup | `EngineeringKnowledgeRegistry` |
| Relationships and resolution | `KnowledgeGraph` |
| Authority evidence and trust conclusions | `authorityEvidenceProvider` |
| Structural integrity | Existing identity, package, fingerprint, and graph validation |

Physical reality is represented as canonical referents plus explicit claims
about state, geometry, evidence, and time. No representation is automatically
the reality it describes.

## Concepts

### 1. Identity Architecture

#### The rejected assumption

“Asset identity can simply reuse artifact identity” is directionally correct
only if “reuse” means reuse of the existing identity authority and validation
rules. It is unsafe if it means treating a physical asset as interchangeable
with a versioned knowledge artifact.

An asset and an artifact have different semantics:

| Concern | Physical asset | Engineering artifact |
| --- | --- | --- |
| Referent | Real or intended engineering thing | Immutable knowledge/evidence representation |
| Continuity | Persists through descriptions, revisions, and state changes | Each revision is a distinct version |
| Change | Condition, location, composition, ownership, or lifecycle may change | New artifact version; old version remains addressable |
| Failure mode | Duplicate or merged physical referents | Wrong revision or lineage resolution |

#### Decision

Physical assets will participate in the existing
`EngineeringArtifactIdentity` authority through a governed identity extension
mechanism, if the current artifact type vocabulary cannot represent them
without ambiguity.

The extension mechanism must preserve the existing identity contract:

- stable lineage identity for the physical referent;
- explicit version or state-reference semantics where required;
- deterministic construction and validation;
- registry-compatible historical resolution;
- no silent latest selection;
- no local asset-ID format;
- no independent asset identity lifecycle.

The architecture therefore distinguishes:

```text
asset referent identity
  !=
asset state claim
  !=
geometry representation identity
  !=
document or calculation artifact identity
```

An asset identity identifies the referent. It does not encode every lifecycle
state, geometry revision, inspection, ownership change, or document version.
Those are separately governed claims or artifacts connected through the
existing graph.

#### Benefits

- One canonical identity and validation boundary.
- Deterministic cross-domain references.
- Historical asset referents remain addressable after renovation, replacement,
  or retirement.
- Existing provenance and resolution patterns can be reused.
- A calculation or drawing can refer to an asset without becoming its identity.

#### Risks

- An artifact-oriented identity contract may become contaminated with
  physical-lifecycle semantics.
- Asset state changes could be incorrectly represented as artifact versions.
- Treating all physical objects as artifacts could blur evidence, identity,
  and authority.
- Existing artifact consumers may assume only `SOURCE`, `PRIMITIVE`,
  `CALCULATION`, `RESULT`, or `BENCHMARK` categories.

#### Guardrails

1. The extension must be reviewed as an extension of the one identity
   authority, not as a new asset identity system.
2. Physical asset identity must not be used as a substitute for asset state,
   geometry, evidence, or authority.
3. Artifact consumers must not accept an asset identity where an artifact
   identity is required, or vice versa, without an explicit governed relation.
4. Asset identity must not be generated from a filename, drawing number,
   imported BIM GUID, QR/NFC token, coordinate, or document revision.
5. External identifiers remain compatibility references and never become
   canonical identity.
6. Merging, splitting, replacement, and renovation require explicit
   identity decisions and preserved historical relationships.

No `AssetRegistry` or parallel identity authority is introduced.

### 2. Engineering Object Model Boundary

The minimum semantic object layer is the ADR-027 vocabulary:

```text
Site
Facility
Building
Level
Space
Zone
Element
Assembly
System
Equipment
Material Instance
```

The layer is deliberately a cross-discipline semantic spine, not a complete
engineering ontology.

#### Shared-domain responsibility

`shared-domain` owns concepts that must have the same meaning across
structural, architectural, MEP, energy, site, inspection, and calculation
contexts:

- object category and identity participation;
- stable referent and lineage semantics;
- containment, composition, location, and functional relationship vocabulary;
- lifecycle, temporal validity, unknown, conflict, and supersession semantics;
- evidence, observation, inspection, and decision relationship meaning;
- geometry representation metadata and uncertainty semantics;
- canonical graph endpoint and edge meaning;
- validation and reconstruction states.

#### Discipline-module responsibility

Discipline modules own specialized interpretations and calculations that
cannot be made universal without distorting meaning:

- structural member behavior and design checks;
- MEP circuit, flow, pressure, and control semantics;
- energy-system performance models;
- geotechnical strata and foundation analysis;
- material-specific testing and degradation models;
- discipline-specific geometry or solver representations.

Discipline modules must reference shared objects and canonical artifacts. They
must not redefine Site, Building, Element, System, identity, graph, evidence,
or lifecycle semantics.

#### Application-layer responsibility

The application layer owns use-case orchestration and projections:

- project and scenario workflows;
- search, reporting, review, and work queues;
- field-session orchestration;
- permissions and workflow assignment;
- read models and user-oriented projections;
- coordination of domain operations.

The application layer must not create application-local canonical asset IDs,
object vocabularies, graph relationships, or authority facts.

#### Boundary rules

- A BIM object, CAD entity, IFC GUID, solver node, mesh face, or drawing
  symbol is not automatically a shared-domain engineering object.
- Imported objects are mapped to shared objects only with explicit mapping
  provenance and unresolved handling.
- Shared-domain objects remain semantically small; specialized attributes
  stay in discipline modules or evidence artifacts.
- One physical object may have multiple discipline views without creating
  multiple canonical objects.

This prevents BIM duplication, CAD object explosion, and discipline-specific
fragmentation.

### 3. KnowledgeGraph Evolution

The current `KnowledgeGraph` can support the target chain if it is extended
as one typed graph with additional node and edge categories. A second graph is
not required and is prohibited.

#### Node categories

The graph may resolve nodes representing:

- physical asset referents and shared engineering objects;
- geometry representations;
- engineering artifacts, including results, calculations, primitives, and
  sources;
- evidence records such as observations, measurements, inspections, tests,
  and document revisions;
- decisions, requirements, assumptions, constraints, alternatives, approvals,
  and change events;
- external identifiers and imported references only as non-canonical
  compatibility or provenance nodes where needed.

Node category is semantic typing, not a new identity system. Every canonical
node must have an identity governed by the existing identity authority or be
an explicitly governed value object whose identity is not presented as a
competing canonical identifier.

#### Edge categories

Edges include:

- physical structure: `contains`, `part-of`, `comprises`, `serves`,
  `located-in`;
- representation: `represented-by`, `depicts`, `derived-from`,
  `mapped-from`;
- engineering relation: `calculated-for`, `designed-for`, `affected-by`;
- evidence relation: `documented-by`, `observed-by`, `inspected-by`,
  `verified-by`, `supported-by`, `contradicted-by`;
- decision relation: `requires`, `assumes`, `constrained-by`,
  `alternative-to`, `decided-by`, `approved-by`, `supersedes`,
  `changes`;
- existing artifact provenance: `RESULT -> CALCULATION -> PRIMITIVE ->
  SOURCE`.

The ADR-027 relationship vocabulary remains the minimum external contract.
Additional edge labels require the same governance review and must not
collapse distinct meanings.

#### Ownership rules

- `EngineeringArtifactIdentity` owns canonical endpoint identity.
- `EngineeringKnowledgeRegistry` owns registered artifact versions and
  historical artifact lookup.
- `KnowledgeGraph` owns relationship representation and resolution.
- The source/evidence boundary owns evidence interpretation.
- `authorityEvidenceProvider` alone supplies authority evidence for trust
  conclusions.
- Domain modules own specialized facts only within their governed scope.
- Application projections may cache or aggregate, but never become canonical.

#### Resolution states

All physical-to-knowledge reconstruction must preserve:

- `RESOLVED`: endpoint and relation are structurally valid and uniquely
  resolved;
- `AMBIGUOUS`: multiple possible endpoints, mappings, revisions, or temporal
  interpretations exist;
- `NOT_FOUND`: the referenced identity or evidence is absent;
- `INVALID`: identity, edge, type, fingerprint, or temporal constraints fail;
- `UNKNOWN`: the system cannot establish the fact from available evidence;
- `CONFLICTING`: valid claims disagree for an overlapping or relevant
  interval;
- `NOT_APPLICABLE`: the relation or claim does not apply to the requested
  asset, scope, or time.

These states must not be reduced to null, false, latest, or “best effort.”

#### Temporal validity

Every state-bearing node and edge must support:

- valid-from and valid-to semantics, including unknown boundaries;
- record time and source revision;
- event time where the relation is event-based;
- applicability scope;
- supersession without deletion;
- conflict preservation.

Graph resolution for a historical question must use the requested time
interval and exact artifact revision. It must not use current graph state or
latest artifact selection as a substitute for historical reconstruction.

### 4. Geometry Intelligence Boundary

Jaryan needs semantic geometry metadata, not a general-purpose geometry
authoring or rendering engine.

Each geometry representation must answer:

```text
What object does this represent?
How was it produced?
In which coordinate context?
With what precision and uncertainty?
For what time interval?
Which evidence or artifact supports it?
```

The answer must remain distinct from:

```text
Is this representation the authoritative physical truth?
```

That second question belongs to evidence and authority evaluation.

#### Required semantic metadata

- represented asset or engineering-object identity;
- representation kind: design, survey, as-built, measured, imported, or
  uncertain;
- geometry artifact identity and revision;
- coordinate reference system and local transform context;
- units and dimensional basis;
- precision, tolerance, resolution, and uncertainty;
- origin and method, including design generation, survey, measurement,
  import, or derivation;
- source artifact, observation, survey, inspection, or decision evidence;
- valid-time interval and record time;
- mapping status when imported from an external model;
- completeness and coverage;
- conflict or reconciliation status;
- relationship to topology, placement, containment, or assembly where known.

#### Representation rules

- Design geometry represents intent.
- Survey and measured geometry represent observations with method and
  uncertainty.
- As-built geometry is a claim about constructed reality and requires
  supporting evidence; its label does not make it verified.
- Imported geometry is untrusted until mapped and evaluated.
- Uncertain geometry remains usable for bounded analysis only when the
  uncertainty is explicit.

Geometry may support a calculation, but it does not make the calculation
authoritative. A calculation may also exist without geometry.

### 5. Plan / Drawing Intelligence Architecture

Jaryan will represent plans and drawings as evidence-oriented representations
with semantic references, not as a CAD authoring environment.

#### Drawing concepts

- **Drawing**: a governed evidence representation or drawing set associated
  with an engineering context.
- **Sheet**: a bounded presentation unit within a drawing set.
- **View**: a projection, section, detail, schedule, or other scoped view of
  engineering content.
- **Annotation**: explanatory or identifying content attached to a sheet,
  view, or referenced object.
- **Dimension**: a stated measurement or constraint representation, not an
  automatically verified physical measurement.
- **Symbol**: a presentation marker that may reference an engineering object,
  system, equipment, or standard meaning.
- **Reference**: a governed link from drawing content to an object, geometry,
  artifact, document, or external source.
- **Revision**: an immutable drawing/document representation revision.

These concepts are intentionally presentation-semantic. They do not attempt
to model every CAD primitive, editing operation, block, layer, mesh, or
parametric constraint.

#### Boundary

A drawing must answer which engineering objects, artifacts, evidence, and
decisions it represents or references. It need not reproduce the authoring
tool's complete internal model.

Drawing content is authoritative only as evidence of what the drawing states.
It is not automatically authoritative evidence of what exists physically.
References may be unresolved, ambiguous, superseded, or contradicted by
survey or inspection evidence.

#### Required drawing relationships

- drawing `documents` asset/object;
- sheet `part-of` drawing;
- view `presents` geometry or object context;
- annotation `references` object/artifact/evidence;
- dimension `states` a designed or documented value;
- symbol `represents` an object/system/equipment category;
- revision `supersedes` prior drawing revision;
- drawing or sheet `supports`, `contradicts`, or is `affected-by` a decision.

The drawing layer must use the existing graph and identity authorities. It
must not become a second document graph or a CAD/BIM replacement.

### 6. Document Lifecycle Intelligence

Documents are evidence artifacts with lifecycle metadata and relationships.
Document existence is never equivalent to authority.

The minimum lifecycle vocabulary is:

- **Document**: the logical evidence lineage or record.
- **Revision**: an immutable content/version state of that document.
- **Issue**: a released or circulated applicability state of a revision.
- **Approval**: an explicit decision/evidence claim about a revision or issue.
- **Supersession**: a directed relationship where a later revision or issue
  replaces an earlier one for a stated scope.
- **Applicability**: the project, asset, location, discipline, purpose, and
  valid-time scope to which the document applies.

A document lifecycle record must preserve:

- canonical artifact identity and revision;
- issue state and effective interval;
- approval relationship and approver evidence;
- supersession and withdrawal relationships;
- applicability scope;
- relationship to assets, objects, geometry, calculations, evidence, and
  decisions;
- missing, unknown, conflicting, and unverified lifecycle facts.

An issued drawing may be structurally issued but still be inapplicable to a
specific asset. An approved document may approve a design intent without
proving construction. A superseded document remains historically
reconstructable.

Authority is evaluated through `authorityEvidenceProvider`; no document
status, filename, title block, or ingestion event can bypass that boundary.

### 7. Engineering Decision Model

Jaryan must preserve the reasoning context around engineering change. The
minimum decision vocabulary is:

- **Requirement**: a need, obligation, performance target, or acceptance
  criterion.
- **Assumption**: a condition accepted for analysis or decision, with
  provenance and uncertainty.
- **Constraint**: a limit or condition that restricts alternatives.
- **Alternative**: a candidate solution or state considered.
- **Decision**: an explicit selection, rejection, or direction.
- **Approval**: a governed acceptance of a decision or deliverable.
- **Change event**: a temporal event that modifies an asset, design,
  requirement, decision, or applicable state.

Each decision must preserve:

- the affected asset/object;
- requirements, assumptions, and constraints in force at the time;
- alternatives considered and their evidence;
- selected outcome and rationale;
- decision maker, reviewer, and approval state;
- exact artifact and document revisions used;
- valid time and record time;
- superseded decision or changed condition;
- resulting impact relationships.

The reconstruction question is:

```text
What did we know at that moment?
What did we not know?
Which alternatives were considered?
What decision was made?
Who approved it, if anyone?
Which asset and future state were affected?
```

A recommendation is not a decision. An AI proposal is not a decision. An
approval is not proof that the physical result matched the decision.

### 8. Mobile / Field Engineering Readiness

Mobile readiness is an architectural requirement before it is a UI feature.
Field workflows must operate against the same canonical model as office and
analysis workflows.

The backbone must support:

- lookup by canonical asset identity and controlled external identifiers;
- QR/NFC resolution as compatibility discovery, never canonical identity;
- offline capture with explicit pending, unsynchronized, and conflict states;
- observation and measurement records with method, actor, time, location,
  uncertainty, and evidence attachments;
- append-only history and correction events rather than overwriting prior
  observations;
- comparison of design, survey, as-built, and measured representations;
- attachment of photos, documents, drawings, and readings as evidence;
- partial synchronization and deterministic conflict handling;
- permissions and review workflow in the application layer;
- explicit unknown identity when a field observation cannot resolve an asset;
- re-identification workflow when a tag is missing, duplicated, or wrong.

The field layer must not create an offline asset registry or local graph.
Offline records are provisional evidence and are reconciled through the
canonical identity, registry, graph, and authority boundaries.

### 9. Release Readiness Impact

The following milestones are architectural readiness bands, not delivery
commitments.

| Milestone | Capabilities | Missing foundations | Principal risks |
| --- | --- | --- | --- |
| **A — Engineering Knowledge Platform** | Versioned artifacts, deterministic provenance, registry reconstruction, graph relationships, provider-backed authority, explicit unknown states | Physical asset/object semantics, geometry semantics, decision and field models | Accurate knowledge remains detached from real-world assets |
| **B — Digital Twin Core** | Canonical physical referents, shared engineering-object vocabulary, asset/artifact graph links, typed geometry, lifecycle and temporal reconstruction, document and decision semantics | Production-grade ingestion, migration, field synchronization, broad discipline adapters | Identity contamination, geometry false confidence, document/reality conflict, temporal gaps |
| **C — Engineering Field Platform** | Mobile observations, QR/NFC discovery, offline evidence capture, inspections, measured/as-built comparison, asset history and field-to-office reconciliation | Mature identity resolution, conflict workflows, security, synchronization, operational validation | Wrong tag or asset match, offline conflicts, unsafe interpretation of incomplete evidence |
| **D — Production Enterprise Release** | Governed multi-project operation, enterprise audit, permissions, retention, integrations, operational support, performance, reliability, and approved field workflows | Formal operational controls, migration completion, security/compliance review, support model, production evidence quality | Enterprise-scale ambiguity, integration drift, legal/retention obligations, unauthorized authority escalation |

Jaryan is architecturally strong at milestone A. ADR-027 and ADR-028 define
the backbone required for milestone B, but do not claim milestone B is
implemented or production-ready. Milestones C and D require additional
architecture reviews for synchronization, security, operations, and
discipline-specific safety.

### 10. Red Team Review

#### Asset identity changes

An asset identity must not be silently mutated. If the referent remains the
same, preserve identity and record a state/change event. If one asset is
replaced, split, merged, or materially redefined, create explicit governed
identity relationships such as predecessor, successor, replaced-by, or
composed-from while preserving historical identity and evidence.

#### Building renovation

Renovation creates affected-by and change relationships. Unaffected assets
retain identity. Modified objects preserve history and acquire new state and
representation claims. Demolished or replaced assets are retired or
superseded, not erased. Design intent must remain distinct from constructed
and measured state.

#### Drawing conflicts with survey

Both claims remain in the graph with their source, revision, time, method, and
resolution state. The drawing may remain valid as a record of design intent
while the survey provides contrary evidence about physical condition.
Conflict is surfaced; it is not resolved by document precedence alone.

#### AI creates a wrong interpretation

The AI output is stored as a suggestion with model context, uncertainty,
inputs, and provenance. It cannot become an asset fact, geometry truth,
approval, or decision without evidence and governed review. A rejected
suggestion remains auditable when policy requires historical retention.

#### Imported BIM model is wrong

The import is classified as imported geometry and an external representation.
Its mapping, completeness, coordinate context, and uncertainty remain
explicit. It may support discovery or analysis but cannot overwrite canonical
objects, lifecycle, or authority facts.

#### Document revision is missing

The document relationship resolves to an unknown or ambiguous revision. The
system must not infer latest, current, or approved status from filename,
timestamp, or ingestion order. Historical reconstruction reports the missing
revision context.

#### Two engineers disagree

The system records both observations, interpretations, or proposed decisions
with actors, times, evidence, and scope. A conflict-resolution or approval
decision may establish a governed conclusion, but disagreement is not erased
and no user opinion becomes authority merely by being newer.

## Decisions

1. Physical assets will participate in the existing
   `EngineeringArtifactIdentity` authority through a governed extension
   mechanism where necessary; no second identity authority or `AssetRegistry`
   will be created.
2. Asset referent identity, asset state, geometry representation, evidence,
   and artifact revision are separate semantic concerns.
3. The shared-domain layer owns the cross-discipline object vocabulary,
   identity participation, graph semantics, temporal validity, uncertainty,
   and reconstruction states.
4. Discipline modules own specialized engineering meanings and calculations;
   application code owns workflows and projections, not canonical domain
   identity or graph meaning.
5. `KnowledgeGraph` remains the only relationship authority for physical
   objects, artifacts, evidence, documents, decisions, and their provenance.
6. Graph nodes and edges must be typed, canonical, temporally valid, and
   resolvable to explicit states including unknown and conflict.
7. Geometry is a provenance-bearing representation with coordinate, unit,
   uncertainty, origin, evidence, mapping, and temporal metadata. It never
   creates authority.
8. Plans and drawings are evidence representations with semantic references,
   not a CAD/BIM authoring model.
9. Document lifecycle is represented as evidence lineage, revision, issue,
   approval, supersession, and applicability; document existence is not
   authority.
10. Engineering decisions must preserve requirements, assumptions,
    constraints, alternatives, rationale, approvals, affected assets, exact
    revisions, and historical context.
11. Mobile and field workflows must use the same canonical authorities and
    preserve offline, conflict, uncertainty, and unknown states.
12. The architecture is ready to guide Digital Twin Core implementation
    design, but this ADR authorizes no production implementation.

## Non-goals

- Creating an `AssetRegistry`, `AssetGraph`, or second canonical identity
  system.
- Creating a document-management product or replacing enterprise document
  systems.
- Rebuilding AutoCAD, Revit, BIM coordination, a geometry kernel, or a
  general-purpose CAD/BIM object model.
- Defining production schemas, database models, APIs, UI, synchronization
  protocols, or import implementations.
- Declaring any document, geometry, AI output, or model import authoritative
  by default.
- Completing every discipline ontology or operational facilities-management
  workflow.
- Replacing `EngineeringArtifactIdentity`, `EngineeringKnowledgeRegistry`,
  `KnowledgeGraph`, or `authorityEvidenceProvider`.

## Risks

### Identity contamination

If physical state changes are represented as artifact revisions, asset
identity, artifact identity, and historical truth will become confused.

### Parallel authority by extension

An apparently convenient asset extension could accidentally become a second
identity or registry path. Any extension must remain inside the existing
identity and validation authority.

### Graph overload

Adding ungoverned node and edge types could turn `KnowledgeGraph` into an
opaque integration store. Every category needs explicit semantics,
resolution behavior, and ownership.

### Representation-as-truth

Geometry, drawings, imported BIM, and documents can look precise while being
wrong, stale, or inapplicable. Provenance and uncertainty must be mandatory
semantic concerns.

### Historical overwrite

Convenience updates could replace prior lifecycle, inspection, document, or
decision facts. All changes must be append-only in meaning and historically
reconstructable.

### Offline identity collision

Field systems may encounter missing, duplicated, or incorrectly assigned
tags. Discovery identifiers must never silently become canonical identity.

### Workflow authority leakage

Approval workflows, application status fields, or AI confidence scores could
be mistaken for authority facts. Authority remains provider-backed and
evidence-linked.

## Migration implications

This review does not authorize migration, but future migration must:

- preserve all existing artifact identities, versions, fingerprints, and
  registry entries;
- treat legacy project, scenario, drawing, BIM, CAD, and tag IDs as
  compatibility references until explicitly resolved;
- classify imported geometry before linking it to canonical objects;
- preserve unresolved and conflicting mappings instead of forcing a match;
- retain historical document revisions and issue states even when incomplete;
- model decisions and field observations as additive historical records;
- avoid deriving physical assets from filenames, geometry coordinates, or
  document presence;
- assess changes to shared-domain, discipline modules, and application
  projections separately;
- validate that every migration path continues to use one identity authority,
  one graph authority, and `authorityEvidenceProvider`.

## Next steps

1. Conduct a focused identity-extension ADR to define how physical referents
   enter `EngineeringArtifactIdentity` while preserving artifact type safety.
2. Define the shared-domain semantic object boundary and ownership matrix for
   core objects, claims, events, geometry metadata, and evidence.
3. Define the unified graph extension, including node/edge categories,
   temporal validity, conflict semantics, and historical resolution.
4. Define drawing and document evidence semantics, including revision, issue,
   applicability, supersession, and semantic references.
5. Define the engineering decision and change-traceability model.
6. Define field evidence and offline reconciliation requirements before any
   mobile implementation.
7. Produce a release-readiness gap register for the transition from milestone
   A to milestone B.
8. Only after these decisions are approved, evaluate schemas, persistence,
   APIs, imports, UI, and production implementation.

## Verification checklist

- [x] No second identity authority introduced.
- [x] No second graph introduced.
- [x] No document-management architecture introduced.
- [x] No CAD/BIM replacement attempted.
- [x] Unknown, ambiguous, invalid, conflicting, and inapplicable states remain
  explicit.
- [x] Historical truth is preserved rather than overwritten.
- [x] Geometry is treated as representation, not authority.
- [x] AI suggestions remain non-authoritative.

## Related decisions

- ADR-007 — Authority Evidence and Revision Trust Boundary
- ADR-018 — Knowledge Identity Governance
- ADR-020 — Legacy Identity Reference Governance
- ADR-021 — Legacy Identity Resolution Safety
- ADR-022 — Knowledge Reconstruction Integrity Audit
- ADR-023 — Reconstruction Gap Prioritization
- ADR-024 — Canonical Provenance Reference Design
- ADR-025 — Revision-Sensitive Consumer Audit
- ADR-026 — Engineering Reality Foundation Audit
- ADR-027 — Physical Reality Semantic Model Design
