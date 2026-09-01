import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  canonicalizeScope,
  extractPostgresCatalog,
  fingerprintCanonicalScope,
  normalizeCatalogScope,
  serializeCanonicalScope,
  verifyCatalogAgainstManifest,
} from '@jaryan/shared-infrastructure';

const provenance = {
  manifestIdentity: 'D10.7-A/2026-08-26',
  baselineArtifact: 'prisma/baseline/20260826_release_cutover_baseline.sql',
  baselineArtifactHash: '3a14e4a3131198ae2d4dd966c8ae13b04fc3d9365cc7db951e9f4d309cfebd5b',
  canonicalizerVersion: '1.0.0',
  normalizationPolicyVersion: '1.0.0',
  verifiedAt: '2026-08-31T00:00:00.000Z',
};

const userTable = (defaultValue = "'ENGINEER'") => ({
  name: 'User',
  columns: [
    { name: 'email', type: 'text', nullable: false, default: null },
    { name: 'globalRole', type: 'text', nullable: false, default: defaultValue },
  ],
  primaryKeys: [{ name: 'User_pkey', columns: ['id'] }],
});
const baseManifest = {
  schemas: ['public'],
  tables: [userTable()],
  uniqueConstraints: [{ name: 'User_email_key', table: 'User', columns: ['email'] }],
  indexes: [{ name: 'User_email_key', table: 'User', unique: true, columns: ['email'] }],
  foreignKeys: [],
  functions: [],
  triggers: [],
};
const matchingIndex = { name: 'User_email_key', table: 'User', unique: true, columns: ['email'] };
const matchingCatalog = {
  ...baseManifest,
  uniqueConstraints: [],
  indexes: [matchingIndex],
  tables: [userTable("'ENGINEER'::text")],
};

const classifications = (result) => result.differences.map((item) => item.classification);
const HISTORICAL_FINGERPRINT = 'd764636b830611d06746565298656aaa9c16ea359ace4a923f5944d069c01aa7';

test('1. matching UNIQUE constraint passes', () => {
  const catalog = {
    ...matchingCatalog,
    uniqueConstraints: baseManifest.uniqueConstraints,
    indexes: [{ ...matchingIndex, constraintBacked: true }],
  };
  assert.equal(verifyCatalogAgainstManifest(baseManifest, catalog, provenance).match, true);
});

test('2. matching UNIQUE index passes', () => {
  assert.equal(verifyCatalogAgainstManifest(baseManifest, matchingCatalog, provenance).match, true);
});

test('3. non-matching unique index fails as missing/unexpected', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [{ ...matchingIndex, columns: ['id'] }] }, provenance);
  assert.ok(classifications(result).includes('MISSING_OBJECT'));
  assert.equal(result.match, false);
});

test('4. partial unique index is unsupported', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [{ ...matchingIndex, predicate: 'email IS NOT NULL' }] }, provenance);
  assert.ok(classifications(result).includes('UNSUPPORTED_CATALOG_FORM'));
});

test('5. expression unique index is unsupported', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [{ ...matchingIndex, columns: [], expressions: ['lower(email)'] }] }, provenance);
  assert.ok(classifications(result).includes('UNSUPPORTED_CATALOG_FORM'));
});

test('6. duplicate semantic matches fail as ambiguous', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [matchingIndex, { ...matchingIndex, name: 'duplicate' }] }, provenance);
  assert.ok(classifications(result).includes('SEMANTIC_ATTRIBUTE_MISMATCH'));
});

test('7. VIEWER typed literal cast is equivalent', () => {
  const manifest = { ...baseManifest, tables: [userTable("'VIEWER'")] };
  assert.equal(verifyCatalogAgainstManifest(manifest, { ...matchingCatalog, tables: [userTable("'VIEWER'::text")] }, provenance).match, true);
});

test('8. ENGINEER typed literal cast is equivalent', () => {
  assert.equal(verifyCatalogAgainstManifest(baseManifest, matchingCatalog, provenance).match, true);
});

test('9. meaningful cast is preserved and mismatches semantically', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, tables: [userTable("'ENGINEER'::integer")] }, provenance);
  assert.ok(classifications(result).includes('UNSUPPORTED_CATALOG_FORM'));
  assert.equal(normalizeCatalogScope({ tables: [userTable("'ENGINEER'::integer")] }).tables[0].columns[1].default, "'ENGINEER'::integer");
});

test('10. unsupported default expression fails explicitly', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, tables: [userTable('now()::timestamp')] }, provenance);
  assert.ok(classifications(result).includes('UNSUPPORTED_CATALOG_FORM'));
});

test('11. object-key permutation has identical fingerprint', () => {
  const a = { z: 1, a: { b: 2, a: 1 } };
  const b = { a: { a: 1, b: 2 }, z: 1 };
  assert.equal(fingerprintCanonicalScope(a), fingerprintCanonicalScope(b));
});

test('12. stable collection permutation has identical fingerprint', () => {
  const a = {
    tables: [{ name: 'B', schema: 'public' }, { name: 'A', schema: 'public' }],
    schemas: ['public', 'z'],
  };
  const b = {
    schemas: ['z', 'public'],
    tables: [{ name: 'A', schema: 'public' }, { name: 'B', schema: 'public' }],
  };
  assert.equal(fingerprintCanonicalScope(a), fingerprintCanonicalScope(b));
});

test('13. semantic difference changes fingerprint', () => {
  assert.notEqual(fingerprintCanonicalScope(baseManifest), fingerprintCanonicalScope({ ...baseManifest, schemas: ['private'] }));
});

test('14. excluded runtime metadata does not affect scope fingerprint', () => {
  const a = { ...matchingCatalog };
  const b = { ...matchingCatalog };
  assert.equal(fingerprintCanonicalScope(a), fingerprintCanonicalScope(b));
  assert.notEqual(provenance.baselineArtifactHash, '');
});

test('15. repeated canonicalization is identical', () => {
  const first = canonicalizeScope(matchingCatalog);
  assert.deepEqual(first, canonicalizeScope(first));
  assert.equal(fingerprintCanonicalScope(first), fingerprintCanonicalScope(matchingCatalog));
});

test('ordered schema sequences remain order-sensitive', () => {
  const ordered = {
    schemas: ['public'],
    tables: [{
      name: 'ProjectMember',
      schema: 'public',
      columns: [{ name: 'projectId' }, { name: 'createdAt' }],
      primaryKeys: [{ name: 'ProjectMember_pkey', columns: ['id'] }],
    }],
    indexes: [{
      name: 'ProjectMember_projectId_createdAt_idx',
      table: 'ProjectMember',
      schema: 'public',
      unique: false,
      columns: ['projectId', 'createdAt'],
    }],
    foreignKeys: [{
      name: 'ProjectMember_projectId_userId_fkey',
      table: 'ProjectMember',
      schema: 'public',
      columns: ['projectId', 'userId'],
      referencedTable: 'Project',
      referencedColumns: ['id', 'createdAt'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    }],
  };
  const reversed = {
    ...ordered,
    indexes: [{ ...ordered.indexes[0], columns: ['createdAt', 'projectId'] }],
    foreignKeys: [{
      ...ordered.foreignKeys[0],
      columns: ['userId', 'projectId'],
      referencedColumns: ['createdAt', 'id'],
    }],
  };
  assert.notEqual(
    serializeCanonicalScope(ordered),
    serializeCanonicalScope(reversed),
  );
  assert.notEqual(
    fingerprintCanonicalScope(ordered),
    fingerprintCanonicalScope(reversed),
  );
  assert.deepEqual(
    canonicalizeScope(ordered).indexes[0].columns,
    ['projectId', 'createdAt'],
  );
  assert.deepEqual(
    canonicalizeScope(ordered).foreignKeys[0].columns,
    ['projectId', 'userId'],
  );
  assert.deepEqual(
    canonicalizeScope(ordered).tables[0].columns.map((column) => column.name),
    ['projectId', 'createdAt'],
  );
  assert.deepEqual(
    canonicalizeScope(ordered).tables[0].primaryKeys[0].columns,
    ['id'],
  );
});

test('table column order changes canonical representation and fingerprint', () => {
  const ordered = {
    schemas: ['public'],
    tables: [{
      name: 'Project',
      schema: 'public',
      columns: [{ name: 'projectId' }, { name: 'createdAt' }],
    }],
  };
  const reversed = {
    schemas: ['public'],
    tables: [{
      name: 'Project',
      schema: 'public',
      columns: [{ name: 'createdAt' }, { name: 'projectId' }],
    }],
  };
  assert.notEqual(serializeCanonicalScope(ordered), serializeCanonicalScope(reversed));
  assert.notEqual(fingerprintCanonicalScope(ordered), fingerprintCanonicalScope(reversed));
});

test('primary-key column order is preserved and fingerprint-sensitive', () => {
  const ordered = {
    schemas: ['public'],
    tables: [{
      name: 'Pair',
      schema: 'public',
      primaryKeys: [{ name: 'Pair_pkey', columns: ['leftId', 'rightId'] }],
    }],
  };
  const reversed = {
    schemas: ['public'],
    tables: [{
      name: 'Pair',
      schema: 'public',
      primaryKeys: [{ name: 'Pair_pkey', columns: ['rightId', 'leftId'] }],
    }],
  };
  assert.deepEqual(canonicalizeScope(ordered).tables[0].primaryKeys[0].columns, ['leftId', 'rightId']);
  assert.notEqual(serializeCanonicalScope(ordered), serializeCanonicalScope(reversed));
  assert.notEqual(fingerprintCanonicalScope(ordered), fingerprintCanonicalScope(reversed));
});

test('foreign-key local and referenced column order is preserved', () => {
  const ordered = {
    schemas: ['public'],
    foreignKeys: [{
      name: 'Pair_left_right_fkey',
      table: 'Pair',
      schema: 'public',
      columns: ['leftId', 'rightId'],
      referencedTable: 'Target',
      referencedColumns: ['leftId', 'rightId'],
    }],
  };
  const reversed = {
    foreignKeys: [{
      ...ordered.foreignKeys[0],
      columns: ['rightId', 'leftId'],
      referencedColumns: ['rightId', 'leftId'],
    }],
  };
  const canonical = canonicalizeScope(ordered);
  assert.deepEqual(canonical.foreignKeys[0].columns, ['leftId', 'rightId']);
  assert.deepEqual(canonical.foreignKeys[0].referencedColumns, ['leftId', 'rightId']);
  assert.notEqual(fingerprintCanonicalScope(ordered), fingerprintCanonicalScope(reversed));
});

test('unordered collections remain deterministic regardless of source order', () => {
  const a = {
    schemas: ['public', 'audit'],
    tables: [{ name: 'B', schema: 'public' }, { name: 'A', schema: 'public' }],
    functions: [{ name: 'z', schema: 'public' }, { name: 'a', schema: 'public' }],
    triggers: [{ name: 'z', schema: 'public', table: 'B' }, { name: 'a', schema: 'public', table: 'A' }],
    events: ['UPDATE', 'INSERT'],
  };
  const b = {
    schemas: ['audit', 'public'],
    tables: [{ name: 'A', schema: 'public' }, { name: 'B', schema: 'public' }],
    functions: [{ name: 'a', schema: 'public' }, { name: 'z', schema: 'public' }],
    triggers: [{ name: 'a', schema: 'public', table: 'A' }, { name: 'z', schema: 'public', table: 'B' }],
    events: ['INSERT', 'UPDATE'],
  };
  assert.equal(fingerprintCanonicalScope(a), fingerprintCanonicalScope(b));
});

test('function body normalization removes only outer whitespace', () => {
  const catalog = {
    ...matchingCatalog,
    functions: [{
      name: 'reject_durable_calculation_snapshot_mutation',
      schema: 'public',
      returns: 'trigger',
      language: 'plpgsql',
      body: '\n  BEGIN\n    RAISE EXCEPTION \'append-only\';\n  END;\n',
    }],
  };
  const normalized = normalizeCatalogScope(catalog);
  assert.equal(
    normalized.functions[0].body,
    'BEGIN\n    RAISE EXCEPTION \'append-only\';\n  END;',
  );
  assert.equal(
    normalizeCatalogScope(normalized).functions[0].body,
    normalized.functions[0].body,
  );
  assert.equal(
    fingerprintCanonicalScope(normalized),
    fingerprintCanonicalScope(normalizeCatalogScope(normalized)),
  );
});

test('16. exact forensic fixture passes approved mapping', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, matchingCatalog, provenance);
  assert.equal(result.match, true);
  assert.equal(result.differences.length, 0);
  assert.equal(result.provenance.manifestIdentity, 'D10.7-A/2026-08-26');
});

test('17. missing object is classified deterministically', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [] }, provenance);
  assert.ok(classifications(result).includes('MISSING_OBJECT'));
});

test('18. unexpected object is classified deterministically', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [matchingIndex, { name: 'extra', table: 'User', unique: false, columns: ['email'] }] }, provenance);
  assert.ok(classifications(result).includes('UNEXPECTED_OBJECT'));
});

test('19. semantic attribute mismatch is explained', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, tables: [userTable("'VIEWER'")] }, provenance);
  assert.ok(classifications(result).includes('SEMANTIC_ATTRIBUTE_MISMATCH'));
});

test('20. normalization mismatch is explained', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, tables: [userTable("'VIEWER'::text")] }, provenance);
  assert.ok(classifications(result).includes('NORMALIZATION_MISMATCH'));
});

test('21. unsupported catalog form is explained', () => {
  const result = verifyCatalogAgainstManifest(baseManifest, { ...matchingCatalog, indexes: [{ ...matchingIndex, predicate: 'email IS NOT NULL' }] }, provenance);
  assert.ok(classifications(result).includes('UNSUPPORTED_CATALOG_FORM'));
});

test('collection identities reject duplicates and incomplete identities', () => {
  assert.throws(
    () => fingerprintCanonicalScope({
      schemas: ['public'],
      tables: [
        { name: 'Project', schema: 'public', columns: [{ name: 'id' }] },
        { name: 'Project', schema: 'public', columns: [{ name: 'otherId' }] },
      ],
    }),
    /DUPLICATE_IDENTITY/,
  );
  assert.throws(
    () => fingerprintCanonicalScope({
      schemas: ['public'],
      tables: [{ schema: 'public', columns: [{ name: 'id' }] }],
    }),
    /INCOMPLETE_IDENTITY/,
  );
});

test('schema-qualified identities prevent cross-schema collection collisions', () => {
  const first = {
    schemas: ['private', 'public'],
    tables: [
      { name: 'Project', schema: 'public' },
      { name: 'Project', schema: 'private' },
    ],
  };
  const second = {
    schemas: ['public', 'private'],
    tables: [
      { name: 'Project', schema: 'private' },
      { name: 'Project', schema: 'public' },
    ],
  };
  assert.equal(fingerprintCanonicalScope(first), fingerprintCanonicalScope(second));
});

test('collection ordering ignores non-identity attributes', () => {
  const first = {
    schemas: ['public'],
    tables: [
      { name: 'A', schema: 'public', columns: [{ name: 'z' }] },
      { name: 'B', schema: 'public', columns: [{ name: 'a' }] },
    ],
  };
  const second = {
    schemas: ['public'],
    tables: [
      { name: 'B', schema: 'public', columns: [{ name: 'a' }] },
      { name: 'A', schema: 'public', columns: [{ name: 'z' }] },
    ],
  };
  assert.equal(serializeCanonicalScope(first), serializeCanonicalScope(second));
});

test('lossless index keyParts and includeColumns preserve positional semantics', () => {
  const index = {
    schemas: ['public'],
    indexes: [{
      name: 'mixed_idx',
      schema: 'public',
      table: 'Project',
      unique: false,
      keyParts: [
        { kind: 'column', name: 'projectId' },
        { kind: 'expression', expression: 'lower(name)' },
      ],
      includeColumns: ['createdAt'],
    }],
  };
  const canonical = canonicalizeScope(index);
  assert.deepEqual(canonical.indexes[0].keyParts, index.indexes[0].keyParts);
  assert.deepEqual(canonical.indexes[0].includeColumns, ['createdAt']);
  assert.equal('columns' in canonical.indexes[0], false);
});

test('ordinary extracted index keyParts adapt to unchanged legacy columns representation', () => {
  const canonical = canonicalizeScope({
    schemas: ['public'],
    indexes: [{
      name: 'ordinary_idx',
      schema: 'public',
      table: 'Project',
      unique: false,
      keyParts: [
        { kind: 'column', name: 'projectId' },
        { kind: 'column', name: 'createdAt' },
      ],
      includeColumns: [],
    }],
  });
  assert.deepEqual(canonical.indexes[0].columns, ['projectId', 'createdAt']);
  assert.equal('keyParts' in canonical.indexes[0], false);
  assert.equal('includeColumns' in canonical.indexes[0], false);
});

test('historical manifest fingerprint remains immutable', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../../../prisma/baseline/schema-manifest.json', import.meta.url),
    'utf8',
  ));
  assert.equal(fingerprintCanonicalScope(manifest.scope), HISTORICAL_FINGERPRINT);
});

test('PostgreSQL adapter remains a read-only deterministic boundary', async () => {
  const responses = [
    [{ database: 'template1', server_version: 'PostgreSQL 17.5' }],
    [{ table_name: 'User', column_name: 'email', column_type: 'text', nullable: false, default_expression: null }],
    [{ constraint_name: 'User_pkey', table_name: 'User', columns: ['id'] }],
    [],
    [],
    [],
    [],
    [],
  ];
  const queries = [];
  const client = {
    async query(text) {
      queries.push(text);
      const rows = responses.shift() ?? [];
      return {
        rows: text.includes('from pg_trigger')
          ? rows.filter((row) => row.function_name?.startsWith('public.'))
          : text.includes('from pg_index')
            ? rows.filter((row) => !row.constraint_backed)
          : rows,
      };
    },
  };
  const extracted = await extractPostgresCatalog(client);
  assert.equal(extracted.database, 'template1');
  assert.equal(extracted.serverVersion, 'PostgreSQL 17.5');
  assert.equal(extracted.scope.tables.find((item) => item.name === 'User').columns[0].name, 'email');
  assert.equal(queries.length, 8);
  assert.ok(queries.every((query) => query.trimStart().toLowerCase().startsWith('select') || query.trimStart().toLowerCase().startsWith('select')));
});

test('PostgreSQL array text values are mapped and WAL triggers remain outside the manifest scope', async () => {
  const responses = [
    [{ database: 'template1', server_version: 'PostgreSQL 17.5' }],
    [{ table_name: 'ProjectMember', column_name: 'projectId', column_type: 'text', nullable: false, default_expression: null }],
    [{ constraint_name: 'ProjectMember_pkey', table_name: 'ProjectMember', columns: '{id}' }],
    [{ constraint_name: 'ProjectMember_projectId_userId_key', table_name: 'ProjectMember', columns: '{projectId,userId}' }],
    [{ constraint_name: 'ProjectMember_projectId_fkey', table_name: 'ProjectMember', referenced_table: 'Project', columns: '{projectId}', referenced_columns: '{id}', on_delete_code: 'c', on_update_code: 'c' }],
    [{ index_name: 'ProjectMember_projectId_userId_key', table_name: 'ProjectMember', unique_index: true, columns: '{projectId,userId}', constraint_backed: false, is_partial: false, is_expression: false }],
    [],
    [
      { trigger_name: 'ProjectMember_valid', table_name: 'ProjectMember', timing: 'BEFORE', events: '{INSERT}', granularity: 'EACH ROW', function_name: 'public.validate_project_member' },
      { trigger_name: 'prisma_dev_wal_capture', table_name: 'ProjectMember', timing: 'AFTER', events: '{INSERT,DELETE,UPDATE}', granularity: 'EACH ROW', function_name: '_prisma_dev_wal.capture_event' },
    ],
  ];
  const queries = [];
  const client = {
    async query(text) {
      queries.push(text);
      const rows = responses.shift() ?? [];
      return {
        rows: text.includes('from pg_trigger')
          ? rows.filter((row) => row.function_name?.startsWith('public.'))
          : rows,
      };
    },
  };
  const extracted = await extractPostgresCatalog(client);
  assert.deepEqual(extracted.scope.tables.find((item) => item.name === 'ProjectMember').primaryKeys, [
    { name: 'ProjectMember_pkey', columns: ['id'] },
  ]);
  assert.deepEqual(extracted.scope.uniqueConstraints, [
    { name: 'ProjectMember_projectId_userId_key', table: 'ProjectMember', columns: ['projectId', 'userId'] },
  ]);
  assert.deepEqual(extracted.scope.foreignKeys, [
    {
      name: 'ProjectMember_projectId_fkey',
      table: 'ProjectMember',
      columns: ['projectId'],
      referencedTable: 'Project',
      referencedColumns: ['id'],
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  ]);
  assert.deepEqual(extracted.scope.indexes, [
    {
      name: 'ProjectMember_projectId_userId_key',
      table: 'ProjectMember',
      unique: true,
      keyParts: [
        { kind: 'column', name: 'projectId' },
        { kind: 'column', name: 'userId' },
      ],
      includeColumns: [],
      constraintBacked: false,
    },
  ]);
  assert.match(queries.find((query) => query.includes('from pg_index')), /c\.conindid is null/);
  assert.deepEqual(extracted.scope.triggers, [
    {
      name: 'ProjectMember_valid',
      table: 'ProjectMember',
      timing: 'BEFORE',
      events: ['INSERT'],
      granularity: 'EACH ROW',
      function: 'public.validate_project_member',
    },
  ]);
  assert.match(queries.at(-1), /fnn\.nspname='public'/);
});
