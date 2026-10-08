import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { AgentConsole } from './components/AgentConsole.tsx';
import { EvaluationTab } from './components/EvaluationTab.tsx';
import { DataProfilerTab } from './components/DataProfilerTab.tsx';
import { ArchitectureTab } from './components/ArchitectureTab.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { DatasetMeta, AgentQueryResult } from '../server/types.ts';
import { Database, ShieldCheck, Cpu, GitBranch, Terminal } from 'lucide-react';

export default function App() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('retail_growth');
  const [activeTab, setActiveTab] = useState<'console' | 'benchmarks' | 'profiler' | 'architecture'>('console');
  const [currentResult, setCurrentResult] = useState<AgentQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Fetch datasets
  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/datasets');
      const data = await res.json();
      if (data.success && data.datasets) {
        setDatasets(data.datasets);
        if (!selectedDatasetId && data.datasets.length > 0) {
          setSelectedDatasetId(data.datasets[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || {
    id: 'retail_growth',
    name: 'Retail Shops & Consumer Revenue Growth Intelligence',
    description: 'B2B retail shops and consumer revenue telemetry tracking actual vs expected revenue, growth trajectories (Growing vs Declining), customer health scores, and retention focus priorities.',
    category: 'Retail & Consumer Analytics',
    totalRecords: 650,
    injectedFlaws: []
  };

  const handleExecuteQuery = async (question: string) => {
    setIsLoading(true);
    setCurrentResult(null);

    try {
      const res = await fetch('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          datasetId: selectedDatasetId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentResult(data.result);
      } else {
        alert(data.error || 'Query failed to process');
      }
    } catch (err: any) {
      console.error('Agent query failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (newId: string) => {
    fetchDatasets().then(() => {
      setSelectedDatasetId(newId);
      setActiveTab('profiler');
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        onSelectDataset={(id) => {
          setSelectedDatasetId(id);
          setCurrentResult(null);
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'console' && (
          <AgentConsole
            currentDataset={currentDataset}
            result={currentResult}
            isLoading={isLoading}
            onExecuteQuery={handleExecuteQuery}
          />
        )}

        {activeTab === 'benchmarks' && <EvaluationTab />}

        {activeTab === 'profiler' && <DataProfilerTab currentDataset={currentDataset} />}

        {activeTab === 'architecture' && <ArchitectureTab />}
      </main>

      {/* Upload Custom Dataset Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">DataSight AI</span>
            <span>•</span>
            <span>Natural-Language MongoDB Analytics Agent</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Read-Only Sandbox</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Gemini 3.8 Flash</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Terminal className="h-3.5 w-3.5 text-purple-400" />
              <span>Mingo Mongo Engine</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
