import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Image as ImageIcon, FolderTree, LogOut } from 'lucide-react';
import { api } from '../services/api';

export default function Layout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch(e) {
      // ignore
    } finally {
      onLogout();
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/prompts', label: 'Prompts', icon: <ImageIcon size={20} /> },
    { path: '/categories', label: 'Categories', icon: <FolderTree size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-200">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-white tracking-tight">AI Prompt Library</h1>
          <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      active ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-auto bg-gray-950">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
