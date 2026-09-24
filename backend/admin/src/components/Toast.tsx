import { useEffect } from 'react';

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-emerald-600' : 'bg-red-600';
  
  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md px-4 py-3 rounded-xl shadow-2xl text-white font-medium text-xs sm:text-sm ${bg} transition-all duration-300 z-50 flex items-center justify-between gap-3 border border-white/10`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        aria-label="Close message"
        className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 text-xs shrink-0"
      >
        ✕
      </button>
    </div>
  );
}
