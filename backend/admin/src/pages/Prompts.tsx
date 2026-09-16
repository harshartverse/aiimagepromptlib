import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Prompt, Category } from '../types';
import { Plus, Edit2, Trash2, Loader2, X, Search, Filter } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { Toast } from '../components/Toast';

export default function Prompts() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Prompt | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [promptText, setPromptText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isNew, setIsNew] = useState(true);
  
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const [p, c] = await Promise.all([api.getPrompts(), api.getCategories()]);
      setPrompts(p);
      setCategories(c);
    } catch (e) {
      setToast({ msg: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return prompts.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.promptText.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter ? p.category === catFilter : true;
      return matchSearch && matchCat;
    });
  }, [prompts, search, catFilter]);

  const handleOpen = (p?: Prompt) => {
    if (p) {
      setEditing(p);
      setTitle(p.title);
      setPromptText(p.promptText);
      setImageUrl(p.imageUrl);
      setCategory(p.category);
      setTags(p.tags || []);
      setIsTrending(p.isTrending);
      setIsNew(p.isNew);
    } else {
      setEditing(null);
      setTitle('');
      setPromptText('');
      setImageUrl('');
      setCategory('');
      setTags([]);
      setIsTrending(false);
      setIsNew(true);
    }
    setTagInput('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return setToast({ msg: 'Category is required', type: 'error' });
    setSubmitting(true);
    const data = { title, promptText, imageUrl, category, tags, isTrending, isNew };
    try {
      if (editing) {
        await api.updatePrompt(editing.id, data);
        setToast({ msg: 'Prompt updated successfully', type: 'success' });
      } else {
        await api.createPrompt(data);
        setToast({ msg: 'Prompt created successfully', type: 'success' });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to save', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      await api.deletePrompt(id);
      setToast({ msg: 'Prompt deleted successfully', type: 'success' });
      load();
    } catch (e) {
      setToast({ msg: 'Failed to delete prompt', type: 'error' });
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Prompts</h2>
        <button
          onClick={() => handleOpen()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add Prompt
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="relative w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-10 pr-8 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" /></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 text-sm font-medium text-gray-400">Prompt</th>
                <th className="p-4 text-sm font-medium text-gray-400">Category</th>
                <th className="p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="p-4 text-sm font-medium text-gray-400 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const cat = categories.find(c => c.id === p.category);
                return (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">No Img</div>
                        )}
                        <div>
                          <p className="font-medium text-white">{p.title}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">{p.promptText}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-300">
                      {cat ? cat.name : <span className="text-gray-500">Unknown</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {p.isNew && <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-500">New</span>}
                        {p.isTrending && <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-500">Trending</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleOpen(p)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">No prompts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-lg font-bold">{editing ? 'Edit Prompt' : 'Add Prompt'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
                    <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Prompt Text *</label>
                    <textarea required value={promptText} onChange={e => setPromptText(e.target.value)} rows={5} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
                    <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white outline-none focus:border-blue-500 appearance-none">
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <ImageUpload value={imageUrl} onChange={setImageUrl} />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
                    <input 
                      value={tagInput} 
                      onChange={e => setTagInput(e.target.value)} 
                      onKeyDown={addTag}
                      placeholder="Type tag and press Enter"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white outline-none focus:border-blue-500 mb-2" 
                    />
                    <div className="flex flex-wrap gap-2">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-xs text-gray-300">
                          {t} <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400"><X size={12}/></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} className="rounded border-gray-800 bg-gray-950 text-blue-500 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-300">Is New</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isTrending} onChange={e => setIsTrending(e.target.checked)} className="rounded border-gray-800 bg-gray-950 text-blue-500 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-300">Is Trending</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || !title || !promptText || !category} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
