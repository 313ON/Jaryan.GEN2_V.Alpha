# Release-1 Production Activation Handoff

Status: `READY_PENDING_EXTERNAL_GATE`

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

The API validates its runtime URL, host, and port before starting. It connects
to PostgreSQL during Nest module initialization, so a healthy process also
proves startup database connectivity.

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
