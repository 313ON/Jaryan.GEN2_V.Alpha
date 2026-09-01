# ADR-033: Current Semantic Relationship Graph Provenance Repair

## Status

Proposed — current corrective decision recorded on 2026-08-22. This is not a
replacement for any missing historical ADR.

## Context

The repository contains:

- ADR-027 — Physical Reality Semantic Model Design;
- ADR-028 — Digital Twin Semantic Backbone Review;
- ADR-030 — Semantic Backbone Implementation Readiness;
- ADR-031 — Semantic Backbone Foundation Implementation Plan.

The repository and all reachable git history do not contain ADR-026, ADR-029,
or ADR-032. No added, renamed, deleted, or superseded file for any of those
numbers was found.

Later ADRs reference ADR-026 and ADR-029, but those references do not recover
the missing documents or prove their exact historical decisions. No repository
evidence establishes that ADR-032 ever existed.

This ADR therefore repairs present-day architectural provenance without
repairing or recreating history.

## Historical provenance classification

### ADR-026

The historical artifact is unavailable. Its exact decision is `UNKNOWN`.
Later references to its title are not treated as recovered content.

### ADR-029

The historical artifact is unavailable. Its exact decision is `UNKNOWN`.
Later references to its title are not treated as recovered content.

### ADR-032

No repository or git-history evidence shows that ADR-032 ever existed.
It must not be described as a historical ADR. Any previous statement that
ADR-032 existed as part of the repository baseline was incorrect.

## Decision

### 1. One graph authority

`KnowledgeGraph` remains the single canonical engineering relationship graph.

The following must not become competing authorities:

- `AssetGraph`;
- `TwinGraph`;
- `DocumentGraph`;
- `RelationshipGraph`;
- `SemanticGraph`.

The existing artifact dependency graph remains valid and authoritative within
its existing scope.

### 2. Semantic relationships extend `KnowledgeGraph`

Future engineering semantic relationships will extend the existing
`KnowledgeGraph` model. They must not be stored in an application-local graph,
adapter-local graph, document graph, or parallel provenance graph.

The current graph primitive remains the existing artifact dependency edge.
The minimum currently guaranteed relationship predicate is:

```text
DEPENDENCY
```

Future predicates require separately verified endpoint categories and semantic
authorization. This ADR does not approve `PART_OF`, `LOCATED_IN`,
`REPRESENTED_BY`, `DESIGNED_BY`, `CALCULATED_FOR`, `SUPPORTED_BY`, or
`AFFECTED_BY` for production implementation.

### 3. Physical identity remains deferred

This ADR does not authorize:

- `AssetId`;
- `ObjectId`;
- `PhysicalReferentIdentity`;
- a generalized `EngineeringArtifactIdentity`;
- an asset identity registry;
- an object identity registry;
- any local identity generator.

Physical asset and engineering-object identity remain a separate architectural
decision.

### 4. One identity authority

`EngineeringArtifactIdentity` remains the current identity authority for
engineering artifacts.

Graph endpoints must remain identity-opaque where future physical identities
are concerned. The graph must not require or derive identity from database
keys, API IDs, filenames, coordinates, BIM GUIDs, QR codes, or external tags.

### 5. Fact, declaration, evidence, and trust remain distinct

The architecture preserves:

```text
Fact
  != Declaration
  != Evidence
  != Trust
```

A structurally valid graph relationship is not thereby evidenced, verified,
or trusted. Existing provenance and authority/trust contracts remain the
authorities for those concerns.

### 6. Temporal truth remains explicit

Current state must be derived from an explicit query context. No mutable
authoritative field such as `current = true` may replace historical claims.

Declarations must preserve, when applicable:

- declaration or record time;
- applicability context;
- historical validity;
- supersession or conflict context.

Later declarations must not destructively overwrite earlier declarations.

### 7. Uncertainty remains explicit

The existing distinction among the following states remains mandatory:

```text
UNKNOWN
AMBIGUOUS
INVALID
UNVERIFIED
CONFLICTING
HISTORICAL
```

No implementation may silently convert one of these states into a trusted
resolved answer through latest-version, first-match, nearest-match, or
best-effort fallback.

## Scope of authorization

After this ADR is accepted, Phase 12C.3 may evaluate and, where the existing
contracts make it unambiguous, implement the smallest shared-domain semantic
relationship envelope inside the existing `KnowledgeGraph` authority.

That evaluation must:

- preserve the existing artifact dependency graph;
- reuse existing artifact identity and provenance contracts;
- keep endpoint identity opaque;
- keep structural resolution separate from authority/trust;
- preserve temporal and historical meaning;
- remain deterministic and immutable.

Acceptance of this ADR does not authorize implementation of physical identity,
future physical predicates, geometry, lifecycle persistence, decision/change
events, document workflows, field/mobile models, CAD/BIM, databases, APIs, or
UI.

Implementation must still verify the actual repository contracts before code
changes. If implementation reveals a new identity, graph, authority, or
unresolved semantic boundary, work must stop and return to architecture
review.

## Why this ADR exists

This ADR does not repair history and does not recreate ADR-026, ADR-029, or
ADR-032. It records a present-day decision because the historical provenance
needed to authorize the next graph phase is unavailable.

The distinction preserves the same provenance principle required of
engineering knowledge:

```text
historical absence remains UNKNOWN;
present decisions are recorded explicitly.
```

## Red-team review

1. This ADR cannot be mistaken for historical ADR-032 because it is numbered
   ADR-033 and explicitly states that ADR-032 has no recovered evidence.
2. It does not authorize `PhysicalReferentIdentity`, `AssetId`, `ObjectId`, or
   identity generalization.
3. It retains `KnowledgeGraph` as the only graph authority.
4. It does not make `KnowledgeGraph` a database, workflow engine, or policy
   engine.
5. It keeps fact, declaration, evidence, and trust separate.
6. It forbids mutable authoritative current-state fields.
7. It preserves `UNKNOWN`, `AMBIGUOUS`, `INVALID`, `UNVERIFIED`,
   `CONFLICTING`, and `HISTORICAL`.
8. It does not authorize CAD, BIM, geometry payloads, or document management.
9. It does not erase or reinterpret the historical absence of ADR-026,
   ADR-029, or ADR-032.

## Consequences

The repository has an explicit present-day graph direction without fabricated
historical provenance. A later implementation phase may evaluate only the
minimal relationship envelope and must continue to preserve the existing
artifact identity, registry, provenance, reconstruction, and trust boundaries.

The missing historical decisions remain unresolved and may require separate
future provenance work if reliable external evidence becomes available.
## Related decisions

- ADR-027 — Physical Reality Semantic Model Design
- ADR-028 — Digital Twin Semantic Backbone Review
- ADR-030 — Semantic Backbone Implementation Readiness
- ADR-031 — Semantic Backbone Foundation Implementation Plan
