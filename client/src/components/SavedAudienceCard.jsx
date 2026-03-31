import React, { useState } from 'react';
import { Search, Target, X } from 'lucide-react';
import api from '../services/api.js';

const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';

const LOCATIONS = [
  { id: 'HK', label: '香港' }, { id: 'TW', label: '台灣' }, { id: 'SG', label: '新加坡' },
  { id: 'MY', label: '馬來西亞' }, { id: 'US', label: '美國' }, { id: 'GB', label: '英國' },
  { id: 'AU', label: '澳洲' },
];

export default function SavedAudienceCard({ data, onSend, isAnswered, adAccountId, token }) {
  const [location, setLocation] = useState('HK');
  const [gender, setGender] = useState('0');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [interests, setInterests] = useState(data?.interests || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const handleSearch = async () => {
    if (!searchQuery.trim() || !adAccountId) return;
    setSearching(true);
    try {
      const { data: res } = await api.get(`/targeting/search?q=${encodeURIComponent(searchQuery)}&adAccountId=${adAccountId}`, { headers });
      setSearchResults(res?.data || res || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const addInterest = (interest) => {
    if (!interests.find(i => i.id === interest.id)) {
      setInterests(prev => [...prev, { id: interest.id, name: interest.name }]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const removeInterest = (id) => {
    setInterests(prev => prev.filter(i => i.id !== id));
  };

  const handleConfirm = () => {
    if (confirmed || isAnswered || interests.length === 0) return;
    setConfirmed(true);
    const locationLabel = LOCATIONS.find(l => l.id === location)?.label || location;
    const genderLabel = gender === '1' ? 'male' : gender === '2' ? 'female' : 'all genders';
    const interestNames = interests.map(i => i.name).join(', ');
    const interestIds = interests.map(i => i.id).join(', ');
    onSend?.(`Create saved audience: location=${locationLabel} (${location}), gender=${genderLabel}, age=${ageMin}-${ageMax}, interests=${interestNames} (IDs: ${interestIds})`);
  };

  if (confirmed || isAnswered) {
    return (
      <div className="my-2 border border-emerald-200 bg-emerald-50/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-600">✓</div>
          <p className="text-[13px] font-semibold text-emerald-700">興趣受眾設定已確認</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 border border-blue-200 bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Target size={14} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-slate-800">建立興趣受眾</span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Location + Gender */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">地區</label>
            <select value={location} onChange={e => setLocation(e.target.value)} className={SEL}>
              {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">性別</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className={SEL}>
              <option value="0">所有</option>
              <option value="2">女性</option>
              <option value="1">男性</option>
            </select>
          </div>
        </div>

        {/* Age range */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">年齡 (最小)</label>
            <input type="number" value={ageMin} onChange={e => setAgeMin(Math.max(13, Math.min(65, Number(e.target.value))))} className={SEL} min={13} max={65} />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">年齡 (最大)</label>
            <input type="number" value={ageMax} onChange={e => setAgeMax(Math.max(ageMin, Math.min(65, Number(e.target.value))))} className={SEL} min={ageMin} max={65} />
          </div>
        </div>

        {/* Interest search */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">興趣</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search interests (e.g. beauty, fitness)..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <button onClick={handleSearch} disabled={searching}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors">
              {searching ? '...' : 'Search'}
            </button>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[160px] overflow-y-auto">
              {searchResults.slice(0, 10).map(r => (
                <button key={r.id} onClick={() => addInterest(r)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-slate-700">{r.name}</p>
                    {r.audience_size_lower_bound && (
                      <p className="text-[10px] text-slate-400">~{(r.audience_size_lower_bound / 1000000).toFixed(1)}M people</p>
                    )}
                  </div>
                  <span className="text-[10px] text-blue-500 font-medium">+ Add</span>
                </button>
              ))}
            </div>
          )}

          {/* Selected interests */}
          {interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {interests.map(i => (
                <span key={i.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-medium text-blue-700">
                  {i.name}
                  <button onClick={() => removeInterest(i.id)} className="hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {interests.length > 0 ? `${interests.length} interest${interests.length > 1 ? 's' : ''} selected` : 'Add at least 1 interest'}
        </span>
        <button onClick={handleConfirm} disabled={interests.length === 0}
          className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          ✅ Confirm
        </button>
      </div>
    </div>
  );
}
