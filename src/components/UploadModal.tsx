import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDatasetId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [datasetName, setDatasetName] = useState('');
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleParseAndUpload = async () => {
    setError(null);
    if (!rawText.trim()) {
      setError('Please provide JSON or CSV data.');
      return;
    }

    setLoading(true);
    try {
      let records: any[] = [];
      const trimmed = rawText.trim();

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Parse JSON
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse simple CSV
        const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          throw new Error('CSV must have a header line and at least one data row.');
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        records = lines.slice(1).map((line) => {
          const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const obj: any = {};
          headers.forEach((h, idx) => {
            const raw = vals[idx];
            if (raw === undefined || raw === '') {
              obj[h] = null;
            } else if (!isNaN(Number(raw))) {
              obj[h] = Number(raw);
            } else {
              obj[h] = raw;
            }
          });
          return obj;
        });
      }

      if (records.length === 0) {
        throw new Error('Parsed 0 records.');
      }

      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datasetName.trim() || `Custom Dataset (${records.length} records)`,
          records,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      onUploadSuccess(data.datasetId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to parse records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Upload Custom Dataset</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Dataset Name</label>
            <input
              type="text"
              placeholder="e.g. Q3 Customer Support Tickets"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">
              JSON Array or CSV Data
            </label>
            <textarea
              rows={8}
              placeholder={`Paste JSON array:\n[\n  {"ticket_id": "T1", "category": "Billing", "status": "open", "time_to_resolve_hr": 2.5}\n]\n\nOr paste CSV with headers:\nticket_id,category,status,time_to_resolve_hr\nT1,Billing,open,2.5`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full font-mono rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleParseAndUpload}
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
          >
            {loading ? 'Ingesting...' : 'Ingest & Profile Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
};
