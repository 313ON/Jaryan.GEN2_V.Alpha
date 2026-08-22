# ADR-039: Engineering Decision and Change Evidence Semantics

**Status:** Accepted — decision/change evidence semantics
**Date:** 2026-08-22

## Context

ADR-030 identifies reconstruction of engineering reasoning as a required
semantic-backbone capability, but leaves its concrete identity, relationship,
temporal, and authority contracts to a follow-up decision. Release B and
Release C now provide the reusable relationship, provenance, evidence,
temporal-validity, supersession, and authority/trust boundaries needed for a
small decision/change slice.

This ADR is approved with the implementation clarification that evidence is
not a `KnowledgeGraph` endpoint. Evidence remains represented by existing
`evidenceReferences` and evidence/authority providers.

Without an explicit contract, a decision or change record could become:

- a second identity authority beside `EngineeringArtifactIdentity`;
- a mutable "current decision" or "current asset state";
- an undirected workflow record with unclear endpoints;
- evidence that is mistaken for authority;
- an event that erases superseded history;
- an AI proposal that is treated as an approved engineering fact.

## Decision

Jaryan will represent engineering decisions and engineering changes as
immutable, evidence-linked domain declarations consumed by the existing
`KnowledgeGraph` authority. This ADR authorizes the semantic contract only;
it does not authorize persistence, API, UI, workflow orchestration, or
external ingestion.

### 1. Identity ownership

`EngineeringArtifactIdentity` remains the sole identity authority for
decision and change records.

- A decision or change record is an engineering artifact with a stable
  identity and immutable declaration content.
- A decision/change identity is not derived from a physical referent,
  relationship, evidence reference, timestamp, issue number, or latest
  revision.
- Physical referents and engineering artifacts remain distinct identity
  categories.
- A change event does not create, merge, split, or replace a
  `PhysicalReferentIdentity`. It declares that an identified referent or
  artifact was affected, intended to be affected, or recorded as changed.
- Decision and change declarations may be versioned or superseded through the
  existing artifact and relationship semantics; prior declarations remain
  reconstructable.

No decision/change registry or second identity service is introduced.

### 2. Smallest authorized semantic slice

The first implementation slice is limited to two immutable declaration shapes:

#### Engineering decision

An engineering decision records:

- decision identity;
- decision kind: `REQUIREMENT`, `ASSUMPTION`, `CONSTRAINT`,
  `ALTERNATIVE`, `DECISION`, or `APPROVAL`;
- subject scope, using existing canonical physical referent and/or artifact
  identity references;
- selected outcome or stated position;
- rationale and, when applicable, alternatives considered;
- evidence and artifact revision references;
- record time and optional valid-time interval;
- explicit status such as `PROPOSED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`,
  `SUPERSEDED`, or `UNKNOWN`.

An `APPROVAL` is a declaration about a decision or deliverable. It is not
proof that the physical result matches the approved intent.

#### Engineering change event

An engineering change event records:

- change identity;
- change kind: `PROPOSED`, `AUTHORIZED`, `IMPLEMENTED`, `OBSERVED`,
  `REJECTED`, `WITHDRAWN`, or `UNKNOWN`;
- affected subject scope, using existing canonical physical referent and/or
  engineering artifact identity references;
- declared before/after meaning or change description, without requiring a
  mutable current-state field;
- initiating decision or related decision references when known;
- evidence and artifact revision references;
- event time, record time, and optional valid-time interval;
- explicit resolution state.

The first slice does not model a general workflow, task, approval chain,
project-management item, or automatic physical-state transition.

### 3. Relationship direction and endpoint semantics

Decision/change relationships are directed declarations in the existing
`KnowledgeGraph`. The predicate vocabulary for implementation is limited to
the following canonical roles:

| Predicate | Subject | Object | Meaning |
| --- | --- | --- | --- |
| `APPLIES_TO` | decision or change | physical referent or artifact | The declaration's stated scope |
| `SUPPORTED_BY` | decision or change | artifact | An artifact is cited by the declaration; evidence remains an existing reference |
| `DERIVED_FROM` | decision or change | decision, change, or artifact | Reasoning or lineage dependency through canonical artifact endpoints |
| `AFFECTS` | change event | physical referent or artifact | The event declares an affected subject |
| `IMPLEMENTS` | change event | decision | The event declares implementation of a decision |
| `SUPERSEDES` | later decision/change | earlier decision/change | The later declaration replaces applicability or intent |

The inverse meaning is obtained by querying the directed relationship; inverse
edges are not separately authored. `SUPPORTED_BY` and `DERIVED_FROM` never
grant authority. `AFFECTS` never proves that the physical change occurred.
`IMPLEMENTS` never proves conformance to the decision.

Existing relationship validation, canonical endpoint references, provenance,
resolution states, and graph ownership remain authoritative.

`SUPPORTED_BY` and `DERIVED_FROM` do not introduce an `EVIDENCE` endpoint.
Their object endpoints are limited to currently authorized canonical artifact
identities, including decision/change records when represented by those
identities.

### 4. Provenance, evidence, authority, and trust

Every decision/change declaration and every relationship it contributes must
retain provenance, record time, and the exact evidence or artifact revision
references known at declaration time.

- Evidence references remain references; this ADR does not create an evidence
  registry.
- Evidence may support, contradict, or leave a declaration unresolved.
- A declaration may be structurally valid while its evidence, applicability,
  or authority is `UNKNOWN`, `AMBIGUOUS`, `INVALID`, or `UNRESOLVED`.
- Authority and trust are evaluated only through the existing
  `authorityEvidenceProvider` boundary and existing projection rules.
- Structural presence, approval status, newer record time, artifact issue,
  or AI authorship does not create authority.
- AI-generated recommendations remain `PROPOSED` unless separately declared
  through the governed evidence and decision path.

### 5. Temporal applicability and historical reconstruction

Decision/change declarations use the existing `TemporalValidity` semantics
and distinguish:

- **record time** — when the declaration was recorded;
- **event/decision time** — when the decision or change was stated to occur;
- **valid time** — the interval during which the declared meaning applies;
- **supersession** — an explicit later declaration that changes applicability
  or intent.

No implicit latest/current selection is allowed. Reconstruction at a requested
time must:

1. select declarations whose explicit valid-time and applicability semantics
   match the request;
2. preserve superseded, withdrawn, conflicting, and unresolved declarations;
3. expose missing or ambiguous boundaries rather than infer them;
4. keep decision intent, declared change, and physical outcome distinct.

An `IMPLEMENTED` or `OBSERVED` change event is still a declaration/evidence
claim. Physical reality is established only by the existing referent,
representation, evidence, and authority semantics.

### 6. Smallest implementation boundary

The next implementation slice may add only:

- immutable domain types for engineering decisions and change events;
- validation for identity-category safety, required provenance, direction,
  temporal fields, status values, and explicit resolution states;
- graph declaration helpers for the six predicates above;
- deterministic reconstruction/projection of these declarations using existing
  graph and authority services.

The implementation must not add persistence, API/UI surfaces, workflow
state machines, notification logic, external integrations, or physical-state
mutation.

## Not authorized

This ADR does not authorize:

- a second identity authority, asset registry, event store, or graph;
- mutable current-state fields or latest/newest inference;
- a relationship trust engine or evidence registry;
- automatic propagation of authority, approval, or trust;
- treating a decision, approval, drawing, artifact, or AI proposal as proof of
  physical construction or condition;
- automatic creation, merging, splitting, or retirement of physical referent
  identities;
- generalized workflow, task, change-order, project-control, or field-sync
  abstractions;
- persistence, API, UI, CAD/BIM/GIS ingestion, or autonomous AI authority.

## Consequences

Decision intent, change declarations, cited evidence, and physical outcomes
remain separately reconstructable. The model can answer what was decided,
what was declared changed, what evidence was cited, and what remains unknown
without promoting any of those facts beyond their authority boundary.

The first implementation remains intentionally narrow. Rich approval
workflows, discipline-specific change semantics, field reconciliation, and
physical outcome comparison require later authorized slices.

## Related decisions

- ADR-007 — Authority Evidence and Revision Trust Boundary
- ADR-027 — Physical Reality Semantic Model Design
- ADR-028 — Digital Twin Semantic Backbone Architecture Review
- ADR-030 — Semantic Backbone Implementation Readiness
- ADR-034 — Relationship Declaration Evidence Boundary and Deterministic Reconstruction
- ADR-036 — Release B Relationship Vocabulary and Direction Contract
- ADR-037 — Relationship Authority Evaluation Adapter Boundary
- ADR-038 — Release C Geometry Representation and `REPRESENTED_BY` Contract
