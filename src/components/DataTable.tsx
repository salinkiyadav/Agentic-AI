import React, { useState, useMemo } from 'react';
import { Download, Copy, Check, ArrowUpDown, Search } from 'lucide-react';

interface DataTableProps {
  data: any[];
}

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const pageSize = 10;

  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lower)
        )
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  const copyAsJson = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportCsv = () => {
    if (!data || data.length === 0) return;
    const header = columns.join(',');
    const rows = data.map((row) =>
      columns.map((c) => JSON.stringify(row[c] ?? '')).join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datasight_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-400">
        No records returned from aggregation.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg backdrop-blur-md">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search result rows..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">
            {filteredData.length} records {filteredData.length !== data.length && `(filtered from ${data.length})`}
          </span>
          <button
            onClick={copyAsJson}
            className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Copy as JSON"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'JSON'}</span>
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center space-x-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Export as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="cursor-pointer px-3 py-2.5 hover:text-cyan-300 transition-colors"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{col.replace(/_/g, ' ')}</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {val === null || val === undefined ? (
                        <span className="text-slate-600 italic">null</span>
                      ) : typeof val === 'number' ? (
                        Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
