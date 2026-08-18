import type { EngineeringCalculationResult } from './engineering-result.ts';

export type EngineeringPipelineStage =
  | 'INPUT'
  | 'VALIDATOR'
  | 'SOLVER'
  | 'DEMAND'
  | 'CAPACITY'
  | 'TRACEABILITY'
  | 'RESULT';

export const STANDARD_ENGINEERING_PIPELINE_STAGES: readonly EngineeringPipelineStage[] = [
  'INPUT',
  'VALIDATOR',
  'SOLVER',
  'DEMAND',
  'CAPACITY',
  'TRACEABILITY',
  'RESULT',
];

export interface EngineeringValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface EngineeringPipelineDefinition<TInput, TSolved> {
  readonly id: string;
  readonly description: string;
  readonly stages: readonly EngineeringPipelineStage[];
  readonly validate: (input: TInput) => readonly EngineeringValidationIssue[];
  readonly solve: (input: TInput) => TSolved | null;
  readonly produce: (solved: TSolved) => readonly EngineeringCalculationResult[];
}

export type EngineeringPipelineRunStatus =
  | 'INVALID'
  | 'COMPLETED'
  | 'REVIEW_REQUIRED';

export interface EngineeringPipelineRun<TInput, TSolved> {
  readonly pipelineId: string;
  readonly input: TInput;
  readonly issues: readonly EngineeringValidationIssue[];
  readonly solved: TSolved | null;
  readonly results: readonly EngineeringCalculationResult[];
  readonly status: EngineeringPipelineRunStatus;
}

export function defineEngineeringPipeline<TInput, TSolved>(input: {
  readonly id: string;
  readonly description: string;
  readonly validate: (value: TInput) => readonly EngineeringValidationIssue[];
  readonly solve: (value: TInput) => TSolved | null;
  readonly produce: (solved: TSolved) => readonly EngineeringCalculationResult[];
}): EngineeringPipelineDefinition<TInput, TSolved> {
  return {
    id: input.id,
    description: input.description,
    stages: STANDARD_ENGINEERING_PIPELINE_STAGES,
    validate: input.validate,
    solve: input.solve,
    produce: input.produce,
  };
}

export function runEngineeringPipeline<TInput, TSolved>(
  definition: EngineeringPipelineDefinition<TInput, TSolved>,
  input: TInput,
): EngineeringPipelineRun<TInput, TSolved> {
  const issues = definition.validate(input);
  const solved = issues.length === 0 ? definition.solve(input) : null;
  const results = solved === null ? [] : definition.produce(solved);
  const status =
    solved === null
      ? 'INVALID'
      : results.some(
          (result) =>
            result.status === 'UNVERIFIED' ||
            result.status === 'REVIEW_REQUIRED' ||
            result.reviewerRequired,
        )
        ? 'REVIEW_REQUIRED'
        : 'COMPLETED';
  return {
    pipelineId: definition.id,
    input,
    issues,
    solved,
    results,
    status,
  };
}