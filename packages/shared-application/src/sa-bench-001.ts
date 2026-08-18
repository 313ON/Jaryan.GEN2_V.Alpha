import type { PrimitiveResult } from '@jaryan/shared-domain';
import { solveSuperAdobe } from './superadobe-solver.ts';

export const SA_BENCH_001 = {
  id: 'SA-BENCH-001',
  title: 'Deterministic circular-dome solver pipeline',
  system: 'superadobe',
  description:
    'A simple circular SuperAdobe dome self-weight pipeline: geometry solver, gravity load assembly, and initial compression, sliding and overturning checks. Validates deterministic repeatability, pipeline correctness and traceability. No external validation values are asserted; the benchmark validates internal consistency.',
  case: {
    projectId: 'benchmark-sa-bench-001',
    inputs: {
      innerDiameterM: 6,
      wallThicknessM: 0.4,
      bagWidthM: 0.45,
      rowHeightM: 0.3,
      domeHeightM: 3.6,
      geometryType: 'circular',
      compactedDensityKgM3: 1850,
    },
    lateralDemandKn: 40,
  },
} as const;

export interface BenchmarkCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface BenchmarkRun {
  readonly benchmarkId: string;
  readonly passed: boolean;
  readonly checks: readonly BenchmarkCheck[];
}

export function runSuperAdobeBenchmark001(): BenchmarkRun {
  const { case: benchmarkCase } = SA_BENCH_001;
  const checks: BenchmarkCheck[] = [];
  const check = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
  };

  const first = solveSuperAdobe(benchmarkCase);
  const second = solveSuperAdobe(benchmarkCase);

  check('solver runs', first !== null && second !== null, 'solver returned null');
  if (!first || !second) {
    return { benchmarkId: SA_BENCH_001.id, passed: false, checks };
  }

  check(
    'deterministic repeatability',
    JSON.stringify(first.geometry) === JSON.stringify(second.geometry) &&
      JSON.stringify(first.loads) === JSON.stringify(second.loads) &&
      JSON.stringify(first.calculations) === JSON.stringify(second.calculations) &&
      JSON.stringify(first.traceability) === JSON.stringify(second.traceability) &&
      JSON.stringify(first.summary) === JSON.stringify(second.summary),
    'geometry, loads, calculations, traceability and summary must be identical across runs',
  );

  const { geometry, loads, calculations, summary } = first;

  check(
    'geometry pipeline',
    geometry.rowCount === 12 &&
      geometry.rows[geometry.rows.length - 1].topElevationM === 3.6 &&
      Math.abs(geometry.totalMassT - sumOf(geometry.rows.map((row) => row.rowMassT))) < 0.05,
    `rowCount=${geometry.rowCount}, apex=3.6, totalMassT=${geometry.totalMassT}`,
  );

  const rowWeightResults = calculations.filter(
    (calculation) => calculation.calculationId === 'SA-ROW-WEIGHT-001',
  );
  const accumulated = calculations.find(
    (calculation) => calculation.calculationId === 'SA-ACC-WEIGHT-001',
  );
  const sumRowWeights = rowWeightResults.reduce(
    (sum, result) => sum + result.result.value,
    0,
  );

  check(
    'mass calculation',
    accumulated !== undefined &&
      Math.abs(accumulated.result.value - sumRowWeights) < 0.05 &&
      Math.abs(summary.totalWeightKn - geometry.totalMassT * 9.81) < 1,
    `totalWeightKn=${summary.totalWeightKn}, ΣrowWeights=${round(sumRowWeights, 2)}, mass·g=${round(geometry.totalMassT * 9.81, 2)}`,
  );

  check(
    'load assembly',
    loads.rowCount === 12 &&
      loads.loadCase.type === 'G' &&
      loads.loadEffect.axialForceKn === summary.totalWeightKn &&
      loads.rows.every(
        (row, index) => row.weightKn === rowWeightResults[index]?.result.value,
      ),
    `loadCase=${loads.loadCase.id}/${loads.loadCase.type}, rows=${loads.rowCount}, effect.axial=${loads.loadEffect.axialForceKn}`,
  );

  const verticalStress = calculations.find(
    (calculation) => calculation.calculationId === 'SA-VERT-STRESS-001',
  );
  const compression = calculations.find(
    (calculation) => calculation.calculationId === 'SA-COMPRESSION-CHECK-001',
  );
  const baseContact = calculations.find(
    (calculation) => calculation.calculationId === 'SA-CONTACT-AREA-001',
  );

  check(
    'compression check',
    verticalStress !== undefined &&
      compression !== undefined &&
      baseContact !== undefined &&
      Math.abs(
        verticalStress.result.value -
          summary.totalWeightKn / baseContact.result.value,
      ) < 0.01 &&
      compression.status === 'UNVERIFIED' &&
      compression.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED' &&
      compression.capacity === undefined,
    `σ=${verticalStress?.result.value ?? 'n/a'} kPa, check=${compression?.status ?? 'n/a'}`,
  );

  const sliding = calculations.find(
    (calculation) => calculation.calculationId === 'SA-SLIDING-CHECK-001',
  );

  check(
    'sliding check',
    sliding !== undefined &&
      sliding.status === 'UNVERIFIED' &&
      sliding.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED' &&
      sliding.inputs.lateralForceKn.value === benchmarkCase.lateralDemandKn,
    `lateral=${sliding?.inputs.lateralForceKn.value ?? 'n/a'} kN, check=${sliding?.status ?? 'n/a'}`,
  );

  const overturning = calculations.find(
    (calculation) => calculation.calculationId === 'SA-OVERTURNING-CHECK-001',
  );

  check(
    'overturning check',
    overturning !== undefined &&
      overturning.status === 'UNVERIFIED' &&
      overturning.review.reviewRequirement === 'HUMAN_REVIEW_REQUIRED' &&
      Math.abs(
        overturning.result.value - benchmarkCase.lateralDemandKn * summary.centerOfGravityM,
      ) < 0.01,
    `M_OT=${overturning?.result.value ?? 'n/a'} kN·m = H·z̄ = ${benchmarkCase.lateralDemandKn} × ${summary.centerOfGravityM}`,
  );

  check(
    'traceability',
    first.traceability.length === calculations.length &&
      first.traceability.every(
        (link) =>
          calculations.some(
            (calculation) => calculation.calculationId === link.calculationId,
          ) && link.assumptions.length > 0,
      ) &&
      calculations.every(calculationContractComplete),
    `links=${first.traceability.length}, calculations=${calculations.length}`,
  );

  check(
    'safety posture',
    first.humanReviewRequired &&
      first.status === 'REVIEW_REQUIRED' &&
      calculations
        .filter((calculation) =>
          ['SA-COMPRESSION-CHECK-001', 'SA-SLIDING-CHECK-001', 'SA-OVERTURNING-CHECK-001'].includes(
            calculation.calculationId,
          ),
        )
        .every((calculation) => calculation.status === 'UNVERIFIED'),
    `humanReviewRequired=${first.humanReviewRequired}, status=${first.status}`,
  );

  return {
    benchmarkId: SA_BENCH_001.id,
    passed: checks.every((entry) => entry.passed),
    checks,
  };
}

function calculationContractComplete(calculation: PrimitiveResult): boolean {
  return (
    calculation.calculationId.length > 0 &&
    calculation.method.length > 0 &&
    calculation.formula.length > 0 &&
    calculation.result.unit.length > 0 &&
    calculation.assumptions.length > 0 &&
    Object.values(calculation.inputs).every((input) => input.unit.length > 0)
  );
}

function sumOf(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}