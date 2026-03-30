import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Target, DollarSign, Globe, Users, Image, Film, Upload, Sparkles, Link, X, Plus, LayoutGrid, Layers, GripVertical, Megaphone, AlertTriangle } from 'lucide-react';

// ── File validation ──────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_IMAGE_MB = 30;
const MAX_VIDEO_MB = 4096;

const validateFiles = (files) => {
  const rejected = [];
  const valid = [];
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const sizeMB = file.size / (1024 * 1024);

    if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: unsupported format (use JPG, PNG, WebP, or GIF)`);
    } else if (isImage && sizeMB > MAX_IMAGE_MB) {
      rejected.push(`${file.name}: too large (${sizeMB.toFixed(1)}MB, max ${MAX_IMAGE_MB}MB)`);
    } else if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: unsupported format (use MP4, MOV, AVI, or MKV)`);
    } else if (isVideo && sizeMB > MAX_VIDEO_MB) {
      rejected.push(`${file.name}: too large (${(sizeMB / 1024).toFixed(1)}GB, max 4GB)`);
    } else if (isImage || isVideo) {
      valid.push(file);
    } else {
      rejected.push(`${file.name}: unsupported file type`);
    }
  }
  return { valid, rejected };
};

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

const COUNTRIES = [
  { id: 'HK', label: 'Hong Kong' }, { id: 'TW', label: 'Taiwan' }, { id: 'SG', label: 'Singapore' },
  { id: 'MY', label: 'Malaysia' }, { id: 'JP', label: 'Japan' }, { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' }, { id: 'AU', label: 'Australia' }, { id: 'CA', label: 'Canada' },
  { id: 'TH', label: 'Thailand' }, { id: 'PH', label: 'Philippines' }, { id: 'ID', label: 'Indonesia' },
  { id: 'VN', label: 'Vietnam' }, { id: 'KR', label: 'South Korea' }, { id: 'CN', label: 'China' },
];

const AD_FORMATS = [
  { id: 'separate', title: 'Separate Ads', desc: 'One ad per image — test which creative wins', icon: <LayoutGrid size={20} /> },
  { id: 'carousel', title: 'Carousel', desc: 'Swipeable cards in a single ad', icon: <Layers size={20} /> },
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

const CardSelect = ({ options, selected, onSelect }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {options.map(opt => {
      const isSelected = selected === opt.id;
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

// ── File Thumbnails Strip ────────────────────────────────────────────────────
const FileThumbnails = ({ files, onRemove }) => {
  if (!files?.length) return null;
  return (
    <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Image size={13} className="text-slate-400" />
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Uploaded Creatives ({files.length})
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {files.map((f, i) => (
          <div key={i} className="relative shrink-0 group">
            {f.preview ? (
              <img src={f.preview} alt={f.name} className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                {f.type?.startsWith('video') ? <Film size={18} className="text-purple-400" /> : <Image size={18} className="text-blue-400" />}
              </div>
            )}
            {onRemove && (
              <button onClick={() => onRemove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <X size={10} className="text-slate-500" />
              </button>
            )}
            <p className="text-[9px] text-slate-400 mt-0.5 truncate w-16 text-center">{f.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Carousel Card Editor ─────────────────────────────────────────────────────
const CarouselEditor = ({ files, cards, onChange }) => {
  const moveCard = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= cards.length) return;
    const updated = [...cards];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };

  const updateCard = (idx, field, value) => {
    const updated = cards.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <FieldLabel icon={Layers} label={`Carousel Cards (${cards.length})`} />
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {cards.map((card, i) => {
          const file = files[i];
          return (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-col items-center gap-1 pt-1">
                <button onClick={() => moveCard(i, i - 1)} disabled={i === 0}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                  <ChevronRight size={12} className="-rotate-90" />
                </button>
                <GripVertical size={12} className="text-slate-300" />
                <button onClick={() => moveCard(i, i + 1)} disabled={i === cards.length - 1}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                  <ChevronRight size={12} className="rotate-90" />
                </button>
              </div>
              {file?.preview ? (
                <img src={file.preview} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-slate-400">#{i + 1}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1.5">
                <input type="text" placeholder={`Card ${i + 1} headline`} value={card.headline}
                  onChange={e => updateCard(i, 'headline', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:border-blue-400 outline-none" />
                <input type="url" placeholder="https://link (optional)" value={card.url}
                  onChange={e => updateCard(i, 'url', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:border-blue-400 outline-none" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export const CreationWizard = ({ step, summary = {}, audiences = [], onSend, onUploadFiles, preUploadedFiles = [] }) => {
  const currentPhase = step?.current || 1;

  // All files: pre-uploaded from chat + locally added in wizard
  const [fileError, setFileError] = useState(null);
  const [localFiles, setLocalFiles] = useState([]);
  const allFiles = useMemo(() => [...preUploadedFiles, ...localFiles], [preUploadedFiles, localFiles]);
  const imageFiles = useMemo(() => allFiles.filter(f => !f.type?.startsWith('video')), [allFiles]);
  const hasMultipleImages = imageFiles.length >= 2 && imageFiles.length <= 10;

  // Stage 1 state
  const [objective, setObjective] = useState(null);
  const [destination, setDestination] = useState(null);
  const [country, setCountry] = useState('HK');
  const [budget, setBudget] = useState(200);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [adFormat, setAdFormat] = useState('separate');

  // Stage 2 state
  const [selectedAudience, setSelectedAudience] = useState('broad');

  // Stage 3 state
  const [cta, setCta] = useState('LEARN_MORE');
  const [landingPage, setLandingPage] = useState('');
  const [carouselCards, setCarouselCards] = useState([]);

  // Boost post state
  const [boostPostId, setBoostPostId] = useState('');

  // Track which stages are expanded
  const [expanded, setExpanded] = useState({ 1: true, 2: false, 3: false });

  // Auto-expand active phase
  useEffect(() => {
    setExpanded({ 1: currentPhase === 1, 2: currentPhase === 2, 3: currentPhase === 3 });
  }, [currentPhase]);

  // Initialize carousel cards when format or files change
  useEffect(() => {
    if (adFormat === 'carousel' && imageFiles.length > 0) {
      setCarouselCards(prev => {
        if (prev.length === imageFiles.length) return prev;
        return imageFiles.map((_, i) => prev[i] || { headline: '', url: '' });
      });
    }
  }, [adFormat, imageFiles.length]);

  // Auto-set CTA based on destination
  useEffect(() => {
    if (destination === 'whatsapp') setCta('WHATSAPP_MESSAGE');
    else if (destination === 'website') setCta('LEARN_MORE');
    else if (destination === 'lead_form') setCta('SIGN_UP');
  }, [destination]);

  const toggleExpand = (phase) => {
    setExpanded(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const needsDestination = objective && ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC'].includes(objective);

  // ── File handlers with validation ────────────────────────────────────────
  const processFiles = useCallback((rawFiles) => {
    const { valid, rejected } = validateFiles(rawFiles);
    if (rejected.length) {
      setFileError(rejected.join('\n'));
      setTimeout(() => setFileError(null), 6000);
    }
    if (valid.length) {
      setLocalFiles(prev => [...prev, ...valid.map(f => ({ name: f.name, type: f.type, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null, _raw: f }))]);
      onUploadFiles?.(valid);
    }
  }, [onUploadFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) processFiles(files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processFiles(files);
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((idx) => {
    // If idx < preUploadedFiles.length, it's a pre-uploaded file (can't remove from parent)
    // Otherwise remove from local
    const localIdx = idx - preUploadedFiles.length;
    if (localIdx >= 0) {
      setLocalFiles(prev => prev.filter((_, i) => i !== localIdx));
    }
  }, [preUploadedFiles.length]);

  // ── Stage 1: Confirm ────────────────────────────────────────────────────
  const handleConfirmStage1 = useCallback(() => {
    const parts = [];
    const obj = OBJECTIVES.find(o => o.id === objective);
    parts.push(`Create a ${obj?.title || objective} campaign`);
    if (destination) parts.push(`destination: ${destination}`);
    if (destinationUrl) parts.push(`URL: ${destinationUrl}`);
    parts.push(`country: ${country}`);
    parts.push(`daily budget: HKD ${budget}`);
    if (hasMultipleImages && adFormat === 'carousel') parts.push('format: Carousel');
    if (hasMultipleImages && adFormat === 'separate') parts.push(`format: ${imageFiles.length} Separate Ads`);
    onSend?.(parts.join(', '));
  }, [objective, destination, destinationUrl, country, budget, adFormat, hasMultipleImages, imageFiles.length, onSend]);

  // ── Stage 2: Confirm ────────────────────────────────────────────────────
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

  // ── Stage 3: Confirm ────────────────────────────────────────────────────
  const handleConfirmStage3 = useCallback(() => {
    const parts = [];
    if (cta) parts.push(`CTA: ${cta}`);
    if (landingPage) parts.push(`Landing page: ${landingPage}`);

    // Include file references so agent knows what's uploaded
    const fileRefs = allFiles.map((f) => {
      if (f.image_hash) return `[image: ${f.name}, hash: ${f.image_hash}]`;
      if (f.video_id) return `[video: ${f.name}, id: ${f.video_id}]`;
      return `[file: ${f.name}]`;
    }).join(', ');
    if (fileRefs) parts.push(`Creatives: ${fileRefs}`);

    if (adFormat === 'carousel' && carouselCards.length > 0) {
      const cardInfo = carouselCards.map((c, i) => `Card ${i + 1}: "${c.headline || 'untitled'}"${c.url ? ` → ${c.url}` : ''}`).join('; ');
      parts.push(`Carousel: ${cardInfo}`);
    }

    parts.push('Please generate ad copy variations and create the ad');
    onSend?.(parts.join(', '));
  }, [cta, landingPage, allFiles, adFormat, carouselCards, onSend]);

  // ── Boost post confirm ──────────────────────────────────────────────────
  const handleConfirmBoost = useCallback(() => {
    const parts = [`Boost post ID: ${boostPostId}`];
    parts.push(`country: ${country}`);
    parts.push(`daily budget: HKD ${budget}`);
    onSend?.(parts.join(', '));
  }, [boostPostId, country, budget, onSend]);

  // ── Summaries for collapsed stages ──────────────────────────────────────
  const stage1Summary = summary.phase1
    ? `${OBJECTIVES.find(o => o.id === summary.phase1.campaign_objective)?.title || 'Campaign'} · ${country} · HKD ${budget}/day`
    : null;
  const stage2Summary = summary.phase2 ? 'Audience configured' : (currentPhase > 2 ? 'Broad targeting' : null);

  const stage1Done = currentPhase > 1;
  const stage2Done = currentPhase > 2;
  const stage3Done = false;

  const hasFiles = allFiles.length > 0;

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm max-h-[70vh] overflow-y-auto relative">

      {/* File validation error toast */}
      {fileError && (
        <div className="sticky top-0 z-20 px-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700 mb-1">File not supported</p>
              {fileError.split('\n').map((line, i) => (
                <p key={i} className="text-[11px] text-red-600 leading-relaxed">{line}</p>
              ))}
            </div>
            <button onClick={() => setFileError(null)} className="text-red-400 hover:text-red-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Pre-uploaded file thumbnails strip ── */}
      {hasFiles && <FileThumbnails files={allFiles} onRemove={removeFile} />}

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
            {needsDestination && (
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

            {/* Ad Format selector — only when 2-10 images uploaded */}
            {hasMultipleImages && (
              <div>
                <FieldLabel icon={LayoutGrid} label="Ad Format" />
                <div className="grid grid-cols-2 gap-2">
                  {AD_FORMATS.map(fmt => (
                    <button key={fmt.id} onClick={() => setAdFormat(fmt.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                        ${adFormat === fmt.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className={adFormat === fmt.id ? 'text-blue-500' : 'text-slate-400'}>{fmt.icon}</span>
                      <div>
                        <p className={`text-xs font-semibold ${adFormat === fmt.id ? 'text-blue-700' : 'text-slate-700'}`}>{fmt.title}</p>
                        <p className="text-[10px] text-slate-400">{fmt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
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
              disabled={!objective || (needsDestination && !destination)}
              label="Create Campaign & Ad Set →" />

            {/* Boost post alternative */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] text-slate-400 uppercase">or</span></div>
            </div>
            <div className="space-y-3">
              <FieldLabel icon={Megaphone} label="Boost an Existing Post" />
              <input type="text" placeholder="Paste post ID or URL" value={boostPostId}
                onChange={e => setBoostPostId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none" />
              <ConfirmButton onClick={handleConfirmBoost}
                disabled={!boostPostId.trim()}
                label="Boost This Post →" />
            </div>
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
              {hasMultipleImages && <div><span className="text-slate-400">Format:</span> <span className="font-medium text-slate-700">{adFormat === 'carousel' ? 'Carousel' : 'Separate Ads'}</span></div>}
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
            <div>
              <FieldLabel icon={Users} label="Select Audience" />
              <div className="space-y-2">
                {/* Broad targeting */}
                <button onClick={() => setSelectedAudience('broad')}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                    ${selectedAudience === 'broad' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <Globe size={18} className={selectedAudience === 'broad' ? 'text-blue-500' : 'text-slate-400'} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Broad Targeting</p>
                    <p className="text-[10px] text-slate-400">Ages 18-65, all interests · Recommended for new campaigns</p>
                  </div>
                  {selectedAudience === 'broad' && <CheckCircle2 size={16} className="text-blue-500 ml-auto" />}
                </button>

                {/* Existing audiences */}
                {audiences.map(aud => (
                  <button key={aud.id} onClick={() => setSelectedAudience(aud.id)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3
                      ${selectedAudience === aud.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <Users size={18} className={selectedAudience === aud.id ? 'text-blue-500' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{aud.name}</p>
                      <p className="text-[10px] text-slate-400">{aud.subtype || aud.type || 'Custom Audience'}{aud.approximate_count ? ` · ~${aud.approximate_count.toLocaleString()} people` : ''}</p>
                    </div>
                    {selectedAudience === aud.id && <CheckCircle2 size={16} className="text-blue-500 ml-auto" />}
                  </button>
                ))}

                {/* Create new */}
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

            {/* Upload zone — only show if no files yet */}
            {!hasFiles && (
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
              </div>
            )}

            {/* If files exist: show ready state or carousel editor */}
            {hasFiles && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">
                    {allFiles.length} creative{allFiles.length > 1 ? 's' : ''} ready
                  </span>
                  <label className="ml-auto text-[10px] text-blue-600 font-medium cursor-pointer hover:underline">
                    + Add more
                    <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {/* Carousel card editor */}
            {adFormat === 'carousel' && hasMultipleImages && hasFiles && (
              <CarouselEditor files={imageFiles} cards={carouselCards} onChange={setCarouselCards} />
            )}

            {/* Landing page */}
            {(destination === 'website' || !destination) && (
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
              disabled={!hasFiles}
              label="Generate Ad Copy & Preview →" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreationWizard;
