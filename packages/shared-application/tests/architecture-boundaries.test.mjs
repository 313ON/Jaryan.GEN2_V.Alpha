import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const applicationRoot = path.resolve(import.meta.dirname, '..');
const infrastructureRoot = path.resolve(applicationRoot, '..', 'shared-infrastructure');

function sourceFiles(root) {
  return fs
    .readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => path.join(root, 'src', entry));
}

test('application owns the snapshot port and has no infrastructure source dependency', () => {
  const applicationPackage = JSON.parse(
    fs.readFileSync(path.join(applicationRoot, 'package.json'), 'utf8'),
  );
  const infrastructurePackage = JSON.parse(
    fs.readFileSync(path.join(infrastructureRoot, 'package.json'), 'utf8'),
  );
  const applicationSource = sourceFiles(applicationRoot)
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');

  assert.equal(applicationPackage.dependencies['@jaryan/shared-infrastructure'], undefined);
  assert.equal(infrastructurePackage.dependencies['@jaryan/shared-application'], '0.1.0');
  assert.match(
    applicationSource,
    /from ['"]\.\/ports\/durable-calculation-snapshot-store\.ts['"]/,
  );
  assert.doesNotMatch(applicationSource, /@jaryan\/shared-infrastructure/);
});

test('infrastructure implements the application-owned snapshot port', () => {
  const storeSource = fs.readFileSync(
    path.join(infrastructureRoot, 'src', 'durable-calculation-snapshot-store.ts'),
    'utf8',
  );

  assert.match(
    storeSource,
    /import type \{ DurableCalculationSnapshotStore \} from '@jaryan\/shared-application'/,
  );
  assert.match(
    storeSource,
    /implements DurableCalculationSnapshotStore/,
  );
});
