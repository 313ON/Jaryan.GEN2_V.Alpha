import 'dotenv/config';
import { access, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('..', import.meta.url));
const expectedBranch = 'release/release-1-recut-2026-09-01';
const expectedFiles = [
  'package-lock.json',
  'prisma/schema.prisma',
  'prisma.config.ts',
  'prisma/baseline/20260826_release_cutover_baseline.sql',
  'prisma/baseline/schema-manifest.json',
  'apps/api/dist/main.js',
  'apps/web/.next/BUILD_ID',
];

function state(ok, evidence, action = '') {
  return { state: ok ? 'PASS' : 'READY_PENDING_EXTERNAL_GATE', evidence, action };
}

async function exists(relativePath) {
  try {
    await access(`${root}${relativePath.replaceAll('/', '\\')}`);
    return true;
  } catch {
    return false;
  }
}

async function git(args) {
  const result = await exec('git', args, { cwd: root });
  return result.stdout.trim();
}

const branch = await git(['branch', '--show-current']);
const head = await git(['rev-parse', 'HEAD']);
const status = await git(['status', '--porcelain']);
const tag = await git(['tag', '--points-at', 'HEAD']);
const manifest = JSON.parse(await readFile(
  `${root}prisma/baseline/schema-manifest.json`,
  'utf8',
));
const manifestFingerprint = createHash('sha256')
  .update(JSON.stringify(canonicalize(manifest.scope)), 'utf8')
  .digest('hex');

const artifactReady = (await Promise.all(expectedFiles.map(exists))).every(Boolean);
const localTarget = process.env['DATABASE_URL']?.includes('127.0.0.1:5432/jaryan_gen2')
  && process.env['PRISMA_DIRECT_TCP_URL']?.includes('127.0.0.1:5432/jaryan_gen2');

const gates = {
  'Release artifact': state(artifactReady, artifactReady
    ? 'Committed lockfile, schema authority, baseline, and production build outputs are present.'
    : 'One or more required release/build artifacts are absent.',
    'Build the release artifact and record its checksum.'),
  'Git state': state(branch === expectedBranch && status === '', {
    branch,
    expectedBranch,
    head,
    clean: status === '',
    tagAtHead: tag || null,
  }, 'Operations must approve the exact SHA/tag used for activation.'),
  'Local database evidence': state(Boolean(localTarget), localTarget
    ? 'Environment variables identify the verified local PostgreSQL target.'
    : 'No verified local target was identified from the environment.',
    'Provide an authorized target and run the read-only migration/schema checks.'),
  'Secrets injection': state(false,
    'Secret names are documented; no values or provider configuration are present.',
    'Operations must inject PRISMA_DIRECT_TCP_URL and DATABASE_URL through an approved provider.'),
  'Backup and restore': state(false,
    'No production backup artifact or restore record is present.',
    'Operations must create a backup and verify an isolated restore before deployment.'),
  'Service and networking': state(false,
    'No approved Windows service, hostname, TLS, reverse proxy, firewall, or log policy is present.',
    'Operations must approve and record the hosting topology and process supervision.'),
  'Operations approval': state(false,
    'Approval is an external authority boundary and is not represented in Git.',
    'Operations must approve the handoff package and activation window.'),
};

console.log(JSON.stringify({
  status: Object.values(gates).every((gate) => gate.state === 'PASS')
    ? 'PASS'
    : 'READY_PENDING_EXTERNAL_GATE',
  milestone: 'Production Activation Gate',
  branch,
  head,
  manifestFingerprint,
  gates,
}, null, 2));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [
      key,
      canonicalize(value[key]),
    ]));
  }
  return value;
}
