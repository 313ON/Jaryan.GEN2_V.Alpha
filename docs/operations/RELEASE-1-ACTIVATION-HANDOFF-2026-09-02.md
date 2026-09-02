# Release-1 Production Activation Handoff

Status: `READY_PENDING_EXTERNAL_GATE`

The immutable release tag `release-1-recut-2026-09-01` identifies commit
`05c8bf31d06b6abfe82fb84f5753cc2d228d2e0f`. The hardened deployable checkout
is the later clean commit recorded by `git rev-parse HEAD`; do not move the
existing tag.

This handoff is for the `Production Activation Gate` following the closed
Release-1 local activation preflight. It describes executable repository
behavior and separates local evidence from production evidence.

## Activation objective

Activate the Release-1 re-cut application from the exact approved Git SHA,
with the API and web production artifacts built from the committed lockfile,
against an authorized PostgreSQL target whose schema and migration history
match the release authority. Activation is complete only after backup/restore
evidence, service startup, health checks, smoke checks, and Operations
approval are recorded.

## Repository-controlled contract

- Install: `npm ci`
- Build: `npm run build`
- API: `node apps/api/dist/main.js` (or the API workspace `start` script)
- API health: `GET /health` returns `{"status":"ok"}`
- API runtime secret: `PRISMA_DIRECT_TCP_URL`
- Prisma CLI secret: `DATABASE_URL`
- Runtime defaults: `HOST=0.0.0.0`, `PORT=3001`
- Migration authority: `prisma/migrations/`; production policy is
  `prisma migrate deploy`, never `db push` or reset.
- Readiness command: `npm run activation:readiness`
- Local recovery evidence: `npm run recovery:verify:local`

The API validates its runtime URL, host, and port before starting. It connects
to PostgreSQL during Nest module initialization, so a healthy process also
proves startup database connectivity.

Configuration classification:

| Variable | Required | Secret | Scope |
|---|---|---|---|
| `DATABASE_URL` | Yes for Prisma CLI | Yes | Operations/production |
| `PRISMA_DIRECT_TCP_URL` | Yes for API runtime | Yes | Operations/production |
| `PORT` | Optional, default `3001` | No | Operations/production |
| `HOST` | Optional, default `0.0.0.0` | No | Operations/production |
| `NODE_ENV` | Optional metadata | No | Operations/production |

## Required pre-activation evidence

1. Exact approved SHA/tag and artifact checksum.
2. Approved Node/npm versions compatible with the repository engines.
3. Secret-provider injection record for `DATABASE_URL` and
   `PRISMA_DIRECT_TCP_URL`; values must not enter Git or logs.
4. Read-only target connectivity, schema identity, and migration-state output.
5. Full database backup identity, checksum, retention, and isolated restore
   verification. Include durable calculation snapshots and audit history.
6. Approved service account, process supervision, restart policy, log
   destination, hostname, ports, firewall, TLS, and reverse-proxy policy.
7. Operations approval and activation window.

## Activation sequence

1. Verify the SHA/tag and checksum.
2. Install with `npm ci` and build with `npm run build`.
3. Take and verify the database backup.
4. Run `prisma migrate status` and the read-only schema comparison.
5. Apply only pending committed migrations with `prisma migrate deploy`.
6. Start the API, wait for `/health`, then start the web process.
7. Run the approved smoke test and record sanitized results.

No production deployment, migration, service installation, or secret injection
is performed by `activation:readiness`.

## Backup/restore and rollback

Use the database provider's approved backup mechanism. A backup is not valid
activation evidence until it has been restored into an isolated target and
validated against the baseline manifest. Application rollback is to the last
approved release SHA/tag. Database rollback is forward-only unless Operations
has a separately verified restore plan; do not fabricate down migrations.

The local recovery command produces `LOCAL_RECOVERY_EVIDENCE` only. It creates
an isolated database, validates the restored schema/data/migration parity, and
removes that target. It does not satisfy the production backup gate. The
historical manifest has lexicographically ordered table columns while the
physical baseline SQL and live database preserve declaration order; this is a
known baseline compatibility finding and is not treated as production
evidence.

## Validation accounting

The workspace scripts execute 588 tests:

- web: 5
- shared application: 159
- shared domain: 370
- shared infrastructure: 41
- shared knowledge: 11
- API runtime configuration: 2

The API release E2E is a separate command and executes 1 additional test.
The two root TypeScript test files are not wired into any package script and
contain no Node test declarations. Therefore the current executed total is
`589`, not `427` or `370`: `427` was an incomplete historical sum, while
`370` was only the shared-domain package result.

## Lint policy

The repository has no ESLint, Biome, Prettier, CI lint job, or lint script.
Next production builds perform framework type/lint checks, and all workspace
typechecks pass. A standalone lint gate is not part of this Release-1
architecture; introducing one is deferred to a tooling milestone.

## Dependency audit disposition

The current audit reports 14 advisories: 8 high and 6 moderate, with no
critical findings. The Next.js findings are runtime-reachable and require a
tested major-line upgrade; the Nest platform findings require Nest 12; the
Prisma/deepmerge/mysql2 findings are in the Prisma CLI/tooling dependency
tree and are not loaded by the PostgreSQL runtime. No force upgrade was
accepted because it would replace the verified Prisma 7/Nest 10 baseline
without compatibility evidence. These risks require a dedicated dependency
upgrade milestone before internet-facing production exposure.

Rollback triggers include failed health checks, failed smoke tests, database
connectivity loss, schema incompatibility, authentication failure, or
material error-rate/logging anomalies during the approved observation window.

## Exact external gates

The current checkout has no authorized production host, database endpoint,
secret provider, backup artifact, isolated restore target, Windows service
definition, reverse-proxy/TLS configuration, approved previous production
release, or Operations approval. These are external gates, not software
failures. Operations should attach those records to the activation ticket and
rerun the repository readiness and smoke procedures.
