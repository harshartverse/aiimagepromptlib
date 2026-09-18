import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Category } from '../types';
import { Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { Toast } from '../components/Toast';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  
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

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-gray-400 mt-1">Manage prompt categories and taxonomy</p>
        </div>
        <button
          onClick={() => handleOpen()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-500" /></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="p-4 text-sm font-medium text-gray-400">Category</th>
                <th className="p-4 text-sm font-medium text-gray-400">Description</th>
                <th className="p-4 text-sm font-medium text-gray-400 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-800" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">No Img</div>
                      )}
                      <span className="font-medium text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 text-sm max-w-xs truncate">{c.description || 'No description'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpen(c)} title="Edit Category" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} title="Delete Category" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">No categories found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-lg font-bold">{editing ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Category Name" className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief category description..." className="w-full bg-gray-950 border border-gray-800 rounded-lg py-2 px-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <ImageUpload value={imageUrl} onChange={setImageUrl} />
              
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting || !name.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
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
