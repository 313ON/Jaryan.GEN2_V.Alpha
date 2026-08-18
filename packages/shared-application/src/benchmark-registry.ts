import { runSuperAdobeBenchmark001, SA_BENCH_001 } from './sa-bench-001.ts';

export interface EngineeringBenchmarkCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface EngineeringBenchmarkOutcome {
  readonly benchmarkId: string;
  readonly passed: boolean;
  readonly checks: readonly EngineeringBenchmarkCheck[];
}

export interface EngineeringBenchmark {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly run: () => EngineeringBenchmarkOutcome;
}

export interface EngineeringBenchmarkRegistry {
  readonly benchmarks: readonly EngineeringBenchmark[];
  readonly get: (benchmarkId: string) => EngineeringBenchmark | undefined;
  readonly register: (
    benchmark: EngineeringBenchmark,
  ) => EngineeringBenchmarkRegistry;
  readonly runAll: () => readonly EngineeringBenchmarkOutcome[];
}

export function createEngineeringBenchmarkRegistry(
  benchmarks: readonly EngineeringBenchmark[] = [],
): EngineeringBenchmarkRegistry {
  return {
    benchmarks,
    get: (benchmarkId) =>
      benchmarks.find((benchmark) => benchmark.id === benchmarkId),
    register: (benchmark) =>
      createEngineeringBenchmarkRegistry([...benchmarks, benchmark]),
    runAll: () => benchmarks.map((benchmark) => benchmark.run()),
  };
}

const SUPERADOBE_BENCHMARK: EngineeringBenchmark = {
  id: SA_BENCH_001.id,
  title: SA_BENCH_001.title,
  description: SA_BENCH_001.description,
  run: () => runSuperAdobeBenchmark001(),
};

export function createDefaultEngineeringBenchmarkRegistry(): EngineeringBenchmarkRegistry {
  return createEngineeringBenchmarkRegistry([SUPERADOBE_BENCHMARK]);
}

export function allBenchmarksPassed(
  outcomes: readonly EngineeringBenchmarkOutcome[],
): boolean {
  return outcomes.length > 0 && outcomes.every((outcome) => outcome.passed);
}