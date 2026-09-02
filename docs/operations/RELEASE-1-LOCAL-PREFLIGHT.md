# Release-1 local activation preflight

This is a deterministic local verification gate for the release branch. It
does not activate production, install services, choose an Operations-approved
host, create a backup, or establish a rollback target.

Run after the release build and local schema provisioning:

```text
npm run release:preflight
```

The preflight verifies:

- the logical schema, baseline, manifest, historical migrations, and built API
  and web artifacts are present;
- `DATABASE_URL` and `PRISMA_DIRECT_TCP_URL` are direct PostgreSQL URLs for
  the same local target `127.0.0.1:5432/jaryan_gen2`;
- the live public catalog contains the eight application tables plus
  `_prisma_migrations`;
- all two historical migrations are finished and not rolled back;
- the expected 16 physical application constraints (8 primary keys and 8
  foreign keys), 5 application indexes, 1 function, and 2 triggers exist;
- the baseline artifact hash and manifest fingerprint are reproducible.

Production activation remains a separate Operations gate. Its approved
deployment target, secret injection, backup/restore, service, networking,
runtime policy, and rollback evidence must be supplied externally.
