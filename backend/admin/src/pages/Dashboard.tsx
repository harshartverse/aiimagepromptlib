import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Prompt, DashboardStats } from '../types';
import { Layers, Image as ImageIcon, TrendingUp, Heart } from 'lucide-react';

export default function Dashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalPrompts: 0, totalCategories: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPrompts(), api.getStats()])
      .then(([p, s]) => {
        setPrompts(p);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse flex gap-4"><div className="h-32 w-full bg-gray-900 rounded-2xl"></div></div>;
  }

  const trendingCount = prompts.filter(p => p.isTrending).length;

  const statCards = [
    { label: 'Total Prompts', value: stats.totalPrompts, icon: <ImageIcon size={24} className="text-blue-500" /> },
    { label: 'Total Categories', value: stats.totalCategories, icon: <Layers size={24} className="text-purple-500" /> },
    { label: 'Total Likes', value: stats.totalLikes, icon: <Heart size={24} className="text-pink-500" /> },
    { label: 'Trending Prompts', value: trendingCount, icon: <TrendingUp size={24} className="text-green-500" /> },
  ];

  // Top Prompts sorted by real like count
  const topPrompts = [...prompts].sort((a, b) => b.likeCount - a.likeCount).slice(0, 5);

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-8">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-gray-950 rounded-xl">
              {s.icon}
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Liked Prompts Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Top Liked Prompts</h3>
          <p className="text-sm text-gray-400">Prompts sorted by real user likes</p>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="p-4 text-sm font-medium text-gray-400">Prompt</th>
              <th className="p-4 text-sm font-medium text-gray-400">Category</th>
              <th className="p-4 text-sm font-medium text-gray-400">AI Model</th>
              <th className="p-4 text-sm font-medium text-gray-400">Real Likes</th>
            </tr>
          </thead>
          <tbody>
            {topPrompts.map((p) => (
              <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">No Img</div>
                    )}
                    <div>
                      <p className="font-medium text-white">{p.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{p.promptText}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-300">{p.categoryName || 'Uncategorized'}</td>
                <td className="p-4 text-sm text-gray-300">{p.aiModel}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                    <Heart size={12} className="fill-pink-400" /> {p.likeCount}
                  </span>
                </td>
              </tr>
            ))}
            {topPrompts.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No prompts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
