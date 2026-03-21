import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Square, Paperclip, CheckCircle2, XCircle, ArrowUpRight, BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap, X, Upload, Image, Film, TrendingUp, ChevronRight, Shield, Sparkles, Download, Bookmark } from 'lucide-react';

// ── Export utilities ─────────────────────────────────────────────────────────
const downloadCSV = (title, rows) => {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title.replace(/\s+/g, '_')}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const downloadCardAsImage = async (cardEl, title) => {
  // Use html2canvas if available, otherwise fallback to print
  if (typeof window.html2canvas === 'function') {
    const canvas = await window.html2canvas(cardEl, { backgroundColor: '#fff', scale: 2 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}.png`; a.click();
  } else {
    // Fallback: copy card HTML to print window
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<html><head><title>${title}</title><link rel="stylesheet" href="${document.querySelector('link[rel=stylesheet]')?.href || ''}"></head><body style="padding:24px;background:#fff">${cardEl.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  }
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ thinkingText }) => (
  <div className="flex items-end gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
      <Bot size={15} className="text-white" />
    </div>
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
      {thinkingText && <span className="text-xs text-blue-600 italic">{thinkingText}</span>}
    </div>
  </div>
);

// ── Markdown table parser ────────────────────────────────────────────────────
const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s\-:|]+\|$/.test(line.trim());
const isNumeric = (s) => /^[\s$\-]?[\d,]+\.?\d*[%x]?\s*$/.test(s.trim());

const parseMarkdownTable = (text) => {
  const lines = text.split('\n');
  const segments = [];
  let textBuf = [];
  let i = 0;

  const RICH_BLOCKS = ['adlib', 'metrics', 'options', 'insights', 'score', 'copyvariations', 'steps', 'quickreplies', 'funnel', 'comparison', 'budget'];

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const blockMatch = trimmed.startsWith('```') && RICH_BLOCKS.find(b => trimmed === '```' + b);
    if (blockMatch) {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      i++;
      let jsonBuf = '';
      while (i < lines.length && lines[i].trim() !== '```') { jsonBuf += lines[i] + '\n'; i++; }
      if (i < lines.length) i++;
      try {
        const data = JSON.parse(jsonBuf.trim());
        if (blockMatch === 'adlib' && Array.isArray(data)) segments.push({ type: 'adlib', ads: data });
        else segments.push({ type: blockMatch, data });
      } catch {}
      continue;
    }
    if (isTableRow(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      const parseCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const columns = parseCells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i]) && !isSeparator(lines[i])) {
        const cells = parseCells(lines[i]);
        while (cells.length < columns.length) cells.push('');
        rows.push(cells.slice(0, columns.length));
        i++;
      }
      segments.push({ type: 'table', columns, rows });
    } else { textBuf.push(lines[i]); i++; }
  }
  if (textBuf.length) segments.push({ type: 'text', content: textBuf.join('\n') });
  return segments;
};

// ── Styled table ─────────────────────────────────────────────────────────────
const StyledTable = ({ columns, rows }) => {
  const tableRef = useRef(null);
  const csvRows = rows.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i] || ''])));
  return (
    <div ref={tableRef} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
        <button onClick={() => downloadCSV('Table_Export', csvRows)} title="Download CSV"
          className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-blue-500 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
          <Download size={11} /> CSV
        </button>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col, ci) => (
              <th key={ci} className="px-4 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap text-[11px] uppercase tracking-wide">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 whitespace-nowrap ${isNumeric(cell) ? 'text-right text-slate-800 font-medium tabular-nums' : 'text-left text-slate-600'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Ad Library Cards ─────────────────────────────────────────────────────────
const platformIcon = (p) => {
  if (p === 'facebook') return '📘';
  if (p === 'instagram') return '📷';
  if (p === 'messenger') return '💬';
  return '📱';
};

const AdLibraryCards = ({ ads }) => (
  <div className="my-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {ads.map((ad, i) => (
      <a key={i} href={ad.snapshot_url || '#'} target="_blank" rel="noopener noreferrer"
        className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all group">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{ad.page_name?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{ad.page_name || 'Unknown'}</p>
            <p className="text-[10px] text-slate-400">
              {ad.platforms?.map(p => platformIcon(p)).join(' ') || '📘'}
              {ad.started && <span className="ml-1">· Started {ad.started}</span>}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            ad.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>{ad.status || 'Active'}</span>
        </div>
        <div className="px-3.5 py-3 flex-1">
          {ad.headline && <p className="text-[13px] font-semibold text-slate-800 mb-1.5 line-clamp-2">{ad.headline}</p>}
          {ad.body && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{ad.body}</p>}
        </div>
        <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] text-slate-400">Ad Library</span>
          <span className="text-[10px] text-blue-600 group-hover:text-blue-500 transition-colors">View Ad →</span>
        </div>
      </a>
    ))}
  </div>
);

// ── Meta-style Report Card wrapper ──────────────────────────────────────────
const MetaCard = ({ title, subtitle, children, badge, csvData }) => {
  const cardRef = useRef(null);
  return (
    <div ref={cardRef} className="my-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MetaLogo height={18} />
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {badge && <span className="text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{badge}</span>}
          {csvData && (
            <button onClick={() => downloadCSV(title, csvData)} title="Download CSV"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
              <Download size={13} />
            </button>
          )}
          <button onClick={() => downloadCardAsImage(cardRef.current, title)} title="Save as image"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Image size={13} />
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

// ── Metric Cards ─────────────────────────────────────────────────────────────
const MetricCards = ({ data }) => {
  if (!Array.isArray(data)) return null;
  return (
    <MetaCard title="Performance Overview" subtitle="Key metrics at a glance" badge="Meta Ads"
      csvData={data.map(m => ({ Metric: m.label, Value: m.value, Change: m.change || '', Trend: m.trend || '' }))}>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100">
        {data.map((m, i) => {
          const isUp = m.trend === 'up';
          const isDown = m.trend === 'down';
          const trendColor = isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-slate-400';
          return (
            <div key={i} className="px-4 py-3.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">{m.value}</p>
              {m.change && (
                <div className={`flex items-center gap-1 mt-1.5 ${trendColor}`}>
                  {isUp && <TrendingUp size={11} />}
                  {isDown && <TrendingDown size={11} />}
                  <span className="text-[11px] font-semibold">{m.change}</span>
                  {m.vs && <span className="text-[10px] text-slate-400 ml-0.5">{m.vs}</span>}
                </div>
              )}
              {m.desc && <p className="text-[10px] text-slate-400 mt-1 leading-snug">{m.desc}</p>}
            </div>
          );
        })}
      </div>
    </MetaCard>
  );
};

// ── Option Cards (A/B/C selectable) ──────────────────────────────────────────
const OptionCards = ({ data, onSend }) => {
  if (!data?.options) return null;
  return (
    <MetaCard title={data.title || 'Choose Your Approach'} subtitle="Select a strategy to proceed" badge="Action Required">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-100">
        {data.options.map((opt, i) => (
          <button key={i} onClick={() => onSend?.(`I choose Option ${opt.id}: ${opt.title}`)}
            className="flex flex-col px-4 py-4 text-left hover:bg-blue-50/50 transition-all group relative">
            {opt.tag && (
              <span className="absolute top-2 right-3 text-[9px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">{opt.tag}</span>
            )}
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">{opt.id}</span>
              <p className="text-[13px] font-semibold text-slate-800">{opt.title}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">{opt.desc}</p>
            <div className="flex items-center gap-1 mt-3 text-blue-600 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Select this option</span><ArrowUpRight size={11} />
            </div>
          </button>
        ))}
      </div>
    </MetaCard>
  );
};

// ── Insight Cards (severity-coded recommendations) ───────────────────────────
const InsightCards = ({ data, onSend }) => {
  if (!Array.isArray(data)) return null;
  const severityConfig = {
    critical: { border: 'border-l-red-500', bg: 'bg-white', dot: 'bg-red-500', label: 'Critical', labelCls: 'text-red-600 bg-red-50 border-red-100' },
    warning:  { border: 'border-l-amber-400', bg: 'bg-white', dot: 'bg-amber-400', label: 'Warning', labelCls: 'text-amber-600 bg-amber-50 border-amber-100' },
    success:  { border: 'border-l-emerald-500', bg: 'bg-white', dot: 'bg-emerald-500', label: 'Opportunity', labelCls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    info:     { border: 'border-l-blue-400', bg: 'bg-white', dot: 'bg-blue-400', label: 'Info', labelCls: 'text-blue-600 bg-blue-50 border-blue-100' },
  };
  return (
    <MetaCard title="Insights" subtitle="Ranked by revenue impact" badge="AI Analysis">
      <div className="divide-y divide-slate-100">
        {data.map((item, i) => {
          const cfg = severityConfig[item.severity] || severityConfig.info;
          return (
            <div key={i} className={`${cfg.bg} border-l-4 ${cfg.border} px-4 py-3.5 flex items-start gap-3`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot} mt-1.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.labelCls}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
              {item.action && onSend && (
                <button onClick={() => onSend(item.action)}
                  className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors">
                  {item.action}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </MetaCard>
  );
};

// ── Score Card (audit health) ────────────────────────────────────────────────
const ScoreCard = ({ data }) => {
  if (!data?.score && data?.score !== 0) return null;
  const score = data.score;
  const max = data.max || 10;
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
  const ringColor = pct >= 80 ? 'stroke-emerald-500' : pct >= 50 ? 'stroke-amber-400' : 'stroke-red-500';
  const statusConfig = {
    good:    { icon: <CheckCircle2 size={14} className="text-emerald-500" />, bg: 'bg-emerald-50' },
    warning: { icon: <AlertTriangle size={14} className="text-amber-500" />, bg: 'bg-amber-50' },
    bad:     { icon: <XCircle size={14} className="text-red-500" />, bg: 'bg-red-50' },
  };

  return (
    <MetaCard title={data.label || 'Account Audit'} subtitle="Validate pixel, CAPI, structure, exclusions, and scaling constraints." badge="Audit">
      <div className="flex items-center gap-6 px-4 py-4">
        {/* Score ring */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#f1f5f9" strokeWidth="7" />
            <circle cx="48" cy="48" r="40" fill="none" className={ringColor} strokeWidth="7"
              strokeLinecap="round" strokeDasharray={`${pct * 2.513} 251.3`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${color} tracking-tight`}>{score}</span>
            <span className="text-[10px] text-slate-400 font-medium">/ {max}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {data.items?.map((item, i) => {
            const cfg = statusConfig[item.status] || { icon: <span className="w-3.5 h-3.5 rounded-full bg-slate-300 inline-block" />, bg: 'bg-slate-50' };
            return (
              <div key={i} className={`flex items-start gap-2.5 ${cfg.bg} rounded-lg px-3 py-2`}>
                <span className="mt-0.5 shrink-0">{cfg.icon}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </MetaCard>
  );
};

// ── Copy Variations (A/B selectable ad copy) ─────────────────────────────────
const CopyVariations = ({ data, onSend }) => {
  if (!data?.variations) return null;
  return (
    <MetaCard title="Ad Copy Variations" subtitle={`${data.variations.length} options`} badge="Creative">
      <div className="divide-y divide-slate-100">
        {data.variations.map((v, i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-3.5 hover:bg-slate-50/50 transition-colors">
            <span className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">{v.id}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-semibold text-slate-800">{v.headline}</p>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wide">{v.cta?.replace(/_/g, ' ') || 'CTA'}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{v.primary}</p>
            </div>
            <button onClick={() => onSend?.(`Use copy variation ${v.id}: "${v.headline}"`)}
              className="shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#1877F2] text-white hover:bg-[#1565C0] transition-colors mt-0.5">
              Use this
            </button>
          </div>
        ))}
      </div>
    </MetaCard>
  );
};

// ── Steps List (prioritized actions) ─────────────────────────────────────────
const StepsList = ({ data }) => {
  if (!Array.isArray(data)) return null;
  const priorityConfig = {
    high:   { dot: 'bg-red-500', label: 'Urgent', labelCls: 'text-red-600 bg-red-50 border-red-100' },
    medium: { dot: 'bg-amber-400', label: 'This week', labelCls: 'text-amber-600 bg-amber-50 border-amber-100' },
    low:    { dot: 'bg-emerald-500', label: 'Opportunity', labelCls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  };
  return (
    <MetaCard title="Recommended Actions" subtitle="Prioritized by impact" badge="Action Plan">
      <div className="divide-y divide-slate-100">
        {data.map((step, i) => {
          const cfg = priorityConfig[step.priority] || { dot: 'bg-slate-300', label: step.priority, labelCls: 'text-slate-500 bg-slate-50 border-slate-200' };
          return (
            <div key={i} className="flex items-start gap-3.5 px-4 py-3.5">
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <span className="text-sm font-bold text-slate-300 w-5 text-right tabular-nums">{i + 1}</span>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-800">{step.title}</p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.labelCls}`}>{cfg.label}</span>
                </div>
                {step.reason && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.reason}</p>}
              </div>
            </div>
          );
        })}
    </div>
    </MetaCard>
  );
};

// ── Quick Replies (clickable follow-up chips) ────────────────────────────────
const QuickRepliesCard = ({ data, onSend }) => {
  if (!Array.isArray(data) || !data.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-1">
      {data.map((text, i) => (
        <button key={i} onClick={() => onSend?.(text)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-blue-200 bg-blue-50/60 text-[13px] font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all hover:-translate-y-0.5 active:translate-y-0">
          {text}
          <ArrowUpRight size={12} className="opacity-50" />
        </button>
      ))}
    </div>
  );
};

// ── Funnel Card ──────────────────────────────────────────────────────────────
// Data: { title, stages: [{ label, value, color? }] }
const FunnelCard = ({ data }) => {
  if (!data?.stages?.length) return null;
  const max = Math.max(...data.stages.map(s => parseFloat(s.value) || 0));
  const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'];
  return (
    <MetaCard title={data.title || 'Conversion Funnel'}>
      <div className="space-y-2">
        {data.stages.map((stage, i) => {
          const val = parseFloat(stage.value) || 0;
          const pct = max > 0 ? (val / max) * 100 : 0;
          const dropoff = i > 0 ? (((parseFloat(data.stages[i-1].value) || 0) - val) / (parseFloat(data.stages[i-1].value) || 1) * 100).toFixed(1) : null;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{typeof stage.value === 'number' ? stage.value.toLocaleString() : stage.value}</span>
                  {dropoff !== null && <span className="text-[10px] text-red-400">-{dropoff}%</span>}
                </div>
              </div>
              <div className="w-full h-6 bg-slate-100 rounded-md overflow-hidden">
                <div className={`h-full ${stage.color || colors[i % colors.length]} rounded-md transition-all`} style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </MetaCard>
  );
};

// ── Comparison Card ──────────────────────────────────────────────────────────
// Data: { title, items: [{ label, metrics: { [key]: { a, b } } }] } OR { title, a_label, b_label, metrics: [{ label, a, b }] }
const ComparisonCard = ({ data }) => {
  if (!data?.metrics?.length) return null;
  return (
    <MetaCard title={data.title || 'Comparison'}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase">Metric</th>
              <th className="text-right py-2 px-2 text-[11px] font-semibold text-blue-600 uppercase">{data.a_label || 'Period A'}</th>
              <th className="text-right py-2 px-2 text-[11px] font-semibold text-violet-600 uppercase">{data.b_label || 'Period B'}</th>
              <th className="text-right py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase">Change</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m, i) => {
              const a = parseFloat(m.a) || 0;
              const b = parseFloat(m.b) || 0;
              const delta = a !== 0 ? ((b - a) / a * 100).toFixed(1) : '—';
              const isPositive = typeof delta === 'string' && delta !== '—' ? parseFloat(delta) > 0 : false;
              const isNegative = typeof delta === 'string' && delta !== '—' ? parseFloat(delta) < 0 : false;
              return (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 px-2 font-medium text-slate-700">{m.label}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{m.a}</td>
                  <td className="py-2 px-2 text-right text-slate-600">{m.b}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-500' : 'text-slate-400'}`}>
                    {delta !== '—' ? `${isPositive ? '+' : ''}${delta}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MetaCard>
  );
};

// ── Budget Card ──────────────────────────────────────────────────────────────
// Data: { title, total_budget, items: [{ name, spend, percentage, roas? }] }
const BudgetCard = ({ data }) => {
  if (!data?.items?.length) return null;
  const total = parseFloat(data.total_budget) || data.items.reduce((s, it) => s + (parseFloat(it.spend) || 0), 0);
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500'];
  return (
    <MetaCard title={data.title || 'Budget Allocation'}>
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden mb-4 bg-slate-100">
        {data.items.map((item, i) => {
          const pct = total > 0 ? ((parseFloat(item.spend) || 0) / total * 100) : 0;
          return <div key={i} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} title={`${item.name}: ${pct.toFixed(1)}%`} />;
        })}
      </div>
      {/* Legend */}
      <div className="space-y-2">
        {data.items.map((item, i) => {
          const spend = parseFloat(item.spend) || 0;
          const pct = total > 0 ? (spend / total * 100).toFixed(1) : '0';
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${colors[i % colors.length]}`} />
                <span className="text-xs font-medium text-slate-700 truncate max-w-[180px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{pct}%</span>
                <span className="text-xs font-semibold text-slate-800">${spend.toLocaleString()}</span>
                {item.roas && <span className="text-[10px] font-medium text-emerald-600">{item.roas}x ROAS</span>}
              </div>
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Total</span>
          <span className="text-sm font-bold text-slate-900">${total.toLocaleString()}</span>
        </div>
      )}
    </MetaCard>
  );
};

// ── Rich text renderer ───────────────────────────────────────────────────────
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i} className="text-slate-800 font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

const renderRichText = (text) => {
  const lines = text.split('\n');
  const elements = [];
  let listBuf = [];
  let listType = null;

  const flushList = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    const cls = listType === 'ol'
      ? 'list-decimal list-inside space-y-1 my-1.5 ml-1 text-slate-600'
      : 'list-disc list-inside space-y-1 my-1.5 ml-1 text-slate-600';
    elements.push(<Tag key={`list-${elements.length}`} className={cls}>{listBuf.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</Tag>);
    listBuf = []; listType = null;
  };

  for (const line of lines) {
    if (line.startsWith('### ')) { flushList(); elements.push(<p key={elements.length} className="text-sm font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(4))}</p>); continue; }
    if (line.startsWith('## '))  { flushList(); elements.push(<p key={elements.length} className="text-base font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(3))}</p>); continue; }
    const bullet = line.match(/^[\-\*]\s+(.*)/);
    if (bullet) { if (listType && listType !== 'ul') flushList(); listType = 'ul'; listBuf.push(bullet[1]); continue; }
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (numbered) { if (listType && listType !== 'ol') flushList(); listType = 'ol'; listBuf.push(numbered[1]); continue; }
    flushList();
    if (!line.trim()) { elements.push(<div key={elements.length} className="h-2" />); continue; }
    elements.push(<p key={elements.length}>{renderInline(line)}</p>);
  }
  flushList();
  return elements;
};

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

// ── Quick reply / Confirm-Reject chips ───────────────────────────────────────
const QuickReplies = ({ actions, onSend, disabled }) => (
  <div className="flex justify-end flex-wrap gap-2 mt-3 mb-1 pr-1">
    {actions.map(({ label, value, variant = 'default' }) => (
      <button key={value} onClick={() => onSend(value)} disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-md shadow-emerald-100' :
            variant === 'danger'  ? 'bg-red-500 hover:bg-red-400 text-white border-red-400 shadow-md shadow-red-100' :
            'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 shadow-sm'}`}>
        {variant === 'confirm' && <CheckCircle2 size={14} />}
        {variant === 'danger' && <XCircle size={14} />}
        {label}
      </button>
    ))}
  </div>
);

// ── Report renderer ──────────────────────────────────────────────────────────
const roasColor = (r) => r >= 3 ? 'text-emerald-600' : r >= 2 ? 'text-amber-600' : r > 0 ? 'text-red-500' : 'text-slate-400';
const truncate = (s, n = 28) => s.length > n ? s.slice(0, n) + '…' : s;
const fmtUSD = (n) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
const fmtNum = (n) => n > 0 ? n.toLocaleString() : '—';

const SummaryCard = ({ label, value, sub }) => (
  <div className="flex flex-col gap-0.5 bg-slate-50 rounded-xl px-3 py-2.5 flex-1 min-w-0">
    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
  </div>
);

const ReportMessage = ({ message, timestamp }) => {
  const { campaigns = [], insights, adAccountId } = message;
  const totSpend   = insights?.totalSpend   ?? campaigns.reduce((s, c) => s + c.spend, 0);
  const totImp     = insights?.impressions  ?? campaigns.reduce((s, c) => s + c.impressions, 0);
  const totClicks  = insights?.clicks       ?? campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgRoas    = insights?.roas         ?? (() => { const a = campaigns.filter(c => c.roas > 0); return a.length ? a.reduce((s, c) => s + c.roas, 0) / a.length : 0; })();

  return (
    <div className="flex items-end gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Campaign Performance Report</p>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days · <span className="font-mono">{adAccountId}</span></p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-medium">Meta Ads API</span>
          </div>
          <div className="px-3 py-3 flex gap-2 border-b border-slate-200">
            <SummaryCard label="Total Spend" value={fmtUSD(totSpend)} sub="Last 7 days" />
            <SummaryCard label="Impressions" value={fmtNum(totImp)} sub="Last 7 days" />
            <SummaryCard label="Clicks" value={fmtNum(totClicks)} sub="Last 7 days" />
            <SummaryCard label="Avg ROAS" value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'} sub="Across campaigns" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Campaign','Delivery','Budget','Spend','ROAS','Impressions','Clicks','CTR'].map(h => (
                    <th key={h} className={`px-3 py-2.5 font-semibold text-slate-500 ${['Budget','Spend','ROAS','Impressions','Clicks','CTR'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 max-w-[180px]"><p className="font-medium text-slate-800" title={c.name}>{truncate(c.name)}</p><p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{c.id}</p></td>
                    <td className="px-3 py-2.5">{c.status === 'ACTIVE' ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span> : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]">Paused</span>}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">${(c.daily_budget / 100).toFixed(0)}/day</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmtUSD(c.spend)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${roasColor(c.roas)}`}>{c.roas > 0 ? `${c.roas}x` : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{fmtNum(c.impressions)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{fmtNum(c.clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <span className="text-slate-400">📡</span>
            <code className="text-[10px] text-slate-400 font-mono">GET /{adAccountId}/insights</code>
            <span className="text-slate-300">·</span>
            <code className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded font-mono">ads_read</code>
            <span className="ml-auto text-[10px] text-slate-400">{fmtTime(timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Table renderer (structured) ──────────────────────────────────────────────
const TableMessage = ({ message }) => (
  <div className="flex items-end gap-3 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="max-w-[95%] w-full">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm overflow-hidden shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-slate-50 border-b border-slate-200">{message.columns.map((col) => (<th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{col}</th>))}</tr></thead>
          <tbody>{message.rows.map((row, ri) => (<tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>{row.map((cell, ci) => (<td key={ci} className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{cell}</td>))}</tr>))}</tbody>
        </table>
        {message.summary && <div className="px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 italic">{renderInline(message.summary)}</div>}
      </div>
      <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
    </div>
  </div>
);

// ── Attachment thumbnail chip ────────────────────────────────────────────────
const AttachmentChip = ({ attachment, onRemove }) => {
  const isImage = attachment.file?.type?.startsWith('image/');
  const isDoc = attachment.isDoc || attachment.file?.name?.match(/\.(pdf|txt|doc|docx)$/i);
  return (
    <div className="relative group flex-shrink-0">
      <div className={`w-20 h-20 rounded-xl border overflow-hidden flex items-center justify-center
        ${attachment.status === 'error' ? 'border-red-300 bg-red-50' :
          attachment.status === 'done' ? 'border-emerald-300 bg-white' :
          'border-slate-200 bg-slate-50'}`}>
        {attachment.preview ? (
          <img src={attachment.preview} alt={attachment.file.name} className="w-full h-full object-cover" />
        ) : isDoc ? (
          <div className="flex flex-col items-center">
            <FileText size={22} className="text-blue-400" />
            <span className="text-[8px] text-slate-400 mt-0.5 truncate max-w-[60px]">{attachment.file.name.split('.').pop()?.toUpperCase()}</span>
          </div>
        ) : (
          <Film size={24} className="text-slate-400" />
        )}
        {/* Upload progress overlay */}
        {attachment.status === 'uploading' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-[9px] font-medium text-blue-600 mt-1">{attachment.progress}%</span>
          </div>
        )}
        {attachment.status === 'done' && (
          <div className="absolute bottom-1 right-1">
            <CheckCircle2 size={14} className="text-emerald-500 bg-white rounded-full" />
          </div>
        )}
        {attachment.status === 'error' && (
          <div className="absolute bottom-1 right-1">
            <XCircle size={14} className="text-red-500 bg-white rounded-full" />
          </div>
        )}
      </div>
      {/* Remove button */}
      {onRemove && (
        <button onClick={() => onRemove(attachment.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <X size={10} />
        </button>
      )}
      {/* Filename */}
      <p className="text-[9px] text-slate-500 mt-1 truncate w-20 text-center">{attachment.file?.name?.slice(0, 12)}</p>
    </div>
  );
};

// ── Attachment bar (above input) ─────────────────────────────────────────────
const AttachmentBar = ({ attachments, onRemove }) => {
  if (!attachments.length) return null;
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
      {attachments.map((a) => (
        <AttachmentChip key={a.id} attachment={a} onRemove={onRemove} />
      ))}
    </div>
  );
};

// ── Message attachment thumbnails (in user bubble) ───────────────────────────
const MessageAttachments = ({ attachments }) => {
  if (!attachments?.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mb-2">
      {attachments.map((a, i) => (
        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-white/30">
          {a.preview ? (
            <img src={a.preview} alt={a.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Film size={16} className="text-white/70" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Save menu for agent messages ─────────────────────────────────────────────
const SaveMenu = ({ messageId, onSave }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
        title="Save this message"
      >
        <Bookmark size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 w-44">
          <button
            onClick={() => { onSave(messageId, 'report'); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            <FileText size={13} className="text-blue-400" />
            Save as Report
          </button>
          <button
            onClick={() => { onSave(messageId, 'strategy'); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
          >
            <Sparkles size={13} className="text-amber-400" />
            Save as Strategy
          </button>
        </div>
      )}
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping, onSaveItem }) => {
  if (message.type === 'report') return (<><ReportMessage message={message} timestamp={message.timestamp} /><div className="mb-2" /></>);
  if (message.type === 'table') return (<><TableMessage message={message} />{isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}<div className="mb-6" /></>);

  const isAgent = message.role === 'agent';
  if (isAgent) {
    const segments = parseMarkdownTable(message.text);
    const hasWide = segments.some(s => s.type !== 'text');
    return (
      <>
        <div className="flex items-end gap-3 mb-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
            <Bot size={15} className="text-white" />
          </div>
          <div className={hasWide ? 'max-w-[95%] flex-1 min-w-0' : 'max-w-[80%]'}>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm relative">
              {onSaveItem && message.id !== 'welcome' && (
                <div className="absolute top-2 right-2 z-10">
                  <SaveMenu messageId={message.id} onSave={onSaveItem} />
                </div>
              )}
              {segments.map((seg, i) => {
                switch (seg.type) {
                  case 'table': return <StyledTable key={i} columns={seg.columns} rows={seg.rows} />;
                  case 'adlib': return <AdLibraryCards key={i} ads={seg.ads} />;
                  case 'metrics': return <MetricCards key={i} data={seg.data} />;
                  case 'options': return <OptionCards key={i} data={seg.data} onSend={onSend} />;
                  case 'insights': return <InsightCards key={i} data={seg.data} onSend={onSend} />;
                  case 'score': return <ScoreCard key={i} data={seg.data} />;
                  case 'copyvariations': return <CopyVariations key={i} data={seg.data} onSend={onSend} />;
                  case 'steps': return <StepsList key={i} data={seg.data} />;
                  case 'quickreplies': return <QuickRepliesCard key={i} data={seg.data} onSend={onSend} />;
                  case 'funnel': return <FunnelCard key={i} data={seg.data} />;
                  case 'comparison': return <ComparisonCard key={i} data={seg.data} />;
                  case 'budget': return <BudgetCard key={i} data={seg.data} />;
                  default: return <div key={i} className="whitespace-pre-wrap">{renderRichText(seg.content)}</div>;
                }
              })}
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
          </div>
        </div>
        {isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}
        <div className="mb-6" />
      </>
    );
  }

  // User message
  return (
    <div className="flex items-end justify-end gap-3 mb-6">
      <div className="max-w-[75%]">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-md shadow-blue-200/30">
          {message.attachments && <MessageAttachments attachments={message.attachments} />}
          {message.text}
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Icon map for action cards ────────────────────────────────────────────────
const ICON_MAP = { BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap };
const ICON_BG = {
  BarChart3: 'bg-[#4F6BED]', Target: 'bg-[#00A67E]', TrendingDown: 'bg-[#E8453C]', Search: 'bg-[#8B5CF6]',
  FileText: 'bg-[#F59E0B]', DollarSign: 'bg-[#0891B2]', AlertTriangle: 'bg-[#F97316]', Zap: 'bg-[#EAB308]',
};

// Meta logo — full logo for report card headers
const MetaLogo = ({ height = 16 }) => (
  <img src="/meta-logo.svg" alt="Meta" style={{ height }} className="shrink-0" />
);

// Meta icon — infinity symbol only, for action cards
const MetaIconOnly = ({ size = 18 }) => (
  <img src="/meta-icon.svg" alt="Meta" style={{ width: size, height: size }} className="shrink-0" />
);

const ActionCard = ({ icon, label, desc, prompt, onSend, disabled }) => {
  const Icon = ICON_MAP[icon] || Zap;
  const bg = ICON_BG[icon] || 'bg-slate-500';
  return (
    <button onClick={() => onSend(prompt)} disabled={disabled}
      className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-xl px-4 py-3.5 text-left hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all duration-150 disabled:opacity-40 group">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5 relative`}>
        <Icon size={15} className="text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
          <MetaIconOnly size={10} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 leading-snug">{label}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{desc}</p>
      </div>
      <ArrowUpRight size={13} className="text-slate-200 group-hover:text-blue-400 transition-colors shrink-0 mt-1" />
    </button>
  );
};

// ── Input box with drag & drop ───────────────────────────────────────────────
const ChatInput = ({ input, setInput, onKeyDown, onSend, onStop, onFilesAdded, attachments, onRemoveAttachment, fileRef, isTyping, handleFileUpload, isOver }) => (
  <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 transition-all
    ${isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
    <AttachmentBar attachments={attachments} onRemove={onRemoveAttachment} />
    <div className="px-4 pt-4 pb-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={attachments.length ? 'Describe what to do with these files...' : 'Ask anything about your ads...'}
        rows={1}
        disabled={isTyping}
        className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 max-h-32 overflow-y-auto"
        style={{ lineHeight: '1.5' }}
      />
    </div>
    <div className="px-4 pb-3 flex items-center justify-end">
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <Paperclip size={16} />
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.txt,.doc,.docx" multiple className="hidden" onChange={handleFileUpload} />
        {isTyping ? (
          <button onClick={onStop}
            className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-colors shadow-sm"
            title="Stop generating">
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button onClick={onSend} disabled={!input.trim() && !attachments.length}
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shadow-sm">
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend, onStop, suggestedActions = [], adAccountId, onSaveItem }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]); // { id, file, preview, status, progress, result }
  const [isDragOver, setIsDragOver] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fileRef  = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  const isEmptyState = messages.length <= 1;
  const dragCounter = useRef(0);

  // Upload a single file to Meta via our bulk-upload endpoint
  const uploadFile = useCallback(async (attachment) => {
    if (!adAccountId) {
      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'error', error: 'Select an ad account first' } : a));
      return;
    }

    setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'uploading', progress: 10 } : a));

    try {
      // Read file as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(attachment.file);
      });

      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, progress: 40 } : a));

      const bearerToken = localStorage.getItem('fb_long_lived_token');
      const res = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
        },
        body: JSON.stringify({
          adAccountId,
          files: [{ name: attachment.file.name, type: attachment.file.type, base64 }],
        }),
      });

      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, progress: 80 } : a));

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const result = data.results?.[0];
      if (result?.status === 'success') {
        setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'done', progress: 100, result } : a));
      } else {
        setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: result?.status === 'pending' ? 'done' : 'error', progress: 100, result, error: result?.message } : a));
      }
    } catch (err) {
      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'error', progress: 0, error: err.message } : a));
    }
  }, [adAccountId]);

  // Add files from input or drag & drop
  const addFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    const isDoc = (f) => f.name.match(/\.(pdf|txt|doc|docx)$/i);

    // Media files — upload to Meta
    const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const mediaAttachments = mediaFiles.map(file => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return { id, file, preview, status: 'queued', progress: 0, result: null };
    });
    if (mediaAttachments.length) {
      setAttachments(prev => [...prev, ...mediaAttachments]);
      mediaAttachments.forEach(a => uploadFile(a));
    }

    // Document files — parse text and add as attachment with extracted content
    const docFiles = files.filter(isDoc);
    docFiles.forEach(async (file) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      setAttachments(prev => [...prev, { id, file, preview: null, status: 'uploading', progress: 30, result: null, isDoc: true }]);

      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const docBearerToken = localStorage.getItem('fb_long_lived_token');
        const res = await fetch('/api/chat/parse-doc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(docBearerToken && { Authorization: `Bearer ${docBearerToken}` }),
          },
          body: JSON.stringify({ base64, type: file.type, name: file.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setAttachments(prev => prev.map(a => a.id === id ? {
          ...a, status: 'done', progress: 100,
          result: { type: 'document', text: data.text, charCount: data.charCount, truncated: data.truncated },
        } : a));
      } catch (err) {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error: err.message } : a));
      }
    });
  }, [uploadFile]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const removeAttachment = useCallback((id) => {
    setAttachments(prev => {
      const a = prev.find(x => x.id === id);
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text) => {
    const t = (typeof text === 'string' ? text : input).trim();
    const doneAttachments = attachments.filter(a => a.status === 'done');

    if (!t && !doneAttachments.length) return;
    if (isTyping) {
      // If typing and user clicks a suggested action card, stop first then send
      if (typeof text === 'string' && onStop) { onStop(); }
      else return;
    }

    // Build message text with asset info
    let msgText = t;
    const mediaAttachments = doneAttachments.filter(a => !a.isDoc);
    const docAttachments = doneAttachments.filter(a => a.isDoc && a.result?.text);

    if (mediaAttachments.length || docAttachments.length) {
      const lines = [];

      // Document context — inject extracted text
      docAttachments.forEach(a => {
        lines.push(`[Document: ${a.file.name} (${a.result.charCount} chars${a.result.truncated ? ', truncated' : ''})]\n${a.result.text}`);
      });

      // Media assets
      mediaAttachments.forEach(a => {
        if (a.result?.image_hash) lines.push(`[Uploaded image: ${a.file.name}, image_hash: ${a.result.image_hash}]`);
        else if (a.result?.video_id) lines.push(`[Uploaded video: ${a.file.name}, video_id: ${a.result.video_id}]`);
        else if (a.result?.type === 'video') lines.push(`[Attached video: ${a.file.name} — upload failed]`);
        else lines.push(`[Attached file: ${a.file.name}]`);
      });

      const defaultPrompt = docAttachments.length
        ? `\n\nI've uploaded a strategy/brand document. Please analyze it and suggest a campaign plan based on its content.`
        : `\n\nI've uploaded these creatives to the ad account. What would you like to do with them?`;

      msgText = lines.join('\n') + (t ? '\n\n' + t : defaultPrompt);
    }

    // Pass attachment previews so user message shows thumbnails
    const msgAttachments = doneAttachments.map(a => ({
      name: a.file.name,
      preview: a.preview,
      type: a.file.type,
      image_hash: a.result?.image_hash,
      video_id: a.result?.video_id,
    }));

    onSend(msgText, msgAttachments);
    setInput('');
    setAttachments([]);
    inputRef.current?.focus();
  }, [input, isTyping, onSend, attachments]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-50/80 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={48} className="text-blue-500 mb-3" />
          <p className="text-lg font-semibold text-blue-700">Drop your images & videos here</p>
          <p className="text-sm text-blue-500 mt-1">They'll be uploaded to your ad account</p>
        </div>
      )}

      {/* Empty State */}
      {isEmptyState && (
        <div className="flex-1 flex flex-col px-8 overflow-y-auto">
          {/* Spacer to push content to ~38% from top */}
          <div className="flex-[0_0_32%]" />

          <div className="w-full max-w-2xl mx-auto">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-6 text-center tracking-tight">
              What would you like to know?
            </h1>
            <ChatInput
              input={input} setInput={setInput} onKeyDown={handleKeyDown}
              onSend={() => handleSend()} onStop={onStop} onFilesAdded={addFiles}
              attachments={attachments} onRemoveAttachment={removeAttachment}
              fileRef={fileRef} isTyping={isTyping}
              handleFileUpload={handleFileInput} isOver={isDragOver}
            />
          </div>

          <div className="w-full max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3 mt-8 pb-8">
            {suggestedActions.map((action) => (
              <ActionCard key={action.label} {...action} onSend={handleSend} disabled={isTyping} />
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {!isEmptyState && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isLatest={msg.id === lastId} onSend={handleSend} isTyping={isTyping} onSaveItem={onSaveItem} />
              ))}
              {isTyping && <TypingIndicator thinkingText={thinkingText} />}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                input={input} setInput={setInput} onKeyDown={handleKeyDown}
                onSend={() => handleSend()} onStop={onStop} onFilesAdded={addFiles}
                attachments={attachments} onRemoveAttachment={removeAttachment}
                fileRef={fileRef} isTyping={isTyping}
                handleFileUpload={handleFileInput} isOver={isDragOver}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
