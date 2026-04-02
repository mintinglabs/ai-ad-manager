import { useState, useEffect } from 'react';
import { ArrowLeft, Instagram, Eye, Users, Heart, TrendingUp, RefreshCw, Image } from 'lucide-react';
import api from '../services/api.js';

const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200 animate-pulse rounded ${className}`} />
);

const MetricCard = ({ icon: Icon, label, value, color, loading }) => (
  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 flex flex-col gap-1 flex-1 min-w-0">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
    </div>
    {loading ? (
      <Skeleton className="h-7 w-24 mt-1" />
    ) : (
      <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
    )}
    <p className="text-xs text-slate-400">Last 7 days</p>
  </div>
);

const SourceLabel = ({ endpoint, permission }) => (
  <div className="flex items-center gap-1.5 mt-1.5 mb-4">
    <code className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-mono">{endpoint}</code>
    <span className="text-slate-300">·</span>
    <code className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">{permission}</code>
  </div>
);

export const InstagramInsights = ({ adAccountId, onBack, token, onLogin, selectedAccount }) => {
  const [igAccounts, setIgAccounts] = useState([]);
  const [selectedIg, setSelectedIg] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch connected IG accounts
  useEffect(() => {
    if (!adAccountId) return;
    setAccountsLoading(true);
    api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`)
      .then(r => {
        const list = r.data?.data || r.data || [];
        setIgAccounts(list);
        if (list.length) setSelectedIg(list[0]);
      })
      .catch(() => setIgAccounts([]))
      .finally(() => setAccountsLoading(false));
  }, [adAccountId]);

  // Fetch insights when IG account selected
  useEffect(() => {
    if (!selectedIg?.id) return;
    setLoading(true);
    setError(null);
    api.get(`/meta/instagram/${selectedIg.id}/insights`)
      .then(r => setInsights(r.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [selectedIg?.id]);

  const handleRefresh = () => {
    if (!selectedIg?.id) return;
    setLoading(true);
    setError(null);
    api.get(`/meta/instagram/${selectedIg.id}/insights`)
      .then(r => setInsights(r.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-3">Log in with Meta to view Instagram Insights</p>
          <button onClick={onLogin} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">Log In</button>
        </div>
      </div>
    );
  }

  if (!adAccountId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-500">Select an ad account first to view Instagram Insights.</p>
      </div>
    );
  }

  const profile = insights?.profile;
  const pi = insights?.profileInsights || {};
  const media = insights?.media || [];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <Instagram size={20} className="text-pink-500" />
        <h1 className="text-base font-semibold text-slate-800">Instagram Insights</h1>
        <span className="text-xs text-slate-400 font-mono">instagram_manage_insights</span>
        {insights?.fetchedAt && (
          <span className="ml-auto text-[10px] text-slate-400 font-mono">
            Fetched: {new Date(insights.fetchedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">
        {/* Account Selector */}
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">1. Select Instagram Account</h3>
        {accountsLoading ? (
          <Skeleton className="h-14 w-full mb-4" />
        ) : igAccounts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-6 text-center mb-4">
            <p className="text-sm text-slate-400">No Instagram accounts connected to this ad account.</p>
          </div>
        ) : (
          <div className="flex gap-2 mb-2 flex-wrap">
            {igAccounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedIg(acc)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${selectedIg?.id === acc.id
                    ? 'bg-gradient-to-r from-pink-50 to-purple-50 border-pink-300 text-pink-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-pink-200 hover:bg-pink-50/30'}`}
              >
                {acc.profile_picture_url && (
                  <img src={acc.profile_picture_url} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                )}
                <span>@{acc.username || acc.id}</span>
              </button>
            ))}
          </div>
        )}
        <SourceLabel endpoint={`GET /${adAccountId}/connected_instagram_accounts`} permission="instagram_basic" />

        {/* Selected account banner */}
        {selectedIg && (
          <div className="flex items-center gap-3 mb-5 bg-white border border-slate-200 rounded-2xl px-4 py-3">
            {(profile?.profile_picture_url || selectedIg.profile_picture_url) && (
              <img
                src={profile?.profile_picture_url || selectedIg.profile_picture_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-pink-200"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">@{profile?.username || selectedIg.username}</p>
              <p className="text-xs text-slate-400 font-mono">IG Account ID: {selectedIg.id}</p>
            </div>
            {profile && (
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span><strong className="text-slate-700">{(profile.followers_count || 0).toLocaleString()}</strong> followers</span>
                <span><strong className="text-slate-700">{profile.media_count || 0}</strong> posts</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="ml-2 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
        )}

        {/* Profile-Level Insights */}
        {selectedIg && (
          <>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">2. Profile-Level Insights</h3>
            <div className="flex gap-3 mb-2">
              <MetricCard icon={Eye}        label="Reach"              value={loading ? '' : (pi.reach || 0).toLocaleString()}              color="bg-blue-500"    loading={loading} />
              <MetricCard icon={TrendingUp} label="Impressions"        value={loading ? '' : (pi.impressions || 0).toLocaleString()}        color="bg-violet-500"  loading={loading} />
              <MetricCard icon={Users}      label="Accounts Engaged"   value={loading ? '' : (pi.accounts_engaged || 0).toLocaleString()}   color="bg-pink-500"    loading={loading} />
              <MetricCard icon={Heart}      label="Total Interactions"  value={loading ? '' : (pi.total_interactions || 0).toLocaleString()} color="bg-orange-500"  loading={loading} />
            </div>
            <SourceLabel endpoint={`GET /${selectedIg.id}/insights`} permission="instagram_manage_insights" />
          </>
        )}

        {/* Media-Level Insights */}
        {selectedIg && (
          <>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">3. Media-Level Insights</h3>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : media.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-6 text-center">
                <p className="text-sm text-slate-400">No media found.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Post</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Type</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Reach</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Impressions</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Likes</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Comments</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {media.map((item, i) => (
                      <tr key={item.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {(item.thumbnail_url || item.media_url) && (
                              <img src={item.thumbnail_url || item.media_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                            )}
                            <div className="min-w-0 max-w-[200px]">
                              <p className="text-slate-700 font-medium truncate">{item.caption?.slice(0, 60) || '(no caption)'}</p>
                              <p className="text-slate-400 font-mono text-[10px]">{item.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            <Image size={10} /> {item.media_type || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-slate-700">{(item.insights?.reach || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{(item.insights?.impressions || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{(item.like_count || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-slate-600">{item.comments_count || 0}</td>
                        <td className="px-3 py-3 text-right text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <SourceLabel endpoint={`GET /{media_id}/insights`} permission="instagram_manage_insights" />
          </>
        )}
      </div>
    </div>
  );
};
