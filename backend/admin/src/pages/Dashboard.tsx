import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Layers,
  Image as ImageIcon,
  Heart,
  Smartphone,
  Zap,
  Calendar,
  Clock,
  Flame,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FolderTree,
  Bell,
  ArrowRight,
  BarChart2
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await api.getStats();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e: any) {
      setError(e.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="h-8 w-48 sm:w-64 bg-gray-900 rounded-lg"></div>
          <div className="h-10 w-28 sm:w-32 bg-gray-900 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 sm:h-28 bg-gray-900 border border-gray-800/60 rounded-2xl p-4 sm:p-5"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 sm:h-24 bg-gray-900 border border-gray-800/60 rounded-2xl p-4 sm:p-5"></div>
          ))}
        </div>
        <div className="h-80 sm:h-96 bg-gray-900 border border-gray-800/60 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto my-8 sm:my-12 space-y-4">
        <AlertCircle size={40} className="text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Failed to Load Dashboard</h3>
        <p className="text-xs sm:text-sm text-gray-400">{error || 'An unexpected error occurred while fetching stats.'}</p>
        <button
          onClick={() => loadStats()}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl transition-colors inline-flex items-center gap-2 min-h-[44px]"
        >
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const primaryCards = [
    {
      label: 'Total Prompts',
      value: stats.totalPrompts.toLocaleString(),
      sub: `${stats.newPrompts} new added`,
      icon: <ImageIcon size={20} className="text-blue-400" />,
      color: 'border-blue-500/20 bg-blue-500/5'
    },
    {
      label: 'Categories',
      value: stats.totalCategories.toLocaleString(),
      sub: 'Active taxonomies',
      icon: <Layers size={20} className="text-purple-400" />,
      color: 'border-purple-500/20 bg-purple-500/5'
    },
    {
      label: 'Total Likes',
      value: stats.totalLikes.toLocaleString(),
      sub: 'Real global interactions',
      icon: <Heart size={20} className="text-pink-400 fill-pink-400/20" />,
      color: 'border-pink-500/20 bg-pink-500/5'
    },
    {
      label: 'Trending Prompts',
      value: stats.trendingPrompts.toLocaleString(),
      sub: 'High engagement',
      icon: <Flame size={20} className="text-emerald-400" />,
      color: 'border-emerald-500/20 bg-emerald-500/5'
    },
    {
      label: 'Registered Devices',
      value: stats.registeredDevices.toLocaleString(),
      sub: `+${stats.newDevices7Days} this week`,
      icon: <Smartphone size={20} className="text-cyan-400" />,
      color: 'border-cyan-500/20 bg-cyan-500/5'
    }
  ];

  const momentumCards = [
    {
      label: 'Likes Today',
      value: stats.likesToday.toLocaleString(),
      timeframe: 'Last 24 hours',
      icon: <Zap size={18} className="text-amber-400" />
    },
    {
      label: 'Likes (7 Days)',
      value: stats.likes7Days.toLocaleString(),
      timeframe: 'Weekly total',
      icon: <Calendar size={18} className="text-blue-400" />
    },
    {
      label: 'Likes (30 Days)',
      value: stats.likes30Days.toLocaleString(),
      timeframe: 'Monthly total',
      icon: <Clock size={18} className="text-purple-400" />
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="text-blue-500" size={24} />
            Dashboard Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time platform metrics, engagement analytics, and catalog distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {lastUpdated && (
            <span className="text-[11px] text-gray-500 font-mono hidden md:inline">
              Updated: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => loadStats(true)}
            disabled={refreshing}
            className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-200 text-xs sm:text-sm font-medium px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:bg-gray-800 disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-blue-400' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {primaryCards.map((c, i) => (
          <div
            key={i}
            className={`bg-gray-900 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-gray-700 shadow-lg ${c.color} ${
              i === 4 ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider truncate">{c.label}</span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-gray-950/80 border border-gray-800/80 shrink-0">
                {c.icon}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{c.value}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 block mt-0.5 truncate">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Like Activity & Momentum Grid */}
      <div>
        <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
          <Zap size={15} className="text-amber-400" />
          <h2 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider">Like Activity & Engagement Momentum</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {momentumCards.map((m, i) => (
            <div
              key={i}
              className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all hover:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-gray-950 border border-gray-800 shrink-0">
                  {m.icon}
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs text-gray-400 font-medium">{m.label}</p>
                  <p className="text-lg sm:text-xl font-extrabold text-white">{m.value}</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] text-gray-500 bg-gray-950 border border-gray-800 px-2 sm:px-2.5 py-1 rounded-full font-mono shrink-0">
                {m.timeframe}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Top Liked Prompts + Content Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

        {/* Left Column: Top Liked Prompts Leaderboard */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Heart size={18} className="text-pink-500 fill-pink-500" />
                Top Liked Prompts
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
                Leaderboard derived from real global <code className="text-pink-400 bg-pink-950/40 px-1 py-0.5 rounded text-[10px]">prompt_likes</code>.
              </p>
            </div>
            <Link
              to="/prompts"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors min-h-[44px] sm:min-h-0 flex items-center"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {/* Desktop/Tablet Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  <th className="p-3.5 text-center w-12">Rank</th>
                  <th className="p-3.5">Prompt</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Model</th>
                  <th className="p-3.5 text-right">Likes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 text-sm">
                {stats.topLikedPrompts.map((p, idx) => {
                  const rank = idx + 1;
                  const rankColor =
                    rank === 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold' :
                    rank === 2 ? 'bg-slate-400/10 text-slate-300 border-slate-400/30 font-bold' :
                    rank === 3 ? 'bg-amber-700/10 text-amber-500 border-amber-700/30 font-bold' :
                    'bg-gray-800/50 text-gray-400 border-gray-800';

                  return (
                    <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-xs ${rankColor}`}>
                          #{rank}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                              No Img
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-sm truncate max-w-[200px]">{p.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.promptText}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-gray-300 font-medium whitespace-nowrap">
                        <span className="bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-lg">
                          {p.categoryName}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-gray-400 whitespace-nowrap">
                        <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono">
                          {p.aiModel}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                          <Heart size={12} className="fill-pink-400" />
                          {p.likeCount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View (< 640px) */}
          <div className="block sm:hidden divide-y divide-gray-800/80">
            {stats.topLikedPrompts.map((p, idx) => {
              const rank = idx + 1;
              const rankColor =
                rank === 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                rank === 2 ? 'bg-slate-400/10 text-slate-300 border-slate-400/30' :
                rank === 3 ? 'bg-amber-700/10 text-amber-500 border-amber-700/30' :
                'bg-gray-800/50 text-gray-400 border-gray-800';

              return (
                <div key={p.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-xs font-bold shrink-0 ${rankColor}`}>
                      #{rank}
                    </span>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                        No Img
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-xs truncate">{p.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-gray-400 bg-gray-950 border border-gray-800 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                          {p.categoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                    <Heart size={11} className="fill-pink-400" />
                    {p.likeCount.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {stats.topLikedPrompts.length === 0 && (
              <p className="p-6 text-center text-gray-500 text-xs">No liked prompts found.</p>
            )}
          </div>
        </div>

        {/* Right Column: Content Summary & Category Distribution */}
        <div className="space-y-6">

          {/* Content Status Summary Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              Content Status Breakdown
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3 text-center">
                <span className="text-[11px] text-gray-400 font-medium block">New Prompts</span>
                <span className="text-lg sm:text-xl font-extrabold text-amber-400">{stats.newPrompts}</span>
              </div>
              <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3 text-center">
                <span className="text-[11px] text-gray-400 font-medium block">Trending Prompts</span>
                <span className="text-lg sm:text-xl font-extrabold text-emerald-400">{stats.trendingPrompts}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 text-xs text-gray-400 flex items-center justify-between">
              <span>Catalog Diversity Ratio:</span>
              <span className="font-mono text-white font-semibold">
                {stats.totalCategories > 0 ? (stats.totalPrompts / stats.totalCategories).toFixed(1) : 0} prompts / cat
              </span>
            </div>
          </div>

          {/* Category Distribution Bars Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-xs sm:text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <FolderTree size={16} className="text-purple-400" />
                Category Distribution
              </h3>
              <Link to="/categories" className="text-xs text-blue-400 hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {stats.categoryDistribution.map((cat) => {
                const percentage = stats.totalPrompts > 0
                  ? Math.round((cat.promptCount / stats.totalPrompts) * 100)
                  : 0;

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-300 truncate max-w-[140px] sm:max-w-[180px]">
                        {cat.categoryName}
                      </span>
                      <span className="text-gray-400 font-mono text-[11px]">
                        {cat.promptCount} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-800/60">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {stats.categoryDistribution.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No categories created yet.</p>
              )}
            </div>
          </div>

          {/* FCM Push System Overview Card */}
          <div className="bg-gradient-to-br from-blue-950/40 to-gray-900 border border-blue-800/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bell size={15} className="text-blue-400" />
                Push Delivery System
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Firebase Cloud Messaging is connected to <strong className="text-white">{stats.registeredDevices}</strong> registered mobile installations.
            </p>
            <Link
              to="/notifications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2.5 rounded-xl transition-colors w-full justify-center min-h-[44px]"
            >
              <span>Broadcast Push Notification</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
