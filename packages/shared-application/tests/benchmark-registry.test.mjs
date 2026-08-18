import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allBenchmarksPassed,
  createDefaultEngineeringBenchmarkRegistry,
  createEngineeringBenchmarkRegistry,
  runSuperAdobeBenchmark001,
  SA_BENCH_001,
} from '@jaryan/shared-application';

test('empty registry has no benchmarks and no outcomes', () => {
  const registry = createEngineeringBenchmarkRegistry();
  assert.deepEqual(registry.benchmarks, []);
  assert.deepEqual(registry.runAll(), []);
  assert.equal(registry.get('SA-BENCH-001'), undefined);
});

test('registering a benchmark is immutable and idempotent in structure', () => {
  const empty = createEngineeringBenchmarkRegistry();
  const withBenchmark = empty.register({
    id: SA_BENCH_001.id,
    title: SA_BENCH_001.title,
    description: SA_BENCH_001.description,
    run: () => runSuperAdobeBenchmark001(),
  });

  assert.equal(empty.benchmarks.length, 0);
  assert.equal(withBenchmark.benchmarks.length, 1);
  assert.equal(withBenchmark.get('SA-BENCH-001')?.id, 'SA-BENCH-001');
});

test('default registry runs SA-BENCH-001 and it passes', () => {
  const registry = createDefaultEngineeringBenchmarkRegistry();
  const outcomes = registry.runAll();

  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].benchmarkId, 'SA-BENCH-001');
  assert.equal(outcomes[0].passed, true);
  assert.ok(outcomes[0].checks.length > 0);
  assert.equal(allBenchmarksPassed(outcomes), true);
});

test('allBenchmarksPassed is false when a benchmark fails', () => {
  const registry = createEngineeringBenchmarkRegistry([
    {
      id: 'SA-BENCH-001',
      title: 'SA-BENCH-001',
      description: 'benchmark',
      run: () => ({
        benchmarkId: 'SA-BENCH-001',
        passed: false,
        checks: [{ name: 'solver runs', passed: false, detail: 'failed' }],
      }),
    },
  ]);

  assert.equal(allBenchmarksPassed(registry.runAll()), false);
});

test('the registry defines an extension point for future domains', () => {
  const registry = createDefaultEngineeringBenchmarkRegistry();
  const extended = registry.register({
    id: 'STRUCT-BENCH-001',
    title: 'Future structural benchmark',
    description: 'Extension point placeholder; not a real benchmark.',
    run: () => ({
      benchmarkId: 'STRUCT-BENCH-001',
      passed: false,
      checks: [
        {
          name: 'not-implemented',
          passed: false,
          detail: 'Future structural benchmark has no implementation yet.',
        },
      ],
    }),
  });

  assert.equal(extended.benchmarks.length, 2);
  assert.equal(extended.get('SA-BENCH-001')?.id, 'SA-BENCH-001');
  assert.equal(extended.get('STRUCT-BENCH-001')?.id, 'STRUCT-BENCH-001');
  assert.equal(registry.benchmarks.length, 1);
});