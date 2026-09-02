# Release-cutover database baseline

The release baseline is `prisma/baseline/20260826_release_cutover_baseline.sql`.
It provisions the verified application schema and the append-only snapshot
integrity function/triggers. It intentionally excludes Prisma development WAL
objects and other ephemeral infrastructure.

The historical migration directories remain unchanged evidence:

- `20260824120000_add_durable_calculation_snapshot`
- `20260826100000_scope_durable_calculation_snapshot_to_project`

They are not a clean reconstruction path. The reproducible empty-database
provisioning command applies this verified baseline and then uses Prisma's
`migrate resolve --applied` command for each historical migration, explicitly
reconciling migration history without pretending that either historical SQL
created the release schema:

```text
npm run db:provision:baseline
```

The command refuses to run when any application table or `_prisma_migrations`
table already exists. It requires both `DATABASE_URL` and
`PRISMA_DIRECT_TCP_URL` to resolve to the same direct target
`127.0.0.1:5432/jaryan_gen2`.

## Canonical fingerprint

`prisma/baseline/schema-manifest.json` is the canonical semantic
representation. Canonicalization recursively sorts object keys and preserves
array order only where the array is already semantically ordered; all
object collections in this manifest are stored in lexicographic order by
their stable identity. The fingerprint is the lowercase hexadecimal
`SHA-256` digest of the UTF-8 JSON serialization of the canonicalized
`scope` object. Provenance metadata is excluded from the schema fingerprint.

Included: public schema, eight application tables, columns, PostgreSQL types,
nullability, defaults, primary keys, unique constraints, indexes, foreign
keys and their delete/update actions, the snapshot mutation function, and its
two triggers.

Excluded: row data, Prisma `_prisma_migrations`, Prisma development WAL
schemas/tables/triggers, ownership/ACL metadata, statistics, sequences not
represented by the application schema, and formatting/whitespace.

Generate and repeat the fingerprint with:

```text
node scripts/verify-baseline-fingerprint.mjs
```

## Authority and reconstruction

Historical migrations are authoritative only as historical evidence. The
baseline SQL and manifest are authoritative for the verified release-cutover
state. Future migrations must start from this cutover state and must be
validated by introspecting the resulting database and comparing the
canonical representation/fingerprint, not only by a migration command exit
code.

For a completely empty PostgreSQL database, run `npm run db:provision:baseline`,
then introspect the resulting public application objects, canonicalize them
with the rules above, and compare the resulting fingerprint with the manifest
fingerprint. Future migrations start after this explicit cutover boundary.
The original schema creation history is unavailable. This release baseline records the verified schema state adopted at release cutover. It is authoritative only for future migrations from that cutover state and does not claim to represent historical schema creation.

## Recovery verification note

`npm run recovery:verify:local` validates a local custom-format backup by
restoring it into an isolated generated database, comparing row counts and
migration history, and comparing the restored catalog with the source
catalog. The current local recovery result is `PASS`.

The historical JSON manifest stores table columns in lexicographic order,
whereas PostgreSQL preserves the declaration order from the baseline SQL.
Because ordered table columns are intentionally fingerprint-sensitive, the
live source/restore fingerprint is distinct from the historical manifest
fingerprint. This is retained as a compatibility finding; it is not
production backup evidence and must not be silently normalized away.
