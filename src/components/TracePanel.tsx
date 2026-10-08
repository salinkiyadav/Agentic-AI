import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Clock, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { ToolTrace } from '../../server/types.ts';

interface TracePanelProps {
  isOpen: boolean;
  onClose: () => void;
  traces: ToolTrace[];
}

export const TracePanel: React.FC<TracePanelProps> = ({ isOpen, onClose, traces }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const totalDuration = traces.reduce((acc, t) => acc + t.durationMs, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">Agent Execution & Tool Observability Trace</h3>
              <p className="text-xs text-slate-400">
                Detailed telemetry of all bounded tool calls, AST validations, and critique evaluations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300 font-mono">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              <span>{totalDuration} ms total</span>
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-3">
          {traces.map((trace, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={trace.stepId || idx}
                className="rounded-xl border border-slate-800 bg-slate-950/60 transition-all hover:border-slate-700"
              >
                <div
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                  className="flex cursor-pointer items-center justify-between p-3.5"
                >
                  <div className="flex items-center space-x-3">
                    {trace.status === 'SUCCESS' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    ) : trace.status === 'WARNING' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {trace.toolName}()
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {trace.stepId}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            trace.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : trace.status === 'WARNING'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {trace.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-300">{trace.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="font-mono">{trace.durationMs}ms</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Reasoning summary */}
                <div className="border-t border-slate-900 px-4 py-2 text-xs text-slate-400 bg-slate-900/30">
                  <span className="font-semibold text-slate-300">Reasoning: </span>
                  {trace.reasoning}
                </div>

                {/* Expanded Input / Output details */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 space-y-3 bg-slate-950 text-xs font-mono">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tool Input Arguments
                      </span>
                      <pre className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300">
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Tool Output Response
                      </span>
                      <pre className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2 text-cyan-300">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
