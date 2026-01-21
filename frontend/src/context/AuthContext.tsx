
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContextType, User, JournalEntry, Message } from '../../../types';
import { dbService } from '../services/databaseService';

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

// Extended return type for signup to include token for demo
interface SignupResult {
    success: boolean;
    token?: string;
}

interface ExtendedAuthContextType extends Omit<AuthContextType, 'signup'> {
    signup: (email: string, password: string, name: string, country: string, emergencyContactName: string, emergencyContactNumber: string, profilePic?: string) => Promise<SignupResult>;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Session persistence
    const storedUserId = localStorage.getItem('soultalk_session_uid');

    // #region agent log
    __dbg('H5', 'AuthContext.tsx:useEffect', 'rehydrate start', { hasStoredUserId: !!storedUserId });
    // #endregion agent log
    
    if (storedUserId) {
       dbService.getAllUsers().then(users => {
          const found = users.find(u => u.id === storedUserId);
          // #region agent log
          __dbg('H5', 'AuthContext.tsx:useEffect', 'rehydrate users loaded', { userCount: users?.length ?? null, found: !!found });
          // #endregion agent log
          if (found) setUser(found);
          setIsLoading(false);
       }).catch(() => {
         // #region agent log
         __dbg('H5', 'AuthContext.tsx:useEffect', 'rehydrate failed', {});
         // #endregion agent log
         setIsLoading(false);
       });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    // #region agent log
    __dbg('H2', 'AuthContext.tsx:login', 'login start', { emailLen: (email || '').length });
    // #endregion agent log
    try {
      const userRecord = await dbService.loginUser({email, password});
      if (userRecord) {
          setUser(userRecord);
          localStorage.setItem('soultalk_session_uid', userRecord.id);
          setIsLoading(false);
          // #region agent log
          __dbg('H2', 'AuthContext.tsx:login', 'login success setUser', { hasId: !!userRecord?.id, isAdmin: !!userRecord?.isAdmin });
          // #endregion agent log
          return true;
      }
    } catch (e) {
      setIsLoading(false);
      // #region agent log
      __dbg('H2', 'AuthContext.tsx:login', 'login threw', { errMsg: String((e as any)?.message || e) });
      // #endregion agent log
      throw e; // Bubble up error
    }
    
    setIsLoading(false);
    // #region agent log
    __dbg('H2', 'AuthContext.tsx:login', 'login returned false (no userRecord)', {});
    // #endregion agent log
    return false;
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string,
    country: string,
    emergencyContactName: string,
    emergencyContactNumber: string,
    profilePic?: string
  ): Promise<SignupResult> => {
    setIsLoading(true);
    // #region agent log
    __dbg('H3', 'AuthContext.tsx:signup', 'signup start', { emailLen: (email || '').length });
    // #endregion agent log
    try {
      const newUser = await dbService.createUser({
        email,
        password,
        name,
        country,
        emergencyContactName,
        emergencyContactNumber,
        profilePic,
        isAdmin: false
      });
      
      // Auto-login user immediately after signup
      setUser(newUser);
      localStorage.setItem('soultalk_session_uid', newUser.id);
      
      setIsLoading(false);
      // #region agent log
      __dbg('H3', 'AuthContext.tsx:signup', 'signup success setUser', { hasId: !!newUser?.id, isAdmin: !!newUser?.isAdmin });
      // #endregion agent log
      return { success: true, token: newUser.verificationToken };
    } catch (e) {
      setIsLoading(false);
      // #region agent log
      __dbg('H3', 'AuthContext.tsx:signup', 'signup threw', { errMsg: String((e as any)?.message || e) });
      // #endregion agent log
      throw e; // Bubble up error
    }
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
      setIsLoading(true);
      try {
          const success = await dbService.verifyUser(token);
          setIsLoading(false);
          return success;
      } catch (e) {
          setIsLoading(false);
          return false;
      }
  };

  const createAdmin = async (email: string, password: string, name: string): Promise<boolean> => {
     if (!user?.isAdmin) return false;
     try {
       await dbService.createUser({
         email,
         password,
         name,
         isAdmin: true
       });
       return true;
     } catch (e) {
       return false;
     }
  };

  const updateProfile = async (updatedData: Partial<User>) => {
    if (!user) return;
    setIsLoading(true);
    await dbService.updateUser(user.id, updatedData);
    setUser({ ...user, ...updatedData });
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('soultalk_session_uid');
  };

  // Admin Helpers
  const getAllUsers = (): User[] => {
    const [users, setUsers] = useState<User[]>([]);
    useEffect(() => {
       dbService.getAllUsers().then(setUsers);
    }, [isLoading]);
    return users;
  };

  const fetchUserData = async (userId: string) => {
    const chat = await dbService.getChatHistory(userId);
    const journal = await dbService.getJournalEntries(userId);
    return { chat, journal };
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, createAdmin, logout, isLoading, getAllUsers, fetchUserData, updateProfile, verifyEmail }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
