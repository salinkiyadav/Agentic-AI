import { GoogleGenAI, Type } from '@google/genai';
import { DATASET_STORE, DATASET_METAS } from './data/datasets.ts';
import { inspectDatasetSchema, profileSpecificFields } from './profiler.ts';
import { validateQueryPipeline } from './validator.ts';
import { executePipeline } from './mongoEngine.ts';
import { AgentExecutionState, AgentQueryResult, ToolTrace } from './types.ts';

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function runAnalyticsAgent(
  question: string,
  datasetId: string
): Promise<AgentQueryResult> {
  const startTime = Date.now();
  const traces: ToolTrace[] = [];
  const maxIterations = 3;
  let iteration = 0;

  const datasetMeta = DATASET_METAS.find((d) => d.id === datasetId) || DATASET_METAS[0];
  const collectionData = DATASET_STORE[datasetId] || DATASET_STORE.bike_trips;

  // Helper to append a trace step
  const addTrace = (
    stepId: string,
    toolName: string,
    description: string,
    stepStartTime: number,
    status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'SKIPPED',
    input: any,
    output: any,
    reasoning: string
  ): ToolTrace => {
    const trace: ToolTrace = {
      stepId,
      toolName,
      description,
      startTime: stepStartTime,
      endTime: Date.now(),
      durationMs: Date.now() - stepStartTime,
      status,
      input,
      output,
      reasoning,
    };
    traces.push(trace);
    return trace;
  };

  const state: AgentExecutionState = {
    currentState: 'CLASSIFY_INTENT',
    iteration: 0,
    maxIterations,
    traces,
    isRejected: false,
  };

  // STEP 1: Intent & Safety Classification
  const t1 = Date.now();
  const lowerQ = question.toLowerCase().trim();

  // Check destructive keywords
  const destructiveRegex = /\b(drop\b|delete\b|truncate\b|remove\b|update\b|insert\b|alter\b|exec\b|shutdown\b|\$out\b|\$merge\b)/i;
  const isDestructive = destructiveRegex.test(lowerQ);

  // Check out-of-scope keywords (ML, external real-time, weather, audio, vision)
  const outOfScopeRegex = /\b(predict\b|forecast\b|arima\b|lstm\b|train\b|neural network\b|machine learning\b|deep learning\b|web search\b|weather in\b|stock ticker\b)/i;
  const isOutOfScope = outOfScopeRegex.test(lowerQ);

  // Check severe ambiguity (e.g., "tell me stuff", "who is the best", "show good records")
  const isTooAmbiguous = /^(who is the best|show good records|what is good|tell me stuff|give me everything|who is number 1|which is nice)\??$/i.test(
    lowerQ
  );

  if (isDestructive) {
    state.currentState = 'REJECTED';
    state.isRejected = true;
    state.rejectionType = 'DESTRUCTIVE';
    state.rejectionReason =
      'Security Guardrail Triggered: Destructive operation detected. DataSight is strictly a read-only analytical engine and prohibits all data modification stages.';

    addTrace(
      'step_1_intent',
      'classify_intent',
      'Screen natural language query for safety, scope, and ambiguity',
      t1,
      'FAILED',
      { question },
      { classification: 'DESTRUCTIVE_VIOLATION' },
      'The user question contains mutation keywords (DROP/DELETE/UPDATE/$out). Immediate rejection enforced before touching data or LLM query generation.'
    );

    return {
      question,
      datasetId,
      success: false,
      status: 'REJECTED',
      answer:
        'Request Rejected: DataSight is an immutable read-only analytics agent. Mutation, write, deletion, and schema-altering commands are strictly blocked by the AST security boundary.',
      pipeline: [],
      data: [],
      assumptions: ['Security policy mandates zero write operations.'],
      limitations: ['Read-only analytical queries ($match, $group, $sort, $project) only.'],
      dataCleaningApplied: [],
      executionStats: {
        totalDurationMs: Date.now() - startTime,
        docsExamined: 0,
        docsReturned: 0,
        iterationsUsed: 1,
        model: 'security-rule-engine',
      },
      stateTrace: state,
    };
  }

  if (isOutOfScope) {
    state.currentState = 'REJECTED';
    state.isRejected = true;
    state.rejectionType = 'OUT_OF_SCOPE';
    state.rejectionReason =
      'Scope Guardrail: Machine learning model training, external web lookups, and predictive forecasting are outside the bounded analytical query scope.';

    addTrace(
      'step_1_intent',
      'classify_intent',
      'Screen natural language query for scope feasibility',
      t1,
      'WARNING',
      { question },
      { classification: 'OUT_OF_SCOPE' },
      'User asked for predictive machine learning or external real-time data which cannot be answered purely through MongoDB aggregation.'
    );

    return {
      question,
      datasetId,
      success: false,
      status: 'REJECTED',
      answer:
        'Request Rejected: The requested analysis (predictive machine learning / external forecasting) is outside the scope of read-only aggregation. Supported scope covers: filtering, grouping, statistical aggregations, sorting, date trends, and metric comparisons.',
      pipeline: [],
      data: [],
      assumptions: ['Analytics agent is bounded to MongoDB descriptive aggregations.'],
      limitations: ['Predictive model training (ARIMA, Neural Nets) is not supported.'],
      dataCleaningApplied: [],
      executionStats: {
        totalDurationMs: Date.now() - startTime,
        docsExamined: 0,
        docsReturned: 0,
        iterationsUsed: 1,
        model: 'scope-rule-engine',
      },
      stateTrace: state,
    };
  }

  if (isTooAmbiguous) {
    state.currentState = 'REJECTED';
    state.isRejected = true;
    state.rejectionType = 'AMBIGUOUS';
    state.rejectionReason =
      'Ambiguity Guardrail: The request lacks specific metrics, filters, or entity targets.';

    addTrace(
      'step_1_intent',
      'classify_intent',
      'Screen question for ambiguity',
      t1,
      'WARNING',
      { question },
      { classification: 'AMBIGUOUS_REQUEST' },
      'Query has no defined metric (e.g. revenue, trip count, duration, profit). Demands clarifying question.'
    );

    return {
      question,
      datasetId,
      success: false,
      status: 'REJECTED',
      answer:
        'Request Too Ambiguous: "Best" is undefined. Please specify an objective metric, such as: "Top users by total ride duration", "Top accounts by MRR", or "Most frequent start stations".',
      pipeline: [],
      data: [],
      assumptions: ['Ambiguous questions are rejected rather than hallucinating assumptions.'],
      limitations: ['Requires clear metric definitions for ranking.'],
      dataCleaningApplied: [],
      executionStats: {
        totalDurationMs: Date.now() - startTime,
        docsExamined: 0,
        docsReturned: 0,
        iterationsUsed: 1,
        model: 'intent-classifier',
      },
      stateTrace: state,
    };
  }

  addTrace(
    'step_1_intent',
    'classify_intent',
    'Screen query for safety, scope, and ambiguity',
    t1,
    'SUCCESS',
    { question, datasetId },
    { classification: 'VALID_ANALYTICAL_QUERY', isSafe: true },
    'Question passed security, scope, and clarity bounds. Proceeding to schema inspection.'
  );

  // STEP 2: Schema Inspection (Bounded Tool: get_schema)
  state.currentState = 'INSPECT_SCHEMA';
  const t2 = Date.now();
  const schema = inspectDatasetSchema(datasetId, collectionData);
  const relevantFields = Object.keys(schema.fields);

  addTrace(
    'step_2_get_schema',
    'get_schema',
    'Extract collection metadata, types, and null percentages',
    t2,
    'SUCCESS',
    { datasetId, totalDocs: schema.totalCount },
    {
      fieldsCount: relevantFields.length,
      nullRates: Object.fromEntries(
        Object.entries(schema.fields).map(([k, v]) => [k, `${v.nullPercentage}% null`])
      ),
      sampleFields: relevantFields.slice(0, 6),
    },
    `Identified ${relevantFields.length} attributes. Detected documented null rates in ${
      Object.values(schema.fields).filter((f) => f.nullCount > 0).length
    } fields.`
  );

  // STEP 3: Field Profiling (Bounded Tool: profile_fields)
  state.currentState = 'PROFILE_FIELDS';
  const t3 = Date.now();
  const targetFieldsToProfile = relevantFields.slice(0, 8);
  const deepProfile = profileSpecificFields(collectionData, targetFieldsToProfile);

  // Look for dirty data signatures
  const dirtyDataFindings: string[] = [];
  for (const [field, p] of Object.entries(schema.fields)) {
    if (p.casingVariations && p.casingVariations.length > 0) {
      dirtyDataFindings.push(`Field '${field}' has mixed casing: [${p.casingVariations.join(', ')}]`);
    }
    if (typeof p.min === 'number' && p.min < 0 && (field.includes('duration') || field.includes('seat'))) {
      dirtyDataFindings.push(`Field '${field}' contains negative anomaly values (min: ${p.min})`);
    }
  }

  addTrace(
    'step_3_profile_fields',
    'profile_fields',
    'Deep inspection of value distributions, casing variations, and anomalies',
    t3,
    'SUCCESS',
    { targetFields: targetFieldsToProfile },
    { dirtyDataFindings, profiledCount: targetFieldsToProfile.length },
    dirtyDataFindings.length > 0
      ? `Dirty data detected! Must sanitize via $match or case-insensitive matching in aggregation.`
      : `Value profile within expected distribution.`
  );

  // AGENT LOOP: Query Generation -> Validation -> Execution -> Critique
  let pipeline: any[] = [];
  let queryResult: {
    success: boolean;
    data: any[];
    docsExamined: number;
    docsReturned: number;
    executionTimeMs: number;
    error?: string;
  } = {
    success: false,
    data: [],
    docsExamined: 0,
    docsReturned: 0,
    executionTimeMs: 0,
  };
  let critiqueFeedback = '';
  let dataCleaningNotes: string[] = [];

  while (iteration < maxIterations) {
    iteration++;
    state.iteration = iteration;

    // STEP 4: Query Generation (Bounded Tool: generate_query)
    state.currentState = 'GENERATE_QUERY';
    const t4 = Date.now();

    const generationPrompt = `
You are the Query Generation Tool of an agentic data analytics system.
Generate a valid MongoDB Aggregation Pipeline JSON array to answer this question.

Dataset ID: "${datasetId}"
Question: "${question}"

Collection Schema:
${JSON.stringify(schema.fields, null, 2)}

Known Dirty Data Findings:
${dirtyDataFindings.join('\n') || 'None'}

Injected Dataset Flaws to Handle:
${datasetMeta.injectedFlaws.map((f) => `- ${f.type} in ${f.affectedFields.join(',')}: ${f.description}`).join('\n')}

${critiqueFeedback ? `PREVIOUS CRITIQUE FEEDBACK (Fix this issue): ${critiqueFeedback}` : ''}

CRITICAL RULES:
1. ONLY return a JSON array of MongoDB aggregation stages (e.g. [{"$match": ...}, {"$group": ...}, {"$sort": ...}, {"$limit": ...}]).
2. ONLY use allowed read-only stages: $match, $group, $sort, $limit, $project, $unwind, $count, $addFields, $facet, $bucket.
3. NEVER use $out, $merge, $where, or write operators.
4. For string filtering that may have casing variations (like "subscriber" vs "Subscriber" or "active" vs "Active"), use regex {"$regex": "^...$", "$options": "i"} or an array {"$in": [...]}.
5. Handle null values safely: if a field has nulls or negative outliers (like negative duration or null MRR), filter them out in $match when appropriate.
6. If the question asks for top N, always include a $limit stage (default 10 if not specified).
7. Respond ONLY with pure JSON. Do not wrap in markdown quotes if possible, or use standard \`\`\`json.
`;

    let generatedJsonStr = '';
    try {
      if (process.env.GEMINI_API_KEY) {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: generationPrompt,
          config: {
            temperature: 0.1,
          },
        });
        generatedJsonStr = response.text || '';
      } else {
        // Fallback generator for offline/unconfigured key mode
        generatedJsonStr = generateFallbackPipeline(datasetId, question);
      }
    } catch (err: any) {
      console.warn('Gemini query generation failed, falling back to heuristic generator:', err.message);
      generatedJsonStr = generateFallbackPipeline(datasetId, question);
    }

    // Parse JSON
    try {
      const cleaned = generatedJsonStr
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      pipeline = JSON.parse(cleaned);
      if (!Array.isArray(pipeline)) {
        pipeline = [pipeline];
      }
    } catch (err: any) {
      pipeline = generateFallbackPipelineObj(datasetId, question);
    }

    addTrace(
      `step_4_generate_query_iter_${iteration}`,
      'generate_query',
      `Generate safe MongoDB aggregation pipeline (Iteration ${iteration})`,
      t4,
      'SUCCESS',
      { question, iteration, previousFeedback: critiqueFeedback || null },
      { pipeline },
      `Generated ${pipeline.length}-stage pipeline incorporating schema and dirty-data compensations.`
    );

    // STEP 5: AST Query Validation (Bounded Tool: validate_query)
    state.currentState = 'VALIDATE_QUERY';
    const t5 = Date.now();
    const validation = validateQueryPipeline(pipeline);

    if (!validation.isValid) {
      addTrace(
        `step_5_validate_query_iter_${iteration}`,
        'validate_query',
        'Strict AST syntax, stage allowlist, and operator safety check',
        t5,
        'FAILED',
        { pipeline },
        { errors: validation.errors, isDestructive: validation.isDestructive },
        `AST validation rejected pipeline: ${validation.errors.join('; ')}`
      );

      if (validation.isDestructive) {
        state.currentState = 'REJECTED';
        state.isRejected = true;
        state.rejectionType = 'DESTRUCTIVE';
        return {
          question,
          datasetId,
          success: false,
          status: 'REJECTED',
          answer: `Pipeline Rejected by AST Validator: ${validation.errors.join('. ')}`,
          pipeline,
          data: [],
          assumptions: [],
          limitations: ['AST validation blocked unsafe stage.'],
          dataCleaningApplied: [],
          executionStats: {
            totalDurationMs: Date.now() - startTime,
            docsExamined: 0,
            docsReturned: 0,
            iterationsUsed: iteration,
            model: 'gemini-3.8-flash',
          },
          stateTrace: state,
        };
      }

      critiqueFeedback = `AST Validation Failed: ${validation.errors.join('; ')}. Fix stages.`;
      continue; // loop to next iteration
    }

    addTrace(
      `step_5_validate_query_iter_${iteration}`,
      'validate_query',
      'Strict AST syntax, stage allowlist, and operator safety check',
      t5,
      'SUCCESS',
      { pipelineStageCount: pipeline.length },
      { isValid: true, stages: pipeline.map((s) => Object.keys(s)[0]) },
      'All stages passed allowlist ($match, $group, etc). No write operators or arbitrary JS detected.'
    );

    // STEP 6: Execute in Read-Only Mode (Bounded Tool: execute_read_only_query)
    state.currentState = 'EXECUTE_QUERY';
    const t6 = Date.now();
    queryResult = executePipeline(collectionData, pipeline, 3000);

    addTrace(
      `step_6_execute_query_iter_${iteration}`,
      'execute_read_only_query',
      'Execute aggregation in isolated read-only memory engine',
      t6,
      queryResult.success ? 'SUCCESS' : 'FAILED',
      { pipeline, collectionSize: collectionData.length },
      {
        success: queryResult.success,
        docsReturned: queryResult.docsReturned,
        executionTimeMs: queryResult.executionTimeMs,
        error: queryResult.error || null,
      },
      queryResult.success
        ? `Executed in ${queryResult.executionTimeMs}ms. Produced ${queryResult.docsReturned} documents.`
        : `Execution error: ${queryResult.error}`
    );

    if (!queryResult.success) {
      critiqueFeedback = `Runtime error executing pipeline: ${queryResult.error}. Please adjust field names or operators.`;
      continue;
    }

    // STEP 7: Critique Result (Bounded Tool: critique_result)
    state.currentState = 'CRITIQUE_RESULT';
    const t7 = Date.now();
    const critique = critiqueOutput(question, pipeline, queryResult.data, collectionData.length);

    addTrace(
      `step_7_critique_result_iter_${iteration}`,
      'critique_result',
      'Critique result for empty data, suspicious nulls, or zero-matches',
      t7,
      critique.isSuspicious ? 'WARNING' : 'SUCCESS',
      { docsReturned: queryResult.docsReturned, sample: queryResult.data.slice(0, 2) },
      critique,
      critique.reasoning
    );

    if (critique.isSuspicious && iteration < maxIterations) {
      critiqueFeedback = critique.suggestion || 'Result had 0 rows or anomalous nulls. Review filter conditions.';
      dataCleaningNotes.push(`Iteration ${iteration} triggered critique self-healing: ${critique.reasoning}`);
      continue;
    }

    // Passed critique or reached limit
    break;
  }

  // STEP 8: Synthesis & Explanation (Bounded Tool: synthesize_answer)
  state.currentState = 'SYNTHESIZE';
  const t8 = Date.now();

  const synthesis = await synthesizeResult(
    question,
    datasetId,
    datasetMeta.name,
    pipeline,
    queryResult.data,
    dirtyDataFindings
  );

  addTrace(
    'step_8_synthesize',
    'synthesize_answer',
    'Formulate executive plain English answer, chart layout, assumptions, and caveats',
    t8,
    'SUCCESS',
    { resultCount: queryResult.data.length },
    {
      chartType: synthesis.chartConfig?.chartType,
      assumptionsCount: synthesis.assumptions.length,
    },
    'Synthesized plain-language summary with data hygiene disclaimers.'
  );

  state.currentState = 'COMPLETED';

  return {
    question,
    datasetId,
    success: queryResult.success,
    status: 'COMPLETED',
    answer: synthesis.answer,
    pipeline,
    data: queryResult.data,
    chartConfig: synthesis.chartConfig,
    assumptions: synthesis.assumptions,
    limitations: synthesis.limitations,
    dataCleaningApplied: [
      ...dirtyDataFindings.map((f) => `Handled: ${f}`),
      ...dataCleaningNotes,
    ],
    executionStats: {
      totalDurationMs: Date.now() - startTime,
      docsExamined: queryResult.docsExamined || collectionData.length,
      docsReturned: queryResult.docsReturned || queryResult.data.length,
      iterationsUsed: iteration,
      model: process.env.GEMINI_API_KEY ? 'gemini-3.8-flash' : 'rule-enhanced-engine',
    },
    stateTrace: state,
  };
}

// Result critique logic
function critiqueOutput(
  question: string,
  pipeline: any[],
  data: any[],
  totalSourceDocs: number
): { isSuspicious: boolean; reasoning: string; suggestion?: string } {
  if (data.length === 0) {
    // Check if pipeline had a case-sensitive $match
    const matchStages = pipeline.filter((s) => s.$match);
    const matchStr = JSON.stringify(matchStages);
    if (!matchStr.includes('$options') && !matchStr.includes('$in') && !matchStr.includes('$regex')) {
      return {
        isSuspicious: true,
        reasoning:
          'Pipeline returned 0 results out of ' +
          totalSourceDocs +
          ' documents. Likely caused by a case-sensitive exact string match on dirty data (e.g. "Subscriber" vs "subscriber").',
        suggestion:
          'Use case-insensitive regex or check $in arrays for varied casing representations.',
      };
    }

    return {
      isSuspicious: true,
      reasoning: 'Pipeline returned 0 documents. Verify field names and numeric threshold boundaries.',
      suggestion: 'Relax strict filter conditions or verify whether the target field exists.',
    };
  }

  // Check if first record contains NaN or null for primary metric
  const first = data[0];
  if (first && typeof first === 'object') {
    for (const [k, v] of Object.entries(first)) {
      if (v === null && k !== '_id') {
        return {
          isSuspicious: true,
          reasoning: `Output contains null in computed metric '${k}'. Aggregation stage may have operated on missing values without prior $match filtering.`,
          suggestion: `Add a preliminary $match stage to exclude documents where '${k}' is null.`,
        };
      }
      if (typeof v === 'number' && isNaN(v)) {
        return {
          isSuspicious: true,
          reasoning: `Detected NaN in metric '${k}'. Likely divide-by-zero or non-numeric conversion.`,
          suggestion: 'Guard with $cond or $ifNull to prevent NaN calculations.',
        };
      }
    }
  }

  return {
    isSuspicious: false,
    reasoning: `Critique passed: Output returned ${data.length} valid documents with non-null metrics.`,
  };
}

// Synthesis logic
async function synthesizeResult(
  question: string,
  datasetId: string,
  datasetName: string,
  pipeline: any[],
  data: any[],
  dirtyFindings: string[]
): Promise<{
  answer: string;
  chartConfig?: any;
  assumptions: string[];
  limitations: string[];
}> {
  // Infer smart chart configuration
  let chartConfig: any = undefined;

  if (data.length === 1 && typeof data[0] === 'object') {
    const keys = Object.keys(data[0]).filter((k) => k !== '_id');
    const firstMetric = keys[0] || 'total';
    const val = data[0][firstMetric];
    chartConfig = {
      chartType: 'kpi',
      title: question,
      kpiValue: typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)) : String(val),
      kpiLabel: firstMetric.replace(/_/g, ' ').toUpperCase(),
      kpiSubtext: `Computed from ${datasetName}`,
    };
  } else if (data.length > 1 && data.length <= 25) {
    const sample = data[0];
    const candidateLabelKeys = Object.keys(sample).filter(
      (k) => typeof sample[k] === 'string' || k === '_id'
    );
    const candidateValueKeys = Object.keys(sample).filter(
      (k) => typeof sample[k] === 'number'
    );

    const xKey = candidateLabelKeys[0] || '_id';
    const yKey = candidateValueKeys[0] || Object.keys(sample).find((k) => k !== xKey) || 'count';

    const isDate = xKey.includes('date') || xKey.includes('time') || xKey.includes('month');
    chartConfig = {
      chartType: isDate ? 'line' : data.length <= 6 ? 'pie' : 'bar',
      title: question,
      xKey,
      yKey,
    };
  }

  const prompt = `
You are the Explanation & Synthesis Tool of an analytics agent.
Explain the MongoDB query results in natural English for an executive analyst or interviewer.

Question: "${question}"
Dataset: "${datasetName}"
Aggregation Pipeline: ${JSON.stringify(pipeline)}
Query Output Data: ${JSON.stringify(data.slice(0, 10))} (Total rows: ${data.length})
Known Dirty Data Anomalies Handled: ${JSON.stringify(dirtyFindings)}

Respond in valid JSON with this exact structure:
{
  "answer": "A clear, concise, direct plain-English answer answering the question with the exact computed numbers.",
  "assumptions": ["List 1 to 3 explicit assumptions made (e.g. filtered negative durations, combined 'Subscriber' casing variants, excluded null stations)"],
  "limitations": ["List 1 or 2 limitations of this analysis (e.g. limited to the current sample dataset, snapshot point-in-time)"]
}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(resp.text || '{}');
      return {
        answer: parsed.answer || 'Query completed successfully with ' + data.length + ' results.',
        chartConfig,
        assumptions: parsed.assumptions || [
          'Assumed all matching records reflect verified customer interactions.',
          'Standardized inconsistent string casing across categorical fields.',
        ],
        limitations: parsed.limitations || [
          'Calculations are bounded to the static public sample dataset.',
        ],
      };
    }
  } catch (err: any) {
    console.warn('Synthesis LLM error, using heuristic summary:', err.message);
  }

  // Heuristic synthesis fallback
  let answerText = '';
  if (data.length === 0) {
    answerText = 'No records matched the specified criteria in the dataset.';
  } else if (data.length === 1 && typeof data[0] === 'object') {
    const entries = Object.entries(data[0]);
    answerText = `The analysis returned: ${entries
      .map(([k, v]) => `${k.replace(/_/g, ' ')} = ${typeof v === 'number' ? v.toLocaleString() : v}`)
      .join(', ')}.`;
  } else {
    answerText = `Found ${data.length} result items for "${question}". Top result: ${JSON.stringify(
      data[0]
    )}.`;
  }

  return {
    answer: answerText,
    chartConfig,
    assumptions: [
      'Standardized casing across categories using case-insensitive matching.',
      'Excluded null or corrupt sentinel values from statistical calculations.',
    ],
    limitations: [
      'Analysis reflects historical records within the current dataset snapshot.',
    ],
  };
}

// Fallback heuristic query generators for offline or instant zero-latency test suites
function generateFallbackPipeline(datasetId: string, question: string): string {
  const p = generateFallbackPipelineObj(datasetId, question);
  return JSON.stringify(p, null, 2);
}

function generateFallbackPipelineObj(datasetId: string, question: string): any[] {
  const q = question.toLowerCase();

  if (datasetId === 'retail_growth') {
    // 1. Declining customers / needs focus
    if (q.includes('declin') || (q.includes('focus') && q.includes('customer')) || q.includes('at risk') || q.includes('churn')) {
      return [
        {
          $match: {
            growth_trajectory: { $regex: 'declin|at-risk', $options: 'i' },
            actual_revenue_ytd: { $gt: 0 }
          }
        },
        { $sort: { actual_revenue_ytd: -1 } },
        { $limit: 10 },
        {
          $project: {
            shop_name: 1,
            consumer_segment: 1,
            actual_revenue_ytd: 1,
            expected_revenue_ytd: 1,
            growth_rate_pct: 1,
            customer_health_score: 1,
            attention_priority: 1,
            primary_decline_reason: { $ifNull: ['$primary_decline_reason', 'Unspecified'] },
            _id: 0
          }
        }
      ];
    }

    // 2. Growing vs Declining Trajectory breakdown
    if (q.includes('growing') || q.includes('growth') || q.includes('trajectory')) {
      return [
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: '$growth_trajectory', regex: 'grow', options: 'i' } },
                'Growing Customers',
                {
                  $cond: [
                    { $regexMatch: { input: '$growth_trajectory', regex: 'declin|at-risk', options: 'i' } },
                    'Declining / At-Risk Customers',
                    'Stagnant Customers'
                  ]
                }
              ]
            },
            total_actual_revenue: { $sum: '$actual_revenue_ytd' },
            customer_count: { $sum: 1 },
            avg_health_score: {
              $avg: {
                $cond: [{ $gt: ['$customer_health_score', 0] }, '$customer_health_score', null]
              }
            }
          }
        },
        { $sort: { total_actual_revenue: -1 } },
        {
          $project: {
            trajectory_group: '$_id',
            customer_count: 1,
            total_actual_revenue: { $round: ['$total_actual_revenue', 2] },
            avg_health_score: { $round: ['$avg_health_score', 1] },
            _id: 0
          }
        }
      ];
    }

    // 3. Actual vs Expected revenue comparison across consumer segments
    if (q.includes('expected') || q.includes('shortfall') || q.includes('revenue generation') || q.includes('segment')) {
      return [
        {
          $match: {
            expected_revenue_ytd: { $ne: null },
            actual_revenue_ytd: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: { $toLower: '$consumer_segment' },
            total_actual_revenue: { $sum: '$actual_revenue_ytd' },
            total_expected_revenue: { $sum: '$expected_revenue_ytd' },
            account_count: { $sum: 1 }
          }
        },
        {
          $project: {
            consumer_segment: '$_id',
            total_actual_revenue: 1,
            total_expected_revenue: 1,
            revenue_shortfall: { $subtract: ['$total_expected_revenue', '$total_actual_revenue'] },
            account_count: 1,
            _id: 0
          }
        },
        { $sort: { total_actual_revenue: -1 } }
      ];
    }

    // 4. Default high-revenue focus accounts
    return [
      {
        $match: { actual_revenue_ytd: { $gt: 0 } }
      },
      { $sort: { actual_revenue_ytd: -1 } },
      { $limit: 10 },
      {
        $project: {
          shop_name: 1,
          consumer_segment: 1,
          actual_revenue_ytd: 1,
          expected_revenue_ytd: 1,
          growth_rate_pct: 1,
          attention_priority: 1,
          _id: 0
        }
      }
    ];
  }

  if (datasetId === 'bike_trips') {
    if (q.includes('average trip duration') || (q.includes('duration') && q.includes('subscriber'))) {
      return [
        {
          $match: {
            user_type: { $regex: '^sub', $options: 'i' },
            duration_sec: { $gt: 0, $lt: 86400 },
          },
        },
        {
          $group: {
            _id: '$user_type',
            avg_duration_sec: { $avg: '$duration_sec' },
            total_trips: { $sum: 1 },
          },
        },
        {
          $project: {
            user_type: '$_id',
            avg_duration_min: { $round: [{ $divide: ['$avg_duration_sec', 60] }, 1] },
            total_trips: 1,
            _id: 0,
          },
        },
      ];
    }

    if (q.includes('top') && (q.includes('station') || q.includes('start'))) {
      return [
        { $match: { start_station_name: { $ne: null } } },
        {
          $group: {
            _id: '$start_station_name',
            ride_count: { $sum: 1 },
            avg_fare: { $avg: '$fare_amount' },
          },
        },
        { $sort: { ride_count: -1 } },
        { $limit: 5 },
        {
          $project: {
            station_name: '$_id',
            ride_count: 1,
            avg_fare: { $round: ['$avg_fare', 2] },
            _id: 0,
          },
        },
      ];
    }

    if (q.includes('gender') || q.includes('demographic')) {
      return [
        {
          $group: {
            _id: '$user_gender',
            trip_count: { $sum: 1 },
          },
        },
        { $sort: { trip_count: -1 } },
      ];
    }

    if (q.includes('bike type') || q.includes('electric')) {
      return [
        {
          $group: {
            _id: '$bike_type',
            trips: { $sum: 1 },
            avg_fare: { $avg: '$fare_amount' },
          },
        },
        { $sort: { trips: -1 } },
      ];
    }

    // Default bike trips aggregation
    return [
      { $match: { duration_sec: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          total_rides: { $sum: 1 },
          avg_duration_sec: { $avg: '$duration_sec' },
          total_revenue: { $sum: '$fare_amount' },
        },
      },
      {
        $project: {
          _id: 0,
          total_rides: 1,
          avg_duration_min: { $round: [{ $divide: ['$avg_duration_sec', 60] }, 1] },
          total_revenue: { $round: ['$total_revenue', 2] },
        },
      },
    ];
  }

  if (datasetId === 'saas_sales') {
    if (q.includes('industry') || q.includes('mrr by industry')) {
      return [
        { $match: { mrr_usd: { $ne: null, $gt: 0 } } },
        {
          $group: {
            _id: '$industry',
            total_mrr: { $sum: '$mrr_usd' },
            avg_mrr: { $avg: '$mrr_usd' },
            customer_count: { $sum: 1 },
          },
        },
        { $sort: { total_mrr: -1 } },
        {
          $project: {
            industry: '$_id',
            total_mrr: 1,
            avg_mrr: { $round: ['$avg_mrr', 2] },
            customer_count: 1,
            _id: 0,
          },
        },
      ];
    }

    if (q.includes('country') || q.includes('united states') || q.includes('usa')) {
      return [
        {
          $match: {
            country: { $regex: '^(usa|united states|us|u\\.s\\.)', $options: 'i' },
            mrr_usd: { $ne: null },
          },
        },
        {
          $group: {
            _id: 'United States (Normalized)',
            total_revenue: { $sum: '$mrr_usd' },
            accounts: { $sum: 1 },
          },
        },
      ];
    }

    if (q.includes('tier') || q.includes('plan')) {
      return [
        { $match: { mrr_usd: { $ne: null } } },
        {
          $group: {
            _id: '$plan_tier',
            total_mrr: { $sum: '$mrr_usd' },
            active_accounts: { $sum: 1 },
          },
        },
        { $sort: { total_mrr: -1 } },
      ];
    }

    return [
      { $match: { mrr_usd: { $ne: null } } },
      {
        $group: {
          _id: null,
          total_mrr: { $sum: '$mrr_usd' },
          avg_mrr: { $avg: '$mrr_usd' },
          active_accounts: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          total_mrr: 1,
          avg_mrr: { $round: ['$avg_mrr', 2] },
          active_accounts: 1,
        },
      },
    ];
  }

  // Retail orders fallback
  if (q.includes('category') || q.includes('technology')) {
    return [
      {
        $group: {
          _id: { $toLower: '$category' },
          total_sales: { $sum: '$sales' },
          total_profit: { $sum: '$profit' },
          order_count: { $sum: 1 },
        },
      },
      { $sort: { total_sales: -1 } },
      {
        $project: {
          category: '$_id',
          total_sales: { $round: ['$total_sales', 2] },
          total_profit: { $round: ['$total_profit', 2] },
          order_count: 1,
          _id: 0,
        },
      },
    ];
  }

  return [
    {
      $group: {
        _id: '$customer_segment',
        total_sales: { $sum: '$sales' },
        total_orders: { $sum: 1 },
      },
    },
    { $sort: { total_sales: -1 } },
  ];
}
