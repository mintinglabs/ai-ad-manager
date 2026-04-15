import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Loader2, X, ChevronDown, FileText, Download, Clock, Eye, Plus, Archive, MessageSquare, Users, Trash2, AlertTriangle, Palette, Zap, Smartphone, Sparkles, ArrowRight, Copy } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Question type presets ──
const FIELD_PRESETS = [
  { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
  { key: 'email', label: 'Email', type: 'EMAIL' },
  { key: 'phone_number', label: 'Phone Number', type: 'PHONE' },
  { key: 'company_name', label: 'Company Name', type: 'COMPANY_NAME' },
  { key: 'job_title', label: 'Job Title', type: 'JOB_TITLE' },
  { key: 'city', label: 'City', type: 'CITY' },
  { key: 'state', label: 'State', type: 'STATE' },
  { key: 'zip', label: 'Zip Code', type: 'ZIP' },
  { key: 'country', label: 'Country', type: 'COUNTRY' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'DATE_OF_BIRTH' },
];

// ── Form Templates ──
const FORM_TEMPLATES = [
  { id: 'appointment', name: 'Appointment Booking', desc: 'Optimized for clinic & salon consultations.', icon: Clock, color: 'text-blue-500 bg-blue-50' },
  { id: 'lead_magnet', name: 'Lead Magnet / Guide', desc: 'Deliver PDF or coupon codes instantly.', icon: Download, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'flash_sale', name: 'Flash Sale Sign-up', desc: 'High-urgency forms for limited offers.', icon: Zap, color: 'text-orange-500 bg-orange-50' },
];

const FormTemplates = ({ onCreateFromTemplate }) => (
  <div className="flex flex-wrap items-center gap-2 mb-4">
    <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick create:</span>
    {FORM_TEMPLATES.map(t => {
      const Icon = t.icon;
      return (
        <button key={t.id} onClick={() => onCreateFromTemplate(t)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm hover:border-orange-300 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 text-[11px] font-medium text-slate-600 hover:text-orange-700 transition-all group">
          <Icon size={11} className="text-slate-400 group-hover:text-orange-500 transition-colors" />
          {t.name}
        </button>
      );
    })}
  </div>
);

// ── Field type badge colors ──
const FIELD_TYPE_COLORS = {
  CUSTOM: 'bg-blue-50 text-blue-600',
  FULL_NAME: 'bg-emerald-50 text-emerald-600',
  EMAIL: 'bg-violet-50 text-violet-600',
  PHONE: 'bg-amber-50 text-amber-600',
  COMPANY_NAME: 'bg-cyan-50 text-cyan-600',
  JOB_TITLE: 'bg-indigo-50 text-indigo-600',
  CITY: 'bg-teal-50 text-teal-600',
  STATE: 'bg-teal-50 text-teal-600',
  ZIP: 'bg-slate-100 text-slate-500',
  COUNTRY: 'bg-slate-100 text-slate-500',
  DATE_OF_BIRTH: 'bg-pink-50 text-pink-600',
};

const FIELD_PLACEHOLDERS = {
  FULL_NAME: '"John Doe"',
  EMAIL: '"email@example.com"',
  PHONE: '"+852 9000 0000"',
  COMPANY_NAME: '"Company name"',
  JOB_TITLE: '"Job title"',
  CITY: '"City"',
  STATE: '"State/Province"',
  ZIP: '"Postal code"',
  COUNTRY: '"Country"',
  DATE_OF_BIRTH: '"DD/MM/YYYY"',
};

// ── Create form modal ──
const CreateFormModal = ({ pageId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [selectedFields, setSelectedFields] = useState(['full_name', 'email', 'phone_number']);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [newCustom, setNewCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleField = (key) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addCustomQuestion = () => {
    if (!newCustom.trim()) return;
    setCustomQuestions(prev => [...prev, { key: `custom_${Date.now()}`, label: newCustom.trim(), type: 'CUSTOM' }]);
    setNewCustom('');
  };

  const removeCustom = (key) => {
    setCustomQuestions(prev => prev.filter(q => q.key !== key));
  };

  const handleCreate = async () => {
    if (!name.trim() || !privacyUrl.trim()) {
      setError('Form name and privacy policy URL are required');
      return;
    }
    if (selectedFields.length === 0 && customQuestions.length === 0) {
      setError('Add at least one field');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const presetQuestions = selectedFields.map(key => {
        const preset = FIELD_PRESETS.find(p => p.key === key);
        return { key: preset.key, label: preset.label, type: preset.type };
      });
      const allQuestions = [...presetQuestions, ...customQuestions.map(q => ({ key: q.key, label: q.label, type: 'CUSTOM' }))];
      await api.post('/leads/forms', {
        pageId,
        name: name.trim(),
        questions: JSON.stringify(allQuestions),
        privacy_policy_url: privacyUrl.trim(),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <FileText size={15} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-white">Create Instant Form</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Form name */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Form Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Promo Lead Form"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>

          {/* Privacy policy */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Privacy Policy URL *</label>
            <input value={privacyUrl} onChange={e => setPrivacyUrl(e.target.value)} placeholder="https://yoursite.com/privacy"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>

          {/* Standard fields */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Standard Fields</label>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_PRESETS.map(field => (
                <button key={field.key} onClick={() => toggleField(field.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors text-left
                    ${selectedFields.includes(field.key)
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedFields.includes(field.key) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                    {selectedFields.includes(field.key) && <span className="text-[10px]">✓</span>}
                  </span>
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom questions */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Custom Questions</label>
            {customQuestions.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {customQuestions.map(q => (
                  <div key={q.key} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <MessageSquare size={12} className="text-blue-500 shrink-0" />
                    <span className="text-[12px] text-blue-700 flex-1">{q.label}</span>
                    <button onClick={() => removeCustom(q.key)} className="text-blue-300 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newCustom} onChange={e => setNewCustom(e.target.value)} placeholder="e.g. What service are you interested in?"
                onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
                className="flex-1 px-3 py-2 text-[12px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300" />
              <button onClick={addCustomQuestion} disabled={!newCustom.trim()}
                className="px-3 py-2 rounded-lg text-[12px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Preview */}
          {(selectedFields.length > 0 || customQuestions.length > 0) && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Preview ({selectedFields.length + customQuestions.length} fields)
              </label>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-1">
                {selectedFields.map((key, i) => {
                  const preset = FIELD_PRESETS.find(p => p.key === key);
                  return (
                    <div key={key} className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 text-right text-slate-300 font-mono">{i + 1}.</span>
                      <span className="text-slate-600">{preset.label}</span>
                      <span className="text-[9px] text-slate-300 font-mono ml-auto">{preset.type}</span>
                    </div>
                  );
                })}
                {customQuestions.map((q, i) => (
                  <div key={q.key} className="flex items-center gap-2 text-[11px]">
                    <span className="w-4 text-right text-slate-300 font-mono">{selectedFields.length + i + 1}.</span>
                    <span className="text-blue-600">{q.label}</span>
                    <span className="text-[9px] text-slate-300 font-mono ml-auto">CUSTOM</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100/60 shrink-0 bg-slate-50/50">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:shadow-none">
            {saving ? 'Creating...' : 'Create Form'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Expandable form row ──
const FormRow = ({ form, expanded, onToggle, onViewLeads, onArchive }) => {
  const questions = form.questions || [];
  return (
    <>
      <tr onClick={onToggle}
        className={`cursor-pointer border-b transition-colors ${expanded ? 'bg-orange-50/40 border-orange-200' : 'border-slate-100 hover:bg-slate-50/80'}`}>
        <td className="py-3 px-4">
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
        <td className="py-3 px-4">
          <p className="text-[12px] font-semibold text-slate-800">{form.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{form.id}</p>
        </td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
            ${form.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : form.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-400 border border-slate-200'
              : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {form.status || 'Active'}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <MessageSquare size={11} className="text-slate-400" />
            {questions.length} field{questions.length !== 1 ? 's' : ''}
          </span>
        </td>
        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
          {fmtDate(form.created_time)}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onViewLeads(form); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
              <Eye size={11} /> Leads
            </button>
            {form.status === 'ACTIVE' && (
              <button onClick={(e) => { e.stopPropagation(); onArchive(form); }}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Archive form">
                <Archive size={11} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-orange-50/20 border-b border-orange-100">
          <td colSpan={6} className="px-4 py-4">
            <div className="pl-6">
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Form Fields ({questions.length})</p>
                <div className="space-y-1.5">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-lg border border-slate-200">
                      <span className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-orange-500">{i + 1}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700">{q.label || q.key}</p>
                        {q.type && <p className="text-[10px] text-slate-400">{q.type}</p>}
                      </div>
                      {q.key && (
                        <span className="text-[10px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">{q.key}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
                {form.locale && <span>Locale: {form.locale}</span>}
                {form.privacy_policy_url && (
                  <a href={form.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline">Privacy Policy</a>
                )}
                <span className="font-mono">ID: {form.id}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Leads viewer modal ──
const LeadsModal = ({ form, pageId, onClose }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!form) return;
    setLoading(true);
    api.get(`/leads/forms/${form.id}/leads`, { params: { pageId } }).then(({ data }) => {
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

  const fieldNames = useMemo(() => {
    const s = new Set();
    leads.forEach(l => (l.field_data || []).forEach(f => s.add(f.name)));
    return [...s];
  }, [leads]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[750px] max-h-[80vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">{form.name}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportCSV} disabled={!leads.length}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-600 rounded-lg transition-colors disabled:opacity-40">
                <Download size={12} /> Export CSV
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-400">No leads submitted yet</p>
            </div>
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

// ── Form detail panel (right side) ──
const FormDetailPanel = ({ form, pageId, pageName, onClose, onArchive }) => {
  const [downloading, setDownloading] = useState(false);
  const questions = form.questions || [];

  const downloadCSV = async () => {
    setDownloading(true);
    try {
      const { data: leads } = await api.get(`/leads/forms/${form.id}/leads`, { params: { pageId } });
      const rows = leads || [];
      if (!rows.length) { alert('No leads to download'); return; }
      const allFields = new Set();
      rows.forEach(l => (l.field_data || []).forEach(f => allFields.add(f.name)));
      const headers = ['Date', 'Campaign', 'Ad', ...allFields];
      const csvRows = rows.map(l => {
        const fm = {};
        (l.field_data || []).forEach(f => { fm[f.name] = (f.values || []).join(', '); });
        return [fmtDateTime(l.created_time), l.campaign_name || '', l.ad_name || '', ...[...allFields].map(f => fm[f] || '')];
      });
      const csv = [headers.join(','), ...csvRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${form.name || 'leads'}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
      {/* Header bar — compact */}
      <div className="px-5 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100/60 shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-slate-800 truncate">{form.name}</h2>
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              {form.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="font-bold uppercase text-slate-400">{form.status}</span>
              )}
              <span className="text-slate-300">·</span>
              <span className="text-slate-500"><strong>{form.leads_count || 0}</strong> leads</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{questions.length} fields</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={downloadCSV} disabled={downloading}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
              <Download size={11} /> {downloading ? '...' : 'Leads CSV'}
            </button>
            <button onClick={() => onClose?.()}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Phone preview — fills remaining height, no scroll */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="h-full flex items-start justify-center" style={{ maxHeight: '100%' }}>
          <div className="transform origin-top" style={{ transform: 'scale(0.8)' }}>
            <FormPhonePreview form={form} pageName={pageName} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Multi-step phone preview (kept for reference but not used in main UI) ──
const FormPhonePreview = ({ form, pageName }) => {
  const questions = form.questions || [];
  // Steps: 0=intro, 1..N=one question per step, N+1=privacy+submit, N+2=thank you
  const totalSteps = questions.length + 3;
  const [step, setStep] = useState(0);

  // Reset step when form changes
  useEffect(() => { setStep(0); }, [form.id]);

  const progress = ((step + 1) / totalSteps) * 100;

  const getPlaceholder = (q) => {
    const map = {
      EMAIL: 'email@example.com', PHONE: '+852 9XXX XXXX', FULL_NAME: 'Your full name',
      COMPANY_NAME: 'Company name', JOB_TITLE: 'Job title', CITY: 'City',
      STATE: 'State/Province', ZIP: 'Postal code', COUNTRY: 'Country',
      DATE_OF_BIRTH: 'DD/MM/YYYY',
    };
    return map[q.type] || 'Enter your answer';
  };

  return (
    <div className="flex justify-center">
      <div className="w-[320px]">
        {/* Phone frame */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          {/* Notch */}
          <div className="h-7 bg-slate-900 flex items-center justify-center relative">
            <div className="w-20 h-[18px] bg-slate-900 rounded-b-2xl absolute -bottom-0" />
            <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>

          {/* Screen content */}
          <div className="min-h-[420px] flex flex-col">
            {/* Step 0: Intro */}
            {step === 0 && (
              <div className="flex-1 flex flex-col">
                {/* Meta-style form intro */}
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold">{(pageName || 'P')[0]}</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700">{pageName || 'Your Page'}</p>
                    <p className="text-[9px] text-slate-400">Sponsored · <span className="text-blue-500">Meta</span></p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <h3 className="text-[14px] font-bold text-slate-800 mb-1">{form.name}</h3>
                  <p className="text-[11px] text-slate-400">{questions.length} question{questions.length !== 1 ? 's' : ''} to complete</p>
                </div>
              </div>
            )}

            {/* Steps 1..N: One question per step */}
            {step >= 1 && step <= questions.length && (() => {
              const q = questions[step - 1];
              const label = q.label || q.key || `Question ${step}`;
              const hasOptions = q.options && q.options.length > 0;
              return (
                <div className="flex-1 flex flex-col p-5">
                  <p className="text-[10px] text-slate-400 mb-1">Question {step} of {questions.length}</p>
                  <h3 className="text-[14px] font-bold text-slate-800 mb-4">{label}</h3>
                  {hasOptions ? (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-600 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-colors">
                          {typeof opt === 'string' ? opt : opt.value || opt.label || `Option ${i + 1}`}
                        </div>
                      ))}
                    </div>
                  ) : q.type === 'CUSTOM' ? (
                    <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[12px] text-slate-400 h-24 resize-none" placeholder={getPlaceholder(q)} readOnly />
                  ) : (
                    <input className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[12px] text-slate-400" placeholder={getPlaceholder(q)} readOnly />
                  )}
                  {q.type && (
                    <p className="text-[9px] text-slate-300 mt-2 font-mono">{q.type}{q.key ? ` · ${q.key}` : ''}</p>
                  )}
                  <div className="flex-1" />
                </div>
              );
            })()}

            {/* Privacy + Submit step */}
            {step === questions.length + 1 && (
              <div className="flex-1 flex flex-col p-5">
                <h3 className="text-[14px] font-bold text-slate-800 mb-3">Review and submit</h3>
                <div className="space-y-2 mb-4">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500">{q.label || q.key}</span>
                      <span className="text-[11px] text-slate-300">{getPlaceholder(q)}</span>
                    </div>
                  ))}
                </div>
                {form.privacy_policy_url && (
                  <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                    By pressing Submit below, you agree that {pageName || 'this business'} may use the info you provided according to their{' '}
                    <span className="text-blue-500 underline">privacy policy</span> and{' '}
                    <span className="text-blue-500 underline">Meta's privacy policy</span>.
                  </p>
                )}
                <div className="flex-1" />
                <button onClick={() => setStep(step + 1)}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors">
                  Submit
                </button>
              </div>
            )}

            {/* Thank you step */}
            {step === questions.length + 2 && (
              <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <h3 className="text-[16px] font-bold text-slate-800 mb-2">Thank you!</h3>
                <p className="text-[12px] text-slate-500 mb-1">Your information has been submitted.</p>
                <p className="text-[11px] text-slate-400">{pageName || 'This business'} will be in touch.</p>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="px-5 pb-4 flex items-center gap-3">
            {step > 0 && step < totalSteps - 1 && (
              <button onClick={() => setStep(Math.max(0, step - 1))}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Back
              </button>
            )}
            {step < questions.length + 1 && (
              <button onClick={() => setStep(Math.min(totalSteps - 1, step + 1))}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 transition-colors">
                {step === 0 ? 'Start' : 'Next'}
              </button>
            )}
            {step === totalSteps - 1 && (
              <button onClick={() => setStep(0)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                Restart Preview
              </button>
            )}
          </div>

          {/* Home indicator */}
          <div className="h-5 flex items-center justify-center">
            <div className="w-24 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-blue-500' : 'bg-slate-200 hover:bg-slate-300'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
export const InstantForms = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat }) => {
  const [showAskAI, setShowAskAI] = useState(false);
  const [forms, setForms] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ACTIVE' | 'ARCHIVED'

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

  const [formsPaging, setFormsPaging] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchForms = useCallback(async (after) => {
    if (!selectedPage) return;
    if (after) setLoadingMore(true); else { setLoading(true); setError(null); }
    try {
      const params = { pageId: selectedPage.id, limit: 20 };
      if (after) params.after = after;
      const { data } = await api.get('/leads/forms', { params });
      const items = data?.data || data || [];
      if (after) setForms(prev => [...prev, ...items]);
      else setForms(items);
      setFormsPaging(data?.paging || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedPage]);

  useEffect(() => { fetchPages(); }, [fetchPages]);
  useEffect(() => { setForms([]); setSelectedForm(null); fetchForms(); }, [fetchForms]);

  const handleArchive = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.post(`/leads/forms/${archiveTarget.id}/archive`, { pageId: selectedPage?.id });
      setForms(prev => prev.map(f => f.id === archiveTarget.id ? { ...f, status: 'ARCHIVED' } : f));
      setArchiveTarget(null);
    } catch (err) {
      console.error('Archive failed:', err);
    } finally {
      setArchiving(false);
    }
  }, [archiveTarget, selectedPage]);

  const filtered = useMemo(() => {
    let list = forms;
    if (statusFilter !== 'all') list = list.filter(f => f.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name?.toLowerCase().includes(q));
    }
    return list;
  }, [forms, search, statusFilter]);

  const activeCount = forms.filter(f => f.status === 'ACTIVE').length;
  const archivedCount = forms.filter(f => f.status === 'ARCHIVED').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">Instant Forms</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : activeCount > 0 ? `${activeCount} active · ${archivedCount} archived` : 'Capture leads from your ads'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400">Ad Account:</span>
              <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
                selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
            </div>
            {pages.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-400">Page:</span>
                <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
                  className="text-[12px] font-medium text-white border border-white/20 rounded-lg px-3 py-2 bg-white/15 hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-colors">
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchForms} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => onPrefillChat?.('I want to create a new lead generation form for my campaigns.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50">
              <Sparkles size={13} /> Create with AI
            </button>
          </div>
        </div>
      </div>


      {/* Filters + Template chips */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="relative max-w-[280px] w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400/60" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden">
          {[['all', `All (${forms.length})`], ['ACTIVE', `Active (${activeCount})`], ['ARCHIVED', `Archived (${archivedCount})`]].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${statusFilter === val ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-orange-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Template chips below filters */}
      <div className="px-6 py-2.5 shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <FormTemplates onCreateFromTemplate={() => setShowCreate(true)} />
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content — master-detail layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Form list sidebar */}
        <div className="flex-1 min-w-0 border-r border-slate-200/60 overflow-auto bg-white/80 backdrop-blur-sm">
          <div className="py-2">
            {!token || !adAccountId ? (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
                <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
              </div>
            ) : loading && forms.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-400">Loading forms...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <FileText size={22} className="text-slate-300" />
                </div>
                <p className="text-[12px] font-semibold text-slate-700 mb-1">{search ? 'No matching forms' : 'No forms yet'}</p>
                <p className="text-[10px] text-slate-400 mb-3 text-center">Create lead forms to capture leads from your ads.</p>
                {!search && (
                  <button onClick={() => setShowCreate(true)} disabled={!selectedPage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                    <Plus size={11} /> Create First Form
                  </button>
                )}
              </div>
            ) : (
              <>
                {filtered.map(form => (
                  <div key={form.id}
                    className={`group w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100/80 transition-all duration-200 cursor-pointer
                      ${selectedForm?.id === form.id ? 'bg-gradient-to-r from-orange-50/80 to-amber-50/40 border-l-2 border-l-orange-500' : 'hover:bg-orange-50/30 border-l-2 border-l-transparent'}`}
                    onClick={() => setSelectedForm(form)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 truncate">{form.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{(form.questions || []).length} fields</span>
                        {form.leads_count != null && (
                          <span className="text-[10px] text-blue-500 font-medium">{Number(form.leads_count).toLocaleString()} leads</span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full
                          ${form.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {form.status || 'Active'}
                        </span>
                      </div>
                    </div>
                    {/* Hover actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onPrefillChat?.(`Duplicate the lead form "${form.name}" with the same fields. Create a copy I can modify.`)}
                        title="Duplicate form"
                        className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-300 hover:text-blue-500 transition-colors">
                        <Copy size={12} />
                      </button>
                      <button onClick={() => setArchiveTarget(form)}
                        title="Archive form"
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                        <Archive size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {formsPaging?.next && (
                  <button onClick={() => fetchForms(formsPaging?.cursors?.after)} disabled={loadingMore}
                    className="w-full py-3 text-center text-[11px] font-medium text-blue-500 hover:bg-blue-50 transition-colors">
                    {loadingMore ? 'Loading...' : 'Load More Forms'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Form detail panel or Templates */}
        {selectedForm ? (
          <FormDetailPanel
            form={selectedForm}
            pageId={selectedPage?.id}
            pageName={selectedPage?.name}
            onClose={() => setSelectedForm(null)}
            onArchive={() => setArchiveTarget(selectedForm)}
          />
        ) : (
          <div className="w-[380px] shrink-0 overflow-hidden bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/20">
                <FileText size={24} className="text-white" />
              </div>
              <p className="text-[14px] font-semibold text-slate-700 mb-1">Select a form to preview</p>
              <p className="text-[12px] text-slate-400">Choose a form from the left to see its preview and lead data</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && selectedPage && <CreateFormModal pageId={selectedPage.id} onClose={() => setShowCreate(false)} onCreated={fetchForms} />}

      {/* Archive confirmation */}
      {archiveTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={() => setArchiveTarget(null)} />
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[380px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 overflow-hidden animate-[fadeSlideUp_0.3s_ease-out]">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Archive "{archiveTarget.name}"?</h3>
              </div>
              <p className="text-xs text-slate-500">Archived forms can no longer collect new leads. Existing leads are kept. This cannot be undone via the API.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100/60 bg-slate-50/50">
              <button onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={handleArchive} disabled={archiving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:shadow-none">
                {archiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
