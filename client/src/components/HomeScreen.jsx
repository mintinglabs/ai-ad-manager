import { Bot, BarChart2, SlidersHorizontal, Users } from 'lucide-react';

const MODULES = [
  {
    icon:   BarChart2,
    label:  'Campaign Report',
    desc:   'Pull live spend, ROAS, impressions & clicks from Meta Ads API',
    prompt: "Show this week's campaign report",
    color:  'text-blue-500',
    bg:     'bg-blue-50 hover:bg-blue-100',
    perm:   'ads_read',
    api:    'GET /{adAccountId}/insights',
  },
  {
    icon:   SlidersHorizontal,
    label:  'On/Off & Budget',
    desc:   'Pause, enable or adjust daily budget — changes go live instantly',
    prompt: 'Manage campaign status and budget',
    color:  'text-emerald-500',
    bg:     'bg-emerald-50 hover:bg-emerald-100',
    perm:   'ads_management',
    api:    'POST /{campaignId}',
  },
  {
    icon:   Users,
    label:  'Custom Audience',
    desc:   'Create a Website Visitors, Customer List, or Video Engagement audience',
    prompt: 'Create a custom audience',
    color:  'text-violet-500',
    bg:     'bg-violet-50 hover:bg-violet-100',
    perm:   'ads_management + business_management',
    api:    'POST /act_{id}/customaudiences',
  },
];

const PERMISSIONS = ['ads_read', 'ads_management', 'business_management'];

export const HomeScreen = ({ onSend, selectedAccount }) => (
  <div className="flex flex-col items-center h-full px-6 pb-8 pt-6 overflow-y-auto">

    {/* Meta API Status Banner */}
    <div className="w-full max-w-lg mb-5 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-xs font-semibold text-emerald-700">Meta Graph API v19.0 — Development</span>
        <span className="ml-auto text-xs text-emerald-600 font-mono">
          {selectedAccount ? selectedAccount.id : '—'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PERMISSIONS.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 text-xs bg-white border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {p}
          </span>
        ))}
      </div>
    </div>

    <div className="w-full max-w-lg mb-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800 leading-tight">
            What would you like to do?
          </h2>
          <p className="text-xs text-slate-400">
            Select a module — I'll call the Meta Ads API on your behalf.
          </p>
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-2.5 w-full max-w-lg">
      {MODULES.map(({ icon: Icon, label, desc, prompt, color, bg, perm, api }) => (
        <button
          key={label}
          onClick={() => onSend(prompt)}
          className={`flex items-center gap-4 p-4 rounded-2xl border border-transparent ${bg} transition-colors text-left group`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/60 group-hover:bg-white/80 transition-colors">
            <Icon size={20} className={color} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
            <p className="text-xs text-slate-400 mt-1 font-mono">{api}</p>
          </div>
          <code className="text-[10px] bg-white/70 text-slate-400 px-2 py-0.5 rounded font-mono shrink-0 group-hover:text-slate-600 transition-colors leading-snug">{perm}</code>
        </button>
      ))}
    </div>
  </div>
);
