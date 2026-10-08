import React, { useState } from 'react';
import { ChartConfig } from '../../server/types.ts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Award } from 'lucide-react';

interface DataVisualizationProps {
  data: any[];
  config?: ChartConfig;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ data, config }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  // 1. KPI Single Metric Card
  if (config?.chartType === 'kpi' || (data.length === 1 && config?.kpiValue)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-slate-900/60 p-8 text-center shadow-inner">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 mb-3">
          <Award className="h-6 w-6" />
        </div>
        <div className="text-4xl font-extrabold tracking-tight text-white font-mono">
          {config?.kpiValue || String(Object.values(data[0])[0])}
        </div>
        <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-cyan-300">
          {config?.kpiLabel || Object.keys(data[0])[0]?.replace(/_/g, ' ')}
        </div>
        {config?.kpiSubtext && (
          <div className="mt-2 text-xs text-slate-400">{config.kpiSubtext}</div>
        )}
      </div>
    );
  }

  // Prepare series data for multi-row datasets
  const xKey = config?.xKey || Object.keys(data[0]).find((k) => typeof data[0][k] === 'string' || k === '_id') || '_id';
  const yKey = config?.yKey || Object.keys(data[0]).find((k) => typeof data[0][k] === 'number') || Object.keys(data[0])[1];

  const items = data.slice(0, 15);
  const values = items.map((d) => (typeof d[yKey] === 'number' ? d[yKey] : Number(d[yKey]) || 0));
  const maxValue = Math.max(...values, 1);
  const totalSum = values.reduce((a, b) => a + b, 0);

  // 2. Donut / Pie View (for small categorical datasets <= 6)
  if (config?.chartType === 'pie' && items.length <= 6) {
    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    let currentAngle = 0;

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          <PieIcon className="h-4 w-4 text-cyan-400" />
          <span>Category Distribution Breakdown</span>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-around gap-6">
          <div className="relative h-44 w-44 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
              {items.map((item, i) => {
                const val = values[i];
                const pct = totalSum > 0 ? val / totalSum : 0;
                const strokeDasharray = `${pct * 314.15} 314.15`;
                const strokeDashoffset = -currentAngle * 314.15;
                currentAngle += pct;

                return (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={colors[i % colors.length]}
                    strokeWidth="16"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all hover:opacity-80 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-sm font-bold text-white font-mono">{totalSum.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex flex-col space-y-2 w-full max-w-xs">
            {items.map((item, i) => {
              const label = String(item[xKey] ?? 'Unknown');
              const val = values[i];
              const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : '0';
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                    hoveredIndex === i ? 'bg-slate-800/80 text-white' : 'text-slate-300'
                  }`}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                    <span className="truncate">{label}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono flex-shrink-0">
                    <span className="font-semibold">{val.toLocaleString()}</span>
                    <span className="text-slate-400 text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. Bar Chart View (Default for comparisons)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <span>Analytics Visualization ({yKey.replace(/_/g, ' ')})</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">Top {items.length} records</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const label = String(item[xKey] ?? `Item ${idx + 1}`);
          const val = values[idx];
          const pct = Math.max(3, (val / maxValue) * 100);

          return (
            <div
              key={idx}
              className="group relative flex flex-col space-y-1 rounded-lg p-1.5 transition-colors hover:bg-slate-800/40"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-medium text-slate-300 max-w-[70%] group-hover:text-cyan-300 transition-colors">
                  {label}
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 group-hover:from-cyan-400 group-hover:to-blue-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
