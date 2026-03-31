import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import api from '../services/api.js';

const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';

const VISITOR_TYPES = [
  { id: 'all', label: '所有網站訪客', desc: '去過任何頁面嘅人' },
  { id: 'specific', label: '特定頁面訪客', desc: '去過某啲 URL 嘅人' },
  { id: 'purchase', label: '購買者', desc: '完成購買嘅人' },
  { id: 'add_to_cart', label: '加入購物車', desc: '加過貨入 Cart 嘅人' },
  { id: 'lead', label: 'Lead 提交者', desc: '提交過表單嘅人' },
];

export default function WebsiteAudienceCard({ data, onSend, isAnswered, adAccountId, token }) {
  const [pixels, setPixels] = useState(data?.pixels || []);
  const [selectedPixel, setSelectedPixel] = useState('');
  const [visitorType, setVisitorType] = useState('all');
  const [urlKeyword, setUrlKeyword] = useState('');
  const [retention, setRetention] = useState(30);
  const [confirmed, setConfirmed] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!adAccountId || pixels.length) return;
    api.get(`/meta/adaccounts/${adAccountId}/pixels`, { headers }).then(r => {
      const list = r.data?.data || r.data || [];
      setPixels(list);
      if (list.length && !selectedPixel) setSelectedPixel(list[0].id);
    }).catch(() => {});
  }, [adAccountId]);

  useEffect(() => {
    if (pixels.length && !selectedPixel) setSelectedPixel(pixels[0].id);
  }, [pixels]);

  const handleConfirm = () => {
    if (confirmed || isAnswered || !selectedPixel) return;
    setConfirmed(true);
    const pixelName = pixels.find(p => p.id === selectedPixel)?.name || selectedPixel;
    const typeLabel = VISITOR_TYPES.find(t => t.id === visitorType)?.label || visitorType;
    const urlPart = visitorType === 'specific' && urlKeyword ? `, URL contains "${urlKeyword}"` : '';
    onSend?.(`Create website audience: pixel="${pixelName}" (ID: ${selectedPixel}), type=${typeLabel}${urlPart}, retention=${retention} days`);
  };

  if (confirmed || isAnswered) {
    return (
      <div className="my-2 border border-emerald-200 bg-emerald-50/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-600">✓</div>
          <p className="text-[13px] font-semibold text-emerald-700">網站受眾設定已確認</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 border border-blue-200 bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Globe size={14} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-slate-800">建立網站訪客受眾</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Pixel selector */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Pixel</label>
          {pixels.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">Loading pixels...</p>
          ) : (
            <select value={selectedPixel} onChange={e => setSelectedPixel(e.target.value)} className={SEL}>
              {pixels.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          )}
        </div>

        {/* Visitor type + Retention */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">訪客類型</label>
            <select value={visitorType} onChange={e => setVisitorType(e.target.value)} className={SEL}>
              {VISITOR_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">保留期</label>
            <input type="number" value={retention} onChange={e => setRetention(Math.min(180, Math.max(1, Number(e.target.value))))}
              className={SEL} min={1} max={180} />
          </div>
        </div>

        {/* URL keyword (for specific pages) */}
        {visitorType === 'specific' && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">URL 關鍵字</label>
            <input value={urlKeyword} onChange={e => setUrlKeyword(e.target.value)}
              placeholder="e.g. /product or /checkout"
              className={SEL} />
            <p className="text-[10px] text-slate-400 mt-1">URL 包含呢個關鍵字嘅頁面訪客會被加入受眾</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">Max retention: 180 days</span>
        <button onClick={handleConfirm} disabled={!selectedPixel}
          className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          ✅ Confirm
        </button>
      </div>
    </div>
  );
}
