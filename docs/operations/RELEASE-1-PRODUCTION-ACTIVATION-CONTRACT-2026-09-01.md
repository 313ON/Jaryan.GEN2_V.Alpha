# Release-1 Production Activation Contract

Contract identity: `JARYAN-RELEASE-1-ACTIVATION-CONTRACT-2026-09-01`

Release identity:

- Release: `JARYAN-RELEASE-1-RECUT-2026-09-01`
- Branch: `release/release-1-recut-2026-09-01`
- Tagged release commit: `05c8bf31d06b6abfe82fb84f5753cc2d228d2e0f`
- Annotated tag: `release-1-recut-2026-09-01`

The hardening checkout continues from this tagged release. The tag is
immutable and must not be moved; deploy the later clean SHA recorded by the
current activation handoff when deploying the hardened checkout.

This document defines prerequisites for a separate production activation gate.
It is not a deployment procedure and does not authorize activation.

## Historical boundary

The historical release
`e810e41c1133a84eb07ff4f5c119cd93a9b32d92` remains unrecoverable from
available Git provenance. This Release-1 re-cut is a new release and must not
be represented as that historical release.

## Existing operational artifacts

| Artifact | Classification | Decision |
|---|---|---|
| `docs/operations/PRODUCTION-ACTIVATION-PARAMETER-MANIFEST.md` | INCOMPLETE / CONTRADICTORY for this re-cut | Preserve unchanged as historical operational evidence; do not use its `e810e41` certified-release fields for this release. |
| `docs/releases/RELEASE-1-RECUT-2026-09-01.md` | VALID release provenance | Use with the annotated tag and exact commit. |
| `docs/database-baseline.md` | VALID but incomplete for live activation | Use as schema-contract evidence; live database verification remains required. |
| `prisma/baseline/` | VALID but not a live database proof | Verify artifact identity and perform authorized restore/introspection before activation. |
| `prisma/migrations/` | VALID historical migration evidence | Verify migration state on the target; do not infer applied state from files alone. |
| `scripts/verify-baseline-fingerprint.mjs` | VALID deterministic local check | Use for artifact/fingerprint verification; it does not prove a live database match. |

No deployment, service, database, secret, backup, or rollback artifact is
created by this contract.

## Runtime contract

### Node.js

```text
REQUIRED VERSION: Node.js >=22.0.0 <23; exact Operations approval remains required
```

Approval evidence must identify the exact Node.js version, Windows
architecture, support policy, and verification source. The developer-machine
version is not approval.

### Dependencies

Use the committed root `package-lock.json` and npm workspaces:

```text
npm ci
```

The install record must identify the Release-1 commit/tag and must not contain
secrets.

### API

```text
Entrypoint: node dist/main.js
Required: PRISMA_DIRECT_TCP_URL
Optional/default: PORT=3001
Health: GET /health -> {"status":"ok"}
```

The API requires a reachable PostgreSQL connection during application startup.
The default port is not a production approval.

### Web

```text
Entrypoint: next start
Production build: npm run build --workspace @jaryan/web
```

The public web port, hostname, TLS termination, and reverse-proxy binding are
unknown and require Operations approval.

## Database contract

The following are separate acceptance conditions:

1. **Database connection** — an explicitly authorized PostgreSQL TCP endpoint
   is reachable using `PRISMA_DIRECT_TCP_URL`.
2. **Schema compatibility** — the live public schema matches the Release-1
   expected schema identity, including the baseline fingerprint where the
   verification procedure supports it.
3. **Migration state** — the target's migration history is inspected and
   reconciled with the known migration files; file presence does not prove
   application state.
4. **Data preservation** — existing rows and historical calculation evidence
   remain intact; no destructive operation is permitted by this contract.

`DATABASE_URL` is used by Prisma CLI configuration. Runtime uses
`PRISMA_DIRECT_TCP_URL`; these variables must not be conflated.

The known schema evidence consists of:

- `prisma/schema.prisma`;
- migrations
  `20260824120000_add_durable_calculation_snapshot` and
  `20260826100000_scope_durable_calculation_snapshot_to_project`;
- `prisma/baseline/20260826_release_cutover_baseline.sql`;
- `prisma/baseline/schema-manifest.json`;
- the canonical baseline fingerprint and its verification script.

The original schema creation history is unavailable. The baseline is a
verified-state reference for future migrations, not a recovered historical
creation sequence.

## Database cutover sequence

Application deployment is prohibited until each stage below has an evidence
record:

```text
BACKUP
  -> CONNECTIVITY VERIFICATION
  -> SCHEMA IDENTITY VERIFICATION
  -> MIGRATION STATE VERIFICATION
  -> COMPATIBILITY VERIFICATION
  -> APPLICATION STARTUP
  -> HEALTH VERIFICATION
```

Required evidence:

| Stage | Required evidence |
|---|---|
| Backup | Backup artifact identity, timestamp, scope, storage location, checksum, and verified restore result. |
| Connectivity | Authorized authenticated PostgreSQL connection test without printing credentials. |
| Schema | Canonical live-schema representation and comparison with the expected Release-1 schema identity. |
| Migration | Read-only migration-state output identifying applied, pending, failed, or unknown migrations. |
| Compatibility | Explicit Release-1 commit/tag to database-schema compatibility record. |
| Startup | API and web processes start from the approved release directory with approved environment injection. |
| Health | API `/health` response and web availability record from the approved binding. |

No production migration may be run merely to discover compatibility.

## Backup and restore contract

Before activation, Operations must define and approve:

1. Full database backup scope, including durable calculation snapshots and
   audit/history data.
2. Approved backup destination and retention.
3. Backup artifact identity, timestamp, checksum, and access controls.
4. Restore target isolated from production.
5. Restore execution authority and operator.
6. Verification that the restored database is readable and schema-compatible.
7. Recovery record linking the backup to the Release-1 activation attempt.

A backup without a successful isolated restore verification is not acceptable
evidence.

## Windows runtime contract

```text
SERVICE TECHNOLOGY: UNAPPROVED
SERVICE NAME: UNKNOWN
```

Operations must approve the service technology before activation. The
repository establishes no NSSM, WinSW, Windows Service, scheduled-task, or
container deployment convention.

The approved service contract must define:

- API process: `node dist/main.js`;
- web process: `next start`;
- approved release working directory;
- environment injection without committed secrets;
- API-before-web startup ordering, if required;
- restart and crash recovery behavior;
- graceful shutdown behavior;
- API and web log destinations and retention;
- health-check and restart escalation behavior.

No service installation or process launch is authorized by this document.

## TLS and reverse proxy contract

```text
TLS TERMINATION: UNKNOWN
PUBLIC HOSTNAME: UNKNOWN
API ORIGIN: UNKNOWN
WEB ORIGIN: UNKNOWN
```

Operations must decide whether traffic is direct HTTP, reverse-proxied, or
TLS-terminated. Certificates, hostnames, bindings, firewall rules, and
forwarded-header policy require explicit approval and evidence.

## Secret management contract

The following values must be injected through an approved secret mechanism and
must never be committed, printed, or placed in command history:

- `PRISMA_DIRECT_TCP_URL`;
- `DATABASE_URL` for Prisma CLI operations, if used;
- authentication/session secrets, if later required by the approved runtime;
- any service-account or proxy credentials.

This repository contains no approved secret-management provider or injection
configuration. That decision is `UNKNOWN` and is evidence-required.

## Rollback contract

Rollback remains blocked. A rollback target must not be invented.

Activation requires all of:

```text
KNOWN APPROVED RELEASE ARTIFACT
  + KNOWN RELEASE SHA/TAG
  + DATABASE COMPATIBILITY
  + VERIFIED DATABASE RESTORE
  + EXECUTABLE RECOVERY PROCEDURE
```

`6ec78fd41f3a38e44045c4d5c8092afd6ea54b82` is only the known continuation
anchor; it is not an approved previous production release.

## Activation checklist

States are `PASS`, `FAIL`, `BLOCKED`, `UNKNOWN`, or `NOT APPLICABLE`.

| Check | Initial state | Required evidence |
|---|---|---|
| Release identity verified | PASS | Exact Release-1 commit/tag mapping. |
| Release tag verified | PASS | Annotated tag peels to the release commit. |
| Release artifact verified | BLOCKED | Approved reproducible production package and checksum. |
| Runtime version approved | UNKNOWN | Operations approval for exact Node.js version. |
| Production configuration approved | BLOCKED | Approved ports, paths, hostnames, service, and environment contract. |
| Secrets injection verified | BLOCKED | Approved provider and injection record. |
| Database connectivity verified | BLOCKED | Authorized PostgreSQL connection evidence. |
| Database backup verified | BLOCKED | Backup identity and verified restore evidence. |
| Database schema compatibility verified | BLOCKED | Live canonical schema comparison. |
| Migration state verified | BLOCKED | Read-only target migration-state evidence. |
| Restore procedure verified | BLOCKED | Isolated restore and validation record. |
| Windows service configuration verified | UNKNOWN | Approved service technology and configuration. |
| Logging verified | UNKNOWN | Approved log path, retention, and access verification. |
| TLS/reverse proxy verified | UNKNOWN | Approved binding, certificate, hostname, and proxy evidence. |
| Health endpoint verified | BLOCKED | Approved-environment API health response. |
| Authentication verified | BLOCKED | Approved non-production or production-safe authentication test. |
| Rollback target verified | BLOCKED | Approved previous release artifact and SHA/tag. |
| Rollback procedure verified | BLOCKED | Executable recovery and database restore evidence. |

## Gate status

```text
GATE A — ACTIVATION CONTRACT:
PASS — contract defined; activation remains blocked pending evidence

GATE B — PRE-ACTIVATION VERIFICATION:
BLOCKED — required external operational evidence is unavailable
```

No production activation, deployment, service installation, database
connection, migration, backup, restore, or secret operation has been
performed.
