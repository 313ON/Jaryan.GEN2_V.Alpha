# ADR-038: Release C Geometry Representation and `REPRESENTED_BY` Contract

## Status

Accepted — recorded on 2026-08-22 as the Phase 15 Release C architecture
gate. Phase 15 implementation remains separately gated and is not authorized
by this ADR acceptance alone.

This ADR defines the smallest geometry-representation decision required
before implementation. It does not implement the relationship or authorize
geometry ingestion.

## Context

Release B established a single `KnowledgeGraph` authority for immutable,
directional relationship declarations. The current authorized relationship
predicates are:

```text
PHYSICAL_REFERENT -> DESCRIBED_BY -> ARTIFACT
ARTIFACT          -> CALCULATED_FOR -> PHYSICAL_REFERENT
```

The repository already contains:

- `GeometryReference`, an opaque compatibility reference with explicit
  resolution state;
- `GeometrySemanticMetadata`, containing representation type, geometry state,
  coordinate reference, units, uncertainty, temporal validity, and an
  evidence reference;
- `KnowledgeGraphEndpoint`, whose canonical endpoint kinds are `ARTIFACT` and
  `PHYSICAL_REFERENT`;
- immutable `RelationshipDeclaration` and deterministic historical
  reconstruction;
- `EngineeringArtifactIdentity` as the identity authority;
- `KnowledgeGraph` as the graph authority.

Release C requires a bounded relationship for saying that a physical
referent has an engineering representation. Geometry must remain a
representation of engineering reality, not a new identity, graph, evidence,
authority, or trust system.

## Decision

### 1. `REPRESENTED_BY` meaning and direction

Authorize one Release C structural predicate:

```text
PHYSICAL_REFERENT -> REPRESENTED_BY -> ARTIFACT
```

`REPRESENTED_BY` means that an engineering artifact carries, references, or
records a geometry representation of the physical referent for the asserted
scope and time.

The relationship does not establish that:

- the geometry is physically installed;
- the geometry is complete, accurate, approved, applicable, or authoritative;
- the physical referent has the represented geometry;
- the artifact is trusted merely because it contains geometry;
- an external geometry payload has been accepted as canonical truth.

The inverse direction is not authorized. `ARTIFACT -> REPRESENTED_BY ->
PHYSICAL_REFERENT` is invalid for this predicate.

### 2. Allowed endpoint types

`REPRESENTED_BY` may use only the existing canonical endpoint kinds:

- subject: `KnowledgeGraphEndpoint` with kind `PHYSICAL_REFERENT`;
- object: `KnowledgeGraphEndpoint` with kind `ARTIFACT`.

The artifact endpoint is governed by `EngineeringArtifactIdentity`. The
physical-referent endpoint is governed by the existing type-safe physical
referent identity role within the same identity authority.

No geometry endpoint kind, geometry identity, location identity, object
identity, persistence identifier, or adapter-local graph node is introduced.

An opaque `GeometryReference` is not a `KnowledgeGraphEndpoint` and cannot
become one through this ADR.

### 3. Geometry metadata ownership and attachment

`GeometryReference` and `GeometrySemanticMetadata` are declaration-level
representation data associated with a `REPRESENTED_BY` assertion.

They are not endpoint identity and do not participate in `RelationshipFact`
identity. Fact identity remains exactly:

```text
subject + predicate + object
```

When Phase 15 implements the relationship, the declaration envelope may carry
the canonicalized, immutable geometry representation data required by this
ADR.

Geometry metadata is not part of `RelationshipFact` identity or fingerprint.
The fact fingerprint remains determined solely by the ordered subject,
predicate, and object.

When geometry metadata is present, it is asserted immutable
declaration-level semantic data and must participate in the canonical
`RelationshipDeclaration` fingerprint. Therefore, two otherwise identical
`REPRESENTED_BY` declarations with different geometry metadata remain
deterministically distinguishable. A declaration without geometry metadata is
not equivalent to a declaration containing different geometry metadata.

This does not create a geometry identity or geometry graph.

The declaration-level geometry data must preserve:

- the opaque `GeometryReference` and its resolution state;
- `GeometrySemanticMetadata`;
- the exact referenced artifact revision through the artifact endpoint and
  existing evidence/reference contracts.

The metadata describes the representation asserted by the declaration. It
does not create a geometry registry, geometry revision authority, or mutable
current representation.

### 4. Identity and graph ownership

This decision reuses:

- `EngineeringArtifactIdentity` for artifact identity;
- the governed physical-referent identity role for physical referent identity;
- `KnowledgeGraph` for canonical relationship facts and declarations.

Geometry cannot create, replace, merge, or infer either endpoint identity.
Geometry-derived labels, coordinates, filenames, BIM GUIDs, tags, payload
hashes, or AI output remain compatibility inputs or evidence unless resolved
through the existing identity authority.

No second identity authority, graph authority, relationship-local registry,
or geometry authority is created.

### 5. Temporal, uncertainty, provenance, and evidence semantics

`REPRESENTED_BY` reuses the existing relationship declaration semantics:

- `AFFIRM` and `DENY` remain assertion dispositions, not authority results;
- `applicabilityContext` remains nullable and query-scoped;
- `TemporalValidity` remains explicit;
- omitted temporal boundaries remain unknown and are never inferred as
  current, open, or latest;
- supersession remains explicit declaration metadata;
- historical declarations remain addressable;
- conflicting affirmations and denials remain preserved;
- insertion order, timestamp order, artifact revision order, and newest
  status do not establish truth or supersession.

`GeometrySemanticMetadata.uncertainty` remains an explicit representation
property. `KNOWN`, `ESTIMATED`, `UNCERTAIN`, `CONFLICTING`, and `UNKNOWN`
must not be collapsed into a binary geometry-validity result.

Geometry provenance and evidence remain separate:

- the artifact endpoint identifies the representation artifact;
- geometry metadata may reference supporting evidence through existing
  artifact identity contracts;
- `RelationshipDeclaration.evidenceReferences` remains the canonical
  relationship evidence list;
- evidence presence or resolution does not establish authority or trust;
- authority and trust remain delegated to the existing provider and trust
  boundaries;
- AI proposals remain non-authoritative.

### 6. Resolution and reconstruction behavior

`REPRESENTED_BY` must use the existing deterministic relationship
reconstruction contract:

1. validate the exact directed fact and both endpoint kinds;
2. include the predicate and ordered endpoints in fact identity;
3. canonicalize duplicate declarations deterministically;
4. apply only explicit applicability and temporal query context;
5. follow only explicit supersession references;
6. preserve historical declarations, denials, and conflicts;
7. keep structural status, geometry metadata state, evidence, authority, and
   trust independently inspectable.

The following states remain explicit:

- `UNKNOWN`: no applicable relationship or geometry basis is established;
- `AMBIGUOUS`: endpoint resolution or geometry mapping has multiple viable
  candidates;
- `INVALID`: an endpoint, declaration, or geometry metadata contract is
  invalid;
- `UNRESOLVED`: an opaque geometry reference exists but has not been governed
  into a resolved representation reference.

An `UNRESOLVED` or `UNKNOWN` geometry reference must not be treated as a
resolved geometry identity or as proof that the relationship is authoritative.
An ambiguous or invalid endpoint must not fall back to another endpoint.
Geometry-reference resolution remains distinct from graph endpoint
resolution.

### 7. Shared-domain boundary

Shared-domain may own only the pure semantic envelope and validation for the
relationship and its metadata:

- representation type and state;
- coordinate and unit metadata;
- uncertainty;
- temporal validity;
- opaque reference and resolution state;
- deterministic declaration content.

Geometry payloads must not enter shared-domain. No meshes, solids, vertices,
faces, point clouds, binary files, renderer objects, CAD entities, BIM
objects, GIS features, transforms with executable behavior, or geometry
engine state are authorized by this ADR.

## Implementation gate

This ADR authorizes architecture only. Phase 15 implementation may begin
only after this ADR is explicitly accepted and the implementation plan
demonstrates:

- exact `PHYSICAL_REFERENT -> ARTIFACT` direction enforcement;
- reuse of the existing identity and `KnowledgeGraph` authorities;
- declaration-level geometry metadata without endpoint identity promotion;
- fact-fingerprint stability independent of geometry metadata;
- declaration-fingerprint determinism including canonical geometry metadata;
- temporal, supersession, conflict, and historical preservation;
- explicit `UNKNOWN`, `AMBIGUOUS`, `INVALID`, and `UNRESOLVED` behavior;
- unchanged `DEPENDENCY`, `DESCRIBED_BY`, and `CALCULATED_FOR` behavior;
- evidence, authority, trust, and AI boundaries remaining separate.

No implementation is authorized by the proposed status alone.

## Explicit non-scope

This ADR does not authorize:

- `VERIFIED_BY`;
- `OBSERVED_BY`;
- `AFFECTED_BY`;
- any other new predicate;
- a geometry identity or geometry registry;
- a second identity or graph authority;
- a geometry engine, CAD, BIM, GIS, or external-model ingestion;
- rendering, meshing, visualization, or geometry authoring;
- geometry payload storage or transport;
- persistence or database schema;
- API or UI;
- document-management or drawing-lifecycle workflows;
- field/mobile synchronization;
- a new evidence registry or trust engine;
- automatic authority or truth from geometry;
- autonomous AI promotion;
- implicit latest/current selection;
- automatic reconciliation of conflicting geometry.

## Consequences

Release C receives one narrow, reviewable representation relationship while
preserving the existing identity, graph, provenance, evidence, authority,
trust, temporal, and reconstruction boundaries.

Geometry remains an immutable, provenance-bearing representation claim. It
can be unresolved, uncertain, conflicting, historical, or unsupported without
being forced into canonical physical truth.

## Related decisions

- ADR-031 — Semantic Backbone Foundation Implementation Plan
- ADR-033 — Current Semantic Relationship Graph Provenance Repair
- ADR-034 — Relationship Declaration, Evidence Boundary, and Deterministic Reconstruction
- ADR-035 — Physical Referent Identity Extension
- ADR-036 — Release B Relationship Vocabulary and Direction Contract
- ADR-037 — Relationship Authority Evaluation Adapter Boundary
