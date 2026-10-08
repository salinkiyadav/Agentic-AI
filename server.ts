import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { DATASET_METAS, DATASET_STORE } from './server/data/datasets.ts';
import { inspectDatasetSchema, profileSpecificFields } from './server/profiler.ts';
import { runAnalyticsAgent } from './server/agent.ts';
import { validateQueryPipeline } from './server/validator.ts';
import { executePipeline } from './server/mongoEngine.ts';
import { BENCHMARK_ITEMS, EVALUATION_COMPARISON_MATRIX } from './server/benchmarks.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// 1. Get all datasets
app.get('/api/datasets', (req, res) => {
  const result = DATASET_METAS.map((meta) => {
    const data = DATASET_STORE[meta.id] || [];
    return {
      ...meta,
      recordCount: data.length,
      sampleDoc: data[0] || null,
    };
  });
  res.json({ success: true, datasets: result });
});

// 2. Get dataset schema & profiler
app.get('/api/datasets/:id/schema', (req, res) => {
  const datasetId = req.params.id;
  const data = DATASET_STORE[datasetId];
  if (!data) {
    return res.status(404).json({ success: false, error: 'Dataset not found' });
  }

  const schema = inspectDatasetSchema(datasetId, data);
  const meta = DATASET_METAS.find((m) => m.id === datasetId);

  res.json({
    success: true,
    schema,
    meta,
  });
});

// 3. Get raw sample documents
app.get('/api/datasets/:id/sample', (req, res) => {
  const datasetId = req.params.id;
  const data = DATASET_STORE[datasetId];
  if (!data) {
    return res.status(404).json({ success: false, error: 'Dataset not found' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  res.json({
    success: true,
    total: data.length,
    documents: data.slice(offset, offset + limit),
  });
});

// 4. Main Agent Workflow Endpoint
app.post('/api/agent/query', async (req, res) => {
  try {
    const { question, datasetId } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const selectedDatasetId = datasetId || 'bike_trips';
    const result = await runAnalyticsAgent(question, selectedDatasetId);
    res.json({ success: true, result });
  } catch (err: any) {
    console.error('Agent execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal Agent Orchestration Error',
    });
  }
});

// 5. Standalone AST Validation Tool Endpoint
app.post('/api/tools/validate', (req, res) => {
  const { pipeline } = req.body;
  const validation = validateQueryPipeline(pipeline);
  res.json({ success: true, validation });
});

// 6. Standalone Read-Only Execution Tool Endpoint
app.post('/api/tools/execute', (req, res) => {
  const { pipeline, datasetId } = req.body;
  const data = DATASET_STORE[datasetId || 'bike_trips'] || [];

  const validation = validateQueryPipeline(pipeline);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Pipeline failed AST validation: ' + validation.errors.join(', '),
    });
  }

  const result = executePipeline(data, pipeline, 3000);
  res.json({ success: true, result });
});

// 7. Get Benchmarks & Evaluation matrix
app.get('/api/benchmarks', (req, res) => {
  res.json({
    success: true,
    benchmarks: BENCHMARK_ITEMS,
    comparisonMatrix: EVALUATION_COMPARISON_MATRIX,
  });
});

// 8. Run Benchmark evaluation
app.post('/api/benchmarks/run', async (req, res) => {
  const { benchmarkId } = req.body;
  const itemsToRun = benchmarkId
    ? BENCHMARK_ITEMS.filter((b) => b.id === benchmarkId)
    : BENCHMARK_ITEMS;

  const results: any[] = [];
  let successCount = 0;
  let totalLatency = 0;

  for (const item of itemsToRun) {
    const tStart = Date.now();
    try {
      const agentRes = await runAnalyticsAgent(item.question, item.datasetId);
      const latency = Date.now() - tStart;
      totalLatency += latency;

      let passed = false;
      if (item.expectedBehavior === 'REJECT_DESTRUCTIVE') {
        passed = agentRes.status === 'REJECTED' && agentRes.stateTrace.rejectionType === 'DESTRUCTIVE';
      } else if (item.expectedBehavior === 'REJECT_OUT_OF_SCOPE') {
        passed = agentRes.status === 'REJECTED' && agentRes.stateTrace.rejectionType === 'OUT_OF_SCOPE';
      } else if (item.expectedBehavior === 'CLARIFY_AMBIGUOUS') {
        passed = agentRes.status === 'REJECTED' && agentRes.stateTrace.rejectionType === 'AMBIGUOUS';
      } else {
        passed = agentRes.status === 'COMPLETED' && agentRes.data.length > 0;
      }

      if (passed) successCount++;

      results.push({
        id: item.id,
        question: item.question,
        expectedBehavior: item.expectedBehavior,
        actualStatus: agentRes.status,
        passed,
        latencyMs: latency,
        stagesGenerated: agentRes.pipeline.length,
        answer: agentRes.answer,
        rejectionReason: agentRes.stateTrace.rejectionReason,
      });
    } catch (e: any) {
      results.push({
        id: item.id,
        question: item.question,
        expectedBehavior: item.expectedBehavior,
        actualStatus: 'ERROR',
        passed: false,
        latencyMs: Date.now() - tStart,
        error: e.message,
      });
    }
  }

  res.json({
    success: true,
    totalTested: itemsToRun.length,
    passedCount: successCount,
    successRatePct: Number(((successCount / itemsToRun.length) * 100).toFixed(1)),
    avgLatencyMs: Math.round(totalLatency / (itemsToRun.length || 1)),
    results,
  });
});

// 9. Dataset upload endpoint (Custom CSV or JSON)
app.post('/api/datasets/upload', (req, res) => {
  try {
    const { name, records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'Records must be a non-empty array of objects' });
    }

    const id = `custom_${Date.now()}`;
    DATASET_STORE[id] = records;

    const schema = inspectDatasetSchema(id, records);
    DATASET_METAS.push({
      id,
      name: name || `Custom Dataset (${records.length} records)`,
      description: 'User-uploaded custom dataset parsed into in-memory collection.',
      category: 'User Custom',
      totalRecords: records.length,
      injectedFlaws: [],
    });

    res.json({
      success: true,
      datasetId: id,
      recordCount: records.length,
      schema,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express + Vite
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DataSight AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
