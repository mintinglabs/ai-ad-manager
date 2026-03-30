import React, { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Target, DollarSign, Globe, Users, Image, Film, Upload, Sparkles, Link, X, Plus } from 'lucide-react';

// ── Objective options ─────────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'OUTCOME_SALES', title: 'Sales', desc: 'Purchases, WhatsApp, website conversions', icon: '💰' },
  { id: 'OUTCOME_LEADS', title: 'Leads', desc: 'Lead forms, Messenger, WhatsApp', icon: '📋' },
  { id: 'OUTCOME_TRAFFIC', title: 'Traffic', desc: 'Website or app visits', icon: '🔗' },
  { id: 'OUTCOME_AWARENESS', title: 'Awareness', desc: 'Reach people likely to remember', icon: '📢' },
  { id: 'OUTCOME_ENGAGEMENT', title: 'Engagement', desc: 'Likes, comments, shares, views', icon: '❤️' },
  { id: 'OUTCOME_APP_PROMOTION', title: 'App Promotion', desc: 'App installs or in-app actions', icon: '📱' },
];

const DESTINATIONS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'website', label: 'Website' },
  { id: 'lead_form', label: 'Lead Form' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'instagram', label: 'Instagram DM' },
];

const CTA_TYPES = [
  { id: 'LEARN_MORE', label: 'Learn More' },
  { id: 'SHOP_NOW', label: 'Shop Now' },
  { id: 'WHATSAPP_MESSAGE', label: 'WhatsApp Message' },
  { id: 'SIGN_UP', label: 'Sign Up' },
  { id: 'CONTACT_US', label: 'Contact Us' },
  { id: 'GET_QUOTE', label: 'Get Quote' },
  { id: 'SUBSCRIBE', label: 'Subscribe' },
  { id: 'BOOK_NOW', label: 'Book Now' },
];

// ── Shared UI components ──────────────────────────────────────────────────────
const SectionHeader = ({ phase, title, done, active, expanded, onClick, summary }) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors
      ${active ? 'bg-blue-50/50' : done ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'bg-slate-50/30 hover:bg-slate-50/60'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
      ${active ? 'border-blue-500 bg-blue-100 text-blue-600' : done ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-slate-200 bg-white text-slate-400'}`}>
      {done ? <CheckCircle2 size={16} /> : phase}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${active ? 'text-blue-800' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{title}</p>
      {done && summary && <p className="text-[11px] text-emerald-600 mt-0.5 truncate">{summary}</p>}
    </div>
    {done && (expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />)}
  </button>
);

const FieldLabel = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 mb-2">
    {Icon && <Icon size={14} className="text-slate-400" />}
    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
  </div>
);

const CardSelect = ({ options, selected, onSelect, multi = false }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {options.map(opt => {
      const isSelected = multi ? selected?.includes(opt.id) : selected === opt.id;
      return (
        <button key={opt.id} onClick={() => onSelect(opt.id)}
          className={`p-3 rounded-xl border-2 text-left transition-all
            ${isSelected ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
          {opt.icon && <span className="text-lg mb-1 block">{opt.icon}</span>}
          <p className={`text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{opt.title}</p>
          {opt.desc && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>}
        </button>
      );
    })}
  </div>
);

const BudgetSlider = ({ value, onChange, currency = 'HKD', min = 50, max = 5000, step = 50 }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[13px] font-bold text-slate-800">{currency} {value}/day</span>
      <span className="text-[10px] text-slate-400">{currency} {min} — {max}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
    <div className="flex justify-between mt-1">
      {[min, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max].map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`text-[9px] px-1.5 py-0.5 rounded ${value === v ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>
          {v}
        </button>
      ))}
    </div>
  </div>
);

const Dropdown = ({ options, value, onChange, placeholder = 'Select...' }) => (
  <select value={value || ''} onChange={e => onChange(e.target.value)}
    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-colors">
    <option value="" disabled>{placeholder}</option>
    {options.map(opt => (
      <option key={opt.id || opt} value={opt.id || opt}>{opt.label || opt.name || opt}</option>
    ))}
  </select>
);

const ConfirmButton = ({ onClick, disabled, label = 'Confirm & Continue' }) => (
  <button onClick={onClick} disabled={disabled}
    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all
      ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-[0.98]'}`}>
    {label}
  </button>
);

// ── Countries ─────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { id: 'HK', label: 'Hong Kong' }, { id: 'TW', label: 'Taiwan' }, { id: 'SG', label: 'Singapore' },
  { id: 'MY', label: 'Malaysia' }, { id: 'JP', label: 'Japan' }, { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' }, { id: 'AU', label: 'Australia' }, { id: 'CA', label: 'Canada' },
  { id: 'TH', label: 'Thailand' }, { id: 'PH', label: 'Philippines' }, { id: 'ID', label: 'Indonesia' },
  { id: 'VN', label: 'Vietnam' }, { id: 'KR', label: 'South Korea' }, { id: 'CN', label: 'China' },
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export const CreationWizard = ({ step, summary = {}, audiences = [], onSend, onUploadFiles }) => {
  const currentPhase = step?.current || 1;

  // Stage 1 state
  const [objective, setObjective] = useState(null);
  const [destination, setDestination] = useState(null);
  const [country, setCountry] = useState('HK');
  const [budget, setBudget] = useState(200);
  const [destinationUrl, setDestinationUrl] = useState('');

  // Stage 2 state
  const [selectedAudience, setSelectedAudience] = useState('broad');

  // Stage 3 state
  const [cta, setCta] = useState('LEARN_MORE');
  const [landingPage, setLandingPage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Track which stages are expanded
  const [expanded, setExpanded] = useState({ 1: true, 2: false, 3: false });

  // Auto-expand active phase, collapse others
  useEffect(() => {
    setExpanded({ 1: currentPhase === 1, 2: currentPhase === 2, 3: currentPhase === 3 });
  }, [currentPhase]);

  const toggleExpand = (phase) => {
    setExpanded(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  // ── Stage 1: Confirm → send to agent ──────────────────────────────────────
  const handleConfirmStage1 = useCallback(() => {
    const parts = [];
    const obj = OBJECTIVES.find(o => o.id === objective);
    parts.push(`Create a ${obj?.title || objective} campaign`);
    if (destination) parts.push(`destination: ${destination}`);
    if (destinationUrl) parts.push(`URL: ${destinationUrl}`);
    parts.push(`country: ${country}`);
    parts.push(`daily budget: HKD ${budget}`);
    onSend?.(parts.join(', '));
  }, [objective, destination, destinationUrl, country, budget, onSend]);

  // ── Stage 2: Confirm → send to agent ──────────────────────────────────────
  const handleConfirmStage2 = useCallback(() => {
    if (selectedAudience === 'new') {
      onSend?.('I want to create a new audience');
    } else if (selectedAudience === 'broad') {
      onSend?.('Use broad targeting (18-65, all interests)');
    } else {
      const aud = audiences.find(a => a.id === selectedAudience);
      onSend?.(`Use audience: ${aud?.name || selectedAudience}`);
    }
  }, [selectedAudience, audiences, onSend]);

  // ── Stage 3: Confirm → send to agent ──────────────────────────────────────
  const handleConfirmStage3 = useCallback(() => {
    const parts = [];
    if (cta) parts.push(`CTA: ${cta}`);
    if (landingPage) parts.push(`Landing page: ${landingPage}`);
    parts.push('Please generate ad copy variations');
    onSend?.(parts.join(', '));
  }, [cta, landingPage, onSend]);

  // ── File drop handler ─────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) {
      setUploadedFiles(prev => [...prev, ...files]);
      onUploadFiles?.(files);
    }
  }, [onUploadFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setUploadedFiles(prev => [...prev, ...files]);
      onUploadFiles?.(files);
    }
  }, [onUploadFiles]);

  // ── Summaries for collapsed stages ────────────────────────────────────────
  const stage1Summary = summary.phase1
    ? `${OBJECTIVES.find(o => o.id === summary.phase1.campaign_objective)?.title || 'Campaign'} · ${country} · HKD ${budget}/day`
    : null;
  const stage2Summary = summary.phase2 ? 'Audience configured' : (currentPhase > 2 ? 'Broad targeting' : null);

  const stage1Done = currentPhase > 1;
  const stage2Done = currentPhase > 2;
  const stage3Done = false; // stage 3 completes when wizard closes

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm max-h-[70vh] overflow-y-auto">
      {/* ═══ STAGE 1: Campaign ═══ */}
      <div className="border-b border-slate-100">
        <SectionHeader phase={1} title="Campaign Settings" done={stage1Done} active={currentPhase === 1}
          expanded={expanded[1]} onClick={() => stage1Done && toggleExpand(1)} summary={stage1Summary} />

        {expanded[1] && currentPhase === 1 && (
          <div className="px-5 pb-5 space-y-5">
            {/* Objective */}
            <div>
              <FieldLabel icon={Target} label="Campaign Objective" />
              <CardSelect options={OBJECTIVES} selected={objective} onSelect={setObjective} />
            </div>

            {/* Destination — only for Sales, Leads, Traffic */}
            {objective && ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC'].includes(objective) && (
              <div>
                <FieldLabel icon={Link} label="Where do people go?" />
                <div className="flex flex-wrap gap-2">
                  {DESTINATIONS.map(d => (
                    <button key={d.id} onClick={() => setDestination(d.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                        ${destination === d.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                {destination === 'website' && (
                  <input type="url" placeholder="https://yoursite.com" value={destinationUrl}
                    onChange={e => setDestinationUrl(e.target.value)}
                    className="mt-2 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none" />
                )}
              </div>
            )}

            {/* Country */}
            <div>
              <FieldLabel icon={Globe} label="Target Country" />
              <Dropdown options={COUNTRIES} value={country} onChange={setCountry} placeholder="Select country" />
            </div>

            {/* Budget slider */}
            <div>
              <FieldLabel icon={DollarSign} label="Daily Budget" />
              <BudgetSlider value={budget} onChange={setBudget} />
            </div>

            {/* Confirm */}
            <ConfirmButton onClick={handleConfirmStage1}
              disabled={!objective || (['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC'].includes(objective) && !destination)}
              label="Create Campaign & Ad Set →" />
          </div>
        )}

        {/* Collapsed summary for done stage 1 */}
        {expanded[1] && stage1Done && (
          <div className="px-5 pb-4 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-slate-400">Objective:</span> <span className="font-medium text-slate-700">{OBJECTIVES.find(o => o.id === objective)?.title}</span></div>
              <div><span className="text-slate-400">Country:</span> <span className="font-medium text-slate-700">{country}</span></div>
              <div><span className="text-slate-400">Budget:</span> <span className="font-medium text-slate-700">HKD {budget}/day</span></div>
              {destination && <div><span className="text-slate-400">Destination:</span> <span className="font-medium text-slate-700">{destination}</span></div>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ STAGE 2: Ad Set / Audience ═══ */}
      <div className="border-b border-slate-100">
        <SectionHeader phase={2} title="Audience Targeting" done={stage2Done} active={currentPhase === 2}
          expanded={expanded[2]} onClick={() => (stage2Done || currentPhase === 2) && toggleExpand(2)} summary={stage2Summary} />

        {expanded[2] && currentPhase === 2 && (
          <div className="px-5 pb-5 space-y-5">
            {/* Audience selection */}
            <div>
              <FieldLabel icon={Users} label="Select Audience" />
              <div className="space-y-2">
                {/* Broad targeting option */}
                <button onClick={() => setSelectedAudience('broad')}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                    ${selectedAudience === 'broad' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <Globe size={18} className={selectedAudience === 'broad' ? 'text-blue-500' : 'text-slate-400'} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Broad Targeting</p>
                    <p className="text-[10px] text-slate-400">Ages 18–65, all interests · Recommended for new campaigns</p>
                  </div>
                  {selectedAudience === 'broad' && <CheckCircle2 size={16} className="text-blue-500 ml-auto" />}
                </button>

                {/* Existing audiences */}
                {audiences.length > 0 && audiences.map(aud => (
                  <button key={aud.id} onClick={() => setSelectedAudience(aud.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                      ${selectedAudience === aud.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Users size={18} className={selectedAudience === aud.id ? 'text-blue-500' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{aud.name}</p>
                      <p className="text-[10px] text-slate-400">{aud.subtype || aud.type || 'Custom Audience'} · {aud.approximate_count ? `~${aud.approximate_count.toLocaleString()} people` : ''}</p>
                    </div>
                    {selectedAudience === aud.id && <CheckCircle2 size={16} className="text-blue-500 ml-auto" />}
                  </button>
                ))}

                {/* Create new audience */}
                <button onClick={() => setSelectedAudience('new')}
                  className={`w-full p-3 rounded-xl border-2 border-dashed text-left transition-all flex items-center gap-3
                    ${selectedAudience === 'new' ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-300'}`}>
                  <Plus size={18} className={selectedAudience === 'new' ? 'text-blue-500' : 'text-slate-400'} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Create New Audience</p>
                    <p className="text-[10px] text-slate-400">Build a custom or lookalike audience</p>
                  </div>
                </button>
              </div>
            </div>

            <ConfirmButton onClick={handleConfirmStage2} label={selectedAudience === 'new' ? 'Build New Audience →' : 'Confirm Audience →'} />
          </div>
        )}
      </div>

      {/* ═══ STAGE 3: Creative ═══ */}
      <div>
        <SectionHeader phase={3} title="Ads Creative" done={stage3Done} active={currentPhase === 3}
          expanded={expanded[3]} onClick={() => currentPhase === 3 && toggleExpand(3)} summary={null} />

        {expanded[3] && currentPhase === 3 && (
          <div className="px-5 pb-5 space-y-5">
            {/* Upload zone */}
            <div>
              <FieldLabel icon={Image} label="Upload Creatives" />
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
                <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-medium text-slate-600">Drag & drop images or videos here</p>
                <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, MP4, MOV · Max 30MB images, 4GB videos</p>
                <label className="mt-3 inline-block px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  Browse Files
                  <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>

              {/* Uploaded file list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {uploadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      {file.type?.startsWith('video') ? <Film size={14} className="text-purple-500" /> : <Image size={14} className="text-blue-500" />}
                      <span className="text-[11px] font-medium text-slate-700 flex-1 truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}>
                        <X size={12} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Landing page */}
            {destination === 'website' && (
              <div>
                <FieldLabel icon={Link} label="Landing Page URL" />
                <input type="url" placeholder="https://yoursite.com/landing" value={landingPage}
                  onChange={e => setLandingPage(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none" />
              </div>
            )}

            {/* CTA */}
            <div>
              <FieldLabel icon={Sparkles} label="Call to Action" />
              <div className="flex flex-wrap gap-2">
                {CTA_TYPES.map(c => (
                  <button key={c.id} onClick={() => setCta(c.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all
                      ${cta === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm */}
            <ConfirmButton onClick={handleConfirmStage3}
              disabled={uploadedFiles.length === 0}
              label="Generate Ad Copy & Preview →" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreationWizard;
