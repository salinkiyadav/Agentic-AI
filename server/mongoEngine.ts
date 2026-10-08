import { Aggregator, Context } from 'mingo';
// Import mingo operators directly
import pipelineOps from 'mingo/operators/pipeline';
import queryOps from 'mingo/operators/query';
import exprOps from 'mingo/operators/expression';
import accumOps from 'mingo/operators/accumulator';
import projOps from 'mingo/operators/projection';

// Initialize context once
const context = Context.init({
  pipeline: pipelineOps,
  query: queryOps,
  expression: exprOps,
  accumulator: accumOps,
  projection: projOps,
});

export interface QueryExecutionResult {
  success: boolean;
  data: any[];
  executionTimeMs: number;
  docsExamined: number;
  docsReturned: number;
  error?: string;
}

export function executePipeline(
  collectionData: any[],
  pipeline: any[],
  timeoutMs: number = 3000
): QueryExecutionResult {
  const startTime = Date.now();
  const docsExamined = collectionData.length;

  try {
    // Clone pipeline to prevent any mutation
    const safePipeline = JSON.parse(JSON.stringify(pipeline));

    // Ensure documents limit doesn't blow up memory
    let hasLimit = false;
    for (const stage of safePipeline) {
      if (stage.$limit !== undefined) {
        hasLimit = true;
        if (stage.$limit > 1000) {
          stage.$limit = 1000;
        }
      }
    }

    // If no limit and no group/count aggregation, add safety limit
    const hasAggregatingStage = safePipeline.some(
      (s: any) => s.$group || s.$count || s.$bucket || s.$facet
    );
    if (!hasLimit && !hasAggregatingStage) {
      safePipeline.push({ $limit: 200 });
    }

    const aggregator = new Aggregator(safePipeline, { context });
    const rawResults = aggregator.run(collectionData);
    const results = Array.isArray(rawResults) ? rawResults : [rawResults];

    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      data: results,
      executionTimeMs,
      docsExamined,
      docsReturned: results.length,
    };
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      data: [],
      executionTimeMs,
      docsExamined,
      docsReturned: 0,
      error: err.message || 'Error executing MongoDB aggregation pipeline',
    };
  }
}
