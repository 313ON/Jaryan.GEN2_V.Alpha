# ADR-037: Relationship Authority Evaluation Adapter Boundary

## Status

Accepted — recorded on 2026-08-22 for Phase 14.4A.

This decision defines only the cross-boundary contract required to evaluate
authority and trust context for relationship declarations. It does not
implement the adapter or change the existing graph, evidence, authority, or
trust contracts.

## Context

`RelationshipDeclaration` owns an immutable historical assertion and may carry
references to evidence artifacts. `KnowledgeGraph` reconstructs relationship
structure, temporal applicability, supersession, and conflict.

The existing authority/trust boundary evaluates an
`EngineeringKnowledgePackage` with package-specific authority evidence and
`TrustPolicy`. It cannot safely evaluate a `RelationshipDeclaration` directly:

- a relationship fingerprint is not automatically an authority identity;
- a relationship has no package result status or package structural contract;
- evidence-reference resolution is not authority interpretation;
- package trust does not establish the truth of a relationship claim.

Converting a relationship into an `EngineeringKnowledgePackage` would invent
semantics and create an accidental relationship trust model.

## Decision

### 1. Authority subject binding

Relationship authority evaluation requires an explicit, provider-owned
authority-subject reference supplied by the application or an authority
adapter.

The reference is an external compatibility reference, not a canonical
identity, graph node, relationship identity, or persistence identity. It must
be resolved by the authority boundary before authority or trust status can be
reported.

The relationship fingerprint, subject/object pair, actor, timestamp, and
artifact revision must not be used as an authority subject implicitly.

An authority adapter may bind a relationship claim to an existing governed
authority subject, including an existing engineering knowledge package, only
when that binding is explicit and independently resolvable. The binding does
not make the relationship equivalent to the bound subject.

### 2. Evidence binding

`RelationshipDeclaration.evidenceReferences` remains a canonical, immutable
list of references to existing engineering artifacts.

The relationship authority adapter passes those references to the existing
evidence/source authority boundary. It may report each reference as resolved,
not found, invalid, ambiguous, or otherwise unverified according to the
existing contracts.

Evidence presence and evidence resolution are inputs to evaluation only.
Neither implies evidence sufficiency, authority, validity, correctness, or
trust. The adapter must not create an evidence registry or reinterpret source
identities.

### 3. Policy binding

Policy is supplied explicitly by the existing governed authority/trust
boundary. No relationship-specific policy, scoring model, authority hierarchy,
or policy registry is created.

Where the existing `TrustPolicy` is applicable to the explicitly bound
authority subject, the adapter may delegate policy interpretation to the
existing trust evaluator. A package trust result must be labeled as the
authority context of the bound subject; it must not be presented as proof that
the relationship itself is true.

### 4. Revision binding

Evaluation preserves separate revision dimensions:

- declaration fingerprint identifies the immutable asserted declaration;
- evidence artifact identity preserves the exact referenced artifact revision;
- authority-subject and authority revisions are supplied by the authority
  boundary;
- policy identity and policy revision are supplied by the trust boundary.

No revision is inferred from timestamps, insertion order, artifact version
ordering, or declaration age. Supersession remains declaration metadata and
continues to be interpreted only by relationship reconstruction.

### 5. Projection result

The application-level adapter projection is a derived, query-time result with
at least:

- structural relationship status from graph reconstruction;
- deterministic evidence-resolution results for the declaration set;
- authority status from the existing authority boundary;
- trust status from the existing trust boundary;
- existing reason/diagnostic codes and explicit adapter diagnostics.

The projection is not stored on `RelationshipDeclaration`, does not alter
declaration fingerprints, and does not become graph state.

Structural relationship status, evidence status, authority status, and trust
status remain independently inspectable. A structurally resolved relationship
may remain evidence-unresolved, unauthorized, unverified, or not eligible for
trust.

### 6. Proposed adapter shape

The future application/infrastructure boundary may expose a contract
equivalent to:

```ts
interface RelationshipAuthorityEvaluationAdapter {
  evaluate(input: {
    declaration: RelationshipDeclaration;
    authoritySubject: ExternalAuthoritySubjectReference | null;
    policy: TrustPolicy | null;
  }): RelationshipAuthorityProjection;
}
```

`ExternalAuthoritySubjectReference` is provider-owned and opaque to
`KnowledgeGraph`. The adapter may delegate to existing evidence authorities,
`AuthorityEvidenceProvider`, and `evaluateEngineeringKnowledgeTrust` only
after explicit subject binding and compatibility validation.

This shape is a boundary contract, not authorization to implement a new trust
engine or to broaden the existing evaluator's subject model.

## Ownership boundaries

| Concern | Owner |
| --- | --- |
| Relationship facts, declarations, predicates, fingerprints, reconstruction | `KnowledgeGraph` / shared-domain |
| Evidence reference resolution and source interpretation | Existing evidence/source authority |
| Authority interpretation | Existing authority provider |
| Trust and policy evaluation | Existing trust evaluator |
| Relationship projection and orchestration | shared-application adapter |
| Serialization only | Persistence |
| Transport only | API |

Persistence and API layers own no semantic authority.

## Preserved invariants

- Evidence reference is not authority.
- Evidence presence is not trust.
- Actor presence is not authorization.
- Relationship fingerprint is not an authority subject unless explicitly
  bound by an authority provider.
- Timestamp and revision ordering do not establish truth or supersession.
- AI confidence and `AI_PROPOSAL` do not become authority automatically.
- Historical reconstruction remains independent from authority/trust
  evaluation.
- One identity authority and one `KnowledgeGraph` remain authoritative.
- No second trust engine, authority registry, evidence registry, graph, or
  identity system is introduced.
- Unknown, ambiguous, invalid, conflicting, historical, unverified, and
  insufficient-evidence states remain explicit.

## Implementation authorization

Phase 14.4 evidence/authority projection is **not yet authorized**.

Implementation may begin only after the authority integration boundary provides
an explicit relationship authority-subject binding and a compatible adapter
that can delegate to existing evidence and trust contracts without presenting
package trust as relationship truth.

No predicate, graph, persistence, API, UI, AI-promotion, or relationship
trust-scoring work is authorized by this ADR.

## Deferred

- implementation of `RelationshipAuthorityEvaluationAdapter`;
- provider-owned external authority-subject reference contract;
- relationship-to-authority subject binding data flow;
- authority-provider support for relationship claim evaluation;
- any new predicates: `VERIFIED_BY`, `OBSERVED_BY`, `AFFECTED_BY`;
- persistence, API, UI, CAD/BIM/GIS, evidence registry, and AI promotion.

## Consequence

The existing package authority/trust evaluator remains unchanged and is not
misapplied to relationship declarations. Release B can proceed only when the
explicit authority-subject adapter boundary is available; until then,
relationship reconstruction may expose evidence references and external
evidence-resolution outcomes without claiming relationship authority or trust.

