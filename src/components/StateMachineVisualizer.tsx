import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldAlert, 
  Search, 
  Terminal, 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AgentExecutionState, ToolTrace } from '../../server/types.ts';

interface StateMachineVisualizerProps {
  state?: AgentExecutionState;
  isLoading: boolean;
  onOpenTrace?: () => void;
}

interface StepDef {
  key: string;
  label: string;
  tool: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  { key: 'CLASSIFY_INTENT', label: 'Intent & Safety', tool: 'classify_intent', icon: ShieldCheck },
  { key: 'INSPECT_SCHEMA', label: 'Schema Inspection', tool: 'get_schema', icon: Search },
  { key: 'PROFILE_FIELDS', label: 'Field Profiler', tool: 'profile_fields', icon: Search },
  { key: 'GENERATE_QUERY', label: 'Query Generation', tool: 'generate_query', icon: Terminal },
  { key: 'VALIDATE_QUERY', label: 'AST Validation', tool: 'validate_query', icon: ShieldCheck },
  { key: 'EXECUTE_QUERY', label: 'Safe Read Execution', tool: 'execute_read_only_query', icon: Play },
  { key: 'CRITIQUE_RESULT', label: 'Critique & Heal', tool: 'critique_result', icon: RefreshCw },
  { key: 'SYNTHESIZE', label: 'Synthesis', tool: 'synthesize_answer', icon: Sparkles },
];

export const StateMachineVisualizer: React.FC<StateMachineVisualizerProps> = ({
  state,
  isLoading,
  onOpenTrace,
}) => {
  if (!state && !isLoading) {
    return (
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">Agentic State Machine Workflow</span>
          <span>Status: Idle</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1">
              <div className="flex items-center space-x-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-500">
                <step.icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700" />}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentState = state?.currentState || 'CLASSIFY_INTENT';
  const isRejected = state?.isRejected || false;
  const traces = state?.traces || [];

  const getStepStatus = (stepKey: string) => {
    if (isLoading && currentState === stepKey) return 'RUNNING';
    const hasTrace = traces.some((t) => t.toolName.toLowerCase().includes(stepKey.toLowerCase().split('_')[0]));
    if (isRejected && currentState === 'REJECTED') {
      if (stepKey === 'CLASSIFY_INTENT' || stepKey === 'VALIDATE_QUERY') return 'REJECTED';
      return 'SKIPPED';
    }
    if (hasTrace) return 'COMPLETED';
    return 'PENDING';
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            {isLoading ? (
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
              </span>
            ) : isRejected ? (
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            )}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Workflow State Machine
          </span>
          {state?.iteration ? (
            <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              Iteration {state.iteration} / {state.maxIterations}
            </span>
          ) : null}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {isRejected && (
            <span className="flex items-center space-x-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 font-medium text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Guardrail Rejection: {state?.rejectionType}</span>
            </span>
          )}

          {traces.length > 0 && (
            <button
              onClick={onOpenTrace}
              className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:border-cyan-500/40 hover:bg-slate-700 hover:text-cyan-300 transition-colors"
            >
              <span>Inspect Trace ({traces.length} steps)</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper pills */}
      <div className="mt-3 flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.key);
          const isCurrent = currentState === step.key && isLoading;
          const matchingTrace = traces.find((t) => t.toolName.toLowerCase().includes(step.tool.split('_')[0]));

          let borderClass = 'border-slate-800 bg-slate-900/60 text-slate-500';
          let icon = <step.icon className="h-3.5 w-3.5 text-slate-600" />;

          if (isCurrent) {
            borderClass = 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300 font-semibold shadow-sm shadow-cyan-500/10';
            icon = <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />;
          } else if (status === 'COMPLETED') {
            borderClass = 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300';
            icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
          } else if (status === 'REJECTED') {
            borderClass = 'border-rose-500/40 bg-rose-950/30 text-rose-300 font-semibold';
            icon = <AlertCircle className="h-3.5 w-3.5 text-rose-400" />;
          }

          return (
            <div key={step.key} className="flex items-center gap-1 flex-1 min-w-[110px]">
              <div
                className={`flex w-full flex-col rounded-lg border p-2 text-xs transition-all ${borderClass}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 truncate">
                    {icon}
                    <span className="truncate">{step.label}</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono">{step.tool}</span>
                  {matchingTrace && (
                    <span className="text-slate-400 font-mono">{matchingTrace.durationMs}ms</span>
                  )}
                </div>
              </div>
              {idx < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700 flex-shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
