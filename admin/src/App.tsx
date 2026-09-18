import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { api } from './services/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Prompts from './pages/Prompts';
import Categories from './pages/Categories';

function AuthGuard({ children, authenticated }: { children: React.ReactNode, authenticated: boolean }) {
  const location = useLocation();
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check session on mount
    api.getSession()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));

    const handleUnauthorized = () => {
      setAuthenticated(false);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  if (authenticated === null) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={authenticated ? <Navigate to="/" replace /> : <Login onLogin={() => setAuthenticated(true)} />} 
        />
        
        <Route 
          path="/" 
          element={
            <AuthGuard authenticated={authenticated}>
              <Layout onLogout={() => setAuthenticated(false)} />
            </AuthGuard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="prompts" element={<Prompts />} />
          <Route path="categories" element={<Categories />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
