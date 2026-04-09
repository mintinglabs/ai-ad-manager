import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, RefreshCw, Plus, Loader2, Trash2, X, ChevronRight, ChevronDown, FileText, Download, Users, Clock, Eye } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Leads viewer modal ──
const LeadsModal = ({ form, onClose }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!form) return;
    setLoading(true);
    api.get(`/leads/forms/${form.id}/leads`).then(({ data }) => {
      setLeads(data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [form]);

  const exportCSV = () => {
    if (!leads.length) return;
    const allFields = new Set();
    leads.forEach(l => (l.field_data || []).forEach(f => allFields.add(f.name)));
    const headers = ['Date', 'Campaign', 'Ad', ...allFields];
    const rows = leads.map(l => {
      const fieldMap = {};
      (l.field_data || []).forEach(f => { fieldMap[f.name] = (f.values || []).join(', '); });
      return [fmtDateTime(l.created_time), l.campaign_name || '', l.ad_name || '', ...[...allFields].map(f => fieldMap[f] || '')];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${form.name || 'leads'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Collect all unique field names
  const fieldNames = useMemo(() => {
    const s = new Set();
    leads.forEach(l => (l.field_data || []).forEach(f => s.add(f.name)));
    return [...s];
  }, [leads]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[700px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{form.name}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{leads.length} leads</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!leads.length}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-40">
              <Download size={12} /> Export CSV
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">No leads submitted yet</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">Date</th>
                  {fieldNames.map(f => (
                    <th key={f} className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">{f}</th>
                  ))}
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const fieldMap = {};
                  (lead.field_data || []).forEach(f => { fieldMap[f.name] = (f.values || []).join(', '); });
                  return (
                    <tr key={lead.id || i} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">{fmtDateTime(lead.created_time)}</td>
                      {fieldNames.map(f => (
                        <td key={f} className="py-2.5 px-4 text-[12px] text-slate-700 max-w-[200px] truncate">{fieldMap[f] || '—'}</td>
                      ))}
                      <td className="py-2.5 px-4 text-[11px] text-slate-400 truncate max-w-[150px]">{lead.campaign_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

// ── Form card ──
const FormCard = ({ form, onViewLeads }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
    <div className="px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-orange-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-slate-800 truncate">{form.name}</h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${form.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {form.status || 'Active'}
              </span>
              <span className="flex items-center gap-1"><Clock size={10} /> {fmtDate(form.created_time)}</span>
            </p>
          </div>
        </div>
      </div>
      {form.questions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {form.questions.slice(0, 5).map((q, i) => (
            <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-slate-500 truncate max-w-[120px]">
              {q.label || q.key}
            </span>
          ))}
          {form.questions.length > 5 && (
            <span className="text-[10px] text-slate-400">+{form.questions.length - 5} more</span>
          )}
        </div>
      )}
    </div>
    <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
      <button onClick={() => onViewLeads(form)}
        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
        <Eye size={12} /> View Leads
      </button>
    </div>
  </div>
);

// ── Main Component ──
export const InstantForms = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [forms, setForms] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewingForm, setViewingForm] = useState(null);

  // Fetch pages first
  const fetchPages = useCallback(async () => {
    if (!adAccountId) return;
    try {
      const { data } = await api.get('/meta/pages');
      setPages(data || []);
      if (data?.length) setSelectedPage(data[0]);
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    }
  }, [adAccountId]);

  // Fetch forms for selected page
  const fetchForms = useCallback(async () => {
    if (!selectedPage) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/leads/forms', { params: { pageId: selectedPage.id } });
      setForms(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => { fetchPages(); }, [fetchPages]);
  useEffect(() => { fetchForms(); }, [fetchForms]);

  const filtered = useMemo(() => {
    if (!search) return forms;
    const q = search.toLowerCase();
    return forms.filter(f => f.name?.toLowerCase().includes(q));
  }, [forms, search]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-orange-500" />
                Instant Forms
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${forms.length} forms`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <button onClick={fetchForms} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Page selector + search */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100">
        {pages.length > 1 && (
          <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
            className="text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && forms.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading forms...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{search ? 'No matching forms' : 'No instant forms yet'}</p>
            <p className="text-xs text-slate-400">Create lead forms in your campaigns to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(form => (
              <FormCard key={form.id} form={form} onViewLeads={setViewingForm} />
            ))}
          </div>
        )}
      </div>

      {viewingForm && <LeadsModal form={viewingForm} onClose={() => setViewingForm(null)} />}
    </div>
  );
};
