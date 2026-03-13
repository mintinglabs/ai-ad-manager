import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send } from 'lucide-react';

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ thinkingText }) => (
  <div className="flex items-end gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
      <Bot size={15} className="text-white" />
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
      {thinkingText && <span className="text-xs text-blue-400 italic">{thinkingText}</span>}
    </div>
  </div>
);

// ── Inline markdown: **bold** and `code` ─────────────────────────────────────
const renderText = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

// ── Quick reply chips — right-aligned (user side) ─────────────────────────────
const QuickReplies = ({ actions, onSend, disabled }) => (
  <div className="flex justify-end flex-wrap gap-2 mt-3 mb-1 pr-1">
    {actions.map(({ label, value, variant = 'default' }) => (
      <button
        key={value}
        onClick={() => onSend(value)}
        disabled={disabled}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm' :
            variant === 'danger'  ? 'bg-white hover:bg-red-50 text-red-600 border-red-300' :
            'bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-sm'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Report renderer (Meta-style) ─────────────────────────────────────────────
const roasColor = (r) => r >= 3 ? 'text-emerald-600' : r >= 2 ? 'text-amber-600' : r > 0 ? 'text-red-500' : 'text-slate-400';
const truncate = (s, n = 28) => s.length > n ? s.slice(0, n) + '…' : s;
const fmtUSD = (n) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
const fmtNum = (n) => n > 0 ? n.toLocaleString() : '—';

const SummaryCard = ({ label, value, sub }) => (
  <div className="flex flex-col gap-0.5 bg-white/60 rounded-xl px-3 py-2.5 flex-1 min-w-0">
    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
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
        <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm overflow-hidden shadow-sm">

          {/* Report header */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Campaign Performance Report</p>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days · <span className="font-mono">{adAccountId}</span></p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded font-medium">Meta Ads API</span>
          </div>

          {/* Summary cards */}
          <div className="px-3 py-3 flex gap-2 border-b border-slate-200 bg-slate-50/80">
            <SummaryCard label="Total Spend"   value={fmtUSD(totSpend)}   sub="Last 7 days" />
            <SummaryCard label="Impressions"   value={fmtNum(totImp)}     sub="Last 7 days" />
            <SummaryCard label="Clicks"        value={fmtNum(totClicks)}  sub="Last 7 days" />
            <SummaryCard label="Avg ROAS"      value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'} sub="Across campaigns" />
          </div>

          {/* Campaign table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Campaign</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Delivery</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Budget</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Spend</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">ROAS</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Impressions</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Clicks</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-white/60' : 'bg-white'}`}>
                    <td className="px-4 py-2.5 max-w-[180px]">
                      <p className="font-medium text-slate-800" title={c.name}>{truncate(c.name)}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{c.id}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {c.status === 'ACTIVE'
                        ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Active</span>
                        : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]">⏸ Paused</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">${(c.daily_budget / 100).toFixed(0)}/day</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmtUSD(c.spend)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${roasColor(c.roas)}`}>
                      {c.roas > 0 ? `${c.roas}x` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{fmtNum(c.impressions)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{fmtNum(c.clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* API source footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-white/50 flex items-center gap-1.5">
            <span className="text-slate-300">📡</span>
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

// ── Table renderer ────────────────────────────────────────────────────────────
const TableMessage = ({ message }) => (
  <div className="flex items-end gap-3 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="max-w-[95%] w-full">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {message.columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {message.summary && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
            {renderText(message.summary)}
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
    return (
      <>
        <div className="flex items-end gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
            <Bot size={15} className="text-white" />
          </div>
          <div className="max-w-[80%]">
            <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {renderText(message.text)}
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
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {message.text}
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Suggested action chips ────────────────────────────────────────────────────
const SuggestedActions = ({ actions, onSend, disabled }) => (
  <div className="px-3 pb-2 flex flex-col gap-1.5">
    <p className="text-xs text-slate-400 text-center mb-0.5">Quick actions</p>
    {actions.map(({ label, prompt }) => (
      <button
        key={label}
        onClick={() => onSend(prompt)}
        disabled={disabled}
        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 hover:border-blue-200 transition-colors disabled:opacity-40"
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend, suggestedActions = [] }) => {
  const [input, setInput] = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  // Show chips only while only the WELCOME message is present
  const showChips = messages.length === 1 && suggestedActions.length > 0;

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

      {showChips && (
        <div className="shrink-0 border-t border-slate-200 bg-white pt-3">
          <SuggestedActions actions={suggestedActions} onSend={onSend} disabled={isTyping} />
        </div>
      )}

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your campaigns…"
            rows={1}
            disabled={isTyping}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-1.5">
          Always review before confirming changes.
        </p>
      </div>
    </div>
  );
};
