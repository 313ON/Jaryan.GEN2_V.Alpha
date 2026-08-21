/**
 * ADR-007: Authority Evidence and Revision Trust Boundary
 *
 * Context
 * - Trust evaluation previously accepted revision compatibility as a caller
 *   supplied `revisionContext` field.
 * - That field could claim compatibility without authority-backed evidence.
 *
 * Decision
 * - Trust evaluation consumes an injected `AuthorityEvidenceProvider`.
 * - Provider output includes immutable authority facts and a
 *   `RevisionTrustContext` bound to the authority identity, authority
 *   revision, and evaluated package fingerprint.
 * - A bare caller-supplied compatibility field is not an authority input.
 *
 * Consequences
 * - TRUSTED requires provider-produced evidence with a valid compatible
 *   revision context.
 * - Missing or malformed evidence remains not eligible or rejected.
 * - The domain remains free of persistence, registries, external integrations,
 *   signatures, and trust state on engineering knowledge packages.
 *
 * Non-Goals
 * - No authority registry
 * - No persistence or cache
 * - No cryptographic attestation or external authority integration
 * - No automatic trust propagation or revocation workflow
 */
