import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Image, RefreshCw, Check, Target, Users } from 'lucide-react';
import api from '../services/api.js';

const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ENGAGEMENT_TYPES = {
  ig: [
    { id: 'ig_business_profile_all', label: '所有互動', desc: '同你 Profile 或內容有互動嘅人' },
    { id: 'ig_business_profile_visit', label: '瀏覽 Profile', desc: '' },
    { id: 'ig_user_interacted_ad_or_organic', label: '帖文/廣告互動', desc: 'Like、留言、分享、儲存' },
    { id: 'ig_user_messaged', label: '發送 DM', desc: '' },
    { id: 'ig_user_saved_media', label: '儲存帖文', desc: '' },
  ],
  fb_page: [
    { id: 'page_engaged', label: '所有互動', desc: 'Like、分享、留言、連結點擊' },
    { id: 'page_liked', label: '專頁讚好/關注', desc: '' },
    { id: 'page_visited', label: '專頁訪客', desc: '' },
    { id: 'page_cta_clicked', label: 'CTA 按鈕點擊', desc: '' },
    { id: 'page_messaged', label: '發送訊息', desc: '' },
  ],
  ad: [
    { id: 'engaged', label: '所有互動', desc: '同廣告互動過嘅人' },
    { id: 'clicked', label: '連結點擊', desc: '' },
    { id: 'video_watched', label: '影片觀看', desc: '' },
  ],
  lead: [
    { id: 'opened', label: '開過 Lead Form', desc: '開過但未必提交' },
    { id: 'submitted', label: '已提交 Lead Form', desc: '' },
    { id: 'not_submitted', label: '開過但無提交', desc: '高意向但未完成' },
  ],
};

const MAX_RETENTION = { ig: 365, fb_page: 365, ad: 365, lead: 90 };
const DEFAULT_RETENTION = { ig: 365, fb_page: 365, ad: 365, lead: 30 };

const ENGAGEMENT_LABELS = {
  ig_business_profile_all: 'engaged with IG profile',
  ig_business_profile_visit: 'visited IG profile',
  ig_user_interacted_ad_or_organic: 'engaged with IG post/ad',
  ig_user_messaged: 'sent IG DM',
  ig_user_saved_media: 'saved IG post',
  page_engaged: 'engaged with FB page',
  page_liked: 'liked/followed FB page',
  page_visited: 'visited FB page',
  page_cta_clicked: 'clicked CTA on FB page',
  page_messaged: 'sent message to FB page',
  engaged: 'engaged with ad',
  clicked: 'clicked ad link',
  video_watched: 'watched ad video',
  opened: 'opened lead form',
  submitted: 'submitted lead form',
  not_submitted: 'opened but did not submit lead form',
};

export default function EngagementAudienceCard({ data, onSend, isAnswered, adAccountId, token }) {
  const mode = data?.mode || 'ig'; // ig | fb_page | ad | lead

  // Config
  const [selectedId, setSelectedId] = useState('');
  const [engagement, setEngagement] = useState(ENGAGEMENT_TYPES[mode]?.[0]?.id || '');
  const [retention, setRetention] = useState(DEFAULT_RETENTION[mode] || 365);
  const [confirmed, setConfirmed] = useState(false);

  // Data
  const [accounts, setAccounts] = useState(data?.accounts || []);
  const [pages, setPages] = useState(data?.pages || []);
  const [campaigns, setCampaigns] = useState(data?.campaigns || []);

  // Posts/ads for specific engagement
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState(new Set());
  const [search, setSearch] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Init: fetch accounts/pages/campaigns if not provided
  useEffect(() => {
    if (!adAccountId) return;
    if (mode === 'ig' && !accounts.length) {
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`, { headers }).then(r => {
        const list = r.data?.data || r.data || [];
        setAccounts(list);
        if (list.length && !selectedId) setSelectedId(list[0].id);
      }).catch(() => {});
    }
    if ((mode === 'fb_page' || mode === 'lead') && !pages.length) {
      api.get('/meta/pages', { headers }).then(r => {
        const list = r.data?.data || r.data || [];
        setPages(list);
        if (list.length && !selectedId) setSelectedId(list[0].id);
      }).catch(() => {});
    }
    if (mode === 'ad' && !campaigns.length) {
      api.get(`/meta/adaccounts/${adAccountId}/campaigns-list`, { headers }).then(r => {
        const list = r.data?.data || r.data || [];
        setCampaigns(list);
      }).catch(() => {});
    }
  }, [adAccountId, mode]);

  // Set default selection when data loads
  useEffect(() => {
    if (mode === 'ig' && accounts.length && !selectedId) setSelectedId(accounts[0].id);
    if ((mode === 'fb_page' || mode === 'lead') && pages.length && !selectedId) setSelectedId(pages[0].id);
  }, [accounts, pages]);

  // Fetch posts/ads when engagement type requires specific selection
  const needsPostPicker = (mode === 'ig' && engagement === 'ig_user_interacted_ad_or_organic') ||
    (mode === 'fb_page' && engagement === 'page_engaged') ||
    mode === 'ad';

  useEffect(() => {
    if (!needsPostPicker || !selectedId) { setPosts([]); return; }
    setPostsLoading(true);
    setPosts([]);
    setSelectedPostIds(new Set());

    let url;
    if (mode === 'ig') url = `/meta/instagram/${selectedId}/posts?adAccountId=${adAccountId}`;
    else if (mode === 'fb_page') url = `/meta/pages/${selectedId}/posts`;
    else if (mode === 'ad') url = `/campaigns/${selectedId}/ads`;

    if (!url) { setPostsLoading(false); return; }

    api.get(url, { headers }).then(r => {
      const list = r.data?.data || r.data || [];
      setPosts(list);
      setPostsLoading(false);
    }).catch(() => { setPostsLoading(false); });
  }, [mode, selectedId, needsPostPicker]);

  const togglePost = (id) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredPosts = posts.filter(p =>
    !search || (p.message || p.name || p.caption || p.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (confirmed || isAnswered) return;
    setConfirmed(true);

    const engLabel = ENGAGEMENT_LABELS[engagement] || engagement;
    let sourceName = '';
    if (mode === 'ig') sourceName = `IG: ${accounts.find(a => a.id === selectedId)?.username || selectedId}`;
    else if (mode === 'fb_page') sourceName = `Page: ${pages.find(p => p.id === selectedId)?.name || selectedId}`;
    else if (mode === 'ad') sourceName = `Campaign: ${campaigns.find(c => c.id === selectedId)?.name || selectedId}`;
    else if (mode === 'lead') sourceName = `Page: ${pages.find(p => p.id === selectedId)?.name || selectedId}`;

    const postIds = selectedPostIds.size > 0 ? ` (specific IDs: ${[...selectedPostIds].join(', ')})` : '';

    onSend?.(`Create ${mode === 'lead' ? 'lead form' : mode === 'ad' ? 'ad engagement' : mode === 'ig' ? 'Instagram engagement' : 'Facebook Page engagement'} audience: source=${sourceName}, engagement=${engLabel}, retention=${retention} days${postIds}`);
  };

  if (confirmed || isAnswered) {
    return (
      <div className="my-2 border border-emerald-200 bg-emerald-50/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-600">✓</div>
          <p className="text-[13px] font-semibold text-emerald-700">
            {mode === 'ig' ? 'IG' : mode === 'fb_page' ? 'FB Page' : mode === 'ad' ? 'Ad' : 'Lead'} 受眾設定已確認
          </p>
        </div>
      </div>
    );
  }

  const modeTitle = { ig: '建立 IG 互動受眾', fb_page: '建立專頁互動受眾', ad: '建立廣告互動受眾', lead: '建立 Lead Form 受眾' };
  const sourceLabel = { ig: 'IG 帳號', fb_page: 'Facebook 專頁', ad: 'Campaign', lead: 'Facebook 專頁' };
  const sourceList = mode === 'ig' ? accounts : mode === 'ad' ? campaigns : pages;

  return (
    <div className="my-2 border border-blue-200 bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Users size={14} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-slate-800">{modeTitle[mode]}</span>
      </div>

      {/* Config */}
      <div className="px-4 py-3 space-y-3 border-b border-slate-100">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{sourceLabel[mode]}</label>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={SEL}>
              {sourceList.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name || (item.username ? `@${item.username}` : item.id)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">互動類型</label>
            <select value={engagement} onChange={e => setEngagement(e.target.value)} className={SEL}>
              {(ENGAGEMENT_TYPES[mode] || []).map(o => (
                <option key={o.id} value={o.id}>{o.label}{o.desc ? ` — ${o.desc}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">保留期</label>
            <input type="number" value={retention} onChange={e => setRetention(Math.min(MAX_RETENTION[mode], Math.max(1, Number(e.target.value))))}
              className={SEL} min={1} max={MAX_RETENTION[mode]} />
          </div>
        </div>
      </div>

      {/* Post/Ad picker (optional — only for specific engagement types) */}
      {needsPostPicker && (
        <div className="px-4 py-3">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            {mode === 'ad' ? 'Select Ads' : 'Select Posts'} <span className="normal-case font-normal">({selectedPostIds.size} selected, optional)</span>
          </label>

          {postsLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-slate-400">
              <RefreshCw size={14} className="animate-spin mr-2" /> Loading...
            </div>
          ) : posts.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center">No posts found — audience will include all engagement</p>
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search posts..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[240px] overflow-y-auto">
                {filteredPosts.slice(0, 20).map(p => (
                  <button key={p.id} onClick={() => togglePost(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selectedPostIds.has(p.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    {p.full_picture || p.thumbnail_url ? (
                      <img src={p.full_picture || p.thumbnail_url} alt="" className="w-12 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                        <Image size={12} className="text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-700 truncate">{p.message || p.name || p.caption || 'Untitled'}</p>
                      <p className="text-[10px] text-slate-400">{fmtDate(p.created_time)}</p>
                    </div>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedPostIds.has(p.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {selectedPostIds.has(p.id) && <Check size={9} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirm */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {selectedPostIds.size > 0 ? `${selectedPostIds.size} posts selected` : 'All engagement included'}
        </span>
        <button onClick={handleConfirm} disabled={!selectedId}
          className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          ✅ Confirm
        </button>
      </div>
    </div>
  );
}
