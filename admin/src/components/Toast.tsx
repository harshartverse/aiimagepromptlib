import { useEffect } from 'react';

export function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg text-white ${bg} transition-all duration-300 z-50`}>
      {message}
    </div>
  );
}
