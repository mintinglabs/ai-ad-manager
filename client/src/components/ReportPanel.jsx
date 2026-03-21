import { useState, useRef, useMemo } from 'react';
import { X, Bookmark, FileText, Printer, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { parseMarkdownTable } from './ChatInterface.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];
const fmtDate = () => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
}).format(new Date());

// ── Parse a numeric string like "$1,234", "2.3x", "1.8%", "24.50" → number
const parseNum = (s) => {
  if (!s || typeof s !== 'string') return 0;
  const cleaned = s.replace(/[$,%x\s]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

// ── Report KPI Card ─────────────────────────────────────────────────────────
const KpiCard = ({ label, value, change, trend }) => {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  return (
    <div className="bg-slate-50 rounded-xl p-4 flex-1 min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-slate-400'}`}>
          {isUp && <TrendingUp size={12} />}
          {isDown && <TrendingDown size={12} />}
          {change}
        </div>
      )}
    </div>
  );
};

// ── Report Section Header ───────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-4 mt-8 first:mt-0">
    <h2 className="text-base font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
    {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    <div className="h-0.5 bg-gradient-to-r from-blue-500 to-transparent mt-2 rounded-full" />
  </div>
);

// ── Table → Bar Chart conversion ────────────────────────────────────────────
const TableBarChart = ({ columns, rows }) => {
  // Find numeric columns for charting
  const numericCols = columns.slice(1).filter((_, ci) =>
    rows.some(row => parseNum(row[ci + 1]) > 0)
  );
  const chartCols = numericCols.slice(0, 3); // max 3 bars
  if (!chartCols.length) return null;

  const data = rows.slice(0, 10).map(row => {
    const entry = { name: row[0]?.length > 18 ? row[0].slice(0, 18) + '…' : row[0] };
    chartCols.forEach(col => {
      const ci = columns.indexOf(col);
      entry[col] = parseNum(row[ci]);
    });
    return entry;
  });

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#475569' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
          />
          {chartCols.map((col, i) => (
            <Bar key={col} dataKey={col} fill={COLORS[i % COLORS.length]} radius={[0, 4, 4, 0]} barSize={16} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Report Table (clean, report-style) ──────────────────────────────────────
const ReportTable = ({ columns, rows }) => (
  <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-800 text-white">
          {columns.map((col, ci) => (
            <th key={ci} className="px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={`border-b border-slate-100 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'font-medium text-slate-800' : 'text-slate-600'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Budget → Pie Chart ──────────────────────────────────────────────────────
const BudgetPieChart = ({ data }) => {
  if (!data?.items?.length) return null;
  const chartData = data.items.map((item, i) => ({
    name: item.name?.length > 20 ? item.name.slice(0, 20) + '…' : item.name,
    value: parseNum(String(item.spend || item.percentage || 0)),
  }));

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
      <SectionHeader title={data.title || 'Budget Allocation'} subtitle="Spend distribution across campaigns" />
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Funnel → Area Chart ─────────────────────────────────────────────────────
const FunnelAreaChart = ({ data }) => {
  if (!data?.stages?.length) return null;
  const chartData = data.stages.map(s => ({
    name: s.label,
    value: parseNum(String(s.value)),
  }));

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
      <SectionHeader title={data.title || 'Conversion Funnel'} />
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} formatter={(v) => v.toLocaleString()} />
          <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#funnelGrad)" strokeWidth={2} />
          <defs>
            <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Comparison → Grouped Bar Chart ──────────────────────────────────────────
const ComparisonBarChart = ({ data }) => {
  if (!data?.metrics?.length) return null;
  const chartData = data.metrics.map(m => ({
    name: m.label?.length > 12 ? m.label.slice(0, 12) + '…' : m.label,
    [data.a_label || 'Period A']: parseNum(String(m.a)),
    [data.b_label || 'Period B']: parseNum(String(m.b)),
  }));
  const keyA = data.a_label || 'Period A';
  const keyB = data.b_label || 'Period B';

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
      <SectionHeader title={data.title || 'Period Comparison'} />
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ left: 10, right: 20, top: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
          <Bar dataKey={keyA} fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey={keyB} fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── Score → Radial Gauge ────────────────────────────────────────────────────
const ScoreGauge = ({ data }) => {
  if (!data?.score && data?.score !== 0) return null;
  const score = data.score;
  const max = data.max || 10;
  const pct = (score / max) * 100;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const chartData = [{ name: 'Score', value: pct, fill: color }];
  const statusIcon = { good: <CheckCircle2 size={14} className="text-emerald-500" />, warning: <AlertTriangle size={14} className="text-amber-500" />, bad: <XCircle size={14} className="text-red-500" /> };

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 mb-4">
      <SectionHeader title={data.label || 'Account Health'} />
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={180} endAngle={0} data={chartData}>
              <RadialBar background clockWise dataKey="value" cornerRadius={8} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
            <span className="text-[10px] text-slate-400 font-medium">/ {max}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.items?.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              {statusIcon[item.status] || <span className="w-3.5 h-3.5 rounded-full bg-slate-300 inline-block mt-0.5" />}
              <p className="text-xs text-slate-700 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Insights Section (report style) ─────────────────────────────────────────
const InsightsSection = ({ data }) => {
  if (!Array.isArray(data)) return null;
  const severityStyle = {
    critical: { border: 'border-l-red-500', bg: 'bg-red-50/50', label: 'CRITICAL', labelCls: 'text-red-600' },
    warning: { border: 'border-l-amber-400', bg: 'bg-amber-50/50', label: 'WARNING', labelCls: 'text-amber-600' },
    success: { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', label: 'OPPORTUNITY', labelCls: 'text-emerald-600' },
    info: { border: 'border-l-blue-400', bg: 'bg-blue-50/50', label: 'INFO', labelCls: 'text-blue-600' },
  };
  return (
    <div className="space-y-2 mb-4">
      <SectionHeader title="Key Insights" subtitle="Ranked by impact" />
      {data.map((item, i) => {
        const cfg = severityStyle[item.severity] || severityStyle.info;
        return (
          <div key={i} className={`${cfg.bg} border-l-4 ${cfg.border} rounded-r-lg px-4 py-3`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.labelCls}`}>{cfg.label}</span>
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
          </div>
        );
      })}
    </div>
  );
};

// ── Steps Section (report style) ────────────────────────────────────────────
const StepsSection = ({ data }) => {
  if (!Array.isArray(data)) return null;
  const prioColor = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-emerald-500' };
  return (
    <div className="mb-4">
      <SectionHeader title="Recommended Actions" subtitle="Prioritized by impact" />
      <div className="space-y-2">
        {data.map((step, i) => (
          <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              <span className="text-sm font-bold text-slate-300 w-5 text-right">{i + 1}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${prioColor[step.priority] || 'bg-slate-300'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
              {step.reason && <p className="text-xs text-slate-500 mt-0.5">{step.reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Rich text for report ────────────────────────────────────────────────────
const ReportText = ({ content }) => {
  const lines = content.split('\n');
  return (
    <div className="mb-3 text-sm text-slate-700 leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-slate-800 mt-4 mb-1">{line.slice(3)}</h3>;
        if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">{line.slice(4)}</h4>;
        if (line.match(/^[\-\*]\s/)) return <li key={i} className="ml-4 list-disc text-slate-600">{line.replace(/^[\-\*]\s+/, '')}</li>;
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{line.replace(/\*\*([^*]+)\*\*/g, (_, t) => t)}</p>;
      })}
    </div>
  );
};

// ── Main Report Panel ───────────────────────────────────────────────────────
export const ReportPanel = ({ content, title, onClose, onSave, folders = [] }) => {
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const contentRef = useRef(null);
  const saveRef = useRef(null);

  const segments = useMemo(() => content ? parseMarkdownTable(content) : [], [content]);

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    const stylesheet = document.querySelector('link[rel=stylesheet]')?.href || '';
    w.document.write(`<html><head><title>${title || 'Report'}</title>${stylesheet ? `<link rel="stylesheet" href="${stylesheet}">` : ''}<style>body{padding:32px;background:#fff;font-family:system-ui,-apple-system,sans-serif}@media print{body{padding:16px}}</style></head><body>${contentRef.current?.innerHTML || ''}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const folderList = folders.length > 0 ? folders : [
    { id: 'reports', name: 'Reports' },
    { id: 'strategies', name: 'Strategies' },
  ];

  return (
    <div className="w-[55%] min-w-[420px] border-l border-slate-200 bg-white flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/meta-icon.svg" alt="Meta" className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 truncate">{title || 'Report'}</p>
            <p className="text-xs text-slate-400">AI Ad Manager · {fmtDate()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative" ref={saveRef}>
            <button onClick={() => setSaveMenuOpen(!saveMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors">
              <Bookmark size={13} /> Save
            </button>
            {saveMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 w-48">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Save to folder</p>
                {folderList.map(folder => (
                  <button key={folder.id}
                    onClick={() => { onSave?.(folder.id); setSaveMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <FileText size={13} className="text-blue-400" />
                    {folder.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handlePrint}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Print report">
            <Printer size={16} />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close panel">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Report body */}
      <div className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="max-w-3xl mx-auto px-8 py-8">
          {/* Report title block */}
          <div className="flex items-center gap-4 mb-6 pb-5 border-b-2 border-slate-800">
            <img src="/meta-icon.svg" alt="Meta" className="w-10 h-10 opacity-70" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title || 'Performance Report'}</h1>
              <p className="text-xs text-slate-400 mt-0.5">Generated {fmtDate()} · AI Ad Manager</p>
            </div>
          </div>

          {/* Render segments as report sections */}
          {segments.map((seg, i) => {
            switch (seg.type) {
              case 'metrics':
                return (
                  <div key={i}>
                    <SectionHeader title="Executive Summary" subtitle="Key performance indicators" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {Array.isArray(seg.data) && seg.data.map((m, j) => (
                        <KpiCard key={j} label={m.label} value={m.value} change={m.change} trend={m.trend} />
                      ))}
                    </div>
                  </div>
                );
              case 'table':
                return (
                  <div key={i}>
                    <SectionHeader title="Performance Breakdown" subtitle="Detailed data" />
                    <TableBarChart columns={seg.columns} rows={seg.rows} />
                    <ReportTable columns={seg.columns} rows={seg.rows} />
                  </div>
                );
              case 'budget':
                return <BudgetPieChart key={i} data={seg.data} />;
              case 'funnel':
                return <FunnelAreaChart key={i} data={seg.data} />;
              case 'comparison':
                return <ComparisonBarChart key={i} data={seg.data} />;
              case 'score':
                return <ScoreGauge key={i} data={seg.data} />;
              case 'insights':
                return <InsightsSection key={i} data={seg.data} />;
              case 'steps':
                return <StepsSection key={i} data={seg.data} />;
              case 'text':
                return <ReportText key={i} content={seg.content} />;
              case 'quickreplies':
                return null; // Skip quick replies in report view
              default:
                return null;
            }
          })}

          {/* Footer */}
          <div className="mt-10 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/meta-icon.svg" alt="Meta" className="w-5 h-5 opacity-40" />
              <span className="text-[10px] text-slate-300 font-medium">AI Ad Manager Report</span>
            </div>
            <span className="text-[10px] text-slate-300">{fmtDate()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
