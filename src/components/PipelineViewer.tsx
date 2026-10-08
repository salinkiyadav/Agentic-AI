import React, { useState } from 'react';
import { Copy, Check, Terminal, ShieldCheck, Clock, Layers } from 'lucide-react';

interface PipelineViewerProps {
  pipeline: any[];
  datasetId: string;
  executionStats?: {
    totalDurationMs: number;
    docsExamined: number;
    docsReturned: number;
    iterationsUsed: number;
  };
}

export const PipelineViewer: React.FC<PipelineViewerProps> = ({
  pipeline,
  datasetId,
  executionStats,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(pipeline, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageExplanation = (stage: any, index: number) => {
    const stageKey = Object.keys(stage)[0] || 'stage';
    switch (stageKey) {
      case '$match':
        return `Stage #${index + 1}: Filter source documents matching specific predicates (filters nulls, ranges, or casing).`;
      case '$group':
        return `Stage #${index + 1}: Aggregate rows into distinct groups and compute accumulators ($sum, $avg, $min, $max).`;
      case '$sort':
        return `Stage #${index + 1}: Order grouped results by primary metric descending or ascending.`;
      case '$limit':
        return `Stage #${index + 1}: Restrict output set to top ${stage.$limit} documents to prevent memory exhaustion.`;
      case '$project':
        return `Stage #${index + 1}: Reshape schema output, rename keys, round decimals, and suppress internal IDs.`;
      case '$unwind':
        return `Stage #${index + 1}: Deconstruct array fields into multiple documents.`;
      case '$count':
        return `Stage #${index + 1}: Count matching documents.`;
      default:
        return `Stage #${index + 1}: ${stageKey} analytical stage.`;
    }
  };

  if (!pipeline || pipeline.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 text-center text-xs text-slate-400">
        No pipeline generated for this query.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Generated MongoDB Aggregation Pipeline
          </span>
          <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-mono text-cyan-400">
            db.{datasetId}.aggregate(...)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            <span>AST Certified Read-Only</span>
          </span>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Query'}</span>
          </button>
        </div>
      </div>

      {/* Execution Performance & Explain Stats */}
      {executionStats && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center space-x-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <div>
              <div className="text-[10px] text-slate-400">Execution Latency</div>
              <div className="font-mono font-semibold text-slate-200">{executionStats.totalDurationMs} ms</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400">Docs Examined</div>
              <div className="font-mono font-semibold text-slate-200">{executionStats.docsExamined.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <div>
              <div className="text-[10px] text-slate-400">Docs Returned</div>
              <div className="font-mono font-semibold text-slate-200">{executionStats.docsReturned.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 rounded-lg border border-slate-800/80 bg-slate-950/40 p-2">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-400">Pipeline Stages</div>
              <div className="font-mono font-semibold text-slate-200">{pipeline.length} stages</div>
            </div>
          </div>
        </div>
      )}

      {/* Stage-by-Stage Breakdown */}
      <div className="mt-3 space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Stage Breakdown
        </span>
        <div className="space-y-1">
          {pipeline.map((stage, idx) => (
            <div
              key={idx}
              className="flex items-center space-x-2 rounded-md border border-slate-800/70 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300 font-mono"
            >
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                {Object.keys(stage)[0]}
              </span>
              <span className="truncate text-slate-400 text-[11px]">
                {getStageExplanation(stage, idx)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Display */}
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3 overflow-x-auto font-mono text-xs text-cyan-300">
        <pre>{formattedJson}</pre>
      </div>
    </div>
  );
};
