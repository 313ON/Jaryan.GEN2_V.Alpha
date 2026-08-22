# ADR-036: Release B Relationship Vocabulary and Direction Contract

## Status

Accepted — recorded on 2026-08-22 for Phase 14.0 Release B authorization.

This ADR authorizes only the minimum relationship vocabulary and endpoint
direction required to begin Release B implementation. It does not implement
predicates or change existing domain contracts.

## Context

The repository has one canonical `KnowledgeGraph`. Its current structural
predicate is `DEPENDENCY`. `KnowledgeGraphEndpoint` already distinguishes the
two endpoint categories available to this phase:

- `ARTIFACT`, governed by `EngineeringArtifactIdentity`;
- `PHYSICAL_REFERENT`, governed through the existing identity authority.

`RelationshipDeclaration` already preserves immutable assertions with:

- `AFFIRM` or `DENY`;
- typed origin and conditional actor;
- applicability context;
- temporal validity;
- evidence references;
- explicit supersession;
- deterministic fingerprints;
- graph-owned reconstruction.

Evidence interpretation, authority, and trust remain outside the graph.
`AI_PROPOSAL` remains non-authoritative.

The Release B roadmap names five possible meanings, but roadmap text alone
does not authorize graph predicates. This decision therefore evaluates each
meaning against the endpoint and authority contracts that exist now.

## Decision

### 1. Authorized predicates

Only these two predicates are authorized for the next implementation phase:

```text
PHYSICAL_REFERENT -> DESCRIBED_BY -> ARTIFACT
ARTIFACT          -> CALCULATED_FOR -> PHYSICAL_REFERENT
```

They are canonical structural predicates owned by `KnowledgeGraph`. They
extend the existing graph authority; they do not create an asset graph,
document graph, evidence graph, or relationship-local graph.

`DESCRIBED_BY` means that an artifact explicitly describes a physical
referent. It does not establish that the artifact is authoritative about the
referent or that the described state exists physically.

`CALCULATED_FOR` means that an artifact explicitly represents a calculation
or calculation result for a physical referent. It does not establish that the
calculation is valid, approved, applicable, or trusted.

The predicates are vocabulary and direction authorizations only. Phase 14.1
must still implement them through the existing `RelationshipFact`,
`RelationshipDeclaration`, and `KnowledgeGraph` contracts without changing
the existing `DEPENDENCY` behavior.

### 2. Decision matrix

| Meaning | Decision now | Graph role | Exact direction | AFFIRM/DENY | Applicability and time | Evidence | Structural projection | Special reconstruction |
|---|---|---|---|---|---|---|---|---|
| `DESCRIBED_BY` | Authorize | Canonical structural predicate | `PHYSICAL_REFERENT -> ARTIFACT` | Meaningful | Reuse existing nullable applicability context and `TemporalValidity`; omitted boundaries remain unknown | May be attached; expected when available, never required for structural declaration construction | Affirmed, applicable, non-`AI_PROPOSAL` declarations may project; denial never creates an edge | Existing endpoint resolution, temporal filtering, explicit supersession, and conflict rules only |
| `CALCULATED_FOR` | Authorize | Canonical structural predicate | `ARTIFACT -> PHYSICAL_REFERENT` | Meaningful | Reuse existing nullable applicability context and `TemporalValidity`; no inferred current/latest scope | May be attached; evidence presence does not imply calculation validity or trust | Affirmed, applicable, non-`AI_PROPOSAL` declarations may project; denial never creates an edge | Existing endpoint resolution, temporal filtering, explicit supersession, and conflict rules only |
| `VERIFIED_BY` | Defer | Not authorized | — | — | Verification scope and the verifier endpoint are not unambiguously defined by current endpoint categories | Existing evidence references are sufficient for linking evidence without this predicate | — | Requires a focused authority/evidence relationship decision |
| `OBSERVED_BY` | Defer | Not authorized | — | — | The repository has `Observation` semantics but no canonical observation graph endpoint identity | Observation evidence references remain available through existing contracts | — | Requires an observation endpoint and reconstruction contract |
| `AFFECTED_BY` | Defer | Not authorized | — | — | The affected/affecting roles and scope are too broad to infer safely from current endpoint categories | Existing declarations may preserve claims and evidence without this broad predicate | — | Requires a focused impact/causality semantic decision |

### 3. Assertion, evidence, and authority boundaries

For the two authorized predicates:

- `AFFIRM` and `DENY` are declaration dispositions, not authority results.
- Evidence references may be attached to declarations.
- Evidence references are resolved by an external adapter or authority
  provider; `KnowledgeGraph` does not interpret evidence.
- Evidence presence, evidence resolution, actor presence, origin, or
  declaration age never implies authority or trust.
- Existing authority and trust contracts remain authoritative.
- No evidence registry or relationship-specific trust engine is introduced.
- `AI_PROPOSAL` may preserve a proposed relationship declaration, but it
  cannot automatically create authoritative structural graph truth or promote
  itself to an affirmed authoritative relationship.

### 4. Applicability and temporal semantics

The authorized predicates reuse the existing declaration fields:

- `applicabilityContext` is an opaque nullable context value; this ADR does
  not define a new scope taxonomy.
- `TemporalValidity` is interpreted using explicit query context.
- Missing `validFrom` or `validTo` remains unknown.
- `recordedAt` records declaration time and does not establish truth.
- Artifact revision order, timestamp order, insertion order, or “newer”
  status does not supersede or invalidate a declaration.
- Supersession remains explicit through declaration fingerprints.

### 5. Deterministic reconstruction

Phase 14.1 must apply the existing deterministic reconstruction model to both
authorized predicates:

1. validate the exact directed fact and both endpoint categories;
2. retain the predicate and ordered endpoints in fact identity;
3. canonicalize duplicate declarations by deterministic fingerprint;
4. apply only explicit applicability and temporal query context;
5. follow only explicit supersession references;
6. preserve eligible affirmations, denials, historical declarations, and
   conflicts;
7. keep structural resolution separate from evidence, authority, and trust.

No reconstruction may use latest-wins, newest-wins, strongest-wins, timestamp
truth, artifact-revision truth, insertion-order selection, or fallback
endpoint selection. `UNKNOWN`, `AMBIGUOUS`, `INVALID`, `CONFLICTING`,
`HISTORICAL`, `INSUFFICIENT_EVIDENCE`, and `UNVERIFIED` remain explicit where
the existing reconstruction contract produces them.

### 6. Identity and ownership invariants

This decision preserves:

1. one `KnowledgeGraph` authority;
2. one identity authority;
3. no relationship-local identity authority;
4. no second provenance system;
5. no evidence registry;
6. no relationship-specific trust engine;
7. no automatic authority from evidence or actors;
8. no automatic authority from AI output;
9. immutable and reconstructable historical declarations;
10. no implicit current/latest selection;
11. explicit unknown and ambiguous states;
12. no persistence, API, or UI semantic authority.

No new endpoint identity, asset identifier, object identifier, registry,
persistence identifier, API identifier, geometry identity, or location
identity is authorized by this ADR.

## Phase 14.1 implementation gate

Phase 14.1 may implement only `DESCRIBED_BY` and `CALCULATED_FOR` in the
shared domain and the existing `KnowledgeGraph` authority.

Before implementation is accepted, it must demonstrate:

- endpoint validation for artifact and physical-referent endpoints;
- exact directionality and predicate-sensitive deterministic identity;
- insertion-order independence and duplicate canonicalization;
- invalid, ambiguous, unresolved, and unknown endpoint behavior;
- affirmative and denial declarations, including conflicts;
- historical preservation and explicit supersession;
- evidence absence and externally resolved evidence without authority
  promotion;
- `AI_PROPOSAL` remaining non-authoritative;
- no fallback or timestamp-based truth selection;
- unchanged `DEPENDENCY` graph behavior.

If implementation requires a new endpoint resolver, identity registry,
applicability taxonomy, observation identity, authority model, or persistence
model, work must stop for a separate focused decision. This ADR does not
authorize any of those systems.

## Explicit deferrals

The following remain deferred and must not be implemented under this ADR:

- `VERIFIED_BY`;
- `OBSERVED_BY`;
- `AFFECTED_BY`;
- verification authority or trust semantics;
- canonical observation endpoints;
- impact/causality ontology;
- evidence registry or relationship trust engine;
- persistence, API, UI, CAD, BIM, GIS, and document-management workflows;
- autonomous AI promotion;
- any second identity or graph authority.

## Consequences

Release B now has a minimal, directional vocabulary for connecting physical
referents and engineering artifacts while preserving the existing graph,
identity, evidence, authority, trust, and reconstruction boundaries.

The remaining roadmap meanings are explicitly deferred instead of being
encoded with ambiguous endpoint or authority semantics.

## Related decisions

- ADR-031 — Semantic Backbone Foundation Implementation Plan
- ADR-033 — Current Semantic Relationship Graph Provenance Repair
- ADR-034 — Relationship Declaration, Evidence Boundary, and Deterministic Reconstruction
- ADR-035 — Physical Referent Identity Extension
