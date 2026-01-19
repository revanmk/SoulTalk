import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import ChatInterface from './components/ChatInterface';
import AdminPortal from './components/AdminPortal';

const AppContent: React.FC = () => {
  const { user, login, logout, isLoading } = useAuth();

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
    <AuthProvider>
      <div className="antialiased text-slate-900 bg-white">
        <AppContent />
      </div>
    </AuthProvider>
  );
};

export default App;