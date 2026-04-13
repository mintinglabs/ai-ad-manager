import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send } from 'lucide-react';

export const AskAIPopup = ({ onSubmit, onClose, context }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSubmit = () => {
    if (!text.trim()) return;
    const prefix = context ? `[Context: ${context}]\n` : '';
    onSubmit(prefix + text.trim());
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">Ask AI Agent</h3>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[12px] text-slate-400 mb-3">What would you like the AI agent to do?</p>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. Analyze performance, suggest optimizations, create a report..."
            className="w-full h-24 text-sm text-slate-700 border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-300"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-sm disabled:opacity-40 transition-colors">
            <Send size={12} /> Send to AI
          </button>
        </div>
      </div>
    </>
  );
};

export const AskAIButton = ({ onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm">
    <Sparkles size={13} /> Ask AI Agent
  </button>
);
