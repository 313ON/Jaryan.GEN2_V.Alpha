# Production Activation Parameter Manifest

Status: **READY WITH WARNINGS — OPERATIONS INPUTS REQUIRED**

This document is a production handoff artifact. It is not a deployment
procedure execution record. No production values are supplied here, and no
secret values may be committed or printed.

The requested source
`docs/operations/RELEASE-1-WINDOWS-ACTIVATION.md` is absent from this
checkout. The procedure below is therefore limited to the executable behavior
that is evidenced by the repository. Operations must provide the missing
Windows service and environment decisions before activation.

## Certified release

| Parameter | Value | Status | Evidence |
|---|---|---|---|
| Release branch | `release/pulse-departmental-materialization` | AVAILABLE FROM RELEASE HANDOFF | User-supplied activation manifest |
| Certified HEAD | `e810e41c1133a84eb07ff4f5c119cd93a9b32d92` | AVAILABLE FROM RELEASE HANDOFF | User-supplied activation manifest |
| Certified parent | `fa4e89bffb41bd881881458dd27e4697d5245ad6` | AVAILABLE FROM RELEASE HANDOFF | User-supplied activation manifest |
| Promotion gate | `READY WITH WARNINGS` | AVAILABLE FROM RELEASE HANDOFF | User-supplied activation manifest |
| Software blockers | None | AVAILABLE FROM RELEASE HANDOFF | User-supplied activation manifest |

The current checkout is not that certified HEAD: local inspection reported
branch `master` at `6ec78fd41f3a38e44045c4d5c8092afd6ea54b82`, with unrelated
modified and untracked files. Operations must activate only from the certified
release artifact or a checkout verified against the certified HEAD.

## Parameter manifest

| Parameter | Required | Expected format | Consumed by | Safe to commit? | Secret/environment input? | Status | Repository evidence |
|---|---|---|---|---|---|---|---|
| Approved target Windows server | Yes | Named host or approved server identifier | Operations deployment | No | Operations inventory input | MISSING | Required by the supplied promotion blocker list; no repository value |
| Approved release directory | Yes | Absolute Windows directory | Operations deployment and process working directory | No | Environment-specific input | MISSING | No Windows deployment script or approved path exists |
| External production database path/endpoint | Yes | Reachable PostgreSQL connection target | Database/runtime configuration | No | Secret/environment input | MISSING | `packages/shared-infrastructure/src/database/prisma.service.ts` consumes `PRISMA_DIRECT_TCP_URL` |
| `PRISMA_DIRECT_TCP_URL` | Yes | `postgres://...` or `postgresql://...` TCP URL | API Prisma runtime adapter and release E2E | No | Yes; secret/environment variable | SECRET / MISSING | `prisma.service.ts` rejects absence; `apps/api/tests/release-e2e.test.mjs` requires a PostgreSQL TCP URL |
| Database credentials | Yes | Credentials embedded or referenced by approved PostgreSQL URL | PostgreSQL client | No | Yes; secret/environment input | SECRET / MISSING | Required implicitly by `PRISMA_DIRECT_TCP_URL`; no value is present |
| Database backup path | Yes before activation | Absolute Windows directory or approved backup target | Operations rollback | No | Environment-specific input | MISSING | No backup script or path exists in repository |
| Application log path | Yes | Absolute Windows directory with service write access | Operations/service host | No | Environment-specific input | MISSING | No logging destination or service wrapper is documented |
| API application port (`PORT`) | Yes | Decimal TCP port, e.g. `3001` only as the code default—not an approval | NestJS API listener and smoke test URL | No | Environment-specific input | MISSING | `apps/api/src/main.ts` uses `PORT`, defaulting to `3001`; no production port is approved |
| Web application port | Yes for web activation | Decimal TCP port | Next.js `next start` listener | No | Environment-specific input | MISSING | `apps/web/package.json` exposes `start`; no production port is declared |
| Service account | Yes for Windows service activation | Approved Windows identity | Windows service/process | No | Secret/identity input | MISSING | No service definition or account is present |
| Windows service name | Yes if installed as a service | Approved service identifier | Operations/service manager | No | Environment-specific input | MISSING | No service wrapper/configuration exists |
| Elevated access | Yes for installation/service/firewall/path setup | Administrator or delegated equivalent | Operations deployment | No | Operational authorization | MISSING | Required by supplied blocker list; no repository authority |
| Node.js runtime version | Yes | Approved supported Node.js version | API and web processes | Yes as policy, but not currently pinned | Environment-specific input | MISSING | `package.json` and workspace manifests do not pin a Node version |
| npm/package installation method | Yes | `npm ci` with committed `package-lock.json` | Dependency installation | Yes | No | AVAILABLE WITH WARNING | Root `package.json` defines npm workspaces and repository contains `package-lock.json`; no Windows install runbook exists |
| Built release artifacts | Yes | `apps/api/dist` and Next.js production build output | API/web startup | Generated artifacts should not be hand-edited or committed unless release policy says so | No | MISSING IN THIS CHECKOUT | API `start` runs `node dist/main.js`; web exposes `next build` and `next start` |
| PostgreSQL schema state | Yes | Database provisioned at certified release state | Prisma repositories/runtime | No | Environment-specific | MISSING | `prisma/schema.prisma`, migrations, and `prisma/baseline/` document schema sources; no production database is available |
| TLS/reverse proxy binding | Conditional | Approved certificate/proxy/hostname configuration | External Windows hosting layer | No | Secret/environment-specific | MISSING / UNDOCUMENTED | No proxy, certificate, hostname, or binding configuration exists |

No secret value, credential, path, hostname, port approval, or service account
has been printed or created.

## Known from repository

- The system is a monorepo containing a Next.js web app and NestJS API.
- Root build command:

  ```text
  npm run build
  ```

- API build and start commands:

  ```text
  npm run build --workspace @jaryan/api
  npm run start --workspace @jaryan/api
  ```

- Web build and start commands:

  ```text
  npm run build --workspace @jaryan/web
  npm run start --workspace @jaryan/web
  ```

- The API listens on `Number(process.env.PORT ?? 3001)`.
- The API requires `PRISMA_DIRECT_TCP_URL`; startup fails if it is absent.
- The API health endpoint is `GET /health` and returns `{ "status": "ok" }`.
- The release E2E test uses:
  - API process: `node dist/main.js`
  - API health URL: `http://127.0.0.1:<test-port>/health`
  - PostgreSQL TCP URL supplied through `PRISMA_DIRECT_TCP_URL`
- The repository contains no Windows service definition, NSSM/WinSW
  configuration, PowerShell activation script, backup script, log policy,
  reverse-proxy configuration, or approved production path.
- The repository does not pin the Node.js version.

## Must be provided by Operations

Operations must provide and approve, before activation:

1. Target Windows server.
2. Certified release artifact location and checksum verification method.
3. Absolute release directory.
4. PostgreSQL production TCP endpoint and credentials through the approved
   secret-management mechanism.
5. Database backup destination and a verified restore/check procedure.
6. API and web ports, firewall rules, and any reverse-proxy bindings.
7. Windows service account and service names.
8. Application log destination, retention, and access policy.
9. Approved Node.js/npm runtime versions.
10. Elevated-access operator or delegated installation authority.
11. The missing Windows activation runbook or an approved replacement procedure.

## Activation procedure

This is the maximum procedure that can be stated from repository evidence.
It is **not executable until the missing Operations parameters are supplied**.

1. Verify the deployment artifact corresponds exactly to certified HEAD
   `e810e41c1133a84eb07ff4f5c119cd93a9b32d92`.
2. On the approved Windows server, place the release in the approved release
   directory.
3. Configure `PRISMA_DIRECT_TCP_URL` using the approved secret/environment
   mechanism. Do not place it in committed files or command history.
4. Configure the approved API `PORT` and web port.
5. Confirm the approved Node.js/npm runtime and install dependencies using the
   committed lockfile.
6. Run the repository root build:

   ```text
   npm run build
   ```

7. Install or update the approved Windows service/process definitions using
   Operations' supplied service procedure.
8. Start the API and web processes using their workspace `start` commands.
9. Execute the smoke tests below and record outputs without recording secrets.
10. Declare activation complete only after Operations verifies service
    persistence, logs, firewall/reverse-proxy behavior, and database backup
    evidence.

The repository does not provide enough evidence to specify the Windows service
installation command, service recovery settings, startup account, or exact
process supervision command.

## Smoke-test procedure

Required repository-backed smoke test:

1. Request `GET http://127.0.0.1:<approved-api-port>/health`.
2. Require an HTTP success response with body:

   ```json
   {"status":"ok"}
   ```

3. Run the certified release E2E test only when Operations has supplied a
   disposable/approved PostgreSQL target and the required environment:

   ```text
   npm run release:e2e --workspace @jaryan/api
   ```

4. Verify the web application through its approved hostname/port and confirm
   that it loads the portal.
5. Confirm service restart recovery, log creation, and database connectivity
   according to the Operations-provided procedure.

The E2E test creates and removes test records. It must not be run against
production unless Operations explicitly provides an approved isolated test
scope and cleanup authorization.

## Rollback procedure

The repository does not contain an executable rollback script. The required
Operations rollback sequence is:

1. Stop the API and web services using the approved Windows service procedure.
2. Preserve service logs and the activation record.
3. Restore the pre-activation application release directory or point the
   service definitions to the last approved release.
4. Restore the database only if the approved change/backup procedure requires
   it; use the verified backup path and restore procedure supplied by
   Operations.
5. Restart services with the previous approved environment configuration.
6. Repeat the `/health` and web smoke tests.
7. Record the rollback result and any database restore activity.

No database restore, file replacement, service stop, or deployment action was
performed by this handoff task.

## Required permissions and prerequisites

Required but not available in this session:

- Administrator or delegated elevated access on the target Windows server.
- Permission to create/update/start Windows services.
- Permission to read the secret-management source for
  `PRISMA_DIRECT_TCP_URL`.
- Network access from the server to PostgreSQL.
- Firewall/reverse-proxy approval for the selected ports.
- Read/write access to the release and log directories.
- Backup/restore authority for the production database.
- Approved Node.js/npm runtime installation.
- An approved isolated smoke-test strategy.

## Handoff decision

**Do not activate yet.** The software release is reported certified, but the
production activation contract remains incomplete until the parameters marked
`MISSING` or `SECRET / MISSING` are supplied by Operations and the missing
Windows runbook is replaced by an approved procedure.
