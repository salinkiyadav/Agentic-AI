import React, { useState, useEffect } from 'react';
import { 
  Binary, 
  Bug, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  HelpCircle, 
  Database, 
  Layers, 
  ChevronDown, 
  ChevronRight 
} from 'lucide-react';
import { DatasetMeta, DatasetSchema, FieldProfile } from '../../server/types.ts';

interface DataProfilerTabProps {
  currentDataset: DatasetMeta;
}

export const DataProfilerTab: React.FC<DataProfilerTabProps> = ({ currentDataset }) => {
  const [schemaData, setSchemaData] = useState<DatasetSchema | null>(null);
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawPage, setRawPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);
  const [expandedDocIndex, setExpandedDocIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/datasets/${currentDataset.id}/schema`).then((r) => r.json()),
      fetch(`/api/datasets/${currentDataset.id}/sample?limit=15&offset=${(rawPage - 1) * 15}`).then((r) => r.json())
    ])
      .then(([schemaRes, sampleRes]) => {
        if (schemaRes.success) setSchemaData(schemaRes.schema);
        if (sampleRes.success) {
          setRawDocs(sampleRes.documents);
          setTotalDocs(sampleRes.total);
        }
      })
      .catch((err) => console.error('Failed to load dataset details:', err))
      .finally(() => setLoading(false));
  }, [currentDataset.id, rawPage]);

  if (loading || !schemaData) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        Inspecting collection schema and data profiling...
      </div>
    );
  }

  const fields = Object.values(schemaData.fields);

  return (
    <div className="space-y-8">
      {/* Overview & Injected Dirty Data Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Documented Injected Dirty Data Anomalies
              </h3>
              <p className="text-xs text-slate-400">
                This public dataset has realistic imperfect data to evaluate agent resilience and self-healing
              </p>
            </div>
          </div>

          <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300">
            {currentDataset.injectedFlaws.length} Documented Flaws
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentDataset.injectedFlaws.map((flaw, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-cyan-300">
                  {flaw.type.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Affected: {flaw.affectedFields.join(', ')}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-200">{flaw.description}</p>
              <div className="text-[11px] text-amber-400/90">
                <span className="font-semibold text-amber-300">Query Impact: </span>
                {flaw.impact}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field-by-Field Profiler Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Binary className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Schema & Field Profiler Output (get_schema tool)
              </h3>
              <p className="text-xs text-slate-400">
                Automated statistical profile used by the agent during query generation
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {fields.length} attributes detected • {schemaData.totalCount} docs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="py-2.5 px-3">Field Name</th>
                <th className="py-2.5 px-3">Inferred BSON Type</th>
                <th className="py-2.5 px-3">Null Rate</th>
                <th className="py-2.5 px-3">Distinct Cardinality</th>
                <th className="py-2.5 px-3">Sample Distinct Values</th>
                <th className="py-2.5 px-3">Data Hygiene Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {fields.map((field) => {
                const hasCasingIssue = field.casingVariations && field.casingVariations.length > 0;
                const hasHighNulls = field.nullPercentage > 0;
                const hasOutlier = typeof field.min === 'number' && field.min < 0;

                return (
                  <tr key={field.name} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-cyan-300 whitespace-nowrap">
                      {field.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{field.type}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          field.nullPercentage > 0
                            ? 'bg-amber-500/10 text-amber-400 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {field.nullCount} ({field.nullPercentage}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{field.distinctCount}</td>
                    <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs text-[11px]">
                      {field.sampleValues.map((v) => JSON.stringify(v)).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {hasCasingIssue ? (
                        <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">
                          Mixed Casing ({field.casingVariations?.length} forms)
                        </span>
                      ) : hasOutlier ? (
                        <span className="rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] text-rose-300">
                          Negative Anomaly (min: {field.min})
                        </span>
                      ) : hasHighNulls ? (
                        <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                          Contains Nulls
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                          Clean
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Collection Browser */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-purple-400" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Raw Collection Document Browser
              </h3>
              <p className="text-xs text-slate-400">
                Browse documents loaded into the in-memory MongoDB engine
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <button
              onClick={() => setRawPage((p) => Math.max(1, p - 1))}
              disabled={rawPage === 1}
              className="rounded bg-slate-800 px-2 py-1 text-slate-300 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {rawPage} of {Math.ceil(totalDocs / 15) || 1}
            </span>
            <button
              onClick={() => setRawPage((p) => p + 1)}
              disabled={rawPage * 15 >= totalDocs}
              className="rounded bg-slate-800 px-2 py-1 text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {rawDocs.map((doc, idx) => {
            const isExpanded = expandedDocIndex === idx;
            const primaryKey = doc.trip_id || doc.account_id || doc.order_id || `Doc #${idx + 1}`;

            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-950/60 text-xs font-mono transition-colors hover:border-slate-700"
              >
                <div
                  onClick={() => setExpandedDocIndex(isExpanded ? null : idx)}
                  className="flex cursor-pointer items-center justify-between p-3"
                >
                  <div className="flex items-center space-x-3 truncate">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-bold text-cyan-300">{primaryKey}</span>
                    <span className="text-slate-400 truncate max-w-xl text-[11px]">
                      {JSON.stringify(doc).slice(0, 100)}...
                    </span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    {Object.keys(doc).length} fields
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-3 bg-slate-950 text-cyan-300 overflow-x-auto text-xs">
                    <pre>{JSON.stringify(doc, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
