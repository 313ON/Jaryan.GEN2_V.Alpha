# Release-cutover database baseline

The release baseline is `prisma/baseline/20260826_release_cutover_baseline.sql`.
It provisions the verified application schema and the append-only snapshot
integrity function/triggers. It intentionally excludes Prisma development WAL
objects and other ephemeral infrastructure.

The historical migration directories remain unchanged evidence:

- `20260824120000_add_durable_calculation_snapshot`
- `20260826100000_scope_durable_calculation_snapshot_to_project`

They are not a clean reconstruction path and are not retroactively marked
applied by this baseline.

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

For a completely empty PostgreSQL database, execute the baseline SQL using a
disposable database connection, introspect the resulting public application
objects, canonicalize them with the rules above, and compare the resulting
fingerprint with the manifest fingerprint. This D10.7-A workspace has no
running disposable PostgreSQL target (`prisma dev ls` reports `default
not_running`, and no `psql` executable/service is available), so the database
execution/introspection proof is intentionally not claimed here.

The original schema creation history is unavailable. This release baseline records the verified schema state adopted at release cutover. It is authoritative only for future migrations from that cutover state and does not claim to represent historical schema creation.
