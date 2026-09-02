import 'dotenv/config';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = fileURLToPath(new URL('..', import.meta.url));
const baselinePath = fileURLToPath(new URL('../prisma/baseline/20260826_release_cutover_baseline.sql', import.meta.url));
const manifestPath = fileURLToPath(new URL('../prisma/baseline/schema-manifest.json', import.meta.url));
const requiredFiles = [
  'prisma/schema.prisma',
  'prisma.config.ts',
  'prisma/baseline/20260826_release_cutover_baseline.sql',
  'prisma/baseline/schema-manifest.json',
  'prisma/migrations/20260824120000_add_durable_calculation_snapshot/migration.sql',
  'prisma/migrations/20260826100000_scope_durable_calculation_snapshot_to_project/migration.sql',
  'apps/api/dist/main.js',
  'apps/web/.next/BUILD_ID',
];
const expectedTables = [
  'AuditLog',
  'Calculation',
  'DurableCalculationSnapshot',
  'Project',
  'ProjectMember',
  'Session',
  'Structure',
  'User',
];
const expectedMigrations = [
  '20260824120000_add_durable_calculation_snapshot',
  '20260826100000_scope_durable_calculation_snapshot_to_project',
];
const expectedIndexes = [
  'DurableCalculationSnapshot_projectId_createdAt_idx',
  'DurableCalculationSnapshot_projectId_snapshotId_idx',
  'DurableCalculationSnapshot_snapshotId_key',
  'ProjectMember_projectId_userId_key',
  'User_email_key',
];

function target(value, variableName) {
  if (!value) throw new Error(`${variableName} is missing.`);
  const url = new URL(value);
  const result = {
    protocol: url.protocol,
    host: url.hostname,
    port: Number(url.port || 5432),
    database: url.pathname.replace(/^\//, ''),
  };
  if (!['postgres:', 'postgresql:'].includes(result.protocol)
    || result.host !== '127.0.0.1'
    || result.port !== 5432
    || result.database !== 'jaryan_gen2') {
    throw new Error(`${variableName} must target 127.0.0.1:5432/jaryan_gen2.`);
  }
  return result;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

for (const relativePath of requiredFiles) {
  await access(`${root}${relativePath.replaceAll('/', '\\')}`);
}

const cliTarget = target(process.env.DATABASE_URL, 'DATABASE_URL');
const runtimeTarget = target(process.env.PRISMA_DIRECT_TCP_URL, 'PRISMA_DIRECT_TCP_URL');
if (JSON.stringify(cliTarget) !== JSON.stringify(runtimeTarget)) {
  throw new Error('DATABASE_URL and PRISMA_DIRECT_TCP_URL resolve to different targets.');
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const baseline = await readFile(baselinePath);
const baselineArtifactHash = createHash('sha256').update(baseline).digest('hex');
const manifestFingerprint = createHash('sha256')
  .update(JSON.stringify(canonicalize(manifest.scope)), 'utf8')
  .digest('hex');

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const tables = (await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  `)).rows.map((row) => row.table_name);
  if (JSON.stringify(tables) !== JSON.stringify([...expectedTables, '_prisma_migrations'].sort())) {
    throw new Error(`Unexpected public table set: ${tables.join(', ')}`);
  }

  const migrationRows = (await client.query(`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    ORDER BY finished_at
  `)).rows;
  const migrations = migrationRows.map((row) => row.migration_name);
  if (JSON.stringify(migrations) !== JSON.stringify(expectedMigrations)
    || migrationRows.some((row) => !row.finished_at || row.rolled_back_at)) {
    throw new Error(`Unexpected migration state: ${migrations.join(', ')}`);
  }

  const counts = (await client.query(`
    SELECT
      (SELECT count(*) FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = 'public' AND t.relname = ANY($1::text[])) AS constraints,
      (SELECT count(*) FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])
         AND indexname = ANY($2::text[])) AS indexes,
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'reject_durable_calculation_snapshot_mutation') AS functions,
      (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND NOT t.tgisinternal) AS triggers
  `, [expectedTables, expectedIndexes])).rows[0];
  if (Number(counts.constraints) !== 16 || Number(counts.indexes) !== 5
    || Number(counts.functions) !== 1 || Number(counts.triggers) !== 2) {
    throw new Error(`Unexpected catalog counts: ${JSON.stringify(counts)}`);
  }
} finally {
  await client.end();
}

console.log(JSON.stringify({
  status: 'PASS',
  scope: 'local-release-activation-preflight',
  target: '127.0.0.1:5432/jaryan_gen2',
  baselineArtifactHash,
  manifestFingerprint,
  tables: 8,
  constraints: 16,
  indexes: 5,
  functions: 1,
  triggers: 2,
  migrations: expectedMigrations,
  productionActivation: 'not performed',
}, null, 2));
