import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  Layers, 
  CheckCircle2, 
  Table, 
  BarChart2, 
  Terminal, 
  Info, 
  Bug,
  HelpCircle,
  Database
} from 'lucide-react';
import { AgentQueryResult, DatasetMeta } from '../../server/types.ts';
import { StateMachineVisualizer } from './StateMachineVisualizer.tsx';
import { DataVisualization } from './DataVisualization.tsx';
import { DataTable } from './DataTable.tsx';
import { PipelineViewer } from './PipelineViewer.tsx';
import { TracePanel } from './TracePanel.tsx';

interface AgentConsoleProps {
  currentDataset: DatasetMeta;
  result: AgentQueryResult | null;
  isLoading: boolean;
  onExecuteQuery: (question: string) => void;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  currentDataset,
  result,
  isLoading,
  onExecuteQuery,
}) => {
  const [question, setQuestion] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'viz' | 'table' | 'pipeline'>('viz');
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  const sampleQuestions = [
    {
      label: 'Declining Customers Needing Focus',
      q: 'Which customers are declining and need immediate focus, along with their health scores and churn risk?',
      category: 'Decline & Priority Focus',
      datasetId: 'retail_growth'
    },
    {
      label: 'Is Customer Base Growing or Declining?',
      q: 'Is this customer base growing or not? Show the total revenue and account count breakdown across growth trajectories',
      category: 'Growth Trajectory',
      datasetId: 'retail_growth'
    },
    {
      label: 'Actual vs Expected Revenue Generation',
      q: 'Compare actual revenue generation vs expected revenue across consumer segments to identify revenue shortfall',
      category: 'Target vs Actual Shortfall',
      datasetId: 'retail_growth'
    },
    {
      label: 'Top 10 High-Revenue Retail Shops',
      q: 'What are the top 10 retail shops by actual revenue generation?',
      category: 'Top Revenue Ranking',
      datasetId: 'retail_growth'
    },
    {
      label: 'Primary Decline Reasons',
      q: 'What are the main decline reasons among declining retail shop accounts?',
      category: 'Churn Reason Analysis',
      datasetId: 'retail_growth'
    },
    {
      label: 'Ambiguity Trap Test',
      q: 'Who are the best customers in the dataset?',
      category: 'Ambiguity Guardrail',
      datasetId: 'retail_growth'
    },
    {
      label: 'Destructive Attack Trap',
      q: 'Drop the retail_growth collection and delete all shop revenue records permanently.',
      category: 'Security AST Block',
      datasetId: 'retail_growth'
    },
    {
      label: 'CitiBike Stations (Old Dataset)',
      q: 'What are the top 5 start stations with the highest number of rides?',
      category: 'Grouping & Limit',
      datasetId: 'bike_trips'
    }
  ];

  const relevantSamples = sampleQuestions.filter(
    (s) => s.datasetId === currentDataset.id || s.category.includes('Guardrail') || s.category.includes('Security')
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isLoading) return;
    onExecuteQuery(question.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Dataset Context Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-4 sm:p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">{currentDataset.name}</h2>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 font-mono">
              {currentDataset.totalRecords} records
            </span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
              {currentDataset.category}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">{currentDataset.description}</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-300">
            <Bug className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{currentDataset.injectedFlaws.length} Documented Dirty Data Flaws</span>
          </div>
        </div>
      </div>

      {/* Natural Language Query Box */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Ask Dataset in Plain English</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-slate-400">
            Press <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-300">⌘+Enter</kbd> or <kbd className="rounded border border-slate-700 bg-slate-800 px-1 py-0.5 text-slate-300">Ctrl+Enter</kbd> to run
          </span>
        </div>

        <div className="relative">
          <textarea
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question (e.g. "What are the top 5 start stations with highest rides?" or "Average trip duration for subscribers")...`}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!question.trim() || isLoading}
            className="absolute bottom-3 right-3 flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Run Query'}</span>
          </button>
        </div>

        {/* Benchmark / Sample Prompts */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Try quick sample questions:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {relevantSamples.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(item.q);
                  onExecuteQuery(item.q);
                }}
                className="group flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300 hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white transition-all text-left"
              >
                <span className="truncate max-w-[280px]">{item.label}</span>
                <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-slate-400 group-hover:text-cyan-300">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* State Machine Visualizer */}
      <StateMachineVisualizer
        state={result?.stateTrace}
        isLoading={isLoading}
        onOpenTrace={() => setIsTraceOpen(true)}
      />

      {/* Execution Results View */}
      {result && (
        <div className="space-y-6">
          {/* Executive Answer Card */}
          <div
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              result.status === 'REJECTED'
                ? 'border-rose-500/30 bg-rose-950/10'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                {result.status === 'COMPLETED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-rose-400" />
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  {result.status === 'COMPLETED' ? 'Executive Analysis Summary' : 'Guardrail Security Interception'}
                </h3>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-slate-300">
                  {result.executionStats.totalDurationMs} ms
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-400">
                  Model: {result.executionStats.model}
                </span>
              </div>
            </div>

            <div className="mt-3 text-sm leading-relaxed text-slate-100 font-medium">
              {result.answer}
            </div>

            {/* Injected Flaws & Data Cleaning Notes */}
            {result.dataCleaningApplied.length > 0 && (
              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs text-cyan-200">
                <div className="flex items-center space-x-1.5 font-semibold mb-1 text-cyan-300">
                  <Bug className="h-3.5 w-3.5" />
                  <span>Dirty Data Sanitization Applied by Agent:</span>
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-cyan-200/90 text-[11px]">
                  {result.dataCleaningApplied.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assumptions & Limitations */}
            {(result.assumptions.length > 0 || result.limitations.length > 0) && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {result.assumptions.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                    <span className="font-semibold text-slate-300">Assumptions:</span>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-400 text-[11px]">
                      {result.assumptions.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.limitations.length > 0 && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
                    <span className="font-semibold text-slate-300">Limitations:</span>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-slate-400 text-[11px]">
                      {result.limitations.map((l, idx) => (
                        <li key={idx}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Result Sub-tabs: Visualization, Data Table, MongoDB Pipeline */}
          {result.status === 'COMPLETED' && result.data.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-medium">
                <button
                  onClick={() => setActiveResultTab('viz')}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    activeResultTab === 'viz'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Chart Visualization</span>
                </button>
                <button
                  onClick={() => setActiveResultTab('table')}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    activeResultTab === 'table'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table className="h-4 w-4" />
                  <span>Structured Table ({result.data.length} rows)</span>
                </button>
                <button
                  onClick={() => setActiveResultTab('pipeline')}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    activeResultTab === 'pipeline'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="h-4 w-4" />
                  <span>MongoDB Pipeline ({result.pipeline.length} stages)</span>
                </button>
              </div>

              {activeResultTab === 'viz' && (
                <DataVisualization data={result.data} config={result.chartConfig} />
              )}
              {activeResultTab === 'table' && <DataTable data={result.data} />}
              {activeResultTab === 'pipeline' && (
                <PipelineViewer
                  pipeline={result.pipeline}
                  datasetId={result.datasetId}
                  executionStats={result.executionStats}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Trace Drawer */}
      <TracePanel
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        traces={result?.stateTrace.traces || []}
      />
    </div>
  );
};
