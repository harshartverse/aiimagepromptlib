import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Category } from '../types';
import { Plus, Edit2, Trash2, Loader2, X, GripVertical, Save, ChevronUp, ChevronDown, FolderTree } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { Toast } from '../components/Toast';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  
  // Drag & Drop / Reorder State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const load = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
      setHasOrderChanged(false);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to load categories', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (cat?: Category) => {
    if (cat) {
      setEditing(cat);
      setName(cat.name);
      setDescription(cat.description || '');
      setImageUrl(cat.imageUrl || '');
    } else {
      setEditing(null);
      setName('');
      setDescription('');
      setImageUrl('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return setToast({ msg: 'Category name is required', type: 'error' });
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.updateCategory(editing.id, { name: name.trim(), description: description.trim(), imageUrl });
        setToast({ msg: 'Category updated successfully', type: 'success' });
      } else {
        await api.createCategory({ name: name.trim(), description: description.trim(), imageUrl });
        setToast({ msg: 'Category created successfully', type: 'success' });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to save category', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.deleteCategory(id);
      setToast({ msg: 'Category deleted successfully', type: 'success' });
      load();
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to delete category', type: 'error' });
    }
  };

  // Drag-and-Drop Reordering Handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...categories];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setCategories(updated);
    setHasOrderChanged(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Touch-friendly Button Reorder Handler (Up/Down)
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);

    setCategories(updated);
    setHasOrderChanged(true);
  };

  const handleSaveOrder = async () => {
    setSavingOrder(true);
    try {
      const ids = categories.map(c => c.id);
      const updated = await api.reorderCategories(ids);
      setCategories(updated);
      setHasOrderChanged(false);
      setToast({ msg: 'Category display order saved successfully!', type: 'success' });
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to save category order', type: 'error' });
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FolderTree className="text-purple-400" size={24} />
            Categories Taxonomy
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage prompt categories and display ordering</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto w-full sm:w-auto">
          {hasOrderChanged && (
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 animate-pulse min-h-[44px]"
            >
              {savingOrder ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Order
            </button>
          )}
          <button
            onClick={() => handleOpen()}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-xl"></div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">

          {/* Desktop/Tablet Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="p-4 text-center w-16">Reorder</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 text-sm">
                {categories.map((c, index) => (
                  <tr
                    key={c.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`hover:bg-gray-800/40 transition-colors cursor-grab active:cursor-grabbing ${
                      draggedIndex === index ? 'bg-blue-900/30 border-blue-500/50' : ''
                    }`}
                  >
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GripVertical size={18} className="text-gray-500 hover:text-gray-300" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                            No Img
                          </div>
                        )}
                        <span className="font-semibold text-white text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-xs max-w-xs truncate">{c.description || 'No description provided.'}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => moveCategory(index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                          aria-label="Move Category Up"
                          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-800"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => moveCategory(index, 'down')}
                          disabled={index === categories.length - 1}
                          title="Move Down"
                          aria-label="Move Category Down"
                          className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-gray-800"
                        >
                          <ChevronDown size={16} />
                        </button>
                        <button
                          onClick={() => handleOpen(c)}
                          title="Edit Category"
                          aria-label="Edit Category"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          title="Delete Category"
                          aria-label="Delete Category"
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 text-sm">No categories found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List View (< 768px) */}
          <div className="block md:hidden divide-y divide-gray-800/80">
            {categories.map((c, index) => (
              <div key={c.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover bg-gray-950 border border-gray-800 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] shrink-0">
                        No Img
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{c.description || 'No description.'}</p>
                    </div>
                  </div>

                  {/* Reorder Up/Down Buttons for Touch */}
                  <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => moveCategory(index, 'up')}
                      disabled={index === 0}
                      aria-label="Move Up"
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <span className="text-[10px] font-mono text-gray-500 px-1">#{index + 1}</span>
                    <button
                      onClick={() => moveCategory(index, 'down')}
                      disabled={index === categories.length - 1}
                      aria-label="Move Down"
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800/60">
                  <button
                    onClick={() => handleOpen(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition-colors min-h-[40px]"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-medium text-red-400 border border-red-500/20 transition-colors min-h-[40px]"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="p-8 text-center text-gray-500 text-xs">No categories found.</p>
            )}
          </div>

        </div>
      )}

      {/* Responsive Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-white">{editing ? 'Edit Category' : 'Add New Category'}</h3>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Category Name <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Cyberpunk & Sci-Fi"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief summary describing prompts in this category..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <ImageUpload value={imageUrl} onChange={setImageUrl} />
              
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
                  disabled={submitting || !name.trim()}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
