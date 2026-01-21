import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContentProvider } from './context/ContentContext';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import AdminPortal from './components/AdminPortal';

// #region agent log
const __dbg = (hypothesisId: string, location: string, message: string, data: Record<string, any> = {}) => {
  fetch('http://127.0.0.1:7242/ingest/b1a760f8-324e-4fe9-afbb-7303f8572f5e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
};
// #endregion agent log

const AppContent: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  // #region agent log
  __dbg('H6', 'App.tsx:AppContent', 'render', { isLoading, hasUser: !!user, isAdmin: !!user?.isAdmin });
  // #endregion agent log

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 bg-indigo-600 rounded-full animate-bounce"></div>
           <p className="text-slate-400 text-sm font-medium">Loading SoulTalk...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user.isAdmin) {
    return <AdminPortal />;
  }

  return <ChatInterface user={user} onLogout={logout} />;
};

const App: React.FC = () => {
  return (
    <ContentProvider>
      <AuthProvider>
        <div className="antialiased text-slate-900 bg-white">
          <AppContent />
        </div>
      </AuthProvider>
    </ContentProvider>
  );
};

export default App;