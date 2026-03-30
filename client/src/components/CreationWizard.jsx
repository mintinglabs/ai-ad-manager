import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle2, Target, DollarSign, Globe, Users, Image, Film, Upload, Sparkles, Link, X, Plus, LayoutGrid, Layers, AlertTriangle, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// ── File validation ──────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

const validateFiles = (files) => {
  const rejected = [], valid = [];
  for (const file of files) {
    const isImg = file.type.startsWith('image/'), isVid = file.type.startsWith('video/');
    const mb = file.size / (1024 * 1024);
    if (isImg && !ALLOWED_IMAGE_TYPES.includes(file.type)) rejected.push(`${file.name}: use JPG, PNG, WebP, or GIF`);
    else if (isImg && mb > 30) rejected.push(`${file.name}: too large (${mb.toFixed(1)}MB, max 30MB)`);
    else if (isVid && !ALLOWED_VIDEO_TYPES.includes(file.type)) rejected.push(`${file.name}: use MP4, MOV, AVI, or MKV`);
    else if (isVid && mb > 4096) rejected.push(`${file.name}: too large (max 4GB)`);
    else if (isImg || isVid) valid.push(file);
    else rejected.push(`${file.name}: unsupported file type`);
  }
  return { valid, rejected };
};

// ── Constants ────────────────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'OUTCOME_SALES', label: 'Sales', icon: '💰' },
  { id: 'OUTCOME_LEADS', label: 'Leads', icon: '📋' },
  { id: 'OUTCOME_TRAFFIC', label: 'Traffic', icon: '🔗' },
  { id: 'OUTCOME_AWARENESS', label: 'Awareness', icon: '📢' },
  { id: 'OUTCOME_ENGAGEMENT', label: 'Engagement', icon: '❤️' },
];
const DESTINATIONS = [
  { id: 'whatsapp', label: 'WhatsApp' }, { id: 'website', label: 'Website' },
  { id: 'lead_form', label: 'Lead Form' }, { id: 'messenger', label: 'Messenger' },
  { id: 'instagram', label: 'Instagram DM' },
];
const CTA_TYPES = [
  { id: 'LEARN_MORE', label: 'Learn More' }, { id: 'SHOP_NOW', label: 'Shop Now' },
  { id: 'WHATSAPP_MESSAGE', label: 'WhatsApp' }, { id: 'SIGN_UP', label: 'Sign Up' },
  { id: 'CONTACT_US', label: 'Contact Us' }, { id: 'GET_QUOTE', label: 'Get Quote' },
  { id: 'BOOK_NOW', label: 'Book Now' },
];
const COUNTRIES = [
  { id: 'HK', label: '🇭🇰 Hong Kong' }, { id: 'TW', label: '🇹🇼 Taiwan' }, { id: 'SG', label: '🇸🇬 Singapore' },
  { id: 'MY', label: '🇲🇾 Malaysia' }, { id: 'JP', label: '🇯🇵 Japan' }, { id: 'US', label: '🇺🇸 United States' },
  { id: 'GB', label: '🇬🇧 UK' }, { id: 'AU', label: '🇦🇺 Australia' }, { id: 'TH', label: '🇹🇭 Thailand' },
  { id: 'PH', label: '🇵🇭 Philippines' }, { id: 'ID', label: '🇮🇩 Indonesia' }, { id: 'VN', label: '🇻🇳 Vietnam' },
  { id: 'KR', label: '🇰🇷 South Korea' }, { id: 'CA', label: '🇨🇦 Canada' },
];

// ── Shared atoms ─────────────────────────────────────────────────────────────
const Label = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-1.5 mb-1.5">
    {Icon && <Icon size={12} className="text-slate-400" />}
    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{text}</span>
  </div>
);

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all
    ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
    {children}
  </button>
);

// ── Stage header ─────────────────────────────────────────────────────────────
const StageHeader = ({ num, title, active, done, expanded, onClick, summary }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors
    ${active ? 'bg-blue-50/60' : done ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-slate-50/40'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all
      ${active ? 'border-blue-500 bg-blue-100 text-blue-600' : done ? 'border-emerald-400 bg-emerald-100 text-emerald-600' : 'border-slate-200 bg-white text-slate-400'}`}>
      {done ? <CheckCircle2 size={14} /> : num}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-[13px] font-semibold ${active ? 'text-blue-800' : done ? 'text-emerald-700' : 'text-slate-400'}`}>{title}</p>
      {done && summary && <p className="text-[10px] text-emerald-600 mt-0.5 truncate">{summary}</p>}
    </div>
    {(done || active) && (expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />)}
  </button>
);

// ── Pipeline progress (after all 3 confirmed) ───────────────────────────────
const PipelineProgress = ({ step }) => {
  const labels = ['Campaign', 'Ad Set', 'Creative', 'Ad'];
  const done = step?.current === 1 ? 0 : step?.current === 2 ? 2 : step?.current >= 3 ? 3 : 0;
  return (
    <div className="bg-white border-b border-slate-200 px-5 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Loader2 size={13} className="text-blue-500 animate-spin" />
        <span className="text-[11px] font-semibold text-slate-600">Creating your ad...</span>
      </div>
      <div className="flex items-center gap-1">
        {labels.map((l, i) => (
          <React.Fragment key={l}>
            <div className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border
                ${i < done ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : i === done ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-300'}`}>
                {i < done ? <CheckCircle2 size={10} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${i < done ? 'text-emerald-600' : i === done ? 'text-blue-600' : 'text-slate-300'}`}>{l}</span>
            </div>
            {i < labels.length - 1 && <div className={`flex-1 h-px min-w-[8px] ${i < done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── Carousel editor ──────────────────────────────────────────────────────────
const CarouselEditor = ({ files, cards, onChange }) => {
  const move = (from, to) => { if (to < 0 || to >= cards.length) return; const u = [...cards]; const [m] = u.splice(from, 1); u.splice(to, 0, m); onChange(u); };
  const set = (i, k, v) => onChange(cards.map((c, j) => j === i ? { ...c, [k]: v } : c));
  return (
    <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
      {cards.map((card, i) => (
        <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-col gap-0.5">
            <button onClick={() => move(i, i - 1)} disabled={i === 0} className="text-slate-400 disabled:opacity-20"><ChevronRight size={9} className="-rotate-90" /></button>
            <button onClick={() => move(i, i + 1)} disabled={i === cards.length - 1} className="text-slate-400 disabled:opacity-20"><ChevronRight size={9} className="rotate-90" /></button>
          </div>
          {files[i]?.preview ? <img src={files[i].preview} alt="" className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0" /> : <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-[9px] text-slate-400">#{i+1}</div>}
          <div className="flex-1 min-w-0 space-y-1">
            <input type="text" placeholder={`Headline ${i+1}`} value={card.headline} onChange={e => set(i, 'headline', e.target.value)} className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded bg-white focus:border-blue-400 outline-none" />
            <input type="url" placeholder="Link (optional)" value={card.url} onChange={e => set(i, 'url', e.target.value)} className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded bg-white focus:border-blue-400 outline-none" />
          </div>
        </div>
      ))}
    </div>
  );
};


// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD — 3 collapsible stages, chips inside
// ═════════════════════════════════════════════════════════════════════════════
export const CreationWizard = ({ step, summary = {}, audiences = [], onSend, onUploadFiles, preUploadedFiles = [] }) => {
  // Which stage the user has confirmed up to (local, independent of backend)
  const [confirmed, setConfirmed] = useState(0); // 0 = none, 1 = stage1 done, 2 = stage2 done, 3 = all done
  const [expanded, setExpanded] = useState(1); // which stage is expanded
  const [fileError, setFileError] = useState(null);
  const [localFiles, setLocalFiles] = useState([]);

  const allFiles = useMemo(() => [...preUploadedFiles, ...localFiles], [preUploadedFiles, localFiles]);
  const imageFiles = useMemo(() => allFiles.filter(f => !f.type?.startsWith('video')), [allFiles]);
  const hasMultipleImages = imageFiles.length >= 2 && imageFiles.length <= 10;
  const hasFiles = allFiles.length > 0;

  // Form state
  const [objective, setObjective] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [country, setCountry] = useState('HK');
  const [budget, setBudget] = useState(200);
  const [adFormat, setAdFormat] = useState('separate');
  const [selectedAudience, setSelectedAudience] = useState('broad');
  const [cta, setCta] = useState('LEARN_MORE');
  const [landingPage, setLandingPage] = useState('');
  const [carouselCards, setCarouselCards] = useState([]);
  const [boostPostId, setBoostPostId] = useState('');

  // Auto CTA
  useEffect(() => {
    if (destination === 'whatsapp') setCta('WHATSAPP_MESSAGE');
    else if (destination === 'website') setCta('LEARN_MORE');
    else if (destination === 'lead_form') setCta('SIGN_UP');
  }, [destination]);

  // Init carousel
  useEffect(() => {
    if (adFormat === 'carousel' && imageFiles.length > 0) {
      setCarouselCards(prev => prev.length === imageFiles.length ? prev : imageFiles.map((_, i) => prev[i] || { headline: '', url: '' }));
    }
  }, [adFormat, imageFiles.length]);

  const needsDest = objective && ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC'].includes(objective);

  // File handlers
  const processFiles = useCallback((raw) => {
    const { valid, rejected } = validateFiles(raw);
    if (rejected.length) { setFileError(rejected.join('\n')); setTimeout(() => setFileError(null), 6000); }
    if (valid.length) {
      setLocalFiles(prev => [...prev, ...valid.map(f => ({ name: f.name, type: f.type, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null, _raw: f }))]);
      onUploadFiles?.(valid);
    }
  }, [onUploadFiles]);
  const handleDrop = useCallback((e) => { e.preventDefault(); const f = Array.from(e.dataTransfer?.files || []); if (f.length) processFiles(f); }, [processFiles]);
  const handleFileSelect = useCallback((e) => { const f = Array.from(e.target.files || []); if (f.length) processFiles(f); e.target.value = ''; }, [processFiles]);
  const removeFile = useCallback((idx) => { const li = idx - preUploadedFiles.length; if (li >= 0) setLocalFiles(prev => prev.filter((_, i) => i !== li)); }, [preUploadedFiles.length]);

  // ── Stage confirms ────────────────────────────────────────────────────────
  const confirmStage1 = useCallback(() => {
    setConfirmed(1);
    setExpanded(2);
    // Send stage 1 info to agent
    const parts = [];
    const obj = OBJECTIVES.find(o => o.id === objective);
    parts.push(`Create a ${obj?.label || objective} campaign`);
    if (destination) parts.push(`destination: ${destination}`);
    if (destinationUrl) parts.push(`URL: ${destinationUrl}`);
    parts.push(`country: ${country}, daily budget: HKD ${budget}`);
    if (hasMultipleImages) parts.push(`format: ${adFormat === 'carousel' ? 'Carousel' : imageFiles.length + ' Separate Ads'}`);
    onSend?.(parts.join(', '));
  }, [objective, destination, destinationUrl, country, budget, adFormat, hasMultipleImages, imageFiles.length, onSend]);

  const confirmStage2 = useCallback(() => {
    setConfirmed(2);
    setExpanded(3);
    if (selectedAudience === 'broad') onSend?.('Use broad targeting (18-65, all interests)');
    else if (selectedAudience === 'new') onSend?.('I want to create a new audience');
    else { const a = audiences.find(a => a.id === selectedAudience); onSend?.(`Use audience: ${a?.name || selectedAudience}`); }
  }, [selectedAudience, audiences, onSend]);

  const confirmStage3 = useCallback(() => {
    setConfirmed(3);
    setExpanded(0);
    const parts = [];
    if (cta) parts.push(`CTA: ${cta}`);
    if (landingPage) parts.push(`landing page: ${landingPage}`);
    const refs = allFiles.map(f => f.image_hash ? `[image: ${f.name}, hash: ${f.image_hash}]` : f.video_id ? `[video: ${f.name}, id: ${f.video_id}]` : `[file: ${f.name}]`);
    if (refs.length) parts.push(`creatives: ${refs.join(', ')}`);
    if (adFormat === 'carousel' && carouselCards.length) {
      parts.push(`carousel: ${carouselCards.map((c, i) => `Card ${i+1}: "${c.headline || 'untitled'}"${c.url ? ` → ${c.url}` : ''}`).join('; ')}`);
    }
    parts.push('Go ahead and create the ad.');
    onSend?.(parts.join(', '));
  }, [cta, landingPage, allFiles, adFormat, carouselCards, onSend]);

  const toggle = (num) => setExpanded(prev => prev === num ? 0 : num);

  // Summaries
  const s1Summary = confirmed >= 1 ? `${OBJECTIVES.find(o => o.id === objective)?.label || ''} · ${country} · HKD ${budget}/day` : null;
  const s2Summary = confirmed >= 2 ? (selectedAudience === 'broad' ? 'Broad targeting' : selectedAudience === 'new' ? 'New audience' : audiences.find(a => a.id === selectedAudience)?.name || '') : null;

  // After all 3 confirmed → show progress
  if (confirmed >= 3) {
    return <PipelineProgress step={step} summary={summary} />;
  }

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm max-h-[70vh] overflow-y-auto relative">

      {/* Error toast */}
      {fileError && (
        <div className="sticky top-0 z-20 px-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg px-3 py-2.5 flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {fileError.split('\n').map((l, i) => <p key={i} className="text-[10px] text-red-600">{l}</p>)}
            </div>
            <button onClick={() => setFileError(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* File thumbnails strip */}
      {hasFiles && (
        <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {allFiles.map((f, i) => (
              <div key={i} className="relative shrink-0 group">
                {f.preview ? <img src={f.preview} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  : <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {f.type?.startsWith('video') ? <Film size={14} className="text-purple-400" /> : <Image size={14} className="text-blue-400" />}
                    </div>}
                {i >= preUploadedFiles.length && (
                  <button onClick={() => removeFile(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm">
                    <X size={8} className="text-slate-500" />
                  </button>
                )}
              </div>
            ))}
            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 shrink-0">
              <Plus size={14} className="text-slate-400" />
              <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* ═══ STAGE 1: Campaign Settings ═══ */}
      <div className="border-b border-slate-100">
        <StageHeader num={1} title="Campaign Settings" active={confirmed < 1} done={confirmed >= 1}
          expanded={expanded === 1} onClick={() => toggle(1)} summary={s1Summary} />

        {expanded === 1 && confirmed < 1 && (
          <div className="px-5 pb-4 space-y-4">
            <div>
              <Label icon={Target} text="Objective" />
              <div className="flex flex-wrap gap-1.5">
                {OBJECTIVES.map(o => <Chip key={o.id} selected={objective === o.id} onClick={() => setObjective(o.id)}>{o.icon} {o.label}</Chip>)}
              </div>
            </div>

            {needsDest && (
              <div>
                <Label icon={Link} text="Destination" />
                <div className="flex flex-wrap gap-1.5">
                  {DESTINATIONS.map(d => <Chip key={d.id} selected={destination === d.id} onClick={() => setDestination(d.id)}>{d.label}</Chip>)}
                </div>
                {destination === 'website' && (
                  <input type="url" placeholder="https://yoursite.com" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none" />
                )}
              </div>
            )}

            {hasMultipleImages && (
              <div>
                <Label icon={LayoutGrid} text="Format" />
                <div className="flex gap-1.5">
                  <Chip selected={adFormat === 'separate'} onClick={() => setAdFormat('separate')}><LayoutGrid size={11} className="inline -mt-0.5 mr-1" />Separate Ads</Chip>
                  <Chip selected={adFormat === 'carousel'} onClick={() => setAdFormat('carousel')}><Layers size={11} className="inline -mt-0.5 mr-1" />Carousel</Chip>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label icon={Globe} text="Country" />
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full px-2.5 py-2 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none">
                  {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label icon={DollarSign} text="Daily Budget" />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">HKD</span>
                  <input type="number" min={50} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none" />
                </div>
                <div className="flex gap-1 mt-1">
                  {[100, 200, 500, 1000].map(v => (
                    <button key={v} onClick={() => setBudget(v)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full border ${budget === v ? 'border-blue-400 bg-blue-50 text-blue-600 font-bold' : 'border-slate-200 text-slate-400'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={confirmStage1} disabled={!objective || (needsDest && !destination)}
              className={`w-full py-2.5 rounded-xl text-[12px] font-bold transition-all
                ${objective && (!needsDest || destination) ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              Next: Audience →
            </button>

            {/* Boost post alternative */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] text-slate-400 uppercase tracking-wider">or boost a post</span></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Paste post ID or URL" value={boostPostId} onChange={e => setBoostPostId(e.target.value)}
                className="flex-1 px-3 py-2 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none" />
              <button onClick={() => { setConfirmed(3); setExpanded(0); onSend?.(`Boost post ${boostPostId}, country: ${country}, daily budget: HKD ${budget}`); }}
                disabled={!boostPostId.trim()}
                className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0
                  ${boostPostId.trim() ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                Boost →
              </button>
            </div>
          </div>
        )}

        {expanded === 1 && confirmed >= 1 && (
          <div className="px-5 pb-3 text-[10px] text-slate-500">
            {OBJECTIVES.find(o => o.id === objective)?.icon} {OBJECTIVES.find(o => o.id === objective)?.label} · {destination || 'Any'} · {country} · HKD {budget}/day
          </div>
        )}
      </div>

      {/* ═══ STAGE 2: Audience ═══ */}
      <div className="border-b border-slate-100">
        <StageHeader num={2} title="Audience" active={confirmed === 1} done={confirmed >= 2}
          expanded={expanded === 2} onClick={() => confirmed >= 1 && toggle(2)} summary={s2Summary} />

        {expanded === 2 && confirmed === 1 && (
          <div className="px-5 pb-4 space-y-4">
            <div>
              <Label icon={Users} text="Target Audience" />

              {/* Broad targeting — default */}
              <button onClick={() => setSelectedAudience('broad')}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 mb-2
                  ${selectedAudience === 'broad' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <Globe size={16} className={selectedAudience === 'broad' ? 'text-blue-500' : 'text-slate-400'} />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-slate-700">Broad Targeting</p>
                  <p className="text-[9px] text-slate-400">Ages 18-65, all interests · Recommended for new campaigns</p>
                </div>
                {selectedAudience === 'broad' && <CheckCircle2 size={14} className="text-blue-500" />}
              </button>

              {/* Existing audiences dropdown */}
              {audiences.length > 0 && (
                <div className="mb-2">
                  <select value={selectedAudience === 'broad' || selectedAudience === 'new' ? '' : selectedAudience}
                    onChange={e => e.target.value && setSelectedAudience(e.target.value)}
                    className="w-full px-3 py-2.5 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none">
                    <option value="">Select an existing audience...</option>
                    {audiences.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.approximate_count ? ` (~${a.approximate_count.toLocaleString()})` : ''} — {a.subtype || a.type || 'Custom'}
                      </option>
                    ))}
                  </select>
                  {selectedAudience !== 'broad' && selectedAudience !== 'new' && audiences.find(a => a.id === selectedAudience) && (
                    <div className="mt-1.5 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-[10px] font-semibold text-blue-700">{audiences.find(a => a.id === selectedAudience)?.name}</p>
                      <p className="text-[9px] text-blue-500">{audiences.find(a => a.id === selectedAudience)?.subtype || 'Custom Audience'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Create new */}
              <button onClick={() => setSelectedAudience('new')}
                className={`w-full p-3 rounded-xl border-2 border-dashed text-left transition-all flex items-center gap-3
                  ${selectedAudience === 'new' ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-300'}`}>
                <Plus size={16} className={selectedAudience === 'new' ? 'text-blue-500' : 'text-slate-400'} />
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">Create New Audience</p>
                  <p className="text-[9px] text-slate-400">Build a custom or lookalike audience</p>
                </div>
              </button>
            </div>

            <button onClick={confirmStage2}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all">
              Next: Creative →
            </button>
          </div>
        )}

        {expanded === 2 && confirmed >= 2 && (
          <div className="px-5 pb-3 text-[10px] text-slate-500">{s2Summary}</div>
        )}
      </div>

      {/* ═══ STAGE 3: Creative ═══ */}
      <div>
        <StageHeader num={3} title="Creative" active={confirmed === 2} done={false}
          expanded={expanded === 3} onClick={() => confirmed >= 2 && toggle(3)} summary={null} />

        {expanded === 3 && confirmed === 2 && (
          <div className="px-5 pb-4 space-y-4">

            {!hasFiles && (
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
                <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                <p className="text-[10px] font-medium text-slate-600">Drop images or videos here (optional)</p>
                <p className="text-[9px] text-slate-400 mt-0.5">JPG, PNG, WebP, GIF, MP4, MOV</p>
                <label className="mt-2 inline-block px-3 py-1.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-200">
                  Browse <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            )}

            {hasFiles && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-700">{allFiles.length} file{allFiles.length > 1 ? 's' : ''} ready</span>
                <label className="ml-auto text-[10px] text-blue-600 font-medium cursor-pointer hover:underline">
                  + Add <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
                </label>
              </div>
            )}

            {adFormat === 'carousel' && hasMultipleImages && (
              <CarouselEditor files={imageFiles} cards={carouselCards} onChange={setCarouselCards} />
            )}

            <div>
              <Label icon={Sparkles} text="Call to Action" />
              <div className="flex flex-wrap gap-1.5">
                {CTA_TYPES.map(c => <Chip key={c.id} selected={cta === c.id} onClick={() => setCta(c.id)}>{c.label}</Chip>)}
              </div>
            </div>

            {(destination === 'website' || !destination) && (
              <div>
                <Label icon={Link} text="Landing Page (optional)" />
                <input type="url" placeholder="https://yoursite.com/landing" value={landingPage} onChange={e => setLandingPage(e.target.value)}
                  className="w-full px-3 py-2 text-[11px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none" />
              </div>
            )}

            <button onClick={confirmStage3}
              className="w-full py-2.5 rounded-xl text-[12px] font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all">
              Create Campaign →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreationWizard;
