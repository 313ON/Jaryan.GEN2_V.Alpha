import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const execFileAsync = promisify(execFile);
const expectedMigrations = [
  '20260824120000_add_durable_calculation_snapshot',
  '20260826100000_scope_durable_calculation_snapshot_to_project',
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
const baselinePath = fileURLToPath(new URL('../prisma/baseline/20260826_release_cutover_baseline.sql', import.meta.url));

function assertTarget(value, variableName) {
  if (!value) throw new Error(`${variableName} is required.`);
  const url = new URL(value);
  const port = Number(url.port || 5432);
  const database = url.pathname.replace(/^\//, '');
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || url.hostname !== '127.0.0.1'
    || port !== 5432
    || database !== 'jaryan_gen2') {
    throw new Error(`${variableName} must target 127.0.0.1:5432/jaryan_gen2 using a direct PostgreSQL URL.`);
  }
}

assertTarget(process.env.DATABASE_URL, 'DATABASE_URL');
assertTarget(process.env.PRISMA_DIRECT_TCP_URL, 'PRISMA_DIRECT_TCP_URL');

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const existing = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name NOT LIKE 'pg_%'
    ORDER BY table_name
  `);
  const existingNames = existing.rows.map((row) => row.table_name);
  const baselineAlreadyPresent = existingNames.length === expectedTables.length
    && existingNames.every((name, index) => name === expectedTables[index]);
  if (existingNames.length > 0 && !baselineAlreadyPresent) {
    throw new Error(`Refusing to provision a non-empty or partial target: ${existingNames.join(', ')}`);
  }

  if (!baselineAlreadyPresent) {
    await client.query('BEGIN');
    try {
      await client.query(await readFile(baselinePath, 'utf8'));
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await client.end();
}

for (const migration of expectedMigrations) {
  await execFileAsync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'migrate', 'resolve', '--applied', migration],
    { env: process.env, shell: process.platform === 'win32', stdio: 'inherit' },
  );
}

console.log('Release baseline provisioned and historical migrations reconciled.');
