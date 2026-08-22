# ADR-035: Physical Referent Identity Extension

## Status

Accepted — recorded on 2026-08-22 for Phase 13.0.

This ADR defines the identity-extension contract required before Release A
implementation. It does not implement physical identity or reconstruct any
missing historical ADR.

## Context

`EngineeringArtifactIdentity` is the current canonical identity authority.
Artifact identities identify immutable, versioned engineering knowledge and
evidence representations. They do not identify the physical or intended
engineering things discussed by those representations.

The Release A roadmap requires physical referents to participate in the
existing identity and graph authorities without introducing an `AssetId`,
`ObjectId`, `AssetRegistry`, second identity system, or physical graph.

The repository already establishes:

- deterministic content fingerprinting;
- immutable artifact identities and explicit artifact revisions;
- `EngineeringKnowledgeRegistry` as the artifact registration authority;
- `KnowledgeGraph` as the sole graph authority;
- explicit `UNKNOWN`, `AMBIGUOUS`, `INVALID`, and unresolved outcomes;
- evidence and authority boundaries that do not promote references
  automatically.

## Decision

### 1. Canonical concept and identity scope

The smallest canonical physical concept is a **physical referent**: a real
or intended engineering thing that may be discussed, designed, observed,
measured, represented, or otherwise related to engineering knowledge.

This concept is intentionally broader than a specific asset-management
category. It does not define separate canonical identities for sites,
locations, systems, assemblies, components, equipment, or observations.
Those are future semantic categories or claims governed by later decisions.

A physical referent identity identifies the referent itself, not:

- an artifact;
- an artifact revision;
- a document or drawing;
- a geometry representation;
- an observation or measurement;
- a lifecycle state;
- an external tag or database record.

### 2. Identity continuity

A physical referent identity represents continuity of the same real or
intended engineering thing across artifact revisions, observations,
representations, and lifecycle claims.

Artifact revision changes do not create a new physical referent identity.
Renaming, reclassification, inspection, or geometry revision does not mutate
the identity.

Replacement, split, merge, or re-identification creates a new referent
identity when the referent continuity changes. The predecessor/successor
history must remain reconstructable through later governed claims or
relationships. No automatic replacement inference is authorized by this ADR.

### 3. One identity authority

Physical referent identity participates in the existing
`EngineeringArtifactIdentity` authority through a governed, type-safe identity
role. It is not a second authority and is not interchangeable with an
artifact identity.

The authority boundary is:

```text
EngineeringArtifactIdentity authority
        |
        +-- artifact identity role
        |
        +-- physical referent identity role
```

The physical role must reuse the existing validation, deterministic
canonicalization, immutability, and resolution boundary. It must not create:

- `AssetId` or `ObjectId`;
- `AssetRegistry` or `PhysicalIdentityRegistry`;
- a local identity generator;
- an application-only canonical key;
- a second resolver or identity authority.

### 4. Canonical identity envelope

The minimum conceptual envelope is:

```text
CanonicalIdentityEnvelope
  authority: EngineeringArtifactIdentity
  identityKind: ARTIFACT | PHYSICAL_REFERENT
  canonicalIdentity: deterministic content identity
```

For a physical referent, `canonicalIdentity` is a stable content-derived
fingerprint over an authority-governed immutable referent seed:

```text
PHYSICAL_REFERENT_KEY =
  authority
  + identityKind
  + governedStableReferentKey
```

The stable referent key is an identity input, not a display name. It must not
be derived automatically from a filename, document title, coordinate,
geometry, QR/NFC tag, external database ID, API ID, proximity, or AI output.
The authority must reject or preserve as unresolved any candidate whose only
basis is one of those compatibility references.

The envelope is deterministic, immutable, independently serializable, and
independent of persistence. No UUID or database-generated identity is
introduced.

The physical referent identity has stable continuity and no artifact-style
revision number. State, representation, observation, evidence, and lifecycle
changes are claims about the referent rather than identity mutations.

### 5. Artifact and physical identity distinction

| Concern | Engineering artifact identity | Physical referent identity |
|---|---|---|
| Identifies | A knowledge/evidence representation | A real or intended engineering thing |
| Revision | Explicit version is identity-bearing | Does not change because an artifact is revised |
| History | Artifact revisions remain addressable | Referent continuity and replacement history remain addressable |
| Source | Calculation, result, primitive, source, benchmark | Governed physical-referent seed |
| Authority | Existing artifact identity and registry rules | Same identity authority, distinct typed role |
| Evidence | May be evidence for another claim | Does not become canonical from evidence presence alone |

An artifact cannot become a physical referent merely because it has a valid
artifact identity. A physical referent cannot be supplied where an artifact
identity is required without an explicit governed relation.

### 6. KnowledgeGraph compatibility

`KnowledgeGraph` remains the only graph authority. No `PhysicalGraph`,
`AssetGraph`, `ObjectGraph`, or local graph is introduced.

The future-compatible endpoint envelope is conceptually:

```text
GraphEndpoint
  kind: ARTIFACT | PHYSICAL_REFERENT
  identity: canonical identity role
```

Current `DEPENDENCY` graph behavior remains artifact-scoped. This ADR does not
authorize any new relationship predicate or physical-to-artifact edge.
Physical endpoints may be admitted to the single graph only through a later
relationship and endpoint implementation gate.

### 7. Unknown and ambiguous identity

The following remain explicit and non-canonical:

- `UNKNOWN`: no canonical physical referent can be established;
- `AMBIGUOUS`: multiple candidate referents remain possible;
- `INVALID`: the candidate violates the identity contract;
- `UNRESOLVED`: a compatibility reference exists but has not been governed
  into a canonical identity.

A human-readable label, external identifier, imported record, document,
geometry, observation, or AI proposal cannot silently resolve any of these
states.

Candidate mappings must remain historically explainable and may be retained
as references or claims without becoming canonical identity.

### 8. Lifecycle semantics

- A physical referent may exist without an artifact.
- Multiple artifacts may refer to one physical referent without changing
  either identity.
- Multiple observations may refer to one physical referent only after an
  explicit governed resolution; otherwise the result remains ambiguous.
- Revisions of one artifact remain artifact revisions and do not create or
  replace a physical referent.
- Replacement, split, merge, and re-identification preserve predecessor and
  successor history and do not destructively overwrite prior identity.
- No mutable `current` identity or latest identity selection is stored.

### 9. Evidence, geometry, documents, and AI

Evidence may support an identity decision but does not establish identity by
presence alone. Geometry is representation, not identity. Documents are
representations or evidence, not identity authority. AI output is a candidate
and cannot create or promote canonical physical identity autonomously.

### 10. Explicit non-scope

This ADR does not authorize:

- production physical identity types or constructors;
- `AssetId`, `ObjectId`, or UUID generation;
- persistence or database schemas;
- APIs, UI, or application workflows;
- CAD/BIM or geometry ingestion;
- document-management workflows;
- actor directories or authorization;
- autonomous AI promotion;
- new graph predicates;
- physical-to-artifact relationship implementation;
- asset lifecycle workflow or asset-management features;
- automatic merge, replacement, split, or re-identification decisions.

## Consequences

Release A has a single identity-extension direction: a typed physical
referent role within the existing identity authority, using deterministic
content identity and preserving artifact/physical separation.

The graph can later accept opaque canonical physical endpoints without
creating a second graph, but no physical edge is authorized by this ADR.
Unknown and ambiguous identity remain reconstructable rather than being
forced into certainty.

## Targeted red-team outcomes

| Situation | Required behavior |
|---|---|
| Same artifact revision, same physical entity | Artifact identity and physical identity remain distinct; explicit mapping is required |
| Different artifact revisions, same physical entity | Artifact identities differ; physical identity remains continuous |
| Equipment replacement | New physical referent identity; prior identity and continuity history remain preserved |
| Duplicate physical labels | Remain ambiguous; labels do not merge identities |
| Renamed equipment | Identity remains unchanged when referent continuity is governed |
| Two artifacts reference one physical entity | Both artifact identities remain distinct and may reference one physical identity |
| One artifact has multiple physical candidates | Result remains ambiguous |
| Unresolved physical referent | Remains unknown or unresolved and non-canonical |
| Imported physical reference | Compatibility reference only until governed resolution |
| AI-proposed physical identity | Candidate/unverified; no autonomous canonical identity |
| Persistence-generated ID | Cannot establish canonical identity |
| Geometry-derived identity | Cannot establish canonical identity by itself |
| Document-derived identity | Cannot establish canonical identity by itself |

## Related decisions

- ADR-027 — Physical Reality Semantic Model Design
- ADR-028 — Digital Twin Semantic Backbone Review
- ADR-030 — Semantic Backbone Implementation Readiness
- ADR-031 — Semantic Backbone Foundation Implementation Plan
- ADR-033 — Current Semantic Relationship Graph Provenance Repair
- ADR-034 — Relationship Declaration, Evidence Boundary, and Deterministic Reconstruction
