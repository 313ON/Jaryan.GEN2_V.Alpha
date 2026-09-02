# ADR-042 — Engineering Intelligence Workspace UI/UX Foundation

Date: 2026-09-02
Status: Accepted

## Context

The existing web application is a deterministic, browser-local engineering
screening console. Its calculations and field-collection worklist already
consume shared-domain and shared-application contracts, but its presentation
did not yet make the wider Jaryan engineering lifecycle explicit. A generic
dashboard would risk hiding identity, provenance, authority, revision history,
and unknown states.

## Decision

The web UI is a projection layer over application contracts. It does not
create a second engineering domain model and it does not depend on Prisma,
database tables, SQL, or repository implementations.

The workspace foundation therefore establishes:

- a navigation map grouped into Command, Engineering, Knowledge, Operations,
  and System;
- reusable semantic state badges with explicit text and symbols;
- a canonical evidence chain from physical asset through revision;
- an integrity overview that distinguishes local verification, review,
  non-authority, and unknown state;
- a Persian-first RTL document shell while preserving LTR isolation for
  engineering identifiers and numeric/code values;
- responsive behavior that keeps the engineering chain and status evidence
  readable without pretending that unavailable mobile data exists.

The current local screening route is retained as the active engineering
surface. Unsupported capabilities are represented as `UNKNOWN`,
`REVIEW_REQUIRED`, `NON_AUTHORITATIVE`, or `EXTERNAL_GATE` according to the
available contract rather than by fabricated records.

## State semantics

`UNKNOWN` means the application has no supported fact. It is not disabled,
empty, or false. `LOCAL_VERIFIED` means the browser-local deterministic
calculation or input provenance is verified within that bounded session; it
does not imply production verification. `NON_AUTHORITATIVE` means the output
must not be treated as approved engineering design. `REVIEW_REQUIRED` marks
missing evidence or a condition requiring engineering attention.

Every state includes text and a symbol, so color is never the sole carrier of
engineering meaning.

## Rejected alternatives

### Generic KPI dashboard

Rejected because numbers without identity and source chain can imply a level
of engineering certainty that the application does not possess.

### Frontend-owned mock domain records

Rejected because fabricated assets, evidence, decisions, or revisions would
make the UI authoritative over engineering truth and would drift from the
shared-domain contracts.

### Direct database reads from the web app

Rejected because the dependency direction must remain UI → application
contracts → domain, with infrastructure adapters below that boundary.

### AI-first workspace

Rejected because AI interpretation is downstream and non-authoritative unless
the application supplies explicit evidence and authority.

## Consequences

The shell is useful before all engineering routes are backed by application
capabilities: unsupported views remain visibly unknown. Future route work must
replace those projections with read-only application query contracts, not
client-side domain logic.
