import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export function ImageUpload({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Unsupported file type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    setError(null);
    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await api.uploadImage(base64);
          onChange(res.secure_url);
        } catch (e: any) {
          setError(e.message || 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setUploading(false);
      };
    } catch (e) {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Image</label>
      
      {value ? (
        <div className="relative inline-block border border-gray-800 rounded-lg overflow-hidden bg-gray-900 group">
          <img src={value} alt="Preview" className="h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 p-1 bg-gray-900/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 cursor-pointer bg-gray-900/50 transition-colors h-32"
        >
          {uploading ? (
            <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
          ) : (
            <UploadCloud size={24} className="mb-2" />
          )}
          <span className="text-sm">{uploading ? 'Uploading...' : 'Click to upload'}</span>
        </div>
      )}
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />
    </div>
  );
}
