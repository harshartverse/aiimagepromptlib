import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, FolderTree, Bell, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch(e) {
      // ignore
    } finally {
      onLogout();
    }
  };

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/prompts', label: 'Prompts', icon: <ImageIcon size={20} /> },
    { path: '/categories', label: 'Categories', icon: <FolderTree size={20} /> },
    { path: '/notifications', label: 'Push Notifications', icon: <Bell size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200 overflow-hidden">
      {/* Mobile Top Header Bar (< 1024px) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">Promptorios</h1>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">Admin Console</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-gray-800/80 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Backdrop Overlay for Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Navigation Drawer */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-snug">Promptorios</h1>
              <p className="text-xs text-gray-400 font-mono">Admin Console</p>
            </div>
          </div>
          {/* Mobile Close Button inside Drawer */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1.5 px-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all min-h-[44px] ${
                      active
                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 font-semibold'
                        : 'hover:bg-gray-800/80 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full text-left rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium min-h-[44px]"
          >
            <LogOut size={18} />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-950 pt-16 lg:pt-0 w-full min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
