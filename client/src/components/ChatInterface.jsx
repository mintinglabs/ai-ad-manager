import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Send, Square, Paperclip, CheckCircle2, XCircle, ArrowUpRight, BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap, X, Upload, Image, Film, TrendingUp, ChevronRight, Shield, Sparkles, Download, Bookmark, ChevronDown, Link2, Building2, Check, ChevronLeft, Users, Plus, RefreshCw, Loader2, PackageOpen, CheckSquare, BookMarked, Brain } from 'lucide-react';
import VideoAudienceCard from './VideoAudienceCard.jsx';
import EngagementAudienceCard from './EngagementAudienceCard.jsx';
import LookalikeAudienceCard from './LookalikeAudienceCard.jsx';
import SavedAudienceCard from './SavedAudienceCard.jsx';
import WebsiteAudienceCard from './WebsiteAudienceCard.jsx';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { uploadToGcs } from '../hooks/useGcsUpload.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';

const CHART_COLORS = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#ef4444','#14b8a6'];
const parseNum = (s) => {
  if (typeof s === 'number') return s;
  if (!s || typeof s !== 'string') return 0;
  return parseFloat(s.replace(/[$,%x\s]/g, '').replace(/,/g, '')) || 0;
};

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

// ── Creation wizard accordion ─────────────────────────────────────────────────
const STEP_LABELS = ['Campaign & Targeting', 'Creative', 'Review & Launch'];
const STEP_ICONS = [Target, Sparkles, CheckCircle2];

const CreationStepBanner = ({ step, summary = {} }) => {
  if (!step) return null;
  const [expandedPhase, setExpandedPhase] = useState(null);

  // Auto-expand completed phases when clicked, but don't auto-expand by default
  const togglePhase = (phase) => {
    setExpandedPhase(prev => prev === phase ? null : phase);
  };

  const phaseSummaryText = (phase) => {
    if (phase === 1 && summary.phase1) {
      const p = summary.phase1;
      return `${p.campaign_objective || 'Campaign'} · Ad Set created`;
    }
    if (phase === 2 && summary.phase2) {
      const p = summary.phase2;
      const count = p.creative_ids?.length || 1;
      return `${count} creative${count > 1 ? 's' : ''} · ${p.ad_format || 'Ready'}`;
    }
    return null;
  };

  return (
    <div className="bg-white border-b border-slate-100 shrink-0">
      {/* Compact progress bar */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className="text-[11px] font-medium text-slate-400 shrink-0">Creating ad</span>
        <div className="flex items-center gap-1 flex-1">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done = num < step.current;
            const active = num === step.current;
            const Icon = STEP_ICONS[i];
            return (
              <React.Fragment key={i}>
                <button onClick={() => done ? togglePhase(num) : null}
                  className={`flex items-center gap-1.5 transition-colors ${done ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                    ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all
                    ${active ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100' : done ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    {done ? <CheckCircle2 size={12} /> : <Icon size={12} />}
                  </div>
                  <span className="text-[11px] font-semibold hidden sm:block">{label}</span>
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-px min-w-[16px] transition-colors ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Expandable phase summary panels */}
      {[1, 2, 3].map(phase => {
        const done = phase < step.current;
        const summaryText = phaseSummaryText(phase);
        if (!done || !summaryText || expandedPhase !== phase) return null;
        return (
          <div key={phase} className="px-4 py-2.5 bg-emerald-50/50 border-t border-emerald-100 animate-in slide-in-from-top-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-700">{STEP_LABELS[phase - 1]}</span>
                <span className="text-[11px] text-emerald-600">{summaryText}</span>
              </div>
              <button onClick={() => setExpandedPhase(null)} className="text-emerald-400 hover:text-emerald-600">
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const ActivityLog = ({ entries }) => {
  const [expanded, setExpanded] = useState(true);

  // Auto-collapse 1.5s after all entries complete
  useEffect(() => {
    if (entries?.length && entries.every(e => e.done)) {
      const t = setTimeout(() => setExpanded(false), 1500);
      return () => clearTimeout(t);
    } else if (entries?.some(e => !e.done)) {
      setExpanded(true);
    }
  }, [entries]);

  if (!entries?.length) return null;
  const allDone = entries.every(e => e.done);
  const runningCount = entries.filter(e => !e.done).length;

  return (
    <div className="mb-1.5">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors w-full text-left"
      >
        <ChevronRight size={10} className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        {allDone
          ? `${entries.length} action${entries.length > 1 ? 's' : ''} completed`
          : `${runningCount} action${runningCount > 1 ? 's' : ''} running…`}
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-4">
          {entries.map((entry) => {
            // The synthetic end-of-turn summary row gets a different look:
            // amber-tinted with a Zap icon so it reads as a totals line,
            // not just another tool call.
            if (entry.isSummary) {
              return (
                <div key={entry.id} className="flex items-center gap-2 text-[11px] py-0.5 mt-0.5 pt-1 border-t border-slate-100">
                  <Zap size={11} className="text-amber-500 shrink-0 fill-amber-100" />
                  <span className="text-slate-500 font-medium">{entry.label}</span>
                  {entry.partial && (
                    <span className="ml-auto text-[10px] text-amber-600 font-semibold">capped</span>
                  )}
                </div>
              );
            }
            return (
              <div key={entry.id} className="flex items-center gap-2 text-[11px] py-0.5">
                {entry.done
                  ? <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                  : <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                }
                <span className={entry.done ? 'text-slate-400' : 'text-slate-600 font-medium'}>
                  {entry.label}
                </span>
                {entry.summary && (
                  <span className="ml-auto text-slate-400 tabular-nums">{entry.summary}</span>
                )}
                {/* Per-tool cost chip — only shown when the server sent a
                    positive cost. Free internal tools (transfer_to_agent,
                    update_workflow_context) come through with cost=0 and
                    we suppress the chip to keep the log clean. */}
                {typeof entry.cost === 'number' && entry.cost > 0 && (
                  <span className={`${entry.summary ? 'ml-2' : 'ml-auto'} inline-flex items-center gap-0.5 text-[10px] tabular-nums text-amber-600 font-semibold`}>
                    <Zap size={9} className="fill-amber-200" />
                    {entry.cost}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Loading state shown while the agent is streaming a response.
//
// Old version: 3 bouncy dots + italic blue "Thinking..." text. Read as
// "page still loading" rather than "AI generating", and clashed visually
// with the rest of the chat (which uses muted slate / orange brand).
//
// New version is layered:
//   • Avatar wears a soft pulsing halo (animate-ping ring) so the page
//     has one obvious "I'm alive" signal even at a glance.
//   • Bubble has a slow shimmer sweeping left-to-right — the same trick
//     Linear/Vercel use for inflight skeleton rows. Kept subtle (orange
//     tint at 30% over white) so it doesn't compete with content.
//   • Three dots fade in/out in sequence (longer 1.4s cycle, no bounce)
//     paired with a calm slate label ("Generating response" by default,
//     overridable via thinkingText prop).
//
// shimmer keyframes live in client/src/index.css so any chat skeleton
// elsewhere can reuse the same `animate-shimmer` class.
const TypingIndicator = ({ thinkingText, activityLog }) => {
  const hasActivity = activityLog?.some(e => !e.done);
  return (
    <div className="flex items-end gap-3 mb-6">
      <div className="relative w-8 h-8 shrink-0">
        <span className="absolute inset-0 rounded-full bg-orange-400/40 animate-ping" />
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-500/30">
          <Zap size={15} className="text-white" />
        </div>
      </div>
      <div className="relative overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-200/70 rounded-2xl rounded-bl-sm px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] min-w-[150px]">
        {/* Light orange shimmer pass — sits behind content via z-0. */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-orange-200/40 to-transparent animate-shimmer" />
        <div className="relative">
          <ActivityLog entries={activityLog} />
          {!hasActivity && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1">
                {[0, 200, 400].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full bg-orange-400/80"
                    style={{ animation: 'pulse 1.4s ease-in-out infinite', animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
              <span className="text-[12px] font-medium text-slate-500">{thinkingText || 'Generating response'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Markdown table parser ────────────────────────────────────────────────────
const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s\-:|]+\|$/.test(line.trim());
const isNumeric = (s) => /^[\s$\-]?[\d,]+\.?\d*[%x]?\s*$/.test(s.trim());

export const parseMarkdownTable = (text) => {
  const lines = text.split('\n');
  const segments = [];
  let textBuf = [];
  let i = 0;

  const RICH_BLOCKS = ['adlib', 'metrics', 'options', 'insights', 'score', 'copyvariations', 'steps', 'quickreplies', 'funnel', 'comparison', 'budget', 'trend', 'adpreview', 'setupcard', 'mediagrid', 'videoaudience', 'engagementaudience', 'lookalikeaudience', 'savedaudience', 'websiteaudience', 'dashboard', 'postpicker'];
  // Aliases for common LLM misspellings
  const BLOCK_ALIASES = { option: 'options', quickreplie: 'quickreplies', quickreply: 'quickreplies', copyvariation: 'copyvariations', metric: 'metrics', step: 'steps', setupcard: 'setupcard', videogrid: 'mediagrid', postgrid: 'mediagrid' };

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const backtickMatch = trimmed.match(/^(`{2,3})(.*)/);
    const blockTag = backtickMatch ? backtickMatch[2].trim().toLowerCase() : '';
    const openFence = backtickMatch ? backtickMatch[1] : '```';
    const blockMatch = blockTag && (RICH_BLOCKS.find(b => b === blockTag) || BLOCK_ALIASES[blockTag]);
    if (blockMatch) {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      i++;
      let jsonBuf = '';
      while (i < lines.length && !lines[i].trim().startsWith(openFence.slice(0,2))) { jsonBuf += lines[i] + '\n'; i++; }
      if (i < lines.length) i++;
      try {
        const data = JSON.parse(jsonBuf.trim());
        if (blockMatch === 'adlib' && Array.isArray(data)) segments.push({ type: 'adlib', ads: data });
        else segments.push({ type: blockMatch, data });
      } catch (e) {
        // JSON parse failed — fall back to showing raw text so content isn't silently lost
        console.warn(`[parseMarkdownTable] failed to parse ${blockMatch} block:`, e.message);
        if (jsonBuf.trim()) segments.push({ type: 'text', content: '```' + blockMatch + '\n' + jsonBuf + '```' });
      }
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
const TableBarChart = ({ columns, rows }) => {
  const numericCols = columns.slice(1).filter((_, ci) =>
    rows.some(row => parseNum(row[ci + 1]) > 0)
  );
  const chartCols = numericCols.slice(0, 3);
  if (!chartCols.length || rows.length < 2) return null;

  const data = rows.slice(0, 10).map(row => {
    const entry = { name: String(row[0] || '').length > 18 ? String(row[0]).slice(0, 18) + '…' : String(row[0] || '') };
    chartCols.forEach(col => {
      const ci = columns.indexOf(col);
      entry[col] = parseNum(row[ci]);
    });
    return entry;
  });

  return (
    <div className="px-4 py-3 border-t border-slate-100">
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#475569' }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
            formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]} />
          {chartCols.map((col, i) => (
            <Bar key={col} dataKey={col} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]} barSize={16} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

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
      <TableBarChart columns={columns} rows={rows} />
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
          <span className="text-[10px] text-slate-400">Ads Gallery</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3">
        {data.map((m, i) => {
          const isUp = m.trend === 'up';
          const isDown = m.trend === 'down';
          const trendColor = isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-slate-400';
          return (
            <div key={i} className="bg-gradient-to-br from-slate-50/80 to-white rounded-xl px-4 py-3.5 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">{m.label}</p>
              <p className="text-xl font-extrabold text-slate-900 leading-tight tracking-tight">{m.value}</p>
              {m.change && (
                <div className={`flex items-center gap-1 mt-1.5 ${trendColor}`}>
                  {isUp && <TrendingUp size={11} />}
                  {isDown && <TrendingDown size={11} />}
                  <span className="text-[10px] font-bold">{m.change}</span>
                  {m.vs && <span className="text-[9px] text-slate-400 ml-0.5">{m.vs}</span>}
                </div>
              )}
              {m.desc && <p className="text-[9px] text-slate-400 mt-1 leading-snug">{m.desc}</p>}
            </div>
          );
        })}
      </div>
    </MetaCard>
  );
};

// ── Option Cards (A/B/C selectable) ──────────────────────────────────────────
const isRawId = (v) => typeof v === 'string' && /^\d{6,}$/.test(v);
const badgeLabel = (opt) => {
  if (!isRawId(opt.id) && String(opt.id).length <= 3) return opt.id;
  return opt.title?.[0]?.toUpperCase() || '?';
};

const OptionCards = ({ data, onSend, isAnswered, selectedTitle }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  if (!data?.options) return null;

  // Collapsed state: show a single chip with the selected option
  if (isAnswered && selectedTitle) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[13px] my-1">
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
        <span className="font-semibold text-emerald-800">{selectedTitle}</span>
        <span className="text-emerald-500 text-[11px] ml-auto">Selected</span>
      </div>
    );
  }

  // Dropdown layout — for long lists (audiences, videos, posts)
  if (data.layout === 'dropdown') {
    const filtered = data.options.filter(opt =>
      !dropdownSearch || opt.title.toLowerCase().includes(dropdownSearch.toLowerCase())
      || (opt.description || '').toLowerCase().includes(dropdownSearch.toLowerCase())
    );
    return (
      <MetaCard title={data.title || 'Select an option'} subtitle={data.subtitle || null}>
        <div className="px-4 py-3">
          {/* Dropdown trigger */}
          <button onClick={() => setDropdownOpen(v => !v)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-orange-300 transition-colors text-left">
            <span className="text-[13px] text-slate-500">Select...</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown list */}
          {dropdownOpen && (
            <div className="mt-1.5 border border-slate-200 rounded-lg bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
              {/* Search input */}
              {data.options.length > 5 && (
                <div className="px-3 py-2 border-b border-slate-100">
                  <input type="text" value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Search..." autoFocus
                    className="w-full text-[13px] text-slate-700 outline-none placeholder:text-slate-400" />
                </div>
              )}
              <div className="overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="px-4 py-3 text-[12px] text-slate-400">No matches found</p>
                )}
                {filtered.map((opt, i) => {
                  const desc = opt.description || opt.desc;
                  return (
                    <button key={i} onClick={() => { setDropdownOpen(false); setDropdownSearch(''); onSend?.(`I choose: ${opt.title}`); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-orange-50/50 transition-colors border-b border-slate-50 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">{opt.title}</p>
                        {desc && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{desc}</p>}
                      </div>
                      {opt.tag && <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">{opt.tag}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </MetaCard>
    );
  }

  const count = data.options.length;
  // 1–3 short options: 3-col grid. 4+ options: full-width list
  const useGrid = count <= 3;

  return (
    <MetaCard title={data.title || 'Choose an option'} subtitle={data.subtitle || null}>
      {useGrid ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-100">
          {data.options.map((opt, i) => {
            const desc = opt.description || opt.desc;
            return (
              <button key={i} onClick={() => onSend?.(`I choose: ${opt.title}`)}
                className="flex flex-col px-4 py-4 text-left hover:bg-orange-50/50 transition-all duration-200 group relative">
                {opt.tag && (
                  <span className="absolute top-2 right-3 text-[9px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full">{opt.tag}</span>
                )}
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/50 flex items-center justify-center text-orange-600 text-xs font-bold group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white group-hover:border-orange-500 transition-all duration-200">
                    {badgeLabel(opt)}
                  </span>
                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-orange-800 transition-colors">{opt.title}</p>
                </div>
                {desc && <p className="text-[11px] text-slate-500 leading-relaxed flex-1 line-clamp-2">{desc}</p>}
                <div className="flex items-center gap-1 mt-3 text-orange-500 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Select</span><ArrowUpRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {data.options.map((opt, i) => {
            const desc = opt.description || opt.desc;
            return (
              <button key={i} onClick={() => onSend?.(`I choose: ${opt.title}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-orange-50/50 transition-all duration-200 group">
                <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200/50 flex items-center justify-center text-orange-600 text-xs font-bold group-hover:bg-gradient-to-br group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white group-hover:border-orange-500 transition-all duration-200 shrink-0">
                  {badgeLabel(opt)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 group-hover:text-orange-800 transition-colors">{opt.title}</p>
                  {desc && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{desc}</p>}
                </div>
                {opt.tag && <span className="text-[9px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2 py-0.5 rounded-full shrink-0">{opt.tag}</span>}
                <ArrowUpRight size={11} className="text-slate-300 group-hover:text-orange-500 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </MetaCard>
  );
};

// ── Media Grid Card (video/post/ad selector — Meta-style with thumbnails, search, lazy load) ──
const MEDIA_PAGE_SIZE = 8; // show 8 items initially, load more on scroll

const MediaGridCard = ({ data, onSend, isAnswered, selectedTitle }) => {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('metric');
  const [visibleCount, setVisibleCount] = useState(MEDIA_PAGE_SIZE);
  const scrollRef = useRef(null);
  if (!data?.items?.length) return null;

  // Collapsed state after confirm
  if (isAnswered && selectedTitle) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[13px] my-1">
        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
        <span className="font-semibold text-emerald-800">{selectedTitle}</span>
        <span className="text-emerald-500 text-[11px] ml-auto">Selected</span>
      </div>
    );
  }

  // Search by title, caption, or video ID
  const filtered = data.items.filter(item =>
    !search
    || (item.title || '').toLowerCase().includes(search.toLowerCase())
    || (item.caption || '').toLowerCase().includes(search.toLowerCase())
    || (item.id || '').includes(search)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date || 0) - new Date(a.date || 0);
    return (b.metric_value || 0) - (a.metric_value || 0);
  });

  // Lazy load: show only visibleCount items
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  // Scroll handler for lazy loading
  const handleScroll = (e) => {
    const el = e.target;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40 && hasMore) {
      setVisibleCount(prev => Math.min(prev + MEDIA_PAGE_SIZE, sorted.length));
    }
  };

  const toggleItem = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(item => item.id)));
  };

  const handleConfirm = () => {
    const selectedItems = data.items.filter(item => selected.has(item.id));
    const names = selectedItems.map(i => i.title || i.caption || i.id).slice(0, 3);
    const label = names.join(', ') + (selectedItems.length > 3 ? ` +${selectedItems.length - 3} more` : '');
    const ids = selectedItems.map(i => i.id).join(', ');
    onSend?.(`I selected: ${label} (IDs: ${ids})`);
  };

  const typeLabel = data.media_type === 'video' ? 'Videos' : data.media_type === 'post' ? 'Posts' : data.media_type === 'ad' ? 'Ads' : 'Items';

  return (
    <MetaCard title={data.title || `Select ${typeLabel}`} subtitle={data.subtitle || null} badge={`${sorted.length} ${typeLabel.toLowerCase()}`}>
      {/* Search + sort + select all */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(MEDIA_PAGE_SIZE); }}
            placeholder={`Search by name or video ID...`}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-300 placeholder:text-slate-400" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none">
          <option value="metric">{data.metric_label || 'Views'} ↓</option>
          <option value="date">Recent ↓</option>
        </select>
        <button onClick={toggleAll}
          className="text-[11px] text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap">
          {selected.size === sorted.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-200 bg-slate-50/50 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        <span className="w-5 shrink-0" />
        <span className="w-14 shrink-0">Thumbnail</span>
        <span className="flex-1">Video Details</span>
        <span className="w-24 text-right">{data.metric_label || 'Views'}</span>
        <span className="w-20 text-right">Date</span>
      </div>

      {/* Scrollable list with lazy loading */}
      <div ref={scrollRef} className="max-h-[340px] overflow-y-auto" onScroll={handleScroll}>
        {visible.map(item => {
          const isSelected = selected.has(item.id);
          return (
            <button key={item.id} onClick={() => toggleItem(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors border-b border-slate-50 ${isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}>
              {/* Checkbox */}
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                {isSelected && <Check size={9} className="text-white" />}
              </div>
              {/* Thumbnail with duration badge */}
              {item.thumbnail ? (
                <div className="w-14 h-10 rounded-md overflow-hidden bg-slate-100 shrink-0 relative">
                  <img src={item.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
                  {item.duration && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-black/75 text-white px-1 py-0.5 rounded">
                      {item.duration}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-14 h-10 rounded-md bg-slate-100 shrink-0 flex items-center justify-center">
                  {data.media_type === 'video' ? <Film size={16} className="text-slate-400" /> : <Image size={16} className="text-slate-400" />}
                </div>
              )}
              {/* Title + ID + date */}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-800 truncate">{item.title || item.caption || 'Untitled'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {item.duration && <span>{item.duration} · </span>}
                  {item.date && <span>Uploaded {item.date}</span>}
                  {item.id && <span className="ml-1 text-slate-300">· ID: {item.id}</span>}
                </p>
              </div>
              {/* Metrics + source icons */}
              <div className="w-24 text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[12px] font-semibold text-slate-700">
                    {typeof item.metric_value === 'number' && item.metric_value > 0 ? item.metric_value.toLocaleString() : '—'}
                  </span>
                  {item.source_icons && (
                    <div className="flex items-center gap-0.5">
                      {item.source_icons.includes('fb') && <span className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center text-[6px] text-white font-bold">f</span>}
                      {item.source_icons.includes('ig') && <span className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[6px] text-white font-bold">ig</span>}
                    </div>
                  )}
                </div>
              </div>
              {/* Date column */}
              <span className="w-20 text-right text-[10px] text-slate-400 shrink-0 hidden sm:block">{item.date || ''}</span>
            </button>
          );
        })}
        {hasMore && (
          <div className="px-4 py-3 text-center text-[11px] text-slate-400">
            Scroll for more · {sorted.length - visibleCount} remaining
          </div>
        )}
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-slate-400">
            {search ? `No ${typeLabel.toLowerCase()} matching "${search}"` : `No ${typeLabel.toLowerCase()} found`}
          </p>
        )}
      </div>

      {/* Confirm bar */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {selected.size > 0
            ? <><span className="font-semibold text-blue-600">{selected.size}</span> of {sorted.length} selected</>
            : `${sorted.length} ${typeLabel.toLowerCase()} available`}
        </span>
        <button onClick={handleConfirm} disabled={selected.size === 0}
          className="px-5 py-1.5 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          {selected.size > 0 ? `Confirm (${selected.size})` : 'Select videos'}
        </button>
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

// ── Copy Variations (A/B selectable ad copy — full-text layout) ──────────────
const CopyVariations = ({ data, onSend }) => {
  if (!data?.variations) return null;
  const thumb = data.image_url || data.thumbnail;
  return (
    <MetaCard title={data.label || 'Ad Copy Variations'} subtitle={`${data.variations.length} options`} badge="Creative">
      {/* Image/video thumbnail preview */}
      {thumb && (
        <div className="px-4 pt-3 pb-1">
          <img src={thumb} alt="Creative preview" className="w-full max-h-[200px] object-cover rounded-lg border border-slate-100" />
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {data.variations.map((v, i) => (
          <div key={i} className="px-4 py-4 hover:bg-slate-50/30 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-bold shrink-0">{v.id}</span>
                <p className="text-[14px] font-bold text-slate-800">{v.headline}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wide">{v.cta?.replace(/_/g, ' ') || 'CTA'}</span>
                <button onClick={() => onSend?.(`Use copy variation ${v.id}: "${v.headline}"`)}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-[#1877F2] text-white hover:bg-[#1565C0] transition-colors">
                  Use this
                </button>
              </div>
            </div>
            {/* Full primary text — no truncation */}
            <div className="ml-[38px]">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Primary Text</p>
              <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{v.primary}</p>
            </div>
          </div>
        ))}
      </div>
    </MetaCard>
  );
};

// ── Inline Select (dropdown inside SetupCard items — portals to body to avoid overflow clipping) ──
const InlineSelect = ({ item, onSend }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef(null);
  const dropRef = useRef(null);
  const [dropStyle, setDropStyle] = useState({});

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Position dropdown relative to trigger when opened
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropUp = spaceBelow < 260;
      setDropStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(dropUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
  }, [open]);

  const filtered = (item.options || []).filter(o =>
    !search || o.title?.toLowerCase().includes(search.toLowerCase()) || o.description?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="relative mt-1">
      <button ref={triggerRef} onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left text-[13px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
        <span className="truncate">{item.value || 'Select...'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && ReactDOM.createPortal(
        <div ref={dropRef} style={dropStyle}
          className="bg-white border border-slate-200 rounded-lg shadow-xl max-h-[240px] overflow-hidden">
          {item.options.length > 5 && (
            <div className="p-2 border-b border-slate-100">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300" autoFocus />
            </div>
          )}
          <div className="overflow-y-auto max-h-[200px]">
            {filtered.map((o, i) => (
              <button key={o.id || i} onClick={() => { setOpen(false); onSend?.(o); }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0">
                <p className="text-[13px] font-medium text-slate-800 truncate">{o.title}</p>
                {o.description && <p className="text-[11px] text-slate-400 truncate">{o.description}</p>}
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[12px] text-slate-400 px-3 py-3 text-center">No matches</p>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ── Setup Card Item Row (handles editable + inline select) ───────────────────
const SetupCardItem = ({ item, status, iconCls, dotColor, onChange }) => {
  const [editing, setEditing] = useState(false);

  const icon = item.icon === 'target' ? <Target size={13} className={iconCls} /> :
    item.icon === 'dollar' ? <DollarSign size={13} className={iconCls} /> :
    item.icon === 'shield' ? <Shield size={13} className={iconCls} /> :
    item.icon === 'sparkles' ? <Sparkles size={13} className={iconCls} /> :
    <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;

  // Show inline select: either type:"select" items OR editable items with options when Edit clicked
  const showSelect = status === 'active' && (
    (item.type === 'select' && item.options?.length) ||
    (editing && item.editable && item.options?.length)
  );

  return (
    <div className="flex items-start gap-3 px-4 py-2.5 group">
      <div className="w-5 flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-medium uppercase tracking-wide text-slate-400`}>{item.label}</p>
        {showSelect ? (
          <InlineSelect item={item} onSend={(opt) => { setEditing(false); onChange?.(opt); }} status={status} />
        ) : (
          <p className={`text-[13px] font-semibold mt-0.5 ${status === 'done' ? 'text-slate-600' : 'text-slate-800'}`}>{item.value}</p>
        )}
        {item.detail && <p className="text-[11px] text-slate-400 mt-0.5">{item.detail}</p>}
      </div>
      {item.editable && status === 'active' && !showSelect && item.options?.length > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-500 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-all shrink-0">
          Edit
        </button>
      )}
    </div>
  );
};

// ── Setup Card (campaign/ad set review — collapsible phase card) ─────────────
const SetupCard = ({ data, onSend, isAnswered }) => {
  const status = data.status || 'active';
  const [collapsed, setCollapsed] = useState(data.collapsed ?? (status === 'done' || status === 'pending'));
  // Track local selections — initialize from data.items values
  const [selections, setSelections] = useState(() => {
    const map = {};
    (data.items || []).forEach(item => {
      map[item.label] = { value: item.value, id: item.options?.find(o => o.title === item.value)?.id || null };
    });
    return map;
  });
  const [confirmed, setConfirmed] = useState(false);

  if (!data?.items?.length && !data.subtitle && status !== 'pending') return null;
  const phase = data.phase || 1;

  const statusStyles = {
    done:    { border: 'border-emerald-200', bg: 'bg-emerald-50/30', headerBg: 'hover:bg-emerald-50/50', badge: 'border-emerald-400 bg-emerald-50 text-emerald-600', badgeIcon: '✓', text: 'text-slate-700', chevron: 'text-emerald-400' },
    active:  { border: 'border-blue-200', bg: 'bg-white', headerBg: 'hover:bg-blue-50/30', badge: 'border-blue-400 bg-blue-50 text-blue-600', badgeIcon: String(phase), text: 'text-slate-800', chevron: 'text-blue-400' },
    pending: { border: 'border-slate-100', bg: 'bg-slate-50/50', headerBg: '', badge: 'border-slate-200 bg-slate-50 text-slate-400', badgeIcon: String(phase), text: 'text-slate-400', chevron: 'text-slate-300' },
  };
  const s = statusStyles[status] || statusStyles.active;
  const iconCls = status === 'pending' ? 'text-slate-300' : status === 'done' ? 'text-emerald-400' : 'text-slate-400';
  const dotColor = status === 'pending' ? 'bg-slate-200' : status === 'done' ? 'bg-emerald-400' : 'bg-blue-400';

  // Build items with current selections applied
  const currentItems = (data.items || []).map(item => ({
    ...item,
    value: selections[item.label]?.value || item.value,
  }));

  const handleItemChange = (label, opt) => {
    setSelections(prev => ({ ...prev, [label]: { value: opt.title || opt.id, id: opt.id || null } }));
  };

  // Check if all required fields have values
  const hasUnfilledFields = currentItems.some(item =>
    item.type === 'select' && (!selections[item.label]?.value || selections[item.label]?.value === 'Select...')
  );

  const handleConfirm = () => {
    if (confirmed || isAnswered || hasUnfilledFields) return;
    setConfirmed(true);
    const parts = currentItems.map(item => {
      const sel = selections[item.label];
      return `${item.label}: ${sel?.value || item.value}${sel?.id ? ` (ID: ${sel.id})` : ''}`;
    });
    onSend?.(`✅ Confirm ${data.title || 'settings'}:\n${parts.join('\n')}`);
  };

  const effectiveStatus = (confirmed || isAnswered) ? 'done' : status;
  const es = statusStyles[effectiveStatus] || statusStyles.active;

  return (
    <div className={`my-2 border rounded-xl overflow-hidden shadow-sm transition-all ${es.border} ${es.bg} ${effectiveStatus === 'pending' ? 'opacity-60' : ''}`}>
      <button onClick={() => effectiveStatus !== 'pending' && setCollapsed(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${effectiveStatus === 'pending' ? 'cursor-default' : `cursor-pointer ${es.headerBg}`}
          ${!collapsed && data.items?.length ? 'border-b border-slate-100' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${es.badge}`}>
            {(confirmed || isAnswered) ? '✓' : String(phase)}
          </div>
          <div className="text-left">
            <p className={`text-[13px] font-semibold ${es.text}`}>{data.title || `Stage ${phase}`}</p>
            {(collapsed || effectiveStatus === 'pending') && data.subtitle && (
              <p className="text-[11px] text-slate-400">{data.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {effectiveStatus === 'done' && !confirmed && !isAnswered && (
            <span onClick={(e) => { e.stopPropagation(); onSend?.(`I want to edit Stage ${phase}`); }}
              className="text-[10px] text-emerald-500 hover:text-emerald-700 font-medium px-2 py-0.5 rounded hover:bg-emerald-50 transition-all">
              Edit
            </span>
          )}
          {effectiveStatus !== 'pending' && (
            <ChevronDown size={14} className={`${es.chevron} transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          )}
        </div>
      </button>

      {!collapsed && currentItems.length > 0 && (
        <div className="divide-y divide-slate-50">
          {currentItems.map((item, i) => (
            <SetupCardItem key={i} item={item} status={(confirmed || isAnswered) ? 'done' : status} iconCls={iconCls} dotColor={dotColor}
              onChange={(opt) => handleItemChange(item.label, opt)} />
          ))}
        </div>
      )}

      {/* Confirm button — only for active setupcards that haven't been confirmed */}
      {!collapsed && status === 'active' && !confirmed && !isAnswered && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/30">
          <button onClick={handleConfirm} disabled={hasUnfilledFields}
            className="w-full py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
            {hasUnfilledFields ? 'Please fill all fields' : `✅ Confirm ${data.title || 'Settings'}`}
          </button>
        </div>
      )}
    </div>
  );
};

// ── Steps List (prioritized actions) ─────────────────────────────────────────
const StepsList = ({ data }) => {
  // Handle both array format and { title, steps: [...] } object format
  const items = Array.isArray(data) ? data : (data?.steps || null);
  if (!Array.isArray(items)) return null;
  const cardTitle = (!Array.isArray(data) && data?.title) || 'Recommended Actions';
  const priorityConfig = {
    high:   { dot: 'bg-red-500', label: 'Urgent', labelCls: 'text-red-600 bg-red-50 border-red-100' },
    medium: { dot: 'bg-amber-400', label: 'This week', labelCls: 'text-amber-600 bg-amber-50 border-amber-100' },
    low:    { dot: 'bg-emerald-500', label: 'Opportunity', labelCls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  };
  return (
    <MetaCard title={cardTitle} subtitle="Prioritized by impact" badge="Action Plan">
      <div className="divide-y divide-slate-100">
        {items.map((step, i) => {
          const cfg = priorityConfig[step.priority] || { dot: 'bg-slate-300', label: step.priority, labelCls: 'text-slate-500 bg-slate-50 border-slate-200' };
          return (
            <div key={i} className="flex items-start gap-3.5 px-4 py-3.5">
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                <span className="text-sm font-bold text-slate-300 w-5 text-right tabular-nums">{i + 1}</span>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-800">{step.title || step.label}</p>
                  {step.priority && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.labelCls}`}>{cfg.label}</span>}
                </div>
                {(step.reason || step.description) && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.reason || step.description}</p>}
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
      {data.map((text, i) => {
        const isNav = /^\[\w+\]/.test(text);
        const displayText = text.replace(/^\[\w+\]\s*/, '');
        return (
          <button key={i} onClick={() => onSend?.(text)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0
              ${isNav ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 hover:shadow-md hover:shadow-orange-500/10 hover:border-orange-300'
                      : 'border-slate-200/80 bg-white text-slate-700 hover:border-orange-200 hover:text-orange-700 hover:shadow-md hover:shadow-orange-500/8'}`}>
            {displayText}
            <ArrowUpRight size={11} className="opacity-40" />
          </button>
        );
      })}
    </div>
  );
};

// ── Funnel Card ──────────────────────────────────────────────────────────────
// Data: { title, stages: [{ label, value, color? }] }
const FunnelCard = ({ data }) => {
  if (!data?.stages?.length) return null;
  const max = Math.max(...data.stages.map(s => parseFloat(s.value) || 0));
  const colors = ['bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400'];

  // Area chart data
  const chartData = data.stages.map(s => ({
    name: s.label,
    value: parseNum(String(s.value)),
  }));

  return (
    <MetaCard title={data.title || 'Conversion Funnel'}>
      {/* Area chart visualization */}
      {chartData.length >= 2 && (
        <div className="px-4 pt-3 pb-1">
          <ResponsiveContainer width="100%" height={180}>
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
      )}
      {/* Horizontal bars */}
      <div className="space-y-2 px-4 pb-4">
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
  const keyA = data.a_label || 'Period A';
  const keyB = data.b_label || 'Period B';

  // Grouped bar chart data
  const chartData = data.metrics.map(m => ({
    name: String(m.label || '').length > 12 ? String(m.label).slice(0, 12) + '…' : String(m.label || ''),
    [keyA]: parseNum(String(m.a)),
    [keyB]: parseNum(String(m.b)),
  }));

  return (
    <MetaCard title={data.title || 'Comparison'}>
      {/* Bar chart */}
      {chartData.length >= 2 && (
        <div className="px-4 pt-3 pb-1">
          <ResponsiveContainer width="100%" height={220}>
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
      )}
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-[11px] font-semibold text-slate-500 uppercase">Metric</th>
              <th className="text-right py-2 px-2 text-[11px] font-semibold text-blue-600 uppercase">{keyA}</th>
              <th className="text-right py-2 px-2 text-[11px] font-semibold text-violet-600 uppercase">{keyB}</th>
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

  // Donut pie chart data
  const pieData = data.items.map((item, i) => ({
    name: String(item.name || '').length > 20 ? String(item.name).slice(0, 20) + '…' : String(item.name || ''),
    value: parseNum(String(item.spend || item.percentage || 0)),
  }));

  return (
    <MetaCard title={data.title || 'Budget Allocation'}>
      {/* Donut chart */}
      {pieData.length >= 2 && (
        <div className="px-4 pt-3 pb-1">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden mb-4 mx-4 bg-slate-100">
        {data.items.map((item, i) => {
          const pct = total > 0 ? ((parseFloat(item.spend) || 0) / total * 100) : 0;
          return <div key={i} className={`${colors[i % colors.length]} transition-all`} style={{ width: `${Math.max(pct, 1)}%` }} title={`${item.name}: ${pct.toFixed(1)}%`} />;
        })}
      </div>
      {/* Legend */}
      <div className="space-y-2 px-4">
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
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between px-4 pb-4">
          <span className="text-xs font-medium text-slate-500">Total</span>
          <span className="text-sm font-bold text-slate-900">${total.toLocaleString()}</span>
        </div>
      )}
    </MetaCard>
  );
};

// ── Trend Card (time-series line chart) ─────────────────────────────────────
// Data: { title, series: [{ name, data: [{ date, value }] }], yLabel? }
const TrendCard = ({ data }) => {
  if (!data?.series?.length) return null;
  // Merge all dates and build chart data
  const dateSet = new Set();
  data.series.forEach(s => s.data?.forEach(d => dateSet.add(d.date)));
  const dates = [...dateSet].sort();
  const chartData = dates.map(date => {
    const point = { date };
    data.series.forEach(s => {
      const match = s.data?.find(d => d.date === date);
      point[s.name] = match ? parseNum(String(match.value)) : 0;
    });
    return point;
  });

  return (
    <MetaCard title={data.title || 'Performance Trend'}>
      <div className="px-2 pt-3 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} label={data.yLabel ? { value: data.yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } } : undefined} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            {data.series.map((s, i) => (
              <Line key={s.name} type="monotone" dataKey={s.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
            {data.series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </MetaCard>
  );
};

// ── Ad Preview Card ──────────────────────────────────────────────────────────
// Data: [{ format, html }] or { format, html }
// html is the raw <iframe src="..."> string returned by Meta's preview API
const FORMAT_LABELS = {
  MOBILE_FEED_STANDARD: 'Mobile Feed',
  DESKTOP_FEED_STANDARD: 'Desktop Feed',
  INSTAGRAM_STANDARD: 'Instagram Feed',
  MOBILE_STORY: 'Mobile Story',
  INSTAGRAM_STORY: 'IG Story',
  INSTAGRAM_REELS: 'Reels',
  RIGHT_COLUMN_STANDARD: 'Right Column',
};

const extractIframeSrc = (html) => {
  if (!html) return null;
  const m = html.match(/src=["']([^"']+)["']/);
  return m ? m[1].replace(/&amp;/g, '&') : null;
};

const isMobileFormat = (fmt) =>
  fmt && (fmt.includes('MOBILE') || fmt.includes('STORY') || fmt.includes('REELS') || fmt.includes('INSTAGRAM'));

const isFullHeightFormat = (fmt) =>
  fmt && (fmt.includes('STORY') || fmt.includes('REELS'));

// Mobile feed: 480px. Stories/Reels: 568px (full 9:16 at 320px wide). Desktop: 300px.
const getFrameHeight = (fmt) => {
  if (isFullHeightFormat(fmt)) return 568;
  if (isMobileFormat(fmt)) return 480;
  return 300;
};

const AdPreviewBlock = ({ data }) => {
  const previews = Array.isArray(data) ? data : (data ? [data] : []);
  const [idx, setIdx] = useState(0);
  if (!previews.length) return null;

  const current = previews[idx] || previews[0];
  const src = extractIframeSrc(current.html);
  const mobile = isMobileFormat(current.format);
  const frameHeight = getFrameHeight(current.format);
  const label = FORMAT_LABELS[current.format] || current.format || 'Ad Preview';

  return (
    <MetaCard title="Ad Preview" subtitle={label} badge="Preview">
      {previews.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 flex-wrap">
          {previews.map((p, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`px-3 py-1 text-[11px] font-medium rounded-full border transition-colors ${i === idx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}>
              {FORMAT_LABELS[p.format] || p.format}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-center py-5 px-4 bg-slate-50">
        {mobile ? (
          <div className="relative w-[280px]">
            {/* Phone shell */}
            <div className="rounded-[32px] border-[6px] border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
              <div className="flex justify-center pt-2 pb-1 bg-slate-900">
                <div className="w-20 h-4 bg-slate-700 rounded-full" />
              </div>
              <div className="bg-white overflow-hidden" style={{ height: frameHeight }}>
                {src ? (
                  <iframe src={src} width="268" height={frameHeight} style={{ border: 'none', display: 'block' }} title="Ad preview" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400">Preview unavailable</div>
                )}
              </div>
              <div className="h-5 bg-slate-900 flex items-center justify-center">
                <div className="w-24 h-1 bg-slate-600 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[520px]">
            {/* Browser shell */}
            <div className="rounded-lg border border-slate-200 shadow-md overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 flex items-center gap-2 border-b border-slate-200">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 bg-white rounded text-[10px] text-slate-400 px-2 py-0.5 text-center truncate">facebook.com</div>
              </div>
              <div className="bg-white overflow-hidden">
                {src ? (
                  <iframe src={src} width="520" height={frameHeight} style={{ border: 'none', display: 'block', width: '100%' }} title="Ad preview" />
                ) : (
                  <div className="flex items-center justify-center h-40 text-xs text-slate-400">Preview unavailable</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MetaCard>
  );
};

// ── Post Picker — visual post cards for boost workflow ──────────────────────
// Schema: { posts: [{ id, thumbnail, caption, likes, comments, shares, media_type, permalink, recommendation }], title? }
const PostPickerCard = ({ data, onSend }) => {
  const { posts = [], title } = typeof data === 'string' ? JSON.parse(data) : data;
  return (
    <div className="my-3">
      {title && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</p>}
      <div className="grid grid-cols-1 gap-3" style={{ maxWidth: posts.length === 1 ? '320px' : posts.length === 2 ? '640px' : '100%' }}>
        <div className={`grid gap-3 ${posts.length === 1 ? 'grid-cols-1' : posts.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {posts.map((post, i) => (
            <div key={post.id || i} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:shadow-orange-500/8 hover:border-orange-200 hover:-translate-y-1 transition-all duration-300">
              {/* Post image */}
              {post.thumbnail && (
                <div className="aspect-square bg-slate-50 overflow-hidden relative">
                  <img src={post.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {post.media_type === 'VIDEO' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                  )}
                  {post.recommendation && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-orange-500 text-white text-[9px] font-bold shadow-lg">
                      {post.recommendation}
                    </span>
                  )}
                </div>
              )}
              {/* Post info */}
              <div className="p-3.5">
                {post.caption && (
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 mb-2">{post.caption}</p>
                )}
                {/* Engagement */}
                <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3">
                  {post.likes != null && <span className="flex items-center gap-1">❤️ {post.likes.toLocaleString()}</span>}
                  {post.comments != null && <span className="flex items-center gap-1">💬 {post.comments.toLocaleString()}</span>}
                  {post.shares != null && <span className="flex items-center gap-1">🔄 {post.shares.toLocaleString()}</span>}
                </div>
                {/* Boost button */}
                <button onClick={() => onSend(`Boost this post (ID: ${post.id}). Set it up with the best targeting and budget.`)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-semibold hover:brightness-110 transition-all shadow-sm shadow-orange-500/20">
                  Boost this post
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Rich text renderer ───────────────────────────────────────────────────────
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i} className="text-slate-800 font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />;
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
    // Standalone image line — markdown syntax
    const imgLine = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgLine) { flushList(); elements.push(<img key={elements.length} src={imgLine[2]} alt={imgLine[1]} className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />); continue; }
    // Bare image URL on its own line (scontent, fbcdn, cdninstagram)
    const bareImg = line.trim().match(/^(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?)$/i) || line.trim().match(/^(https?:\/\/(scontent|.*fbcdn|.*cdninstagram)[^\s]+)$/i);
    if (bareImg) { flushList(); elements.push(<img key={elements.length} src={bareImg[1]} alt="Post" className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />); continue; }
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
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold tracking-wide border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5
          ${variant === 'confirm' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white border-emerald-400/50 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30' :
            variant === 'danger'  ? 'bg-gradient-to-r from-red-500 to-red-400 text-white border-red-400/50 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30' :
            'bg-white text-slate-700 border-slate-200/80 shadow-sm hover:border-orange-200 hover:text-orange-700 hover:shadow-md hover:shadow-orange-500/8'}`}>
        {variant === 'confirm' && <CheckCircle2 size={13} />}
        {variant === 'danger' && <XCircle size={13} />}
        {label}
        {variant === 'default' && <ArrowRight size={12} className="text-slate-300 group-hover:text-orange-400" />}
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
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 mb-0.5">
        <Zap size={15} className="text-white" />
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
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 mb-0.5">
      <Zap size={15} className="text-white" />
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
const AttachmentChip = ({ attachment, onRemove, onRetry }) => {
  const isImage = attachment.file?.type?.startsWith('image/');
  const isDoc = attachment.isDoc || attachment.file?.name?.match(/\.(pdf|txt|doc|docx)$/i);
  return (
    <div className="relative group flex-shrink-0">
      <div className={`relative w-20 h-20 rounded-xl border overflow-hidden flex items-center justify-center
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
          <div className="absolute bottom-1 right-1 bg-white rounded-full shadow-sm ring-1 ring-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
        )}
        {attachment.status === 'error' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <XCircle size={14} className="text-red-500" />
            {onRetry && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(attachment); }}
                className="mt-1 flex items-center gap-0.5 text-[9px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                title="Retry upload"
              >
                <RefreshCw size={10} /> Retry
              </button>
            )}
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
const AttachmentBar = ({ attachments, onRemove, onRetry }) => {
  if (!attachments.length) return null;
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
      {attachments.map((a) => (
        <AttachmentChip key={a.id} attachment={a} onRemove={onRemove} onRetry={onRetry} />
      ))}
    </div>
  );
};

// ── Message attachment thumbnails (in user bubble) ───────────────────────────
// Resolution order: gcs_public_url (survives reload) → preview (blob, works
// only in the session that created it). Doc attachments have no thumbnail —
// render a filename chip that links to the GCS original when available.
const MessageAttachments = ({ attachments }) => {
  if (!attachments?.length) return null;
  const isImage = (a) => (a.type || '').startsWith('image/');
  const isVideo = (a) => (a.type || '').startsWith('video/');
  return (
    <div className="flex gap-1.5 flex-wrap mb-2">
      {attachments.map((a, i) => {
        const thumbUrl = a.gcs_public_url || a.preview;
        if (isImage(a) && thumbUrl) {
          return (
            <a
              key={i}
              href={a.gcs_public_url || thumbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-16 h-16 rounded-lg overflow-hidden border border-white/30 block"
              title={a.name}
            >
              <img src={thumbUrl} alt={a.name} className="w-full h-full object-cover" />
            </a>
          );
        }
        if (isVideo(a)) {
          return (
            <a
              key={i}
              href={a.gcs_public_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={a.gcs_public_url ? undefined : (e) => e.preventDefault()}
              className="w-16 h-16 rounded-lg overflow-hidden border border-white/30 bg-white/10 flex items-center justify-center block"
              title={a.name}
            >
              <Film size={16} className="text-white/70" />
            </a>
          );
        }
        // Document fallback — filename chip
        return (
          <a
            key={i}
            href={a.gcs_public_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={a.gcs_public_url ? undefined : (e) => e.preventDefault()}
            className="px-2 py-1 h-16 rounded-lg border border-white/30 bg-white/10 flex items-center gap-1.5 max-w-[180px]"
            title={a.name}
          >
            <FileText size={14} className="text-white/70 shrink-0" />
            <span className="text-[11px] text-white/90 truncate">{a.name}</span>
          </a>
        );
      })}
    </div>
  );
};

// ── Rich content renderer (exported for ReportPanel) ────────────────────────
export const RichContent = ({ text, onSend }) => {
  const segments = parseMarkdownTable(text);
  return (
    <>
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
          case 'setupcard': return <SetupCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} />;
          case 'quickreplies': return <QuickRepliesCard key={i} data={seg.data} onSend={onSend} />;
          case 'funnel': return <FunnelCard key={i} data={seg.data} />;
          case 'comparison': return <ComparisonCard key={i} data={seg.data} />;
          case 'budget': return <BudgetCard key={i} data={seg.data} />;
          case 'trend': return <TrendCard key={i} data={seg.data} />;
          case 'adpreview': return <AdPreviewBlock key={i} data={seg.data} />;
          case 'videoaudience': return <VideoAudienceCard key={i} data={seg.data} onSend={onSend} />;
          case 'postpicker': return <PostPickerCard key={i} data={seg.data} onSend={onSend} />;
          case 'engagementaudience': return <EngagementAudienceCard key={i} data={seg.data} onSend={onSend} />;
          case 'lookalikeaudience': return <LookalikeAudienceCard key={i} data={seg.data} onSend={onSend} />;
          case 'savedaudience': return <SavedAudienceCard key={i} data={seg.data} onSend={onSend} />;
          case 'websiteaudience': return <WebsiteAudienceCard key={i} data={seg.data} onSend={onSend} />;
          default: return <div key={i} className="whitespace-pre-wrap">{renderRichText(seg.content)}</div>;
        }
      })}
    </>
  );
};

// ── Detect if message has rich cards ────────────────────────────────────────
export const hasRichCards = (text) => {
  if (!text) return false;
  const segments = parseMarkdownTable(text);
  return segments.some(s => !['text', 'quickreplies'].includes(s.type));
};

// ── Split message into chat (text-only) vs canvas (full content with charts) ──
// These block types get stripped from inline chat and rendered in the canvas panel instead
// Dashboard block is the only canvas trigger — old metrics/budget/trend blocks stay in chat

export const splitChatAndCanvas = (text) => {
  if (!text) return { chatText: '', canvasData: null };

  // Only dashboard JSON block opens canvas — no legacy format
  const dashboardMatch = text.match(/```dashboard\n([\s\S]*?)```/);
  if (dashboardMatch) {
    try {
      const dashboard = JSON.parse(dashboardMatch[1]);
      const chatText = text.replace(/```dashboard\n[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
      return { chatText, canvasData: { dashboard, title: dashboard.title || 'Performance Dashboard' } };
    } catch { /* invalid JSON — keep everything in chat */ }
  }

  return { chatText: text, canvasData: null };
};

// ── Save menu for agent messages ─────────────────────────────────────────────
// ── Save as Skill Modal ──
const SaveAsSkillModal = ({ messageText, onClose, onCreateSkill, generateSkill }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(messageText || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  // Auto-extract name from first heading or first line
  useEffect(() => {
    if (!messageText) return;
    const lines = messageText.split('\n').filter(l => l.trim());
    const heading = lines.find(l => l.startsWith('#'));
    const autoName = heading
      ? heading.replace(/^#+\s*/, '').slice(0, 60)
      : lines[0]?.replace(/^[*_#>\s]+/, '').slice(0, 60) || 'Untitled Skill';
    setName(autoName);
    setDescription(lines.slice(0, 3).join(' ').replace(/^[#*_>\s]+/g, '').slice(0, 120));
    setTimeout(() => nameRef.current?.select(), 100);
  }, [messageText]);

  const handleGenerate = async () => {
    if (!generateSkill) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateSkill(messageText);
      if (result) {
        if (result.name) setName(result.name);
        if (result.description) setDescription(result.description);
        if (result.content) setContent(result.content);
      }
    } catch (err) {
      setError('AI generation failed. You can still save with raw content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onCreateSkill({
        name: name.trim(),
        description: description.trim(),
        content: content.trim(),
        icon: 'sparkles',
        type: 'strategy',
      });
      setSaved(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      { const e = err.response?.data?.error; setError(typeof e === 'string' ? e : e?.message || err.message || 'Failed to save skill'); };
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[560px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <PackageOpen size={16} className="text-indigo-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Save as Skill</h3>
              <p className="text-[10px] text-slate-400">Save this AI response as a reusable custom skill</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Skill Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. High-Converting Ad Copy Strategy"
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-300" />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="One-line summary of what this skill does"
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 placeholder:text-slate-300" />
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Skill Content</label>
              <div className="flex items-center gap-2">
                {generateSkill && (
                  <button onClick={handleGenerate} disabled={generating}
                    className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
                    {generating ? <><Loader2 size={10} className="animate-spin" /> Refining...</> : <><Sparkles size={10} /> Refine with AI</>}
                  </button>
                )}
                <button onClick={() => setEditMode(!editMode)}
                  className="text-[10px] font-medium text-slate-400 hover:text-slate-600">
                  {editMode ? 'Preview' : 'Edit'}
                </button>
              </div>
            </div>
            {editMode ? (
              <textarea value={content} onChange={e => setContent(e.target.value)}
                className="w-full h-[240px] text-[12px] text-slate-700 font-mono border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none" />
            ) : (
              <div className="w-full h-[240px] overflow-auto text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 leading-relaxed whitespace-pre-wrap">
                {content || <span className="text-slate-300 italic">No content yet</span>}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">Skill will appear in Custom Skills</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving || saved}
              className={`px-5 py-2 text-[12px] rounded-lg font-semibold shadow-sm transition-all disabled:cursor-not-allowed
                ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40'}`}>
              {saved ? <><Check size={13} className="inline mr-1" />Saved!</> : saving ? 'Saving...' : 'Save as Skill'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Save as Skill Button (on message hover) ──
const SaveAsSkillButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200"
  >
    <Sparkles size={11} /> Save as Skill
  </button>
);

// ── Save to Brand Library Modal ──
const SaveToBrandModal = ({ messageText, onClose, onSaveToBrand }) => {
  const [name, setName] = useState(`Memory from ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const [content, setContent] = useState(messageText || '');
  const [type, setType] = useState('guidelines');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.select(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveToBrand({ name: name.trim(), type, content: content.trim(), metadata: { source: 'chat' } });
      setSaved(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      { const e = err.response?.data?.error; setError(typeof e === 'string' ? e : e?.message || err.message || 'Failed to save'); };
    } finally {
      setSaving(false);
    }
  };

  const types = [
    { value: 'guidelines', label: 'Guidelines' },
    { value: 'tone', label: 'Tone' },
    { value: 'visual', label: 'Visual' },
    { value: 'content', label: 'Content' },
    { value: 'crawled', label: 'Crawled' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[520px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Brain size={16} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Save to Brand Library</h3>
              <p className="text-[10px] text-slate-400">AI will remember this in future conversations</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 placeholder:text-slate-300" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Type</label>
            <div className="flex gap-2">
              {types.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                    ${type === t.value ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="w-full h-[200px] text-[12px] text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 resize-none font-mono leading-relaxed" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">Linked to current ad account · enabled by default</p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving || saved}
              className={`px-5 py-2 text-[12px] rounded-lg font-semibold shadow-sm transition-all disabled:cursor-not-allowed
                ${saved ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40'}`}>
              {saved ? <><Check size={13} className="inline mr-1" />Saved!</> : saving ? 'Saving...' : 'Save to Brand Memory'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Save to Brand Button (on message hover) ──
const SaveToBrandButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all opacity-0 group-hover:opacity-100 text-slate-400 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200"
  >
    <Brain size={11} /> Save to Brand Memory
  </button>
);

const SaveMenu = ({ messageId, onSave, folders = [] }) => {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = (folderId) => {
    onSave(messageId, folderId);
    setOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const folderList = folders.length > 0 ? folders : [
    { id: 'reports', name: 'Reports' },
    { id: 'strategies', name: 'Strategies' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !saved && setOpen(!open)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100
          ${saved ? 'text-blue-500 bg-blue-50 scale-110 opacity-100' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'}`}
        title={saved ? 'Saved!' : 'Save this message'}
      >
        <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 w-48">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Save to folder</p>
          {folderList.map(folder => (
            <button key={folder.id}
              onClick={() => handleSave(folder.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <FileText size={13} className="text-blue-400" />
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Auto-open canvas when a message has chart data ──────────────────────────
const AutoCanvasOpener = ({ data, onOpen }) => {
  const opened = useRef(false);
  useEffect(() => {
    if (data && onOpen && !opened.current) { opened.current = true; onOpen(data); }
  }, [data, onOpen]);
  return null;
};

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping, onSaveItem, folders, isAnswered, answeredWith, onOpenCanvas, adAccountId, token, onPackageAsSkill, onSaveToBrand, selectionMode, isSelected, onToggleSelect }) => {
  if (message.type === 'report') return (<><ReportMessage message={message} timestamp={message.timestamp} /><div className="mb-2" /></>);
  if (message.type === 'table') return (<><TableMessage message={message} />{isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}<div className="mb-6" /></>);

  const isAgent = message.role === 'agent';
  if (isAgent) {
    const { chatText, canvasData } = splitChatAndCanvas(message.text);
    const segments = parseMarkdownTable(chatText);
    const hasWide = segments.some(s => s.type !== 'text');
    const selectedTitle = answeredWith ? answeredWith.replace(/^I choose:\s*/i, '').trim() : null;
    return (
      <>
        <div className="flex items-end gap-3 mb-2 group">
          {selectionMode && (
            <button onClick={() => onToggleSelect?.(message.id)}
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mb-1 transition-colors
                ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 hover:border-indigo-400'}`}>
              {isSelected && <Check size={11} />}
            </button>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 mb-0.5">
            <Zap size={15} className="text-white" />
          </div>
          <div className={hasWide ? 'max-w-[95%] flex-1 min-w-0' : 'max-w-[80%] min-w-0'}>
            {/* break-words + overflow-wrap:anywhere so long tokens (file
                hashes, URLs, image_hash:xxxx strings) wrap inside the bubble
                instead of pushing the bubble past its max-width. min-w-0 on
                the flex parent above is also required — without it the
                flex item's intrinsic min-width is `auto` and the unbroken
                word still wins. */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm relative break-words [overflow-wrap:anywhere]">
              {/* Save as Skill button moved below message */}
              {segments.map((seg, i) => {
                switch (seg.type) {
                  case 'table': return <StyledTable key={i} columns={seg.columns} rows={seg.rows} />;
                  case 'adlib': return <AdLibraryCards key={i} ads={seg.ads} />;
                  case 'metrics': return <MetricCards key={i} data={seg.data} />;
                  case 'options': return <OptionCards key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} selectedTitle={selectedTitle} />;
                  case 'insights': return <InsightCards key={i} data={seg.data} onSend={onSend} />;
                  case 'score': return <ScoreCard key={i} data={seg.data} />;
                  case 'copyvariations': return <CopyVariations key={i} data={seg.data} onSend={onSend} />;
                  case 'steps': return <StepsList key={i} data={seg.data} />;
                  case 'setupcard': return <SetupCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} />;
                  case 'quickreplies': return <QuickRepliesCard key={i} data={seg.data} onSend={onSend} />;
                  case 'funnel': return <FunnelCard key={i} data={seg.data} />;
                  case 'comparison': return <ComparisonCard key={i} data={seg.data} />;
                  case 'budget': return <BudgetCard key={i} data={seg.data} />;
                  case 'trend': return <TrendCard key={i} data={seg.data} />;
                  case 'adpreview': return <AdPreviewBlock key={i} data={seg.data} />;
                  case 'mediagrid': return <MediaGridCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} selectedTitle={selectedTitle} />;
                  case 'videoaudience': return <VideoAudienceCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} adAccountId={adAccountId} token={token} />;
                  case 'postpicker': return <PostPickerCard key={i} data={seg.data} onSend={onSend} />;
                  case 'engagementaudience': return <EngagementAudienceCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} adAccountId={adAccountId} token={token} />;
                  case 'lookalikeaudience': return <LookalikeAudienceCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} adAccountId={adAccountId} token={token} />;
                  case 'savedaudience': return <SavedAudienceCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} adAccountId={adAccountId} token={token} />;
                  case 'websiteaudience': return <WebsiteAudienceCard key={i} data={seg.data} onSend={onSend} isAnswered={isAnswered} adAccountId={adAccountId} token={token} />;
                  default: return <div key={i} className="whitespace-pre-wrap">{renderRichText(seg.content)}</div>;
                }
              })}
              {/* Dashboard: auto-open on latest + show button to re-open */}
              {canvasData?.dashboard && isLatest && <AutoCanvasOpener data={canvasData} onOpen={onOpenCanvas} />}
              {canvasData?.dashboard && (
                <button onClick={() => onOpenCanvas?.(canvasData)}
                  className="mt-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[12px] font-bold hover:from-orange-400 hover:to-amber-400 transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5">
                  <BarChart3 size={14} /> View Dashboard
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 ml-1">
              <p className="text-xs text-slate-400">{fmtTime(message.timestamp)}</p>
              {onPackageAsSkill && message.id !== 'welcome' && (
                <SaveAsSkillButton onClick={() => onPackageAsSkill(message)} />
              )}
              {onSaveToBrand && message.id !== 'welcome' && (
                <SaveToBrandButton onClick={() => onSaveToBrand(message)} />
              )}
            </div>
          </div>
        </div>
        {isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}
        <div className="mb-6" />
      </>
    );
  }

  // User message
  return (
    <div className="flex items-end justify-end gap-3 mb-6 group">
      <div className="max-w-[75%] min-w-0">
        {/* See agent bubble above for why break-words + [overflow-wrap:anywhere]
            + min-w-0 are all needed together. The user-pasted hashes (e.g.
            "[Uploaded image: 679667959_1024343...image_hash:404d27...]")
            are the most common offender on this side. */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-md shadow-slate-300/20 break-words [overflow-wrap:anywhere]">
          {message.attachments && <MessageAttachments attachments={message.attachments} />}
          {message.text}
        </div>
        <div className="flex items-center justify-end gap-2 mt-1 mr-1">
          <button onClick={() => onSend(message.text)} title="Retry this message"
            className="text-[10px] text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
            Retry
          </button>
          <p className="text-xs text-slate-400">{fmtTime(message.timestamp)}</p>
        </div>
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
  <img src="/meta-icon.svg" alt="Meta" style={{ height }} className="shrink-0" />
);

// Meta icon — infinity symbol only, for action cards
const MetaIconOnly = ({ size = 18 }) => (
  <img src="/meta-icon.svg" alt="Meta" style={{ width: size, height: size }} className="shrink-0" />
);

const ACTION_ICON_MAP = { Zap, Users, BarChart3, Image, Shield };
const ACTION_COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-600',
  violet: 'bg-violet-100 text-violet-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
};

const ActionCard = ({ icon, label, desc, prompt, onSend, disabled, color = 'blue' }) => {
  const IconComponent = ACTION_ICON_MAP[icon] || Zap;
  return (
    <button onClick={() => onSend(prompt)} disabled={disabled}
      className="flex flex-col bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl px-5 py-4 text-left hover:border-orange-200/60 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-40 group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ACTION_COLOR_MAP[color] || ACTION_COLOR_MAP.blue} group-hover:scale-105 transition-transform duration-300`}>
        <IconComponent size={18} />
      </div>
      <p className="text-[14px] font-bold text-slate-900 leading-snug mt-3">{label}</p>
      <p className="text-[12px] text-slate-400 leading-relaxed mt-1.5 flex-1">{desc}</p>
      <div className="flex items-center gap-1 mt-3 text-[11px] font-semibold text-orange-500 opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300">
        Ask now <ArrowUpRight size={11} />
      </div>
    </button>
  );
};

// ── Slash Command Picker ────────────────────────────────────────────────────
const SlashPicker = ({ skills, filter, onSelect, selectedIndex }) => {
  const filtered = skills.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.id.includes(filter.toLowerCase())
  );
  if (filtered.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 max-h-64 overflow-y-auto z-50">
      <div className="px-3 py-2 border-b border-slate-100">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Skills — type to filter</p>
      </div>
      {filtered.map((skill, i) => (
        <button key={skill.id} onClick={() => onSelect(skill)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
            ${i === selectedIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
          <Sparkles size={14} className={`shrink-0 ${i === selectedIndex ? 'text-indigo-500' : 'text-slate-400'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${i === selectedIndex ? 'text-indigo-700' : 'text-slate-700'}`}>/{skill.id}</p>
            <p className="text-[10px] text-slate-400 truncate">{skill.name} — {skill.description}</p>
          </div>
          {skill.isDefault && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Default</span>}
        </button>
      ))}
    </div>
  );
};

// ── Skills Dropdown (chat bar) ──────────────────────────────────────────────
const SKILL_CATEGORIES = {
  performance_analyst: 'Analysis',
  inception_funnel_audit: 'Analysis',
  creative_strategist: 'Creative',
  budget_optimizer: 'Strategy',
  audience_strategist: 'Targeting',
};
const CATEGORY_ORDER = ['Analysis', 'Strategy', 'Creative', 'Targeting', 'Custom'];

const SKILL_ICONS = {
  performance_analyst: BarChart3,
  inception_funnel_audit: Target,
  creative_strategist: Sparkles,
  budget_optimizer: DollarSign,
  audience_strategist: Target,
};

const SkillsDropdown = ({ skills, activeSkill, activeSkillIds, onToggleSkill, onSlashSelect, onManageSkills, onClose, enabledSkillIds = [], dropUp = true }) => {
  const ref = useRef(null);
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const enabledSkills = skills.filter(s => enabledSkillIds.includes(s.id));
  const filtered = skillSearch
    ? enabledSkills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) || s.id.includes(skillSearch.toLowerCase()))
    : enabledSkills;

  return (
    <div ref={ref} className={`absolute left-0 w-[320px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-[100] ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
            placeholder="Search Skills"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-300 focus:bg-white transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Skill list */}
      <div className="max-h-[260px] overflow-y-auto px-1.5 pb-1.5">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-[12px] text-slate-400">{skillSearch ? 'No matching skills' : 'No enabled skills'}</p>
            <p className="text-[11px] text-slate-400 mt-1">{skillSearch ? 'Try a different search' : 'Enable skills from the Skills Library'}</p>
          </div>
        ) : filtered.map(skill => {
          const isActive = activeSkillIds instanceof Set ? activeSkillIds.has(skill.id) : activeSkill?.id === skill.id;
          const isOfficial = skill.isDefault;
          return (
            <button key={skill.id} onClick={() => { if (onSlashSelect) { onSlashSelect(skill); onClose(); } else { onToggleSkill(skill.id); } }}
              className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <Sparkles size={14} className={`mt-0.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>{skill.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${isOfficial ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {isOfficial ? 'Official' : 'Custom'}
                  </span>
                </div>
                {skill.description && (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{skill.description}</p>
                )}
              </div>
              {isActive && <CheckCircle2 size={14} className="text-indigo-500 shrink-0 mt-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {onManageSkills && (
        <div className="border-t border-slate-100 px-3 py-2.5">
          <button onClick={() => { onManageSkills(null); onClose(); }}
            className="w-full flex items-center gap-2 px-1 py-1 text-[12px] font-medium text-slate-500 hover:text-indigo-600 transition-colors rounded-lg">
            <Sparkles size={12} />
            Manage Skills
          </button>
        </div>
      )}
    </div>
  );
};

// ── Account Connector (replaces "Select from Page" — opens upward) ──────────
const MetaIcon = () => <img src="/meta-icon.svg" alt="Meta" className="w-3.5 h-3.5 shrink-0" />;
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.84 4.84 0 01-3.77-1.81V6.69h3.77z"/></svg>
);

const AccountConnector = ({ token, onLogin, onLogout, isLoginLoading, loginError, selectedAccount, selectedBusiness, onSelectAccount, dropUp = true, googleConnected, googleCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('platforms'); // 'platforms' | 'business' | 'accounts' | 'google_accounts'
  const [activeBiz, setActiveBiz] = useState(null);
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(null);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts: accounts, isLoading: accLoading } = useAdAccounts(activeBiz?.id);

  const fetchGoogleAccounts = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const res = await fetch('/api/google/accounts');
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to load Google accounts');
      const flat = [];
      (data.accounts || []).forEach(acc => {
        if (acc.isManager && acc.children?.length) acc.children.forEach(c => flat.push({ ...c, mccId: acc.id }));
        else flat.push(acc);
      });
      setGoogleAccounts(flat);
    } catch (e) {
      setGoogleError(e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (!googleConnected) {
      onGoogleConnect?.();
      setOpen(false);
      return;
    }
    setLevel('google_accounts');
    if (googleAccounts.length === 0) fetchGoogleAccounts();
  };

  const handleGoogleAccountPick = (acc) => {
    onSelectGoogleAccount?.(acc.id, acc.mccId || null);
    setOpen(false);
    setLevel('platforms');
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-navigate: if token exists, skip platforms → go straight to business or accounts
  const getInitialLevel = () => {
    if (!token) return 'platforms';
    if (selectedBusiness) { setActiveBiz(selectedBusiness); return 'accounts'; }
    return 'business';
  };

  // Auto-open account picker when logged in but no account selected
  const prevToken = useRef(token);
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    // After fresh login (token changes null → value)
    if (!prevToken.current && token) { setOpen(true); setLevel('business'); hasAutoOpened.current = true; }
    prevToken.current = token;
  }, [token]);

  // On mount: if token exists but no account selected, nudge user to pick one
  useEffect(() => {
    if (token && !selectedAccount && !hasAutoOpened.current) {
      const timer = setTimeout(() => { setOpen(true); setLevel(selectedBusiness ? 'accounts' : 'business'); }, 500);
      hasAutoOpened.current = true;
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMetaClick = () => {
    if (!token) { onLogin?.(); return; } // keep dropdown open to show loading/error
    setLevel('business');
  };

  const handleBizClick = (biz) => { setActiveBiz(biz); setLevel('accounts'); };

  const handleAccClick = (account) => {
    onSelectAccount?.(activeBiz, account);
    setOpen(false);
    setLevel('platforms');
  };

  const isConnected = !!token && !!selectedAccount;
  const isLoggedIn = !!token;

  // Meta-only button content (Google + TikTok are Coming Soon)
  let buttonContent;
  if (isConnected) {
    buttonContent = <><img src="/meta-icon.svg" alt="Meta" className="w-3 h-3" /><span className="truncate max-w-[160px]">{selectedAccount.name}</span></>;
  } else {
    buttonContent = <><Link2 size={12} /><span>{isLoggedIn ? 'Select Account' : 'Connect'}</span></>;
  }

  const buttonStyle = isConnected
    ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
    : isLoggedIn ? 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100'
    : 'border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(v => { if (!v) setLevel(getInitialLevel()); return !v; }); }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors ${buttonStyle}`}>
        {buttonContent}
      </button>

      {open && (
        <div className={`absolute left-0 w-[260px] bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-[100] overflow-hidden ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          {level === 'platforms' && (
            <>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ad Platforms</p>
              </div>
              <div className="py-1">
                {/* Meta Ads */}
                <button onClick={handleMetaClick}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                  <MetaIcon />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-700 truncate">Meta Ads</p>
                    {isConnected && <p className="text-[10px] text-slate-400 truncate">{selectedAccount.name}</p>}
                  </div>
                  {isConnected ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLogout?.(); setOpen(false); }}
                      className="relative w-8 h-[18px] rounded-full bg-emerald-500 hover:bg-red-500 transition-colors group"
                      title="Disconnect"
                    >
                      <span className="absolute top-[2px] right-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all group-hover:right-[14px]" />
                    </button>
                  ) : isLoggedIn ? (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Select Account</span>
                  ) : (
                    <span className="text-[10px] font-medium text-blue-600">Connect</span>
                  )}
                </button>
                {/* Loading / Error */}
                {isLoginLoading && (
                  <div className="px-3 py-2 text-center">
                    <p className="text-[11px] text-indigo-500 font-medium animate-pulse">Connecting to Facebook...</p>
                  </div>
                )}
                {loginError && (
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-red-500 font-medium">{loginError}</p>
                  </div>
                )}
                {/* Google Ads — Coming Soon */}
                <div className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left opacity-50 cursor-default">
                  <GoogleIcon />
                  <span className="text-[12px] font-medium text-slate-400 flex-1">Google Ads</span>
                  <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
                </div>
                {/* TikTok Ads — Coming Soon */}
                <div className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left opacity-50 cursor-default">
                  <TikTokIcon />
                  <span className="text-[12px] font-medium text-slate-400 flex-1">TikTok Ads</span>
                  <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
                </div>
              </div>
            </>
          )}
          {level === 'business' && (
            <>
              <button onClick={() => setLevel('platforms')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14} className="text-slate-400" />
                <MetaIcon />
                <span className="text-[11px] font-medium text-slate-500">Meta Ads</span>
              </button>
              <div className="px-3 py-1.5 border-b border-slate-50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {bizLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading...</div>
                ) : businesses.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No businesses found</div>
                ) : businesses.map(biz => (
                  <button key={biz.id} onClick={() => handleBizClick(biz)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${biz.id === selectedBusiness?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{biz.name}</span>
                    <ChevronRight size={12} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
          {level === 'accounts' && (
            <>
              <button onClick={() => setLevel('business')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14} className="text-slate-400" />
                <Building2 size={12} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{activeBiz?.name}</span>
              </button>
              <div className="max-h-48 overflow-y-auto">
                {accLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading...</div>
                ) : accounts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No accounts found</div>
                ) : accounts.map(account => (
                  <button key={account.id} onClick={() => handleAccClick(account)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${account.id === selectedAccount?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">{account.name?.[0]?.toUpperCase()}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium truncate ${account.id === selectedAccount?.id ? 'text-blue-600' : 'text-slate-700'}`}>{account.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">act_{account.account_id}</p>
                    </div>
                    {account.id === selectedAccount?.id && <Check size={12} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
          {level === 'google_accounts' && (
            <>
              <button onClick={() => setLevel('platforms')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500">Google Ads Accounts</span>
              </button>
              <div className="max-h-64 overflow-y-auto">
                {googleLoading && <div className="px-3 py-6 text-center text-[11px] text-slate-400">Loading accounts…</div>}
                {googleError && <div className="px-3 py-3 text-[11px] text-red-500">{googleError}</div>}
                {!googleLoading && !googleError && googleAccounts.length === 0 && (
                  <div className="px-3 py-6 text-center text-[11px] text-slate-400">No Google Ads accounts found</div>
                )}
                {googleAccounts.map(acc => (
                  <button key={acc.id} onClick={() => handleGoogleAccountPick(acc)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{acc.name || `Account ${acc.id}`}</p>
                      <p className="text-[10px] text-slate-400">{acc.id} · {acc.currencyCode || ''}</p>
                    </div>
                    {acc.id === googleCustomerId && <Check size={12} className="text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Input box with drag & drop + slash commands ─────────────────────────────
// Keyword-based skill suggestion — match user input against skill descriptions
const useSuggestedSkill = (input, skills, activeSkill, slashSkills) => {
  const [suggested, setSuggested] = useState(null);
  useEffect(() => {
    if (!input || input.startsWith('/') || input.length < 8 || activeSkill || slashSkills.length) {
      setSuggested(null);
      return;
    }
    const timer = setTimeout(() => {
      const lower = input.toLowerCase();
      const KEYWORD_MAP = {
        performance_analyst: ['performance', 'roas', 'cpa', 'ctr', 'cpc', 'metrics', 'report', 'kpi', 'spend', 'impressions', 'clicks', 'conversions'],
        creative_strategist: ['creative', 'ad copy', 'headline', 'fatigue', 'copy', 'variations', 'a/b test', 'design', 'image', 'video ad'],
        budget_optimizer: ['budget', 'spend', 'allocat', 'scaling', 'scale up', 'cost', 'optimize budget', 'reallocat', 'waste'],
        audience_strategist: ['audience', 'targeting', 'lookalike', 'overlap', 'retarget', 'custom audience', 'interest', 'demographic'],
        inception_funnel_audit: ['funnel', 'tofu', 'mofu', 'bofu', 'awareness', 'consideration', 'conversion funnel', 'full funnel', 'audit'],
      };
      for (const [skillId, keywords] of Object.entries(KEYWORD_MAP)) {
        if (keywords.some(kw => lower.includes(kw))) {
          setSuggested(skills.find(s => s.id === skillId) || null);
          return;
        }
      }
      setSuggested(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, skills, activeSkill, slashSkills]);
  return suggested;
};

// ── Action Pills with Use Case Tabs ──
const ACTION_PILLS = [
  { icon: '📊', label: 'Campaign', primary: true, cards: [
    { title: 'Launch new ads', desc: 'Drop images/videos, upload CSV, or start from scratch — single or bulk', prompt: 'I want to create new ads for my campaigns.' },
    { title: 'Boost post', desc: 'Pick a FB/IG post to promote — single or multiple posts', prompt: 'I want to boost a post from my page.' },
    { title: 'Edit campaigns', desc: 'Pause, change budgets, swap creatives, bulk update', prompt: 'I want to make changes to my existing campaigns.' },
  ]},
  { icon: '👥', label: 'Audience', primary: true, cards: [
    { title: 'Create audience', desc: 'Lookalike, retargeting, custom list, interest-based — single or bulk', prompt: 'I want to create a new audience for my campaigns.' },
    { title: 'Manage audiences', desc: 'View existing, check overlap, edit, refresh stale', prompt: 'Show me my existing audiences and check for any issues.' },
  ]},
  { icon: '⚡', label: 'Automations', primary: true, cards: [
    { title: 'Create rule', desc: 'Auto-pause, auto-scale, spend alerts, frequency caps', prompt: 'I want to create an automation rule for my campaigns.' },
    { title: 'Manage rules', desc: 'View, edit, or delete existing rules', prompt: 'Show me my existing automation rules.' },
  ]},
  { icon: '📈', label: 'Performance', primary: true, cards: [
    { title: 'Quick snapshot', desc: 'Key metrics, red flags, wins — with dashboard', prompt: 'How are my campaigns doing? Show me the dashboard.' },
    { title: 'Diagnose & fix', desc: 'Find why CPA is high, ROAS dropped, or spend is off', prompt: 'Something seems off with my campaigns. Help me figure out what\'s wrong and how to fix it.' },
    { title: 'Weekly report', desc: 'This week vs last — formatted for boss or client', prompt: 'Generate my weekly performance report.' },
  ]},
  { icon: '🎨', label: 'Creatives', primary: true, cards: [
    { title: 'Upload & manage', desc: 'Add new assets, see what\'s used vs available', prompt: 'I want to manage my creative assets.' },
    { title: 'What\'s working', desc: 'Which creatives perform best and what to make next', prompt: 'Analyze my creative performance and suggest what to make next.' },
  ]},
  // Secondary — shown in "More" expandable
  { icon: '📋', label: 'Lead Forms', cards: [
    { title: 'Create form', desc: 'Design questions, privacy, thank-you page', prompt: 'I want to create a lead generation form.' },
    { title: 'Check performance', desc: 'Completion rates, cost per lead, drop-off', prompt: 'How are my lead forms performing?' },
  ]},
  { icon: '🔍', label: 'Ad Review', cards: [
    { title: 'Review my ads', desc: 'See what\'s running across all campaigns', prompt: 'Show me all the ads running in my account.' },
    { title: 'Ad fatigue check', desc: 'Find tired ads and suggest replacements', prompt: 'Which of my ads are fatigued and need replacing?' },
  ]},
  { icon: '🎯', label: 'Tracking', cards: [
    { title: 'Setup tracking', desc: 'Meta Pixel, CAPI, conversion events', prompt: 'I need to set up tracking for my website.' },
    { title: 'Check setup', desc: 'Verify events are firing correctly', prompt: 'Is my tracking working properly?' },
  ]},
];

const ActionPills = ({ onSelect, activePill, setActivePill }) => {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  const primaryPills = ACTION_PILLS.filter(p => p.primary);
  const secondaryPills = ACTION_PILLS.filter(p => !p.primary);

  // Close More dropdown on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);


  return (
    <div className="mt-6 relative z-0">
      {/* Pills row — hidden when a pill is selected */}
      {!activePill && (
        <div className="relative flex items-center justify-center gap-2.5">
          {primaryPills.map(pill => (
            <button key={pill.label} onClick={() => setActivePill(pill.label)}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-semibold bg-white border border-slate-200/70 text-slate-600 hover:border-orange-200 hover:shadow-[0_4px_16px_-2px_rgba(251,146,60,0.15)] hover:text-orange-700 transition-all duration-300 hover:-translate-y-0.5">
              <span className="text-[15px] group-hover:scale-110 transition-transform duration-200">{pill.icon}</span>
              {pill.label}
            </button>
          ))}
          <div className="relative" ref={moreRef}>
            <button onClick={() => setShowMore(!showMore)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[12px] font-semibold transition-all duration-300 ${
                showMore ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-200/70 text-slate-600 hover:border-orange-200 hover:shadow-[0_4px_16px_-2px_rgba(251,146,60,0.15)] hover:text-orange-700 hover:-translate-y-0.5'
              }`}>
              More
            </button>
            {showMore && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl z-30 py-2 min-w-[180px] animate-[fadeSlideUp_0.15s_ease-out]">
                {secondaryPills.map(pill => (
                  <button key={pill.label} onClick={() => { setActivePill(pill.label); setShowMore(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[12px] font-medium text-slate-600 hover:bg-orange-50/50 hover:text-orange-700 transition-colors text-left">
                    <span className="text-[15px]">{pill.icon}</span>
                    {pill.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflow cards — shown when pill selected */}
      {activePill && (() => {
        const pill = ACTION_PILLS.find(p => p.label === activePill);
        if (!pill?.cards) return null;
        return (
          <div className="animate-[fadeSlideUp_0.2s_ease-out]" data-workflow-cards>
            <div className={`grid gap-3 ${pill.cards.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {pill.cards.map((card) => (
                  <button key={card.title} onClick={() => onSelect(card.prompt)}
                    className="group text-left rounded-2xl bg-white border border-orange-100 relative overflow-hidden hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 flex flex-col min-h-[160px]">
                    {/* Warm gradient bg — always subtle, stronger on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 to-amber-50/20 group-hover:from-orange-50/80 group-hover:to-amber-50/40 transition-all duration-500" />
                    {/* Top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-400 to-amber-400 opacity-30 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative p-5 flex flex-col flex-1">
                      <p className="text-[13px] font-bold text-slate-800 group-hover:text-orange-800 transition-colors leading-snug">{card.title}</p>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed flex-1">{card.desc}</p>
                      <div className="flex justify-end mt-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-500/20 group-hover:shadow-md group-hover:shadow-orange-500/30 group-hover:scale-110 transition-all duration-300">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7V17" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const ChatInput = ({ input, setInput, onKeyDown, onSend, onStop, onFilesAdded, attachments, onRemoveAttachment, onRetryUpload, fileRef, isTyping, handleFileUpload, isOver, activeSkill, activeSkills = [], onDeactivateSkill, skills = [], onSlashSelect, slashSkills = [], onRemoveSlashSkill, onClearAllSlash, onToggleSkill, onManageSkills, token, onLogin, onLogout, isLoginLoading, loginError, selectedAccount, selectedBusiness, onSelectAccount, enabledSkillIds = [], activeSkillIds, brandEnabledCount = 0, isEmptyState = false, activePill, setActivePill, googleConnected, googleCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount }) => {
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  // Slash command detection — show picker when input starts with "/"
  const showSlash = input.startsWith('/');
  const slashFilter = showSlash ? input.slice(1).trim() : '';
  const filteredSkills = showSlash ? skills.filter(s =>
    !slashSkills.find(ss => ss.id === s.id) && // hide already-selected
    (!slashFilter || s.name.toLowerCase().includes(slashFilter.toLowerCase()) || s.id.includes(slashFilter.toLowerCase()))
  ) : [];
  const [slashIndex, setSlashIndex] = useState(0);

  // Context-aware skill suggestion
  const suggestedSkill = useSuggestedSkill(input, skills, activeSkill, slashSkills);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(null);

  const handleChange = (e) => {
    setInput(e.target.value);
    setSlashIndex(0);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px'; // max ~14 rows, then scroll
  };

  const handleSlashKeyDown = (e) => {
    if (showSlash && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredSkills.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        onSlashSelect(filteredSkills[slashIndex]);
        return;
      }
      if (e.key === 'Escape') { setInput(''); return; }
    }
    // Backspace on empty input removes last slash skill chip
    if (e.key === 'Backspace' && !input && slashSkills.length > 0) {
      onRemoveSlashSkill(slashSkills[slashSkills.length - 1].id);
      return;
    }
    onKeyDown(e);
  };

  const activeSkillsList = Array.isArray(activeSkills) ? activeSkills : (activeSkill ? [activeSkill] : []);
  const hasChips = slashSkills.length > 0 || activeSkillsList.length > 0 || brandEnabledCount > 0;

  return (
    <div className="relative">
      <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl shadow-lg transition-all
        ${isOver ? 'border-blue-400 ring-2 ring-blue-100'
          : 'border-orange-300/60 ring-1 ring-orange-200/40 shadow-orange-100/30'}
        focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200 focus-within:shadow-orange-200/40`}>
        <AttachmentBar attachments={attachments} onRemove={onRemoveAttachment} onRetry={onRetryUpload} />
        {/* Skill chips — shown above textarea */}
        {hasChips && (
          <div className="px-4 pt-3 pb-0 flex flex-wrap items-center gap-1.5">
            {slashSkills.map(sk => (
              <div key={sk.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-[11px] font-semibold text-violet-700">
                <Sparkles size={11} />
                /{sk.id}
                <button onClick={() => onRemoveSlashSkill(sk.id)} className="ml-0.5 text-violet-400 hover:text-violet-600 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
            {activeSkillsList.map(sk => (
              <div key={sk.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-[11px] font-semibold text-indigo-700">
                <Sparkles size={11} />
                {sk.name}
                <button onClick={() => onDeactivateSkill(sk.id)} className="ml-0.5 text-indigo-400 hover:text-indigo-600 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
            {brandEnabledCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                <BookMarked size={11} />
                Brand Memory · {brandEnabledCount}
              </div>
            )}
          </div>
        )}
        {/* Context-aware skill suggestion */}
        {suggestedSkill && suggestedSkill.id !== dismissedSuggestion && !hasChips && (
          <div className="px-4 pt-3 pb-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px]">
              <Sparkles size={11} className="text-amber-500" />
              <span className="text-amber-700"><strong>{suggestedSkill.name}</strong> might help</span>
              <button onClick={() => { onSlashSelect(suggestedSkill); setDismissedSuggestion(null); }}
                className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-semibold hover:bg-amber-300 transition-colors">
                Use
              </button>
              <button onClick={() => setDismissedSuggestion(suggestedSkill.id)}
                className="text-amber-400 hover:text-amber-600 transition-colors">
                <X size={11} />
              </button>
            </div>
          </div>
        )}
        <div className="px-4 pt-4 pb-3">
          <textarea
            value={input}
            onChange={(e) => { handleChange(e); if (dismissedSuggestion) setDismissedSuggestion(null); }}
            onKeyDown={handleSlashKeyDown}
            placeholder={slashSkills.length ? 'Type your message...' : activeSkillsList.length ? `${activeSkillsList.length} skill${activeSkillsList.length > 1 ? 's' : ''} active...` : attachments.length ? 'Describe what to do with these files...' : 'Manage ads, create skills, analyze performance... (type / for skills)'}
            rows={1}
            disabled={isTyping}
            className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 overflow-y-auto"
            style={{ lineHeight: '1.5', maxHeight: '300px' }}
          />
        </div>
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="relative flex items-center gap-2">
            {/* + Menu: files & skills */}
            <button onClick={() => { setPlusMenuOpen(!plusMenuOpen); setSkillsOpen(false); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative ${plusMenuOpen || skillsOpen ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              title="Add">
              <Plus size={16} />
              {activeSkillsList.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.txt,.doc,.docx" multiple className="hidden" onChange={handleFileUpload} />

            {/* Plus menu dropdown */}
            {plusMenuOpen && !skillsOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setPlusMenuOpen(false)} />
                <div className={`absolute left-0 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 z-[100] py-1.5 ${isEmptyState ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                  <button onClick={() => { setPlusMenuOpen(false); fileRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 rounded-lg">
                    <Paperclip size={15} className="text-slate-400" />
                    Add from local files
                  </button>
                  <button onClick={() => { setPlusMenuOpen(false); setSkillsOpen(true); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 rounded-lg">
                    <span className="flex items-center gap-2.5">
                      <Sparkles size={15} className="text-slate-400" />
                      Use Skills
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </button>
                </div>
              </>
            )}

            {/* Skills dropdown */}
            {skillsOpen && (
              <SkillsDropdown skills={skills} activeSkill={activeSkill} activeSkillIds={activeSkillIds} onToggleSkill={onToggleSkill} onSlashSelect={onSlashSelect} onManageSkills={onManageSkills} onClose={() => { setSkillsOpen(false); setPlusMenuOpen(false); }} enabledSkillIds={enabledSkillIds} dropUp={!isEmptyState} />
            )}

            <AccountConnector token={token} onLogin={onLogin} onLogout={onLogout} isLoginLoading={isLoginLoading} loginError={loginError} selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} dropUp={!isEmptyState} googleConnected={googleConnected} googleCustomerId={googleCustomerId} onGoogleConnect={onGoogleConnect} onGoogleDisconnect={onGoogleDisconnect} onSelectGoogleAccount={onSelectGoogleAccount} />
            {/* Active pill chip — orange theme */}
            {activePill && setActivePill && (() => {
              const pill = ACTION_PILLS.find(p => p.label === activePill);
              return pill ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-[11px] font-semibold text-orange-700 border border-orange-200">
                  <span className="text-[13px]">{pill.icon}</span>
                  {pill.label}
                  <button onClick={() => setActivePill(null)} className="text-orange-400 hover:text-orange-600 ml-0.5 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-2">
            {isTyping ? (
              <button onClick={onStop}
                className="w-8 h-8 rounded-lg bg-red-500 hover:bg-red-400 text-white flex items-center justify-center transition-colors shadow-sm"
                title="Stop generating">
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button onClick={onSend} disabled={!input.trim() && !attachments.length}
                className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shadow-sm">
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Slash command dropdown — above the input box */}
      {showSlash && filteredSkills.length > 0 && (
        <SlashPicker skills={filteredSkills} filter={slashFilter} onSelect={onSlashSelect} selectedIndex={slashIndex} />
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, activityLog = [], onSend, onStop, suggestedActions = [], cardCategories = [], quickChips = [], adAccountId, onSaveItem, folders = [], activeSkill = null, activeSkills = [], activeSkillIds, onDeactivateSkill, skills = [], onToggleSkill, onManageSkills, onNavigate, onOpenCanvas, token, onLogin, onLogout, isLoginLoading, loginError, selectedAccount, selectedBusiness, onSelectAccount, initialInput, initialPill, initialSlashSkill, enabledSkillIds = [], onCreateSkill, generateSkill, brandEnabledCount = 0, onSaveToBrand, userName = '', googleConnected, googleCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount }) => {
  const [input, setInput] = useState('');
  // Package as Skill state
  const [packagingMessage, setPackagingMessage] = useState(null);
  // Save to Brand state
  const [brandMessage, setBrandMessage] = useState(null);
  const [brandToast, setBrandToast] = useState(null);
  // Multi-message selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

  const handleToggleSelect = useCallback((msgId) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      return next;
    });
  }, []);

  const handlePackageSelected = useCallback(() => {
    const selected = messages.filter(m => selectedMessageIds.has(m.id) && m.role === 'agent');
    if (selected.length === 0) return;
    const combined = selected.map(m => m.text).join('\n\n---\n\n');
    setPackagingMessage({ text: combined, id: 'combined' });
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [messages, selectedMessageIds]);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  // Pre-fill input from parent (e.g. "Build with AI Ad Manager")
  const [consumedInput, setConsumedInput] = useState(null);
  useEffect(() => {
    if (initialInput && initialInput !== consumedInput) {
      setInput(initialInput);
      setConsumedInput(initialInput);
      // Focus the input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialInput, consumedInput]);
  const [attachments, setAttachments] = useState([]); // { id, file, preview, status, progress, result }
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState(null); // validation error toast
  const [slashSkills, setSlashSkills] = useState([]); // multiple one-off skills from /command

  // Pre-fill slash skill from parent (e.g. "Try it out" from Skills Library)
  const [consumedSlash, setConsumedSlash] = useState(null);
  useEffect(() => {
    if (initialSlashSkill && initialSlashSkill.id !== consumedSlash) {
      setSlashSkills(prev => prev.find(s => s.id === initialSlashSkill.id) ? prev : [...prev, initialSlashSkill]);
      setConsumedSlash(initialSlashSkill.id);
    }
  }, [initialSlashSkill, consumedSlash]);
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fileRef  = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  // Empty state: no messages, or only the old welcome message
  const isEmptyState = messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome');
  const [activePill, setActivePill] = useState(initialPill || null);

  // Set pill when navigating from a module
  useEffect(() => { if (initialPill) setActivePill(initialPill); }, [initialPill]);
  const dragCounter = useRef(0);

  // Upload a file: GCS-first, then register with Meta via URL.
  //
  //   Step 1: Upload bytes to GCS (direct, with real progress events).
  //   Step 2: Tell /api/assets/bulk-upload to register that GCS URL with Meta
  //           — Meta pulls the object and returns image_hash / video_id.
  //
  // Bytes only traverse the user's network once. If GCS fails, we fall back to
  // the legacy base64 → bulk-upload path so the user always succeeds.
  const uploadFile = useCallback(async (attachment) => {
    if (!adAccountId) {
      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'error', error: 'Select an ad account first' } : a));
      return;
    }

    setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'uploading', progress: 2 } : a));

    // Auth now flows via the HttpOnly aam_session cookie — no Bearer needed
    // for the GCS sign endpoints or Meta bulk-upload, but we must opt in to
    // sending credentials with fetch().

    // ── Step 1: GCS direct upload (real progress 0–90%) ─────────────────────
    let gcs = null;
    try {
      gcs = await uploadToGcs(attachment.file, {
        kind: 'chat',
        onProgress: (p) => {
          // Reserve 90–100% for the Meta register call.
          const scaled = Math.round(p * 0.9);
          setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, progress: scaled } : a));
        },
      });
      setAttachments(prev => prev.map(a => a.id === attachment.id
        ? { ...a, gcs: { objectKey: gcs.objectKey, publicUrl: gcs.publicUrl, size: gcs.size }, progress: 90 }
        : a));
    } catch (err) {
      console.warn('[chat] GCS upload failed, falling back to base64:', err?.message || err);
      gcs = null; // signal fallback
    }

    // ── Step 2: register with Meta ─────────────────────────────────────────
    try {
      let bulkFile;
      if (gcs) {
        // Preferred path: tell Meta to pull from GCS CDN URL.
        bulkFile = { name: attachment.file.name, type: attachment.file.type, url: gcs.publicUrl };
      } else {
        // Fallback: read file as base64 and upload the old way.
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(attachment.file);
        });
        bulkFile = { name: attachment.file.name, type: attachment.file.type, base64 };
      }

      const res = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId, files: [bulkFile] }),
      });

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

    // ── File count limit ──────────────────────────────────────────────
    const MAX_FILES = 10;
    const currentCount = attachments.length;
    if (currentCount + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files per message (${currentCount} already attached)`);
      setTimeout(() => setFileError(null), 6000);
      return;
    }

    // ── Format & size validation ──────────────────────────────────────
    const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const ALLOWED_VIDEO = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    const MAX_IMAGE_MB = 30;
    const MAX_VIDEO_MB = 4096; // 4 GB

    const rejected = [];
    const validMedia = [];

    for (const file of files) {
      if (isDoc(file)) continue; // docs handled below
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const sizeMB = file.size / (1024 * 1024);

      if (isImage && !ALLOWED_IMAGE.includes(file.type)) {
        rejected.push(`${file.name}: unsupported image format (use JPG, PNG, WebP, or GIF)`);
      } else if (isImage && sizeMB > MAX_IMAGE_MB) {
        rejected.push(`${file.name}: image too large (${sizeMB.toFixed(1)}MB, max ${MAX_IMAGE_MB}MB)`);
      } else if (isVideo && !ALLOWED_VIDEO.includes(file.type)) {
        rejected.push(`${file.name}: unsupported video format (use MP4, MOV, AVI, or MKV)`);
      } else if (isVideo && sizeMB > MAX_VIDEO_MB) {
        rejected.push(`${file.name}: video too large (${(sizeMB / 1024).toFixed(1)}GB, max 4GB)`);
      } else if (isImage || isVideo) {
        validMedia.push(file);
      } else if (!isDoc(file)) {
        rejected.push(`${file.name}: unsupported file type`);
      }
    }

    if (rejected.length) {
      setFileError(rejected.join('\n'));
      setTimeout(() => setFileError(null), 6000);
    }

    // Media files — upload to Meta
    const mediaAttachments = validMedia.map(file => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      return { id, file, preview, status: 'queued', progress: 0, result: null };
    });
    if (mediaAttachments.length) {
      setAttachments(prev => [...prev, ...mediaAttachments]);
      mediaAttachments.forEach(a => uploadFile(a));
    }

    // Document files — parse text and add as attachment with extracted content.
    // A2 fix: side-car upload original file to GCS so the raw bytes are persisted
    // (AI only sees a truncated extract — without the original we can't replay/debug).
    // GCS failure is non-fatal: we log + continue with parse-doc only.
    const docFiles = files.filter(isDoc);
    docFiles.forEach(async (file) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      setAttachments(prev => [...prev, { id, file, preview: null, status: 'uploading', progress: 10, result: null, isDoc: true }]);

      // Fire GCS upload in parallel with parse-doc base64 prep
      const gcsPromise = uploadToGcs(file, {
        kind: 'chat',
        onProgress: (p) => {
          // Doc UI has a single progress bar — show GCS progress up to 60%,
          // leave 60-100% for parse-doc. Good enough signal; not exact.
          const scaled = Math.round(p * 0.6);
          setAttachments(prev => prev.map(a => a.id === id && a.progress < 60 ? { ...a, progress: scaled } : a));
        },
      }).catch(err => {
        console.warn('[chat] doc GCS upload failed (parse-doc will still run):', err?.message || err);
        return null;
      });

      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Cookie session carries auth — no Bearer header.
        const res = await fetch('/api/chat/parse-doc', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, type: file.type, name: file.name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Wait for GCS side-car to settle before marking done (it's usually
        // faster than parse-doc so this rarely blocks).
        const gcs = await gcsPromise;

        setAttachments(prev => prev.map(a => a.id === id ? {
          ...a, status: 'done', progress: 100,
          gcs: gcs ? { objectKey: gcs.objectKey, publicUrl: gcs.publicUrl, size: gcs.size } : null,
          result: { type: 'document', text: data.text, charCount: data.charCount, truncated: data.truncated },
        } : a));
      } catch (err) {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error: err.message } : a));
      }
    });
  }, [uploadFile, attachments]);

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

  const handleSlashSelect = useCallback((skill) => {
    setSlashSkills(prev => prev.find(s => s.id === skill.id) ? prev : [...prev, skill]);
    setInput(skill.starterPrompt || '');
  }, []);

  const handleRemoveSlashSkill = useCallback((skillId) => {
    setSlashSkills(prev => prev.filter(s => s.id !== skillId));
  }, []);

  const handleSend = useCallback((text) => {
    const t = (typeof text === 'string' ? text : input).trim();

    // Navigation prefixes — intercept and route instead of sending as message
    const navMatch = t.match(/^\[(\w+)\]\s*(.*)/);
    if (navMatch && onNavigate) {
      onNavigate(navMatch[1]); // e.g. "audiences"
      return;
    }

    // Intercept common navigation phrases from AI quick replies
    const lc = t.toLowerCase();
    if (lc.includes('go to skills library') || lc.includes('skills library') && lc.length < 30) {
      if (onNavigate) onNavigate('skills');
      return;
    }

    const doneAttachments = attachments.filter(a => a.status === 'done');

    if (!t && !doneAttachments.length) return;
    if (isTyping) {
      // If typing and user clicks a suggested action card, stop first then send
      if (typeof text === 'string' && onStop) { onStop(); }
      else return;
    }

    // Build message text with asset info
    let msgText = t;

    // Pass slash skill IDs to parent so it injects their context (skills persist in input bar)
    const currentSlashIds = slashSkills.map(s => s.id);
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
        : `\n\nI've uploaded these creatives to the ad account. Build me a campaign using these assets — suggest the best objective, targeting, ad format, and generate the ad copy. Use my brand memory if available.`;

      msgText = lines.join('\n') + (t ? '\n\n' + t : defaultPrompt);
    }

    // Pass attachment metadata on user message. Shape designed to round-trip
    // through Supabase `chat_messages.metadata.attachments` — so we deliberately
    // keep the blob `preview` (used only for the in-memory first render) next
    // to the durable `gcs_public_url` (used on reload). The save layer strips
    // the blob URL before persisting.
    const msgAttachments = doneAttachments.map(a => ({
      name: a.file.name,
      type: a.file.type,
      preview: a.preview,             // blob: URL — ephemeral, stripped on save
      isDoc: !!a.isDoc,
      image_hash: a.result?.image_hash,
      video_id: a.result?.video_id,
      // GCS side-car — persists images, videos, and documents to our bucket.
      // Absent if the side-car upload failed (non-fatal; Meta / base64 paths still work).
      gcs_object_key: a.gcs?.objectKey,
      gcs_public_url: a.gcs?.publicUrl,
      size: a.gcs?.size ?? a.file.size,
    }));

    // 4th arg = displayText: what the USER sees in their own bubble.
    // msgText is the AI-visible prompt (with [Uploaded image: ..., image_hash: ...]
    // hints the agent needs). `t` is the raw user input — thumbnails already
    // render above so no need to repeat filename/hash in the bubble body.
    onSend(msgText, msgAttachments, currentSlashIds, t);
    setInput('');
    setAttachments([]);
    inputRef.current?.focus();
  }, [input, isTyping, onSend, attachments, slashSkills]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30"
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

      {/* File validation error toast */}
      {fileError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-md animate-in slide-in-from-top-2">
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 mb-1">File not supported</p>
              {fileError.split('\n').map((line, i) => (
                <p key={i} className="text-[11px] text-red-600 leading-relaxed">{line}</p>
              ))}
            </div>
            <button onClick={() => setFileError(null)} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Empty State — title+input anchored at ~40% height, content grows below with scroll */}
      {isEmptyState && (
        <div className="flex-1 overflow-y-auto">
          <div style={{ height: '25vh' }} />
          <div className="w-full max-w-[820px] mx-auto px-8">
            <div className="text-center mb-6">
              {userName && <p className="text-[14px] text-slate-400 mb-1">Hello, {userName.split(' ')[0]} 👋</p>}
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Optimize</span> Your Ads?
              </h1>
            </div>
            <div className="relative z-10">
              <ChatInput
                input={input} setInput={setInput} onKeyDown={handleKeyDown}
                onSend={() => handleSend()} onStop={onStop} onFilesAdded={addFiles}
                attachments={attachments} onRemoveAttachment={removeAttachment} onRetryUpload={uploadFile}
                fileRef={fileRef} isTyping={isTyping}
                handleFileUpload={handleFileInput} isOver={isDragOver}
                activeSkill={activeSkill} activeSkills={activeSkills} activeSkillIds={activeSkillIds} onDeactivateSkill={onDeactivateSkill}
                skills={skills} onSlashSelect={handleSlashSelect} slashSkills={slashSkills} onRemoveSlashSkill={handleRemoveSlashSkill} onClearAllSlash={() => setSlashSkills([])} enabledSkillIds={enabledSkillIds}
                onToggleSkill={onToggleSkill} onManageSkills={onManageSkills}
                token={token} onLogin={onLogin} onLogout={onLogout} isLoginLoading={isLoginLoading} loginError={loginError} selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount}
                brandEnabledCount={brandEnabledCount}
                isEmptyState={true}
                activePill={activePill} setActivePill={setActivePill}
                googleConnected={googleConnected} googleCustomerId={googleCustomerId} onGoogleConnect={onGoogleConnect} onGoogleDisconnect={onGoogleDisconnect} onSelectGoogleAccount={onSelectGoogleAccount}
              />
            </div>
            <ActionPills activePill={activePill} setActivePill={setActivePill} onSelect={(prompt) => { setInput(prompt); setTimeout(() => { const el = document.querySelector('textarea'); if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 300) + 'px'; } }, 0); }} />
          </div>
        </div>
      )}

      {/* Chat messages */}
      {!isEmptyState && (
        <>
          {/* overflow-x-hidden + min-w-0 here is the belt-and-braces fix for
              the bottom horizontal scrollbar: when the chat is narrowed
              (canvas open at 520px) any over-wide message content (tables,
              charts, MetaCard) used to push the container, triggering a
              page-level horizontal scroll. We clip it instead. */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-2 min-w-0">
              {messages.map((msg, idx) => {
                // Find the first user message after this agent message (if any)
                const nextUserMsg = msg.role === 'agent'
                  ? messages.slice(idx + 1).find(m => m.role === 'user')
                  : null;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isLatest={msg.id === lastId}
                    onSend={handleSend}
                    isTyping={isTyping}
                    onSaveItem={onSaveItem}
                    folders={folders}
                    isAnswered={!!nextUserMsg}
                    answeredWith={nextUserMsg?.text || ''}
                    onOpenCanvas={onOpenCanvas}
                    adAccountId={adAccountId}
                    token={token}
                    onPackageAsSkill={onCreateSkill ? setPackagingMessage : undefined}
                    onSaveToBrand={onSaveToBrand ? setBrandMessage : undefined}
                    selectionMode={selectionMode}
                    isSelected={selectedMessageIds.has(msg.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                );
              })}
              {isTyping && <TypingIndicator thinkingText={thinkingText} activityLog={activityLog} />}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3 overflow-x-hidden">
            <div className="max-w-3xl mx-auto min-w-0">
              <ChatInput
                input={input} setInput={setInput} onKeyDown={handleKeyDown}
                onSend={() => handleSend()} onStop={onStop} onFilesAdded={addFiles}
                attachments={attachments} onRemoveAttachment={removeAttachment} onRetryUpload={uploadFile}
                fileRef={fileRef} isTyping={isTyping}
                handleFileUpload={handleFileInput} isOver={isDragOver}
                activeSkill={activeSkill} activeSkills={activeSkills} activeSkillIds={activeSkillIds} onDeactivateSkill={onDeactivateSkill}
                skills={skills} onSlashSelect={handleSlashSelect} slashSkills={slashSkills} onRemoveSlashSkill={handleRemoveSlashSkill} onClearAllSlash={() => setSlashSkills([])} enabledSkillIds={enabledSkillIds}
                onToggleSkill={onToggleSkill} onManageSkills={onManageSkills}
                token={token} onLogin={onLogin} isLoginLoading={isLoginLoading} loginError={loginError} selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount}
                brandEnabledCount={brandEnabledCount}
                activePill={activePill} setActivePill={setActivePill}
                googleConnected={googleConnected} googleCustomerId={googleCustomerId} onGoogleConnect={onGoogleConnect} onGoogleDisconnect={onGoogleDisconnect} onSelectGoogleAccount={onSelectGoogleAccount}
              />
            </div>
          </div>
        </>
      )}

      {/* Multi-message selection floating bar */}
      {selectionMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-indigo-200 px-4 py-2.5 flex items-center gap-3">
          <span className="text-[11px] font-medium text-slate-500">
            {selectedMessageIds.size} message{selectedMessageIds.size !== 1 ? 's' : ''} selected
          </span>
          <button onClick={handlePackageSelected} disabled={selectedMessageIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors">
            <PackageOpen size={12} /> Save as Skill
          </button>
          <button onClick={handleExitSelection}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </div>
      )}

      {/* Selection mode toggle */}
      {onCreateSkill && !selectionMode && messages.some(m => m.role === 'agent') && (
        <button onClick={() => setSelectionMode(true)}
          className="fixed bottom-20 right-6 z-40 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold text-slate-500 bg-white/90 backdrop-blur-sm border border-slate-200/80 hover:border-orange-300 hover:text-orange-600 shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-0.5"
          title="Select messages to package as skill">
          <CheckSquare size={12} /> Select Messages
        </button>
      )}

      {/* Save as Skill Modal */}
      {packagingMessage && onCreateSkill && (
        <SaveAsSkillModal
          messageText={packagingMessage.text}
          onClose={() => setPackagingMessage(null)}
          onCreateSkill={onCreateSkill}
          generateSkill={generateSkill}
        />
      )}

      {/* Save to Brand Modal */}
      {brandMessage && onSaveToBrand && (
        <SaveToBrandModal
          messageText={brandMessage.text}
          onClose={() => setBrandMessage(null)}
          onSaveToBrand={async (data) => {
            await onSaveToBrand(data);
            setBrandMessage(null);
            setBrandToast('Saved to Brand Library. AI will remember this in future conversations.');
            setTimeout(() => setBrandToast(null), 4000);
          }}
        />
      )}

      {/* Brand toast */}
      {brandToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium max-w-md">
          <Brain size={16} />
          {brandToast}
        </div>
      )}
    </div>
  );
};
