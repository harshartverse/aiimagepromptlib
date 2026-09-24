import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Prompt, Category } from '../types';
import { Plus, Edit2, Trash2, Loader2, X, Search, Filter, Heart, Sparkles } from 'lucide-react';
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
  const [categoryId, setCategoryId] = useState('');
  const [outputType, setOutputType] = useState('HQ 1:1');
  const [aiModel, setAiModel] = useState('Gemini 2.0 Flash');
  const [gender, setGender] = useState('Male');
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
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return prompts.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.promptText.toLowerCase().includes(search.toLowerCase()) ||
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchCat = catFilter ? p.category_id === catFilter : true;
      return matchSearch && matchCat;
    });
  }, [prompts, search, catFilter]);

  const handleOpen = (p?: Prompt) => {
    if (p) {
      setEditing(p);
      setTitle(p.title);
      setPromptText(p.promptText);
      setImageUrl(p.imageUrl || '');
      setCategoryId(p.category_id || '');
      setOutputType(p.outputType || 'HQ 1:1');
      setAiModel(p.aiModel || 'Gemini 2.0 Flash');
      setGender(p.gender || 'Male');
      setTags(p.tags || []);
      setIsTrending(p.isTrending);
      setIsNew(p.isNew);
    } else {
      setEditing(null);
      setTitle('');
      setPromptText('');
      setImageUrl('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setOutputType('HQ 1:1');
      setAiModel('Gemini 2.0 Flash');
      setGender('Male');
      setTags([]);
      setIsTrending(false);
      setIsNew(true);
    }
    setTagInput('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setToast({ msg: 'Title is required', type: 'error' });
    if (!promptText.trim()) return setToast({ msg: 'Prompt text is required', type: 'error' });
    if (!categoryId) return setToast({ msg: 'Category is required', type: 'error' });

    setSubmitting(true);
    const data = {
      title: title.trim(),
      promptText: promptText.trim(),
      imageUrl,
      category_id: categoryId,
      tags,
      isTrending,
      isNew,
      outputType,
      aiModel,
      gender
    };

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
      setToast({ msg: e.message || 'Failed to save prompt', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    try {
      await api.deletePrompt(id);
      setToast({ msg: 'Prompt deleted successfully', type: 'success' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to delete prompt', type: 'error' });
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="text-blue-500" size={24} />
            Prompts Management
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage AI prompt catalog, metadata, and tags</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20 min-h-[44px] self-start sm:self-auto w-full sm:w-auto"
        >
          <Plus size={18} /> Add Prompt
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title, prompt text, or tags..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[44px]"
          />
        </div>
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2.5 pl-10 pr-8 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer min-h-[44px]"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-900 border border-gray-800 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">

          {/* Desktop/Tablet Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Prompt</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Output</th>
                  <th className="p-4">Model & Gender</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Likes</th>
                  <th className="p-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 text-sm">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                            No Img
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-xs">{p.title}</p>
                          <p className="text-xs text-gray-400 truncate max-w-xs">{p.promptText}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-300 font-medium whitespace-nowrap">
                      <span className="bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-lg">
                        {p.categoryName || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                        {p.outputType || 'HQ 1:1'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-300 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono w-fit">
                          {p.aiModel}
                        </span>
                        <span className="text-gray-400 text-[11px]">{p.gender}</span>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex gap-1.5 flex-wrap">
                        {p.isNew && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">NEW</span>}
                        {p.isTrending && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">TRENDING</span>}
                        {!p.isNew && !p.isTrending && <span className="text-xs text-gray-500">Standard</span>}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span title="Real global likes" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        <Heart size={12} className="fill-pink-400" /> {p.likeCount}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpen(p)}
                          title="Edit Prompt"
                          aria-label="Edit Prompt"
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="Delete Prompt"
                          aria-label="Delete Prompt"
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                      No prompts found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View (< 768px) */}
          <div className="block md:hidden divide-y divide-gray-800/80">
            {filtered.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                      No Img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white text-sm truncate">{p.title}</p>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 shrink-0">
                        <Heart size={11} className="fill-pink-400" /> {p.likeCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{p.promptText}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-800/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-gray-950 border border-gray-800 px-2 py-0.5 rounded text-gray-300 font-medium">
                      {p.categoryName || 'Uncategorized'}
                    </span>
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-mono">
                      {p.gender}
                    </span>
                    {p.isNew && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">NEW</span>}
                    {p.isTrending && <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">TRENDING</span>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpen(p)}
                      title="Edit Prompt"
                      aria-label="Edit Prompt"
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      title="Delete Prompt"
                      aria-label="Delete Prompt"
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="p-8 text-center text-gray-500 text-xs">No prompts found matching your filter.</p>
            )}
          </div>

        </div>
      )}

      {/* Responsive Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-white">{editing ? 'Edit Prompt' : 'Add New Prompt'}</h3>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Cyberpunk Samurai City"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Prompt Text <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      required
                      value={promptText}
                      onChange={e => setPromptText(e.target.value)}
                      rows={4}
                      placeholder="Full AI image generation prompt text..."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-blue-500 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      required
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-blue-500 transition-all cursor-pointer min-h-[44px]"
                    >
                      <option value="">Select category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Output Ratio
                      </label>
                      <select
                        value={outputType}
                        onChange={e => setOutputType(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white outline-none focus:border-blue-500 transition-all cursor-pointer min-h-[44px]"
                      >
                        <option value="HQ 1:1">HQ 1:1</option>
                        <option value="RAW 4:5">RAW 4:5</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Gender / Model
                      </label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-white outline-none focus:border-blue-500 transition-all cursor-pointer min-h-[44px]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Boy">Boy</option>
                        <option value="Girl">Girl</option>
                        <option value="Baby Boy">Baby Boy</option>
                        <option value="Baby Girl">Baby Girl</option>
                        <option value="Couple">Couple</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <ImageUpload value={imageUrl} onChange={setImageUrl} />
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Tags
                    </label>
                    <input 
                      value={tagInput} 
                      onChange={e => setTagInput(e.target.value)} 
                      onKeyDown={addTag}
                      placeholder="Type tag and press Enter"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white outline-none focus:border-blue-500 transition-all mb-2"
                    />
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 text-xs text-gray-300 border border-gray-700">
                          #{t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            aria-label={`Remove tag ${t}`}
                            className="hover:text-red-400 p-0.5"
                          >
                            <X size={12}/>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        checked={isNew}
                        onChange={e => setIsNew(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-800 bg-gray-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Is New</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        checked={isTrending}
                        onChange={e => setIsTrending(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-800 bg-gray-950 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>Is Trending</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-800 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !promptText.trim() || !categoryId}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Prompt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
