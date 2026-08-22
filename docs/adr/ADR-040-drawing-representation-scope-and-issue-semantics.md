# ADR-040: Drawing Representation Scope and Issue Semantics

## Status

Proposed — architecture review only.

This ADR defines a bounded semantic extension for drawing and plan
representation scope. It does not authorize production implementation,
persistence, document management, file processing, external ingestion, API,
UI, or workflow behavior.

## A. Problem

Jaryan can already represent:

- an exact `EngineeringArtifactIdentity` revision;
- a physical referent;
- a plan or drawing representation;
- representation role and issue label;
- geometry and representation provenance;
- applicability and temporal validity;
- evidence references;
- explicit supersession;
- deterministic historical reconstruction.

The remaining Release C semantic gap is representation-level scope inside an
already identified artifact representation. The current contract cannot
express, without overloading free text, that a declaration concerns a
particular sheet or view.

Examples include:

- a plan artifact and sheet `A-101`;
- a drawing artifact and view `SECTION A-A`;
- a representation declaration limited to a source-declared detail, section,
  or elevation reference.

The missing concept must remain a declaration-scoped locator. It must not
become an identity for a document, file, sheet, view, or physical referent.

## B. Existing contracts

The following remain authoritative and are reused without duplication:

### Identity

- `EngineeringArtifactIdentity` identifies the exact immutable engineering
  artifact revision.
- `PhysicalReferentIdentity` identifies the physical or intended referent.
- Artifact revision and physical referent identity remain distinct.

### Representation

- `REPRESENTED_BY` is the existing directed relationship:

  ```text
  PHYSICAL_REFERENT -> REPRESENTED_BY -> ARTIFACT
  ```

- `EngineeringRepresentationSemanticMetadata` currently carries:
  - `representationKind: PLAN | DRAWING`;
  - `semanticRole`;
  - source-declared `issue`.
- `GeometryReference` and `GeometrySemanticMetadata` remain opaque,
  provenance-bearing representation data.

### Declaration and graph

- `RelationshipFact` remains identified only by ordered subject, predicate,
  and object.
- `RelationshipDeclaration` remains the immutable semantic assertion envelope.
- `KnowledgeGraph` remains the sole graph authority.
- No new predicate is required.

### Time, applicability, and history

- `TemporalValidity` remains the valid-time and record-time contract.
- `applicabilityContext` remains an opaque query-scoped applicability value.
- `supersedes` remains explicit declaration metadata.
- Historical reconstruction remains deterministic and never selects by
  latest, newest, largest, or timestamp order.

### Evidence and authority

- Evidence remains represented by existing artifact identity references.
- Authority and trust remain provider-backed projections.
- Imported and AI-generated metadata remains non-authoritative.

## C. Exact semantic gap

The repository has no declaration-scoped representation locator for:

- sheet;
- view;
- detail;
- section;
- elevation;
- equivalent source-declared sub-scope.

The repository also does not define whether these values are structured
semantic categories or merely source-declared labels.

The existing `issue: string | null` is intentionally only a label. It does
not define issue ordering, issue authority, issue applicability, or issue
supersession beyond the existing declaration context.

## D. Candidate designs

### Candidate 1 — Opaque source-declared scope values

```text
representationScope:
  readonly string[] | null
```

Advantages:

- minimal normalization;
- no vocabulary inflation;
- no implied authority;
- compatible with unfamiliar source conventions.

Risks:

- sheet and view meaning cannot be distinguished deterministically;
- consumers must parse source text heuristically;
- `"Sheet ?"` and a real sheet label have no semantic distinction;
- reconstruction cannot reliably compare like-for-like scope claims.

This candidate is too weak to close the demonstrated gap by itself.

### Candidate 2 — Fully governed document/drawing ontology

This would introduce structured sheet, view, detail, section, elevation,
annotation, and document lifecycle concepts.

Advantages:

- rich semantic querying;
- explicit discipline vocabulary.

Risks:

- vocabulary inflation;
- accidental document-management semantics;
- hidden sheet/view identities;
- premature CAD/BIM or drawing-model coupling;
- new authority boundaries without demonstrated need.

This candidate exceeds the required scope and is rejected.

### Candidate 3 — Small governed locator envelope with opaque values

```text
EngineeringRepresentationScopeReference
  kind: SHEET | VIEW
  value: opaque source-declared non-empty string
  resolution: RESOLVED | UNKNOWN | UNRESOLVED | AMBIGUOUS | INVALID
```

Multiple references may be carried by one representation declaration. A sheet
and a view can therefore be represented together without creating a
sheet-to-view graph or identity.

`DETAIL`, `SECTION`, and `ELEVATION` are not introduced as new canonical
scope kinds. Where present, they remain source-declared `VIEW` values, for
example `DETAIL 3/A-501` or `SECTION A-A`.

This candidate closes the semantic gap while minimizing normalization and
authority.

## E. Recommended smallest design

Adopt Candidate 3 as the semantic direction for implementation review.

The declaration-scoped representation metadata may be extended with an
optional immutable collection:

```text
scopeReferences: readonly EngineeringRepresentationScopeReference[] | null
```

The smallest governed scope vocabulary is:

```text
SHEET
VIEW
```

Each reference contains:

- `kind`;
- opaque source-declared `value`;
- explicit resolution state.

The value is not parsed into a global number, code, path, filename, or
identity. Whitespace-only values are invalid. Values such as `Sheet ?`,
`UNKNOWN`, or an imported unresolved token do not become canonical merely
because they are non-empty.

Multiple scope references are declaration metadata, not graph endpoints.
Canonicalization may sort and deduplicate exact reference content for
determinism, but must not infer parent/child relationships or uniqueness.

No `DETAIL`, `SECTION`, or `ELEVATION` enum is justified by the current
repository. Those meanings remain source-declared view values until a later
focused decision demonstrates a stable cross-discipline need.

## F. Identity boundary

The scope locator:

- does not identify an artifact;
- does not identify an artifact revision;
- does not identify a physical referent;
- does not identify a document;
- does not identify a file;
- does not identify a sheet or view globally;
- does not create a registry;
- does not create a UUID or persistence key.

The artifact endpoint remains the sole identity-bearing representation
reference. The locator only qualifies the semantic sub-scope asserted within
that representation declaration.

Artifact revision, issue label, and representation scope remain distinct:

```text
artifact revision != issue label != representation scope
```

A repeated sheet number in two artifacts is not an identity collision. It is
two declaration-scoped source values attached to two distinct artifact
revisions.

## G. Temporal/applicability semantics

Scope references reuse existing declaration semantics:

- `TemporalValidity` describes when the scope claim applies;
- `applicabilityContext` describes the applicable project, issue context, or
  other governed query scope;
- explicit `supersedes` references preserve predecessor declarations;
- missing temporal boundaries remain unknown;
- missing applicability remains unknown;
- historical declarations remain addressable.

No scope reference creates a `current` representation.

No issue or scope ordering is inferred from:

- numeric labels;
- alphabetical labels;
- artifact versions;
- timestamps;
- upload order;
- insertion order;
- synchronization order.

## H. Issue semantics

The existing issue field remains a nullable, source-declared label:

```text
issue: string | null
```

An issue label means only that the declaration carries that label as reported
by its source or author. It does not mean:

- latest;
- current;
- approved;
- authoritative;
- valid;
- superseding;
- physically realized.

Artifact `version` remains the artifact revision identity. An issue label does
not replace or alter artifact version semantics.

Issue applicability may be expressed through the existing
`applicabilityContext` and `TemporalValidity`. Issue supersession may be
expressed only through explicit declaration `supersedes` references or other
already governed relationships. No issue registry, issue identity, issue
ordering, or automatic issue transition is introduced.

## I. Fingerprint semantics

`RelationshipFact` fingerprint remains unchanged:

```text
subject + predicate + object
```

Representation scope and issue metadata do not participate in fact identity.

Because they are declaration-level semantic content, both issue and
`scopeReferences` participate in the canonical `RelationshipDeclaration`
fingerprint.

The canonical declaration content includes:

```text
representationMetadata:
  representationKind
  semanticRole
  issue
  scopeReferences:
    kind
    value
    resolution
```

Consequences:

- two declarations with different scope references remain distinct;
- two declarations with different issue labels remain distinct;
- identical scope/issue content canonicalizes deterministically;
- scope and issue do not create new graph facts;
- no hidden filename, path, payload hash, or inferred “latest” value enters
  the fingerprint.

## J. Unknown/ambiguous behavior

The following behavior is mandatory:

### Missing scope

`scopeReferences: null` or an absent scope means no representation sub-scope
was declared. It must not be inferred from filenames, page counts, drawing
titles, or geometry payloads.

### `UNKNOWN`

The available declaration does not establish a usable scope value.

### `UNRESOLVED`

An external or imported scope token exists, but it has not been governed into
a usable semantic reference.

### `AMBIGUOUS`

Multiple candidate scope interpretations remain possible. No candidate is
selected by proximity, text similarity, source order, or latest metadata.

### `INVALID`

The scope declaration violates the contract, such as an empty value, invalid
kind, malformed resolution, or non-canonical content.

### Conflicting locators

Different affirming locators for the same representation fact remain separate
declaration claims. They are not merged or selected automatically. Existing
affirm/deny conflict and historical reconstruction semantics remain
authoritative.

`Sheet ?`, imported labels, and AI-generated locators remain claims with their
declared resolution and origin. They cannot become canonical through presence
alone.

## K. Evidence/authority boundary

Scope and issue metadata are semantic claims.

They do not establish:

- artifact validity;
- representation accuracy;
- approval;
- authority;
- physical correctness;
- construction status;
- as-built status;
- trust.

Evidence references remain existing artifact identity references. Evidence
resolution remains external to `KnowledgeGraph`. Authority and trust remain
under the existing provider and projection contracts.

An imported or AI-generated scope locator may be retained with provenance and
an explicit unresolved or unverified state. It cannot promote itself to
canonical identity, authoritative representation, or physical truth.

## L. Red-team findings

### Hidden locator identity

Rejected. The locator is declaration-scoped, has no global identity, and is
not a graph endpoint.

### Hidden issue revision identity

Rejected. Artifact version remains the only artifact revision identity. Issue
labels are uninterpreted source values.

### Implicit latest issue

Rejected. No numeric, alphabetical, timestamp, insertion, or upload ordering
has semantic force.

### Globally unique sheet numbers

Rejected. Sheet values are scoped to the containing representation
declaration and artifact revision.

### Filename-derived identity

Rejected. Filenames and paths are outside the semantic identity contract.

### Evidence resolving ambiguity automatically

Rejected. Evidence may support a governed resolution, but presence or
resolution does not silently select a locator.

### Imported metadata becoming authoritative

Rejected. Imported values retain origin, resolution, evidence, and authority
separation.

### AI-generated canonical locators

Rejected. AI output remains a candidate or unverified claim.

### Document-management expansion

Rejected. No files, folders, publishing, workflow, storage, or permissions
are introduced.

### Second graph

Rejected. Scope is declaration metadata carried by the existing
`REPRESENTED_BY` relationship.

### Artifact revision duplication

Rejected. Issue and scope metadata qualify a declaration; they do not alter
artifact identity or version semantics.

## M. Explicit non-scope

This ADR does not authorize:

- document management;
- file storage;
- uploads or downloads;
- folders;
- document publishing;
- approval workflow;
- check-in/check-out;
- OCR;
- PDF processing;
- CAD/BIM ingestion;
- rendering;
- thumbnail generation;
- cloud storage;
- persistence;
- API;
- UI;
- document registry;
- sheet registry;
- issue registry;
- file identity;
- workflow engine;
- mobile synchronization;
- AI promotion;
- automatic latest/current inference;
- new graph authority;
- new relationship predicate;
- automatic physical-state mutation;
- automatic reconciliation of conflicting representations.

## N. Implementation gate

This ADR is Proposed and does not authorize implementation.

If accepted in a later architecture review, the smallest implementation may
extend declaration-scoped representation metadata with:

- `scopeReferences`;
- `SHEET` and `VIEW` kinds only;
- opaque source-declared values;
- explicit `RESOLVED`, `UNKNOWN`, `UNRESOLVED`, `AMBIGUOUS`, and `INVALID`
  states;
- deterministic canonicalization;
- declaration-fingerprint participation;
- unchanged fact fingerprints;
- unchanged `KnowledgeGraph`, identity, evidence, authority, trust, temporal,
  and supersession boundaries.

Implementation must demonstrate:

- no second identity authority;
- no document, sheet, issue, or file registry;
- no new graph or predicate;
- no latest/current selection;
- preserved historical and conflicting declarations;
- explicit unresolved and ambiguous behavior;
- unchanged existing `DEPENDENCY`, `DESCRIBED_BY`, `CALCULATED_FOR`,
  `REPRESENTED_BY`, and decision/change behavior.

No production code, tests, persistence, API, UI, ingestion, or workflow
implementation is authorized by this Proposed ADR.

## Related decisions

- ADR-031 — Semantic Backbone Foundation Implementation Plan
- ADR-034 — Relationship Declaration, Evidence Boundary, and Deterministic Reconstruction
- ADR-035 — Physical Referent Identity Extension
- ADR-036 — Release B Relationship Vocabulary and Direction Contract
- ADR-037 — Relationship Authority Evaluation Adapter Boundary
- ADR-038 — Release C Geometry Representation and `REPRESENTED_BY` Contract
- ADR-039 — Engineering Decision and Change Evidence Semantics
