# ADR-031: Semantic Backbone Foundation Implementation Plan

## Status

Proposed — created for Phase 13 Semantic Backbone Foundation Implementation
Planning.

## Problem statement

Jaryan has completed the architecture work required to define an Engineering
Digital Twin Platform boundary:

```text
Physical Asset
        |
Engineering Object
        |
Geometry Representation
        |
Engineering Artifact
        |
Calculation
        |
Evidence
        |
Decision
        |
Revision History
```

The existing repository already provides a strong engineering-knowledge
substrate:

- `EngineeringArtifactIdentity` is the canonical artifact identity authority;
- `EngineeringKnowledgeRegistry` preserves registered artifact versions;
- `KnowledgeGraph` resolves the existing artifact dependency graph;
- engineering knowledge packages preserve deterministic provenance;
- authority and trust conclusions remain provider-backed;
- shared-application exposes application queries and projections.

The repository does not yet contain a physical-reality semantic foundation.
The implementation risk is not merely missing types. It is accidentally
introducing a second identity model, second graph, mutable current-truth
store, CAD/BIM object model, document-management engine, or AI authority
path.

This ADR defines the smallest implementation plan for the semantic backbone.
It authorizes planning boundaries and release gates only. It creates no
production code, schema, database, API, UI, persistence, import pipeline, or
mobile implementation.

## Architecture

The foundation will be implemented as a semantic bridge around existing
authorities:

```text
shared-domain semantic references and claims
              |
              v
existing EngineeringArtifactIdentity + KnowledgeGraph
              |
              v
shared-knowledge evidence and artifact interpretation
              |
              v
shared-application reconstruction and workflows
              |
              v
infrastructure adapters for external representations
```

The implementation must preserve the existing provenance chain:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

Physical reality adds explicit cross-domain relationships to that chain. It
does not replace, flatten, or duplicate the artifact provenance model.

### Readiness conclusion

The minimum foundation is sufficiently specified for a staged implementation
of semantic identity references, object boundaries, temporal claims, and
typed graph relationships.

The following are not yet authorized as part of the foundation:

- physical persistence design;
- external geometry import;
- drawing or document lifecycle implementation;
- field synchronization;
- full decision workflow;
- discipline-specific object ontologies;
- CAD/BIM model ingestion;
- UI or API design.

Those require later architecture gates and release-specific decisions.

## Smallest semantic backbone

The minimum viable engineering-reality model is smaller than a complete
digital twin ontology.

### Required foundation concepts

| Concept | Minimum purpose |
| --- | --- |
| `PhysicalAsset` | Stable referent for a real or intended engineering thing |
| `EngineeringObject` | Shared subject/boundary for engineering reasoning |
| `Location` | Temporal spatial or containment context |
| `LifecycleState` | Historical assertion of planned, designed, installed, operational, retired, or unknown state |
| `TemporalValidity` | Valid-time and record-time context for claims and relationships |
| `Observation` | Time- and actor-bounded statement about an asset/object |
| `Measurement` | Quantified observation with units, method, precision, and uncertainty |
| `GeometryReference` | Provenance-bearing reference to geometry without embedding geometry authority |
| `RelationshipType` | Governed meaning for physical-to-artifact and claim relationships |

### Deferred concepts

The following are important but do not block the first semantic foundation:

- `Space` as a specialized `Location`;
- `System`, `Component`, and `Assembly` classifications;
- `Condition` as a richer assessed claim;
- `Requirement`, `Assumption`, `Constraint`, `Alternative`, `Decision`, and
  `ChangeEvent`;
- plan/sheet/view/annotation/dimension/symbol semantics;
- document issue, approval, applicability, and supersession details.

They remain architectural commitments from ADR-029, but implementation must
introduce them only when the relevant release gate is approved. The
foundation must leave room for them without prematurely encoding a large
ontology.

### Why these concepts exist

The minimum set answers the first reconstruction questions:

```text
Which real or intended thing is this?
What engineering object is being discussed?
Where and when did it apply?
What was observed or measured?
Which geometry representation is being referenced?
Which artifact, evidence, or relationship connects it to engineering knowledge?
```

If a proposed primitive does not improve one of those answers or enforce one
of the core invariants, it belongs in a later phase or a discipline module.

## Identity strategy

### Existing repository truth

The current `EngineeringArtifactIdentity` contract is explicitly artifact
oriented. Its current type vocabulary is:

```text
SOURCE | PRIMITIVE | CALCULATION | RESULT | BENCHMARK
```

Its identity includes a stable base lineage, explicit version, type, name, and
metadata. Its constructors and validators enforce canonical formatting. The
knowledge registry and graph rely on those semantics.

Physical assets must therefore not be represented by casually reusing a
calculation/result identity or by adding an ungoverned asset ID field.

### Plan

Physical assets will participate in the one identity authority through a
type-safe, explicitly governed identity extension or semantic identity role.
The extension must:

- use the existing canonical identity construction and validation boundary;
- distinguish physical referent identity from artifact revision identity;
- preserve stable referent lineage;
- support explicit identity continuity, replacement, split, merge, and
  re-identification relationships;
- remain resolvable through the existing identity/registry governance path;
- preserve exact artifact identity at the other endpoint of every relation;
- retain unknown and ambiguous resolution states.

No implementation may create:

- `AssetIdentityRegistry`;
- a local asset-ID generator;
- an application-only canonical asset key;
- BIM GUID or QR/NFC canonical identity;
- a second resolver or identity authority.

### Identity invariants

- A physical asset identity identifies a referent, not its document, geometry,
  observation, or calculation.
- An artifact revision does not create a new asset identity by default.
- A lifecycle state does not become an artifact revision.
- External identifiers are compatibility references until canonical resolution.
- Ambiguous identity resolution remains explicit; latest selection is forbidden.
- Historical identity changes preserve predecessor and successor relationships.

Identity extension must be reviewed before implementing any new identity type
or artifact-compatible physical node.

## KnowledgeGraph strategy

### Existing repository truth

The current `KnowledgeGraph` resolves artifact nodes and dependency edges,
including the deterministic:

```text
RESULT -> CALCULATION -> PRIMITIVE -> SOURCE
```

It currently exposes structural resolution states:

```text
RESOLVED | AMBIGUOUS | NOT_FOUND | INVALID
```

The semantic backbone must extend this authority rather than create a
physical graph beside it.

### Plan

Introduce typed cross-domain graph semantics in stages:

```text
PhysicalAsset / EngineeringObject
  --described-by----> EngineeringArtifact
  --calculated-for--> Result / Calculation
  --verified-by-----> Evidence
  --represented-by--> GeometryReference
  --observed-by-----> Observation
  --affected-by-----> Decision / ChangeEvent
  --located-in------> Location
```

The initial foundation should implement relationship meaning and endpoint
references before attempting broad graph persistence or query optimization.

### Required graph states

The existing states remain valid and must be supplemented semantically where
needed by:

- `UNKNOWN`: the available evidence cannot establish the relationship;
- `CONFLICTING`: valid claims disagree for a relevant interval;
- `NOT_APPLICABLE`: the relationship does not apply to the requested scope
  or time.

These may be represented through existing graph resolution conventions or a
governed extension, but they must not be collapsed to null, false, latest, or
best effort.

### Required relationship metadata

Every cross-domain relationship requires:

- relationship type and direction;
- canonical endpoint references;
- provenance/evidence reference;
- valid-time interval, including unknown/open boundaries;
- record time;
- applicability scope;
- resolution state;
- supersession or conflict context when applicable.

### Graph ownership

`KnowledgeGraph` remains the sole owner of canonical relationship semantics.
Shared-domain defines valid relationship vocabulary and invariants.
Shared-knowledge supplies evidence interpretation. Shared-application
projects and queries the graph. Adapters translate external relationships
into candidate or resolved graph inputs.

No layer may create an asset graph, document graph, BIM graph, or local
relationship truth.

## Domain and application boundaries

### `shared-domain`

The first implementation boundary for `shared-domain` includes:

- physical referent and engineering-object semantic categories;
- identity references and identity-type safety;
- `Location` and spatial-context semantics;
- `TemporalValidity`;
- `LifecycleState`;
- `Observation`;
- `Measurement`;
- `GeometryReference`;
- relationship types and endpoint rules;
- resolution, unknown, conflict, and supersession semantics;
- pure validation and deterministic normalization.

Shared-domain must remain independent of:

- database/storage;
- file formats;
- HTTP/API transport;
- UI;
- mobile device behavior;
- CAD/BIM libraries;
- external authority services.

### `shared-knowledge`

The first implementation boundary for `shared-knowledge` includes:

- evidence and source interpretation;
- document/drawing artifact references;
- claim support and applicability;
- authority-provider requests and results;
- knowledge-oriented decision evidence;
- source revision and supersession interpretation.

It must consume physical references without owning their identity or graph.
It must not convert a document, geometry reference, or AI suggestion into
authority without the existing provider path.

### `shared-application`

The first implementation boundary for `shared-application` includes:

- reconstruction queries;
- asset/object history projections;
- artifact-to-asset traceability views;
- temporal filtering and comparison workflows;
- review and approval orchestration;
- migration adapters from legacy application references.

Application code may offer convenient lookup and projections, but it must not
own canonical identity, graph edges, lifecycle truth, or authority status.

### Knowledge and infrastructure adapters

Adapters include:

- existing engineering package and registry adapters;
- source/document/drawing adapters;
- geometry and survey adapters;
- external model/BIM/CAD translation boundaries;
- field observation and measurement ingestion;
- QR/NFC/external identifier resolution;
- storage, transport, and synchronization.

Adapters may preserve raw external data and unresolved mappings. They must
not promote external IDs, imported geometry, or adapter-local records to
canonical identity or graph authority.

## Implementation boundaries by concern

### PhysicalAsset

Implement as a stable referent and relationship target. Do not model it as a
generic CRUD asset row with mutable current fields.

Required semantics:

- canonical identity participation;
- object relationship;
- historical identity changes;
- lifecycle and temporal claims;
- explicit unresolved identity.

Deferred:

- enterprise ownership workflows;
- maintenance work orders;
- asset catalog synchronization;
- facilities-management properties.

### EngineeringObject

Implement as a small shared semantic subject/boundary. It may represent an
asset view, intended object, system, component, assembly, or logical object.

Do not mirror every imported model object, solver node, CAD primitive, mesh
face, or discipline-specific record.

### Location

Implement temporal containment and spatial context. A `Space` may be
introduced as a specialized location when a release needs space-level
reconstruction.

Do not implement a full GIS or coordinate geometry engine in the foundation.

### LifecycleState and TemporalValidity

Implement as immutable or append-only claims with:

- state;
- valid-from/valid-to, including unknown/open boundaries;
- record time;
- support/provenance;
- resolution/conflict status.

Do not implement a mutable `currentStatus` authority that overwrites history.

### Observation and Measurement

Implement observations as historical claims and measurements as quantified
observations.

Measurements must preserve:

- value and unit;
- method/instrument/source;
- precision and uncertainty;
- actor/device context where available;
- capture and record times;
- referenced asset/object.

Do not treat an observation or measurement as verified solely because it was
submitted.

### GeometryReference

Implement only the semantic reference and metadata boundary:

- referenced asset/object;
- representation type;
- coordinate system and transform context;
- units;
- source and production method;
- evidence/provenance;
- uncertainty and completeness;
- lifecycle and temporal context.

Do not implement geometry authoring, rendering, meshing, CAD kernels, or BIM
object synchronization.

### Relationship types

Implement the minimum typed relationship set:

```text
described-by
represented-by
calculated-for
verified-by
observed-by
affected-by
located-in
```

Add `designed-for`, `inspected-by`, `part-of`, `comprises`, `contains`, and
`serves` only when their endpoint and temporal semantics are explicitly
reviewed.

## Migration strategy

Migration must be additive, evidence-preserving, and reversible in meaning.

### Stage 0 — Protect current authorities

- inventory identity, registry, graph, provenance, and authority consumers;
- preserve all existing artifact IDs, versions, fingerprints, and packages;
- identify legacy IDs and application-local references;
- reject any new parallel identity or graph path;
- establish contract-level review before changing identity types.

### Stage 1 — Introduce semantic references

- define physical referent and engineering-object identity participation;
- introduce `TemporalValidity`, lifecycle, observation, measurement, and
  geometry-reference semantics;
- preserve unknown and ambiguous mappings;
- avoid persistence and external imports.

### Stage 2 — Connect to existing provenance

- add typed physical-to-artifact relationships through `KnowledgeGraph`;
- retain exact artifact revisions;
- preserve `RESULT -> CALCULATION -> PRIMITIVE -> SOURCE`;
- expose historical and unresolved reconstruction outcomes.

### Stage 3 — Migrate current application references

- map project, scenario, calculation, geometry, and source references;
- retain legacy identifiers as compatibility metadata;
- classify current geometry as designed, calculated, imported, observed, or
  unknown before physical linking;
- do not infer installed or operational state from current solver output.

### Stage 4 — Add evidence and relationship consumers

- connect observations, measurements, and evidence artifacts;
- expose application reconstruction queries;
- preserve conflicts and supersession;
- delay document/drawing lifecycle details to Release C.

### Stage 5 — Add later release capabilities

- geometry and plan intelligence;
- decision/change reconstruction;
- field capture and synchronization;
- discipline-specific adapters.

No stage may overwrite historical state or silently infer missing identity,
revision, geometry provenance, lifecycle, or authority.

## Migration risks

### Identity collision

Legacy IDs, BIM GUIDs, tags, filenames, and coordinates may point to the same
or different physical referents. Automatic merging creates irreversible
semantic damage. Resolution must support ambiguity and governed merge
decisions.

### Artifact contamination

Using artifact identities as if they were physical assets could cause
document or calculation revisions to appear as asset changes. Type safety and
explicit cross-domain edges are mandatory.

### Graph fragmentation

Application-local relationships or adapter-specific graphs could diverge from
`KnowledgeGraph`. All canonical edges must be created and resolved through
the existing graph authority.

### Geometry overclaim

Generated or imported geometry may be mislabeled as installed or verified.
Representation type, source, uncertainty, and evidence must be preserved.

### Historical overwrite

Migrating into mutable “current” fields could erase prior lifecycle,
condition, location, or evidence claims. Migration must be append-only in
historical meaning.

### Unknown-state collapse

Legacy systems may encode missing values as empty strings, defaults, or
version `1`. Those values must not be upgraded to certainty without evidence.

### Layer leakage

Application projections, adapters, or discipline modules may accidentally
become canonical owners. Ownership tests and review gates must prevent this.

### Scope inflation

Introducing BIM, CAD, GIS, document-management, or field features during
foundation work could obscure the smallest semantic backbone and delay
implementation.

## Release roadmap

### Release A — Engineering identity + semantic backbone foundation

**Capabilities**

- governed physical referent identity participation;
- minimum physical-reality vocabulary;
- engineering-object and location references;
- temporal validity and lifecycle claims;
- observation and measurement semantics;
- geometry references without geometry authority;
- initial typed graph relationship validation;
- explicit unresolved, ambiguous, unknown, and conflicting states.

**Required architecture gates**

- identity-extension contract review;
- graph endpoint and relationship review;
- shared-domain ownership review.

**Out of scope**

- persistence, API, UI, geometry import, document lifecycle, and mobile
  synchronization.

**Primary risk**

Encoding a second identity or graph while trying to make the foundation
convenient.

### Release B — Asset relationships + evidence linking

**Capabilities**

- asset/object links to existing engineering artifacts;
- `described-by`, `calculated-for`, `verified-by`, `observed-by`, and
  `affected-by` relationships;
- evidence and authority-status projections;
- historical relationship queries;
- unresolved and conflicting evidence handling.

**Required architecture gates**

- evidence/artifact relationship review;
- authority-provider integration review;
- reconstruction query review.

**Out of scope**

- document-management workflows and unrestricted external imports.

**Primary risk**

Treating evidence presence or document status as authority.

### Release C — Geometry and plan intelligence

**Capabilities**

- designed, surveyed, installed, observed, imported, and uncertain geometry
  classifications;
- coordinate systems, units, uncertainty, and representation provenance;
- spatial contexts and object representation links;
- drawings, sheets, views, annotations, dimensions, symbols, and references;
- document revision, issue, applicability, approval, and supersession;
- design-versus-observed reconstruction.

**Required architecture gates**

- geometry/spatial semantics review;
- plan/drawing evidence-boundary review;
- document lifecycle review.

**Out of scope**

- CAD authoring, BIM replacement, full 3D viewer, or automatic truth
  reconciliation.

**Primary risk**

Imported or drawn representations becoming false physical authority.

### Release D — Field/mobile digital twin experience

**Capabilities**

- field asset discovery through compatibility identifiers;
- inspection, observation, photo, and measurement evidence;
- offline capture and deterministic reconciliation;
- asset history and design-versus-observed comparison;
- review, approval, and conflict workflows.

**Required architecture gates**

- field evidence contract;
- offline synchronization and conflict review;
- security and authorization review;
- operational and safety review.

**Out of scope**

- a local mobile identity registry or local graph;
- autonomous AI engineering authority.

**Primary risk**

Wrong asset association, offline conflict loss, or unreviewed observations
being presented as verified truth.

## Definition of implementation readiness

Production coding may begin only when Release A has approved:

- the identity participation contract;
- the minimum domain vocabulary;
- graph endpoint and edge semantics;
- temporal validity and unknown-state behavior;
- ownership boundaries;
- migration rules for legacy references;
- preservation tests for existing artifact provenance.

The existence of ADR-031 alone does not authorize code. Each release requires
its own architecture approval and a demonstrated non-violation of the core
invariants.

## What must not be created

- `AssetIdentityRegistry` or any second identity authority;
- `AssetGraph`, `BIMGraph`, or `DocumentGraph`;
- a second artifact or provenance registry;
- a mutable current-truth asset database;
- a CAD object model, geometry kernel, or BIM clone;
- a document-management engine;
- an AI knowledge authority or autonomous approval path;
- latest-version inference for exact reconstruction;
- destructive updates that overwrite historical truth;
- hidden conversion of unknown or ambiguous state into false certainty.

## Validation checklist

- [x] `EngineeringArtifactIdentity` remains the only identity authority.
- [x] `KnowledgeGraph` remains the only relationship authority.
- [x] Existing engineering provenance remains intact.
- [x] Domain and application ownership boundaries are explicit.
- [x] Infrastructure adapters cannot become canonical authorities.
- [x] Geometry remains representation, not truth.
- [x] Documents remain evidence artifacts.
- [x] AI suggestions remain non-authoritative.
- [x] Unknown, unresolved, ambiguous, conflicting, and historical states
      remain explicit.
- [x] No production implementation is authorized by this ADR.

## Next steps

1. Approve ADR-031 as the Phase 13 implementation-planning boundary.
2. Produce the identity-extension contract review before coding physical
   referents.
3. Produce the graph extension contract review before adding cross-domain
   edges.
4. Implement Release A only after both reviews are approved.
5. Review evidence linking before Release B.
6. Review geometry and plan intelligence before Release C.
7. Review field/mobile synchronization and operational safety before Release D.
8. Stop implementation when a new authority, graph, or unresolved semantic
   boundary is discovered; return to architecture review.

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
- ADR-030 — Semantic Backbone Implementation Readiness
