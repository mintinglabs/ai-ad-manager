import React, { useState, useEffect } from 'react';
import { Users, Check } from 'lucide-react';
import api from '../services/api.js';

const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';

const COUNTRIES = [
  { id: 'HK', label: '香港' }, { id: 'TW', label: '台灣' }, { id: 'SG', label: '新加坡' },
  { id: 'MY', label: '馬來西亞' }, { id: 'US', label: '美國' }, { id: 'GB', label: '英國' },
  { id: 'AU', label: '澳洲' }, { id: 'JP', label: '日本' }, { id: 'TH', label: '泰國' },
];

const RATIOS = [
  { id: '0.01', label: '1% (最相似)', desc: '最小、最高質素' },
  { id: '0.02', label: '2%', desc: '' },
  { id: '0.03', label: '3%', desc: '質素同覆蓋嘅平衡' },
  { id: '0.05', label: '5%', desc: '' },
  { id: '0.10', label: '10%', desc: '較大覆蓋，相似度較低' },
  { id: '0.20', label: '20% (最闊)', desc: '' },
];

export default function LookalikeAudienceCard({ data, onSend, isAnswered, adAccountId, token }) {
  const [audiences, setAudiences] = useState(data?.audiences || []);
  const [sourceId, setSourceId] = useState('');
  const [country, setCountry] = useState('HK');
  const [ratio, setRatio] = useState('0.01');
  const [confirmed, setConfirmed] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    if (!adAccountId || audiences.length) return;
    api.get(`/meta/adaccounts/${adAccountId}/customaudiences`, { headers }).then(r => {
      const list = (r.data?.data || r.data || []).filter(a => a.subtype !== 'LOOKALIKE');
      setAudiences(list);
      if (list.length && !sourceId) setSourceId(list[0].id);
    }).catch(() => {});
  }, [adAccountId]);

  useEffect(() => {
    if (audiences.length && !sourceId) setSourceId(audiences[0].id);
  }, [audiences]);

  const handleConfirm = () => {
    if (confirmed || isAnswered || !sourceId) return;
    setConfirmed(true);
    const source = audiences.find(a => a.id === sourceId);
    const countryLabel = COUNTRIES.find(c => c.id === country)?.label || country;
    onSend?.(`Create lookalike audience: source="${source?.name || sourceId}" (ID: ${sourceId}), country=${countryLabel} (${country}), ratio=${ratio}`);
  };

  if (confirmed || isAnswered) {
    return (
      <div className="my-2 border border-emerald-200 bg-emerald-50/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-600">✓</div>
          <p className="text-[13px] font-semibold text-emerald-700">Lookalike 受眾設定已確認</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 border border-blue-200 bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Users size={14} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-slate-800">建立 Lookalike 受眾</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">來源受眾</label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} className={SEL}>
            {audiences.length === 0 && <option value="">Loading...</option>}
            {audiences.map(a => (
              <option key={a.id} value={a.id}>{a.name} {a.approximate_count_lower_bound ? `(~${(a.approximate_count_lower_bound / 1000).toFixed(0)}K)` : ''}</option>
            ))}
          </select>
          {audiences.length > 0 && sourceId && (
            <p className="text-[10px] text-slate-400 mt-1">Source must have ≥100 people for Lookalike</p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">目標國家</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className={SEL}>
              {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">相似度</label>
            <select value={ratio} onChange={e => setRatio(e.target.value)} className={SEL}>
              {RATIOS.map(r => (
                <option key={r.id} value={r.id}>{r.label}{r.desc ? ` — ${r.desc}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {ratio === '0.01' ? 'Smallest, highest quality' : ratio === '0.03' ? 'Balanced' : ratio === '0.10' || ratio === '0.20' ? 'Broad reach' : ''}
        </span>
        <button onClick={handleConfirm} disabled={!sourceId}
          className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          ✅ Confirm
        </button>
      </div>
    </div>
  );
}
