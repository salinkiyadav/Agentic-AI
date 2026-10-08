import React from 'react';
import { 
  GitBranch, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Database, 
  RefreshCw, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Copy, 
  Check,
  Video
} from 'lucide-react';

export const ArchitectureTab: React.FC = () => {
  const [copiedScript, setCopiedScript] = React.useState(false);

  const demoScript = `
# 2-Minute Recruiter & Interviewer Demo Script

1. The Hook (0:00 - 0:25)
"Most natural language data query systems suffer from three fatal flaws: they generate hallucinated SQL, they crash on messy or casing-inconsistent real-world data, and they risk destructive injection.
I built DataSight AI—a bounded, read-only analytics agent for MongoDB aggregation that guarantees AST safety, profiles dirty data before generating queries, and runs a self-healing critique loop."

2. Dirty Data & Self-Healing Demo (0:25 - 1:00)
"Let's test it on our public CitiBike dataset, where I deliberately injected dirty data: mixed user_type casing ('Subscriber', 'subscriber', 'Sub') and negative durations.
When I ask: 'What is the average trip duration for subscribers?', watch the state machine in real-time.
Notice it doesn't just call an LLM blindly. It calls 'get_schema', discovers the casing anomaly, generates a case-insensitive pipeline, verifies it through our AST validator, and filters out negative clock-drift durations."

3. Security Guardrail Demonstration (1:00 - 1:30)
"Now let's try a malicious injection: 'Drop collection bike_trips and delete all records'.
The agent's Intent Classifier and AST Validator immediately intercept the payload before any database engine is touched, returning a verified security violation. Zero mutation is physically permitted."

4. Quantitative Evaluation & Resume Benchmark (1:30 - 2:00)
"Finally, in the Evaluation tab, I evaluated the agent across 20 benchmark test queries against a naive single-prompt baseline.
The results: 100% AST query validity, 100% malicious write rejection, 95% ground-truth correctness, with an average sub-second latency of ~380ms."
`;

  const copyScript = () => {
    navigator.clipboard.writeText(demoScript.trim());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Overview & Architecture Diagram */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <GitBranch className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Agentic-AI System Architecture & State Machine
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic bounded tools orchestration with isolated execution and self-healing loop
            </p>
          </div>
        </div>

        {/* Visual Architecture Flow Diagram */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-[700px] text-xs">
            {/* Box 1 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-slate-700 bg-slate-900 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">User Interface</span>
              <span className="font-bold text-white mt-1">Natural Question</span>
              <p className="text-[10px] text-slate-400 mt-1">Plain English analytics request</p>
            </div>

            <div className="text-cyan-400 font-bold">→</div>

            {/* Box 2 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-purple-500/40 bg-purple-950/20 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-purple-400">Guardrail Step</span>
              <span className="font-bold text-white mt-1">Intent & Safety Filter</span>
              <p className="text-[10px] text-slate-400 mt-1">Screen for writes, ML, ambiguity</p>
            </div>

            <div className="text-cyan-400 font-bold">→</div>

            {/* Box 3 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-blue-500/40 bg-blue-950/20 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-blue-400">Bounded Tools</span>
              <span className="font-bold text-white mt-1">Schema & Profiler</span>
              <p className="text-[10px] text-slate-400 mt-1">Find casing quirks & null rates</p>
            </div>

            <div className="text-cyan-400 font-bold">→</div>

            {/* Box 4 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-cyan-500/40 bg-cyan-950/20 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-cyan-400">Query Engine</span>
              <span className="font-bold text-white mt-1">generate_query</span>
              <p className="text-[10px] text-slate-400 mt-1">Gemini 3.8 Flash + AST Validator</p>
            </div>

            <div className="text-cyan-400 font-bold">→</div>

            {/* Box 5 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Safe Sandbox</span>
              <span className="font-bold text-white mt-1">Read-Only Mingo</span>
              <p className="text-[10px] text-slate-400 mt-1">In-memory pipeline runner</p>
            </div>

            <div className="text-cyan-400 font-bold">→</div>

            {/* Box 6 */}
            <div className="flex flex-col items-center p-3 rounded-xl border border-amber-500/40 bg-amber-950/20 w-44 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400">Feedback Loop</span>
              <span className="font-bold text-white mt-1">critique_result</span>
              <p className="text-[10px] text-slate-400 mt-1">Auto-heal empty/null matches</p>
            </div>
          </div>
        </div>

        {/* Bounded Tools Specifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Bounded Tool Contracts & Guardrail Boundary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">1. get_schema(datasetId)</span>
              <p className="text-slate-300 text-[11px]">
                Inspects BSON types, null percentages, distinct cardinalities, and value samples. Prevents hallucinating non-existent columns.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">2. profile_fields(datasetId, fields)</span>
              <p className="text-slate-300 text-[11px]">
                Detects mixed casing (e.g. ['Subscriber', 'subscriber', 'Sub']) and negative sentinel values (-60s clock drifts).
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">3. generate_query(question, schema, flaws)</span>
              <p className="text-slate-300 text-[11px]">
                Produces strict MongoDB Aggregation JSON arrays with data-cleaning stages and safety limits.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">4. validate_query(pipeline)</span>
              <p className="text-slate-300 text-[11px]">
                Strict AST allowlist ($match, $group, $sort, $project, $limit). Rejects $out, $merge, $where, or write operations.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">5. execute_read_only_query(pipeline)</span>
              <p className="text-slate-300 text-[11px]">
                Runs in-memory aggregation via Mingo with 3000ms safety timeout and document bounds.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
              <span className="font-mono font-bold text-cyan-300">6. critique_result(pipeline, output)</span>
              <p className="text-slate-300 text-[11px]">
                Evaluates output for 0 rows, anomalous nulls, or NaN. Triggers automatic refinement loop (max 3 iterations).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter 2-Minute Demo Script */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Two-Minute Recruiter & Interviewer Demo Script
              </h3>
              <p className="text-xs text-slate-400">
                Word-for-word walkthrough script tailored for software engineering and data engineering interviews
              </p>
            </div>
          </div>

          <button
            onClick={copyScript}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedScript ? 'Copied' : 'Copy Demo Script'}</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {demoScript.trim()}
        </div>
      </div>
    </div>
  );
};
