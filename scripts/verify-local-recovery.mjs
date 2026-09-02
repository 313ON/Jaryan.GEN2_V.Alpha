import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  extractPostgresCatalog,
  fingerprintCanonicalScope,
  normalizeCatalogScope,
  verifyCatalogAgainstManifest,
} from '../packages/shared-infrastructure/dist/index.js';

const exec = promisify(execFile);
const { Client } = pg;
const root = fileURLToPath(new URL('..', import.meta.url));
const sourceUrl = process.env['DATABASE_URL'];
const binaryDirectory = process.env['PG_BIN_DIR'] ?? 'C:\\Program Files\\PostgreSQL\\17\\bin';
const outputDirectory = process.env['RECOVERY_OUTPUT_DIR']
  ?? `${root}artifacts\\recovery`;
const manifest = JSON.parse(await readFile(
  `${root}prisma\\baseline\\schema-manifest.json`,
  'utf8',
));

if (!sourceUrl) throw new Error('DATABASE_URL is required.');
const source = parseUrl(sourceUrl);
if (source.host !== '127.0.0.1' || source.port !== 5432 || source.database !== 'jaryan_gen2') {
  throw new Error('Recovery verification only permits the known local database 127.0.0.1:5432/jaryan_gen2.');
}

const stamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14);
const restoreDatabase = `jaryan_recovery_${stamp}`;
if (!/^jaryan_recovery_[0-9]{14}$/.test(restoreDatabase)) throw new Error('Invalid isolated restore database name.');
await mkdir(outputDirectory, { recursive: true });
const backupPath = `${outputDirectory}\\${restoreDatabase}.dump`;
const commandEnvironment = {
  ...process.env,
  PGPASSWORD: source.password,
  PGDATABASE: 'postgres',
};
const commonArgs = ['-h', source.host, '-p', String(source.port), '-U', source.user];

const sourceCounts = await readEvidence(sourceUrl);
await run('pg_dump.exe', [...commonArgs, '-d', source.database, '-Fc', '--no-owner', '--no-privileges', '-f', backupPath], commandEnvironment);
const backupHash = await sha256(backupPath);
await run('createdb.exe', [...commonArgs, restoreDatabase], commandEnvironment);

let restoreCounts;
try {
  await run('pg_restore.exe', [...commonArgs, '-d', restoreDatabase, '--no-owner', '--no-privileges', backupPath], commandEnvironment);
  restoreCounts = await readEvidence(withDatabase(sourceUrl, restoreDatabase));
} finally {
  await run('dropdb.exe', [...commonArgs, '--if-exists', restoreDatabase], commandEnvironment);
}

const backupSize = (await stat(backupPath)).size;
if (backupSize <= 0) throw new Error('Backup artifact is empty.');
if (JSON.stringify(sourceCounts.tables) !== JSON.stringify(restoreCounts.tables)
  || JSON.stringify(sourceCounts.rows) !== JSON.stringify(restoreCounts.rows)
  || JSON.stringify(sourceCounts.migrations) !== JSON.stringify(restoreCounts.migrations)) {
  throw new Error('Restored database evidence differs from the source database.');
}
const postRestoreSchemaMatch = sourceCounts.schemaFingerprint === restoreCounts.schemaFingerprint;
if (!postRestoreSchemaMatch) {
  throw new Error('Restored schema differs from the source schema.');
}

console.log(JSON.stringify({
  status: 'PASS',
  evidenceClass: 'LOCAL_RECOVERY_EVIDENCE',
  backupArtifact: backupPath,
  backupBytes: backupSize,
  backupSha256: backupHash,
  restoreTarget: restoreDatabase,
  restoreTargetLifecycle: 'created, validated, and removed',
  backup: 'PASS',
  restore: 'PASS',
  postRestoreSchema: 'PASS',
  baselineCompatibility: sourceCounts.schemaMatch ? 'PASS' : 'FINDING',
  postRestoreMigration: 'PASS',
  fingerprint: restoreCounts.fingerprint,
  dataIntegrity: 'PASS',
}, null, 2));

async function readEvidence(connectionString) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const catalog = await extractPostgresCatalog(client);
    const normalized = normalizeCatalogScope(catalog.scope);
    const verification = verifyCatalogAgainstManifest(
      manifest.scope,
      catalog.scope,
      {
        manifestIdentity: manifest.identity,
        baselineArtifact: 'prisma/baseline/20260826_release_cutover_baseline.sql',
        baselineArtifactHash: 'local-recovery',
        canonicalizerVersion: '1.0.0',
        normalizationPolicyVersion: '1.0.0',
        verifiedAt: new Date(0).toISOString(),
      },
    );
    const tables = (await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name
    `)).rows.map((row) => row.table_name);
    const rows = {};
    for (const table of manifest.scope.tables.map((item) => item.name)) {
      rows[table] = Number((await client.query(`SELECT count(*)::int AS count FROM "${table}"`)).rows[0].count);
    }
    const migrations = (await client.query(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations" ORDER BY finished_at
    `)).rows.map((row) => ({
      name: row.migration_name,
      finished: row.finished_at !== null,
      rolledBack: row.rolled_back_at !== null,
    }));
    return {
      tables,
      rows,
      migrations,
      schemaMatch: verification.match,
      schemaDifferences: verification.differences,
      schemaFingerprint: fingerprintCanonicalScope(normalized),
      fingerprint: fingerprintCanonicalScope(normalized),
    };
  } finally {
    await client.end();
  }
}

function parseUrl(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be PostgreSQL.');
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
  };
}

function withDatabase(sourceValue, database) {
  const url = new URL(sourceValue);
  url.pathname = `/${database}`;
  return url.toString();
}

async function run(command, args, env) {
  await exec(`${binaryDirectory}\\${command}`, args, {
    cwd: root,
    env,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}
