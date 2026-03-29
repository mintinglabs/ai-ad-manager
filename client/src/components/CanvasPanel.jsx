import { X, BarChart3, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { RichContent } from './ChatInterface.jsx';

// ── Canvas Panel — slide-over right panel for data visualization ─────────────

export const CanvasPanel = ({ data, onClose, onSend }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!data) return null;

  return (
    <div
      className={`flex flex-col bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl shadow-slate-300/20 transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-50' : 'relative h-full'
      }`}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <BarChart3 size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700">
            {data.title || 'Performance Dashboard'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullScreen(f => !f)}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <RichContent text={data.content} onSend={onSend} />
      </div>
    </div>
  );
};
