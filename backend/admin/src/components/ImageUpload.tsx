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
      setError('Unsupported file type. Please upload an image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB limit).');
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
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Image Upload</label>
      
      {value ? (
        <div className="relative border border-gray-800 rounded-xl overflow-hidden bg-gray-950 group w-full max-w-xs">
          <img src={value} alt="Uploaded Preview" className="w-full h-36 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove uploaded image"
            className="absolute top-2 right-2 p-1.5 bg-gray-950/80 hover:bg-red-600 text-white rounded-xl transition-colors shadow-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-800 hover:border-gray-600 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-gray-400 cursor-pointer bg-gray-950/50 hover:bg-gray-900/60 transition-all h-32 text-center"
        >
          {uploading ? (
            <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
          ) : (
            <UploadCloud size={24} className="mb-2 text-blue-400" />
          )}
          <span className="text-xs sm:text-sm font-medium">{uploading ? 'Uploading to Cloudinary...' : 'Click to select or upload image'}</span>
          <span className="text-[10px] text-gray-500 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
        </div>
      )}
      
      {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      
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
