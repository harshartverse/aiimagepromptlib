import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Prompt, Category } from '../types';
import { Layers, Image as ImageIcon, TrendingUp, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPrompts(), api.getCategories()])
      .then(([p, c]) => {
        setPrompts(p);
        setCategories(c);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse flex gap-4"><div className="h-32 w-full bg-gray-900 rounded-2xl"></div></div>;
  }

  const trendingCount = prompts.filter(p => p.isTrending).length;
  const newCount = prompts.filter(p => p.isNew).length;

  const stats = [
    { label: 'Total Prompts', value: prompts.length, icon: <ImageIcon size={24} className="text-blue-500" /> },
    { label: 'Total Categories', value: categories.length, icon: <Layers size={24} className="text-purple-500" /> },
    { label: 'Trending Prompts', value: trendingCount, icon: <TrendingUp size={24} className="text-green-500" /> },
    { label: 'New Prompts', value: newCount, icon: <Sparkles size={24} className="text-amber-500" /> },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight mb-8">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
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
    </div>
  );
}
