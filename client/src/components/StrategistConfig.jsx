import { useState, useRef } from 'react';
import { ArrowLeft, Upload, X, FileText, Sparkles, Save } from 'lucide-react';

export const StrategistConfig = ({ strategist, onUpdate, onAddDoc, onRemoveDoc, onBack }) => {
  const [name, setName] = useState(strategist.name);
  const [instructions, setInstructions] = useState(strategist.instructions || '');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const handleSave = () => {
    onUpdate(strategist.id, { name, instructions });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        let text = '';
        if (file.name.endsWith('.pdf')) {
          // Parse PDF via server
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const bearerToken = localStorage.getItem('fb_long_lived_token');
          const res = await fetch('/api/chat/parse-doc', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
            },
            body: JSON.stringify({ base64, type: file.type, name: file.name }),
          });
          const data = await res.json();
          text = data.text || '';
        } else {
          // TXT/DOC — read as text
          text = await file.text();
        }
        onAddDoc(strategist.id, { name: file.name, text, charCount: text.length });
      } catch (err) {
        console.error('Failed to parse document:', err);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles size={18} className="text-indigo-500" />
          <span className="text-lg font-bold text-slate-900">Configure Strategist</span>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
          <Save size={14} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              placeholder="e.g., Inception Funnel Auditor"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Instructions
              <span className="text-xs font-normal text-slate-400 ml-2">Tell the AI how to behave when this strategist is active</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y"
              placeholder="e.g., Always analyze campaigns through the TOFU/MOFU/BOFU funnel framework. Score each funnel stage. Identify gaps and recommend budget shifts..."
            />
            <p className="text-[11px] text-slate-400 mt-1">{instructions.length} characters</p>
          </div>

          {/* Knowledge Base (Documents) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Knowledge Base
              <span className="text-xs font-normal text-slate-400 ml-2">Upload PDF or TXT files as context</span>
            </label>

            {/* Uploaded docs */}
            {strategist.documents?.length > 0 && (
              <div className="space-y-2 mb-3">
                {strategist.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5 group">
                    <FileText size={16} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                      <p className="text-[11px] text-slate-400">{doc.charCount?.toLocaleString() || '?'} characters</p>
                    </div>
                    <button onClick={() => onRemoveDoc(strategist.id, i)}
                      className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors">
              <Upload size={16} />
              Upload PDF or TXT
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" multiple className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
      </div>
    </div>
  );
};
