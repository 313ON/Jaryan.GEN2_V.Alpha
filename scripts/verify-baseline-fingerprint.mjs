import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../prisma/baseline/schema-manifest.json', import.meta.url));
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

const canonicalRepresentation = JSON.stringify(canonicalize(manifest.scope));
const fingerprint = createHash('sha256').update(canonicalRepresentation, 'utf8').digest('hex');
const repeatFingerprint = createHash('sha256').update(canonicalRepresentation, 'utf8').digest('hex');

if (fingerprint !== repeatFingerprint) {
  throw new Error('Canonical fingerprint is not repeatable.');
}

console.log(JSON.stringify({
  algorithm: 'SHA-256',
  fingerprint,
  repeatable: true,
  canonicalRepresentation,
}, null, 2));
