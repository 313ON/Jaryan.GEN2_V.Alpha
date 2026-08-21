# ADR-030: Semantic Backbone Implementation Readiness

## Status

Proposed — created for the Phase 12B Semantic Backbone Implementation
Readiness Review.

## Problem statement

ADR-029 defines the minimum semantic backbone required to connect physical
engineering reality to Jaryan's existing engineering knowledge foundation.
The next question is whether that design is sufficiently bounded for
production implementation.

The current repository already contains mature engineering identity,
knowledge-package, registry, graph, provenance, authority, and application
boundaries. It does not yet contain a shared physical-reality implementation.
Implementing that layer without explicit ownership and migration boundaries
could create:

- a second identity model for assets;
- a second graph for physical relationships;
- discipline-specific object fragmentation;
- geometry or document data being mistaken for truth;
- application projections becoming accidental authorities;
- historical state being overwritten.

This ADR is an implementation-readiness review only. It creates no production
code, schema, database model, API, UI, persistence layer, CAD/BIM importer, or
document-management engine.

## Architecture

The semantic backbone is ready for staged implementation, subject to the
boundaries and gates in this ADR:

```text
shared-domain semantic foundation
        |
        v
existing identity and KnowledgeGraph authorities
        |
        v
shared-knowledge evidence and artifact semantics
        |
        v
shared-application reconstruction and workflow projections
        |
        v
infrastructure adapters for external sources and field capture
```

The implementation must preserve the existing knowledge path:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

The new path connects physical reality to that chain; it does not replace or
duplicate it:

```text
PhysicalAsset
  -> EngineeringObject
  -> Geometry / Observation / Measurement
  -> EngineeringArtifact
  -> Evidence / Decision
  -> existing provenance and revision history
```

### Readiness conclusion

The semantic backbone is sufficiently defined for a constrained foundation
implementation, but not for unrestricted digital-twin feature development.

Implementation may begin only with the minimal shared-domain vocabulary,
identity participation boundary, graph relationship semantics, and explicit
unknown/temporal states. Geometry, drawing, document lifecycle, field
synchronization, and discipline-specific extensions require separate gates and
follow-up architecture decisions.

## Concepts

### Minimum domain vocabulary

The minimum production foundation is:

- `PhysicalAsset`
- `EngineeringObject`
- `Location`
- `Space`
- `System`
- `Component`
- `Assembly`
- `Observation`
- `Measurement`
- `Condition`
- `LifecycleState`

These concepts are sufficient to answer the first reconstruction questions:

- What physical or intended thing is this?
- Which engineering object is being reasoned about?
- Where was it located?
- What system, component, or assembly boundary applies?
- What was observed or measured?
- What condition and lifecycle state were asserted?
- Which artifact, evidence, or decision is related?

No additional ontology is required before foundation coding. Site, facility,
building, level, zone, equipment, material instance, drawing content, and
discipline-specific classifications may be introduced as governed
specializations or follow-up decisions when a demonstrated reconstruction
need exists.

### Definition-of-done for the foundation

The foundation is not implementation-ready until each minimum concept has:

- a stable semantic purpose;
- an explicit identity participation rule;
- allowed relationship roles;
- temporal-validity semantics;
- unknown and conflict behavior;
- ownership by one repository layer;
- reconstruction behavior for missing or ambiguous references;
- no dependency on a CAD/BIM or document-management model.

## Repository ownership boundaries

### `shared-domain`

`shared-domain` owns semantic meaning that must remain consistent across all
engineering disciplines and applications:

- physical-reality vocabulary;
- identity references and identity-type safety;
- object boundaries and composition semantics;
- location and spatial-context semantics;
- observation, measurement, condition, and lifecycle claims;
- temporal validity, supersession, unknown, and conflict states;
- geometry representation metadata;
- canonical relationship roles and graph endpoint rules;
- domain validation and reconstruction-state semantics.

`shared-domain` must not own rendering, file parsing, storage, mobile
synchronization, or user workflow.

### `shared-knowledge`

`shared-knowledge` owns reusable knowledge and evidence interpretation:

- source and evidence references;
- claims, assumptions, policies, and authority context;
- document and drawing evidence semantics;
- decision-support evidence and provenance interpretation;
- applicability and supersession meaning for knowledge artifacts;
- authority-provider integration contracts.

It may interpret evidence about a physical object, but it must not create a
second physical-object identity or graph.

### `shared-application`

`shared-application` owns use-case orchestration and projections:

- project and scenario workflows;
- reconstruction queries;
- asset/object history views;
- review and approval orchestration;
- field-session orchestration;
- comparison of design, observed, and installed representations;
- user-facing read models and reports.

Application code must consume canonical domain and graph services. It must
not define local canonical IDs, relationship semantics, lifecycle truth, or
authority facts.

### Infrastructure adapters

Infrastructure adapters own translation at system boundaries:

- document and drawing file access;
- survey, measurement, and sensor ingestion;
- QR/NFC and external identifier resolution;
- BIM/CAD exchange import;
- photo and attachment transport;
- offline synchronization;
- database, message, and storage integration;
- external authority and provider clients.

Adapters may preserve external identifiers and raw payloads as evidence or
compatibility references. They must not promote them to canonical identity,
graph ownership, or authority.

## Implementation boundaries

### Physical Asset

The implementation boundary is a canonical physical referent with
historical continuity, not a generic asset row.

It must support:

- identity governed by `EngineeringArtifactIdentity` principles;
- explicit distinction between referent and representation;
- predecessor, successor, replacement, split, and merge relationships;
- temporal lifecycle and location claims;
- unknown and ambiguous identity states;
- links to engineering objects, artifacts, evidence, and decisions.

It must not contain every document field, geometry payload, discipline
property, or mutable “current truth” status.

### Engineering Object

The implementation boundary is a shared semantic object subject or boundary.
It may represent a physical asset, intended object, logical system, spatial
context, component, or assembly.

It must support:

- explicit relationship to a physical referent where one exists;
- stable object category;
- composition and functional relationships;
- discipline-neutral links to geometry, evidence, and artifacts;
- separation between model lifecycle and physical lifecycle.

It must not mirror every imported BIM/CAD object or solver primitive.

### Location / Spatial Context

The implementation boundary is a temporal spatial or containment context.
Location is not just a string, coordinate, or geometry file.

It must support:

- containment and `located-in` relationships;
- coordinate/reference context where applicable;
- historical moves, renumbering, and changed containment;
- `Space` as a bounded or named operational/engineering context;
- distinction between location semantics and geometry representation.

It must not become a full GIS or facilities-management ontology.

### Geometry Representation

The implementation boundary is metadata and relationship semantics around
geometry, not a geometry kernel.

It must support:

- represented asset or engineering object;
- coordinate system and transform context;
- units;
- representation type: designed, surveyed, installed, observed, imported,
  or uncertain;
- source and production method;
- evidence/artifact provenance;
- uncertainty, tolerance, precision, and completeness;
- lifecycle and valid-time context;
- mapping and conflict status.

The geometry payload may be delegated to an adapter or external engine.
Geometry cannot establish asset identity, installation, approval, condition,
or authority.

### Plan / Drawing

The implementation boundary is an evidence representation with semantic
references:

- drawing lineage and revision;
- sheet;
- view;
- annotation;
- dimension;
- symbol;
- reference to object, geometry, artifact, evidence, or decision.

The implementation must preserve what the drawing states and which objects it
references. It must not reproduce a complete CAD authoring model, editing
kernel, layer system, parametric constraint engine, or BIM coordination
model.

### Document Evidence

The implementation boundary is evidence lineage and applicability:

- document identity and revision;
- issue and effective scope;
- approval relationship;
- supersession and withdrawal;
- applicability to assets, objects, projects, and time;
- evidence and authority status;
- missing or unresolved revision context.

Document existence, filename, issue label, or ingestion status is not
authority.

### Lifecycle State

The implementation boundary is an append-only temporal claim:

```text
planned
designed
approved
constructed
installed
operational
inspected
maintained
retired
unknown
conflicting
```

States may overlap, skip, or have unknown boundaries. Lifecycle state must not
be a mutable replacement for historical claims or evidence.

### Decision / Change Record

The implementation boundary is reconstruction of engineering reasoning:

- requirement;
- assumption;
- constraint;
- alternative;
- decision;
- approval;
- change event;
- affected asset/object;
- exact evidence and artifact revisions;
- rationale and valid/record time.

A recommendation, AI output, document issue, or workflow submission is not
automatically a decision or approval.

### Relationship Types

The first implementation set is:

```text
described-by
represented-by
calculated-for
designed-for
verified-by
observed-by
inspected-by
affected-by
located-in
```

Required structural relationships include:

```text
part-of
comprises
contains
serves
supports
contradicted-by
supersedes
```

Every relationship must have:

- direction and semantic role;
- canonical endpoint references;
- provenance;
- temporal validity and applicability;
- resolution state;
- conflict/supersession behavior where applicable.

The relationship vocabulary extends the existing `KnowledgeGraph`; it does
not create an asset graph, document graph, or BIM graph.

## Identity and graph constraints

### One identity authority

Physical assets must participate in the existing
`EngineeringArtifactIdentity` authority through a governed extension or
type-safe identity role. No `AssetIdentity`, `AssetRegistry`, local asset-ID
authority, imported BIM GUID authority, QR/NFC authority, or application
database key may become canonical.

Identity continuity, replacement, split, merge, and re-identification are
explicit historical relationships. An artifact revision does not implicitly
create a new asset, and a lifecycle state does not implicitly create an
artifact revision.

### One graph authority

All physical, object, geometry, evidence, document, and decision
relationships remain in `KnowledgeGraph`.

Graph resolution must preserve:

- `RESOLVED`;
- `AMBIGUOUS`;
- `NOT_FOUND`;
- `INVALID`;
- `UNKNOWN`;
- `CONFLICTING`;
- `NOT_APPLICABLE`.

Graph state must support valid time, record time, source revision,
applicability, supersession, and historical reconstruction.

### Existing provenance preservation

The existing chain remains authoritative for engineering knowledge:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

Physical links attach to the chain through explicit graph edges. They must
not flatten provenance or substitute a physical asset for an artifact node.

## Migration order

Migration must be additive, staged, and reversible in meaning.

### Step 0 — Contract inventory and protection

- inventory existing identity, registry, graph, provenance, and authority
  consumers;
- identify legacy IDs and application-local references;
- freeze the rule that no new parallel identity or graph path is accepted;
- preserve existing artifact versions and fingerprints.

### Step 1 — Identity participation and semantic objects

- establish the governed physical-referent identity extension;
- introduce the minimum shared-domain vocabulary;
- define object, asset, location, composition, and lifecycle references;
- retain unresolved mappings as explicit states;
- connect only validated physical referents to existing artifact identities.

### Step 2 — Graph relationship extension

- add the minimum physical-to-artifact, evidence, decision, and location
  relationship semantics;
- validate endpoint types and temporal scope;
- preserve exact artifact revisions and existing provenance;
- provide historical and ambiguity-aware reconstruction.

### Step 3 — Geometry and spatial intelligence

- classify existing geometry by representation type;
- add coordinate, units, uncertainty, source, and temporal metadata;
- link geometry to objects through explicit graph relationships;
- do not treat generated or imported geometry as installed truth.

### Step 4 — Document, drawing, and evidence lifecycle

- represent document/drawing revision, issue, applicability, approval,
  supersession, and references;
- preserve documents as evidence artifacts;
- retain missing revision and conflicting evidence states.

### Step 5 — Decision and change reconstruction

- add requirements, assumptions, constraints, alternatives, decisions,
  approvals, and change events;
- link exact artifact and evidence revisions;
- preserve “what was known at time T.”

### Step 6 — Field and infrastructure adapters

- add photo, measurement, inspection, QR/NFC, and offline adapters;
- keep external IDs and offline records provisional until canonical
  reconciliation;
- implement synchronization conflict and approval workflows only after the
  semantic foundation is stable.

No migration step may overwrite historical facts or infer missing identity,
revision, geometry, lifecycle, or authority.

## Release roadmap

### Milestone A — Engineering identity + semantic objects foundation

**Capabilities**

- governed physical referent identity participation;
- minimum semantic vocabulary;
- asset/object/location relationships;
- lifecycle and temporal claims;
- initial graph edges and explicit resolution states;
- links to existing artifact identities and provenance.

**Required foundations**

- identity-extension decision and validation;
- shared-domain ownership;
- graph endpoint and edge semantics;
- historical and unknown-state behavior.

**Risks**

- identity contamination;
- duplicate physical referents;
- object boundaries becoming discipline-specific;
- application code becoming canonical.

**Readiness**

This is the first implementation milestone authorized by this ADR, subject to
identity and graph contract review.

### Milestone B — Geometry and spatial intelligence

**Capabilities**

- design, survey, installed, observed, imported, and uncertain geometry;
- coordinate systems, units, transforms, uncertainty, and provenance;
- spatial containment and object representation links;
- design-versus-observed comparison semantics.

**Required foundations**

- geometry metadata contract;
- spatial context semantics;
- external geometry adapter boundary;
- conflict and reconciliation rules.

**Risks**

- imported BIM/CAD false authority;
- geometry replacing evidence;
- coordinate or unit errors;
- visual precision masking uncertainty.

**Readiness**

Requires a dedicated geometry/spatial architecture gate before implementation.

### Milestone C — Document/drawing/evidence lifecycle

**Capabilities**

- document and drawing revisions;
- sheets, views, annotations, dimensions, symbols, and references;
- issue, approval, applicability, supersession, and withdrawal;
- asset/object/evidence relationships;
- conflict between documented and observed reality.

**Required foundations**

- evidence lifecycle semantics;
- document/drawing boundary;
- provider-backed authority evaluation;
- exact revision reconstruction.

**Risks**

- accidental document-management engine;
- document status treated as truth;
- missing revision inferred as latest;
- drawing content mistaken for physical state.

**Readiness**

Requires a dedicated document/drawing evidence-lifecycle architecture gate.

### Milestone D — Field/mobile engineering usage

**Capabilities**

- inspection and observation capture;
- photo and measurement evidence;
- QR/NFC discovery;
- design-versus-observed comparison;
- offline capture and synchronization;
- review and approval workflows.

**Required foundations**

- stable semantic identity and graph behavior;
- conflict and duplicate-resolution rules;
- append-only historical capture;
- security, authorization, and operational controls;
- infrastructure adapter contracts.

**Risks**

- wrong asset association in the field;
- offline conflicts resolved by synchronization order;
- unreviewed observations treated as verified;
- device or tag identifiers promoted to canonical identity.

**Readiness**

Requires field evidence, synchronization, security, and operational
architecture reviews.

## What must not be created

The following are explicitly prohibited:

- a second identity model or asset identity authority;
- `AssetRegistry`;
- `AssetGraph`, `BIMGraph`, or `DocumentGraph`;
- an independent artifact or document provenance chain;
- a CAD replacement or geometry authoring engine;
- a BIM clone or complete imported-object ontology;
- a document-management engine;
- an application-local authority or “current truth” store;
- an AI authority or autonomous engineering approval path;
- silent latest-version selection;
- destructive updates that overwrite historical truth;
- inferred certainty for missing identity, revision, geometry, lifecycle, or
  evidence.

## Red-team review

### Imported BIM file becomes false authority

The import must remain an external representation with mapping, coordinate,
revision, source, completeness, and uncertainty metadata. Import success
creates no canonical asset identity and no authority conclusion.

### AI generates false asset relationships

AI output is a suggestion with provenance and uncertainty. It may propose a
candidate edge, but the edge remains unresolved or unverified until existing
evidence and review/provider rules accept it.

### Geometry replaces evidence

A geometry representation can show intended, surveyed, installed, or observed
form, but cannot by itself prove physical existence, condition, approval,
operation, or safety.

### Documents override reality

A document records what was documented. Survey, observation, inspection, or
measurement may conflict with it. Both claims remain available with revision
and time context; authority is not assigned by document recency or issue
status alone.

### Two identities describe one object

Resolution must return `AMBIGUOUS` or an explicit duplicate-resolution
outcome. A merge decision preserves predecessor identities and historical
relationships. Names, coordinates, tags, and model GUIDs are not sufficient
for silent merging.

### Historical truth is overwritten

Lifecycle, condition, geometry, evidence, and decision changes are additive
historical claims. Corrections and supersession retain prior records and
their original validity/record times.

### Missing revision or evidence

The result remains unknown, unresolved, ambiguous, or unsupported. The
implementation must not infer latest, approved, current, or verified status.

### Two engineers disagree

Both observations or interpretations are recorded with actor, time, scope,
and evidence. A later decision may resolve the engineering workflow, but it
does not erase the disagreement or rewrite the earlier state.

### Discipline module creates a parallel model

Discipline modules may add specialized interpretation, but must reference
shared-domain objects and graph edges. A discipline-local object cannot
become a second canonical asset or relationship authority.

## Risks

### Premature implementation

Coding before identity and graph gates are approved could permanently encode
parallel authorities. The mitigation is milestone gating and contract review.

### Semantic vocabulary inflation

Adding too many concepts before real reconstruction needs are known could
produce a BIM-like ontology that is difficult to govern. The mitigation is
the minimum vocabulary and explicit follow-up ADRs.

### Layer leakage

Application, adapter, or discipline code could define canonical meaning.
Ownership rules and architectural review must reject such changes.

### Evidence-to-authority leakage

Documents, geometry, imports, AI suggestions, and workflow statuses may be
mistaken for authority. All authority conclusions remain provider-backed.

### Temporal loss

Mutable status fields and destructive migrations could destroy historical
truth. All state-bearing concepts require temporal and supersession semantics.

## Migration implications

This ADR does not authorize implementation or migration. When migration is
approved:

- existing artifact identities, versions, fingerprints, registries, and
  provenance chains must remain unchanged;
- legacy project, scenario, calculation, drawing, document, BIM, CAD, and
  field IDs remain compatibility references until canonical resolution;
- existing solver geometry must be classified before physical linking;
- missing identity, revision, evidence, lifecycle, and spatial context must
  migrate as explicit unknown or unresolved states;
- migration must preserve conflicting and superseded records;
- application read models must be rebuilt from canonical domain and graph
  relationships rather than promoted to authority;
- every stage must be auditable and reversible in meaning.

## Next steps

1. Approve ADR-030 as the implementation-readiness boundary.
2. Produce the focused physical identity-extension contract review.
3. Produce the graph extension contract review for endpoint, edge, temporal,
   and resolution semantics.
4. Implement only Milestone A after those contract reviews are approved.
5. Review geometry/spatial semantics before Milestone B.
6. Review document/drawing/evidence lifecycle before Milestone C.
7. Review field synchronization, security, and operations before Milestone D.
8. Do not authorize production coding beyond the approved milestone.

## Validation checklist

- [x] No second identity authority.
- [x] No second graph.
- [x] No CAD replacement.
- [x] No BIM clone.
- [x] No document-management engine.
- [x] No AI authority layer.
- [x] Existing provenance chain remains intact.
- [x] Unknown, unresolved, ambiguous, conflicting, and historical states
      remain explicit.
- [x] Repository ownership boundaries are defined.
- [x] Migration order and release gates are defined.

## Related decisions

- ADR-018 — Knowledge Identity Governance
- ADR-020 — Legacy Identity Reference Governance
- ADR-021 — Legacy Identity Resolution Safety
- ADR-022 — Knowledge Reconstruction Integrity Audit
- ADR-024 — Canonical Provenance Reference Design
- ADR-025 — Revision-Sensitive Consumer Audit
- ADR-026 — Engineering Reality Foundation Audit
- ADR-027 — Physical Reality Semantic Model Design
- ADR-028 — Digital Twin Semantic Backbone Review
- ADR-029 — Digital Twin Semantic Backbone Domain Foundation
