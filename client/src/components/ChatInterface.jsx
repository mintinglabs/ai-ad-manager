import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Paperclip, CheckCircle2, XCircle, ArrowUpRight, BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap } from 'lucide-react';

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

  while (i < lines.length) {
    // Detect ```adlib code blocks
    if (lines[i].trim() === '```adlib') {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      i++;
      let jsonBuf = '';
      while (i < lines.length && lines[i].trim() !== '```') {
        jsonBuf += lines[i] + '\n';
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      try {
        const ads = JSON.parse(jsonBuf.trim());
        if (Array.isArray(ads)) segments.push({ type: 'adlib', ads });
      } catch { /* ignore parse errors, treat as text */ }
      continue;
    }

    // Look for table: header row + separator row
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
    } else {
      textBuf.push(lines[i]);
      i++;
    }
  }
  if (textBuf.length) segments.push({ type: 'text', content: textBuf.join('\n') });
  return segments;
};

// ── Styled table (Ads Manager style) ─────────────────────────────────────────
const StyledTable = ({ columns, rows }) => (
  <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
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
      <a
        key={i}
        href={ad.snapshot_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all group"
      >
        {/* Header */}
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
            ad.status === 'Active'
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {ad.status || 'Active'}
          </span>
        </div>

        {/* Body */}
        <div className="px-3.5 py-3 flex-1">
          {ad.headline && (
            <p className="text-[13px] font-semibold text-slate-800 mb-1.5 line-clamp-2">{ad.headline}</p>
          )}
          {ad.body && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{ad.body}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] text-slate-400">Ad Library</span>
          <span className="text-[10px] text-blue-600 group-hover:text-blue-500 transition-colors">View Ad →</span>
        </div>
      </a>
    ))}
  </div>
);

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
    listBuf = [];
    listType = null;
  };

  for (const line of lines) {
    // Headings
    if (line.startsWith('### ')) { flushList(); elements.push(<p key={elements.length} className="text-sm font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(4))}</p>); continue; }
    if (line.startsWith('## '))  { flushList(); elements.push(<p key={elements.length} className="text-base font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(3))}</p>); continue; }

    // Bullet lists
    const bullet = line.match(/^[\-\*]\s+(.*)/);
    if (bullet) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuf.push(bullet[1]);
      continue;
    }

    // Numbered lists
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (numbered) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuf.push(numbered[1]);
      continue;
    }

    flushList();

    // Empty line = paragraph break
    if (!line.trim()) { elements.push(<div key={elements.length} className="h-2" />); continue; }

    // Regular text
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
      <button
        key={value}
        onClick={() => onSend(value)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-md shadow-emerald-100' :
            variant === 'danger'  ? 'bg-red-500 hover:bg-red-400 text-white border-red-400 shadow-md shadow-red-100' :
            'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 shadow-sm'}`}
      >
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
  const avgRoas    = insights?.roas         ?? (() => {
    const active = campaigns.filter(c => c.roas > 0);
    return active.length ? active.reduce((s, c) => s + c.roas, 0) / active.length : 0;
  })();

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
            <SummaryCard label="Total Spend"   value={fmtUSD(totSpend)}   sub="Last 7 days" />
            <SummaryCard label="Impressions"   value={fmtNum(totImp)}     sub="Last 7 days" />
            <SummaryCard label="Clicks"        value={fmtNum(totClicks)}  sub="Last 7 days" />
            <SummaryCard label="Avg ROAS"      value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'} sub="Across campaigns" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-500">Campaign</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Delivery</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Budget</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Spend</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">ROAS</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Impressions</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Clicks</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-500">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-2.5 max-w-[180px]">
                      <p className="font-medium text-slate-800" title={c.name}>{truncate(c.name)}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{c.id}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {c.status === 'ACTIVE'
                        ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span>
                        : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]">Paused</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500">${(c.daily_budget / 100).toFixed(0)}/day</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmtUSD(c.spend)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${roasColor(c.roas)}`}>
                      {c.roas > 0 ? `${c.roas}x` : '—'}
                    </td>
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
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {message.columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {message.summary && (
          <div className="px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 italic">
            {renderInline(message.summary)}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping }) => {
  if (message.type === 'report') {
    return (
      <>
        <ReportMessage message={message} timestamp={message.timestamp} />
        <div className="mb-2" />
      </>
    );
  }

  if (message.type === 'table') {
    return (
      <>
        <TableMessage message={message} />
        {isLatest && message.actions?.length > 0 && (
          <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />
        )}
        <div className="mb-6" />
      </>
    );
  }

  const isAgent = message.role === 'agent';
  if (isAgent) {
    // Check if message contains markdown tables
    const segments = parseMarkdownTable(message.text);
    const hasTables = segments.some(s => s.type === 'table' || s.type === 'adlib');

    return (
      <>
        <div className="flex items-end gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
            <Bot size={15} className="text-white" />
          </div>
          <div className={hasTables ? 'max-w-[95%] flex-1 min-w-0' : 'max-w-[80%]'}>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
              {segments.map((seg, i) =>
                seg.type === 'table'
                  ? <StyledTable key={i} columns={seg.columns} rows={seg.rows} />
                  : seg.type === 'adlib'
                    ? <AdLibraryCards key={i} ads={seg.ads} />
                    : <div key={i} className="whitespace-pre-wrap">{renderRichText(seg.content)}</div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
          </div>
        </div>
        {isLatest && message.actions?.length > 0 && (
          <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />
        )}
        <div className="mb-6" />
      </>
    );
  }

  return (
    <div className="flex items-end justify-end gap-3 mb-6">
      <div className="max-w-[75%]">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-md shadow-blue-200/30">
          {message.text}
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Icon map for action cards ────────────────────────────────────────────────
const ICON_MAP = { BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap };

// ── Action card grid ─────────────────────────────────────────────────────────
const ActionCard = ({ icon, color, label, desc, prompt, onSend, disabled }) => {
  const Icon = ICON_MAP[icon] || Zap;
  return (
    <button
      onClick={() => onSend(prompt)}
      disabled={disabled}
      className="flex flex-col bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-md hover:shadow-blue-50 transition-all disabled:opacity-40 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon size={18} className="text-white" />
        </div>
        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </button>
  );
};

// ── Mode toggle (Fast / Deep Research) ───────────────────────────────────────
const ModeToggle = ({ mode, setMode }) => (
  <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
    {['Fast', 'Deep Research'].map((m) => (
      <button
        key={m}
        onClick={() => setMode(m)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
          ${mode === m
            ? 'bg-white text-slate-800 shadow-sm'
            : 'text-slate-400 hover:text-slate-600'
          }`}
      >
        {m}
      </button>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend, suggestedActions = [], mode = 'Fast', onModeChange }) => {
  const [input, setInput] = useState('');
  const setMode = onModeChange || (() => {});
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fileRef  = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  const isEmptyState = messages.length <= 1;

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { alert('Please select an image or video file.'); return; }

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        onSend(`[Uploaded image: ${file.name}] Please upload this image to my ad account using the base64 data: ${base64.slice(0, 100)}...`);
      };
      reader.readAsDataURL(file);
    } else {
      onSend(`[Uploaded video: ${file.name}] I'd like to upload a video to my ad account. The file is "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)}MB). Please help me upload it — I'll need to provide a URL. What's the best way to proceed?`);
    }
    e.target.value = '';
  }, [onSend]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text) => {
    const t = (typeof text === 'string' ? text : input).trim();
    if (!t || isTyping) return;
    onSend(t);
    setInput('');
    inputRef.current?.focus();
  }, [input, isTyping, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">

      {/* Empty State — centered heading */}
      {isEmptyState && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-10 text-center">
            Ask anything about your ads
          </h1>

          {/* Input area */}
          <div className="w-full max-w-4xl">
            <div className="max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50">
              <div className="px-4 pt-4 pb-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your ads"
                  rows={1}
                  disabled={isTyping}
                  className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 max-h-32 overflow-y-auto"
                  style={{ lineHeight: '1.5' }}
                />
              </div>
              <div className="px-4 pb-3 flex items-center justify-between">
                <ModeToggle mode={mode} setMode={setMode} />
                <div className="flex items-center gap-2">
                  <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <Paperclip size={16} />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action cards grid */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {suggestedActions.map((action) => (
                <ActionCard key={action.label} {...action} onSend={onSend} disabled={isTyping} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages — shown when there are messages beyond welcome */}
      {!isEmptyState && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLatest={msg.id === lastId}
                  onSend={handleSend}
                  isTyping={isTyping}
                />
              ))}
              {isTyping && <TypingIndicator thinkingText={thinkingText} />}
              <div ref={endRef} />
            </div>
          </div>

          {/* Bottom input for active chat */}
          <div className="shrink-0 border-t border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 pt-3 pb-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about your ads"
                      rows={1}
                      disabled={isTyping}
                      className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 max-h-32 overflow-y-auto"
                      style={{ lineHeight: '1.5' }}
                    />
                  </div>
                  <div className="px-4 pb-2.5 flex items-center justify-between">
                    <ModeToggle mode={mode} setMode={setMode} />
                    <div className="flex items-center gap-2">
                      <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <Paperclip size={16} />
                      </button>
                      <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shadow-sm"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
