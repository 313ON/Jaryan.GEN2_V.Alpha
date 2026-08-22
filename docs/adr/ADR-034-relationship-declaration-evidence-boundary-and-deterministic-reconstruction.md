# ADR-034: Relationship Declaration, Evidence Boundary, and Deterministic Reconstruction

## Status

Accepted — recorded on 2026-08-22 for Phase 12C.7 implementation.

This ADR is a present-day decision. It does not reconstruct or replace the
missing ADR-026, ADR-029, or ADR-032.

## Context

`EngineeringArtifactIdentity` is the current identity authority.
`KnowledgeGraph` is the sole canonical graph authority.
Existing source, provenance, authority, and trust contracts remain
authoritative for their existing concerns.

The current graph supports the `DEPENDENCY` predicate and artifact endpoints.
The graph must gain a minimal historical relationship-declaration boundary
without becoming a second identity authority, evidence registry, trust engine,
policy engine, persistence layer, or API.

## Decision

### 1. Relationship fact

A `RelationshipFact` is the directed proposition:

```text
subject + predicate + object
```

The current implementation supports only:

```text
predicate = DEPENDENCY
```

Current endpoints are artifact identity references only. The fact identity is
the deterministic ordered content fingerprint:

```text
FACT_KEY =
  kind(subject)
  + canonicalIdentity(subject)
  + predicate
  + kind(object)
  + canonicalIdentity(object)
```

Direction matters. Predicate participates in identity. Temporal validity,
evidence, provenance, actor, authority, and trust do not participate in fact
identity.

No UUID, database ID, API ID, or generated relationship ID is permitted.

### 2. Relationship declaration

A `RelationshipDeclaration` is an immutable historical assertion about a
fact. It contains:

- `fact`;
- `assertionDisposition: AFFIRM | DENY`;
- `applicabilityContext`;
- `temporalValidity`;
- typed `origin`;
- conditional `actor`;
- canonical evidence references;
- explicit predecessor declaration fingerprints in `supersedes`;
- deterministic `declarationFingerprint`.

The declaration fingerprint includes only canonical asserted content:

- fact;
- assertion disposition;
- applicability context;
- `recordedAt`;
- `validFrom`;
- `validTo`;
- origin;
- actor when present;
- canonicalized evidence references;
- canonicalized supersession references.

It excludes structural resolution, authority status, trust status, conflict
status, historical/current query results, and derived evidence sufficiency.

Exact duplicate declarations are canonicalized. Declarations that differ in
asserted content remain separately addressable.

### 3. Declaration origin and actor

Origins are typed:

```text
HUMAN
OBSERVATION
IMPORTED
SYSTEM
AUTHORITY_RECORD
AI_PROPOSAL
```

Actor attribution is conditional. `HUMAN`, `OBSERVATION`, and
`AUTHORITY_RECORD` declarations require a non-empty actor reference.
`IMPORTED`, `SYSTEM`, and `AI_PROPOSAL` may omit actor attribution.

Actor attribution is not authorization and never implies authority.
No actor directory or authorization system is introduced by this ADR.

### 4. Evidence boundary

Declarations store evidence references only. Evidence references are
canonical references to existing artifact identities and are sorted and
deduplicated.

`KnowledgeGraph` does not evaluate evidence sufficiency, source validity,
applicability, or authority. A relationship evidence adapter may resolve
references and translate results into the existing authority/trust boundary.
The adapter is not an evidence registry, provenance authority, policy engine,
or trust engine.

Evidence presence never implies authority or trust.

### 5. Trust boundary

Structural graph resolution and authority/trust evaluation remain separate.

```text
structurally resolved != authoritative != trusted
```

Existing authority and trust contracts remain authoritative. No relationship
trust engine is introduced. An AI proposal remains a candidate or unverified
declaration until governed acceptance and independent authority/trust
evaluation.

### 6. Temporal semantics

`recordedAt` is declaration record time. `validFrom` and `validTo` describe
known applicability boundaries. `queryTime` belongs to reconstruction context.

Missing valid boundaries remain unknown and must not be inferred as open,
closed, current, or latest. `CURRENT` is never stored. Current state is
derived from explicit query context, temporal validity, applicability,
supersession, conflict, and authority/trust outcomes.

### 7. Supersession

Supersession is represented by explicit predecessor declaration fingerprints
in declaration metadata. It is not a graph predicate.

Timestamp order, artifact revision order, insertion order, and “newer” status
never imply supersession. No declaration automatically invalidates another.
Superseded declarations remain historically addressable.

### 8. Conflict

Conflict is derived during reconstruction. No `CONFLICTING` graph predicate is
created.

Different evidence for the same fact is not automatically conflict.
`AFFIRM` and `DENY` declarations for the same fact, applicable scope, and
overlapping valid interval derive `CONFLICTING`. All conflicting declarations
remain preserved.

### 9. Reconstruction

Reconstruction is deterministic:

```text
reconstructRelationship(fact, queryContext)
```

It validates endpoints, matches the exact fact key, applies explicit
applicability and temporal context, follows only explicit supersession
references, preserves all eligible declarations, derives conflict, and keeps
evidence/trust outcomes separate.

It never selects by latest, first, strongest, newest, or nearest fallback.

Required explicit outcomes include:

```text
UNKNOWN
AMBIGUOUS
INVALID
CONFLICTING
HISTORICAL
INSUFFICIENT_EVIDENCE
UNVERIFIED
```

### 10. KnowledgeGraph ownership

`KnowledgeGraph` owns canonical structural relationship facts and immutable
declarations. It does not own identity issuance, evidence interpretation,
authority, trust policy, persistence, or transport.

Existing `EngineeringDependencyEdge` compatibility is preserved. The
relationship declaration envelope extends the existing graph authority.

### 11. Future endpoints

The declaration and graph boundary is compatible with future opaque canonical
endpoints representing physical assets, engineering objects, geometry, sites,
or decisions. This ADR does not define those identities or authorize their
implementation.

## Explicit non-scope

This ADR does not authorize:

- `AssetId`, `ObjectId`, or `PhysicalReferentIdentity`;
- a second identity authority;
- a second graph;
- a second provenance system;
- a second trust engine;
- persistence or database-generated identity;
- API or UI;
- CAD, BIM, geometry, or document-management workflows;
- actor directories or authorization systems;
- autonomous AI authority;
- predicates beyond `DEPENDENCY`.

## Consequences

Relationship declarations become deterministic, immutable, historically
addressable content records. Structural graph resolution remains useful
without being mistaken for evidence, authority, or trust. Conflicting,
ambiguous, invalid, historical, and unverified states remain explicit.

Phase 12C.7 may implement only the minimum shared-domain contract described
here and must stop if implementation requires a new authority or unresolved
semantic boundary.
