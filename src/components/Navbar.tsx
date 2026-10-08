import React from 'react';
import { Database, ShieldCheck, Cpu, PlayCircle, BarChart3, Binary, BookOpen, Sparkles } from 'lucide-react';
import { DatasetMeta } from '../../server/types.ts';

interface NavbarProps {
  activeTab: 'console' | 'benchmarks' | 'profiler' | 'architecture';
  setActiveTab: (tab: 'console' | 'benchmarks' | 'profiler' | 'architecture') => void;
  datasets: DatasetMeta[];
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onOpenUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  onOpenUpload,
}) => {
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white">DataSight AI</span>
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
                Agentic MongoDB
              </span>
              <span className="hidden sm:inline-flex items-center space-x-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                <span>Read-Only Bounded</span>
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 md:block">
              Schema Inspection • Query AST Safety • Critique Self-Healing • Full Observability
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all ${
              activeTab === 'console'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlayCircle className="h-4 w-4" />
            <span>Agent Console</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all ${
              activeTab === 'benchmarks'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Evaluation & Benchmarks</span>
          </button>
          <button
            onClick={() => setActiveTab('profiler')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all ${
              activeTab === 'profiler'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Binary className="h-4 w-4" />
            <span>Dataset & Dirty Profiler</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 transition-all ${
              activeTab === 'architecture'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Architecture & Demo</span>
          </button>
        </nav>

        {/* Dataset Selector */}
        <div className="hidden lg:flex items-center space-x-2">
          <div className="flex flex-col items-end text-xs">
            <span className="text-slate-400">Target Dataset</span>
            <span className="font-semibold text-slate-200">{currentDataset?.name.split('(')[0] || 'CitiBike'}</span>
          </div>
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.totalRecords} records)
              </option>
            ))}
          </select>
          <button
            onClick={onOpenUpload}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Upload Custom Dataset"
          >
            + Upload
          </button>
        </div>
      </div>
    </header>
  );
};
