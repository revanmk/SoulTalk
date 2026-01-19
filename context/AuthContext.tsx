
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User, JournalEntry, Message } from '../types';
import { dbService } from '../services/databaseService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Session persistence is tricky without JWT/Cookies in this simple refactor.
    // We will rely on localStorage for the ID, and re-fetch user details.
    const storedUserId = localStorage.getItem('soultalk_session_uid');
    
    // In a real JWT app, we would verify token. Here we just reload data if ID exists
    // Note: With the new backend, we really should fetch "me" endpoint.
    // For this migration, we will fetch all users and find the ID to restore session.
    // (Optimization: Add a /me endpoint in backend later)
    if (storedUserId) {
       dbService.getAllUsers().then(users => {
          const found = users.find(u => u.id === storedUserId);
          if (found) setUser(found);
          setIsLoading(false);
       }).catch(() => {
         setIsLoading(false);
       });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Backend Login
      const userRecord = await dbService.loginUser({email, password});
      if (userRecord) {
          setUser(userRecord);
          localStorage.setItem('soultalk_session_uid', userRecord.id);
          setIsLoading(false);
          return true;
      }
    } catch (e) {
      console.error(e);
    }
    
    setIsLoading(false);
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
  ): Promise<boolean> => {
    setIsLoading(true);
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

      setUser(newUser);
      localStorage.setItem('soultalk_session_uid', newUser.id);
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error(e);
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

  const getUserData = (userId: string) => {
    // This fetches data dynamically for the admin panel
    const [data, setData] = useState<{ journal: JournalEntry[], chat: Message[] }>({ journal: [], chat: [] });
    
    useEffect(() => {
        const fetchData = async () => {
            const chat = await dbService.getChatHistory(userId);
            const journal = await dbService.getJournalEntries(userId);
            setData({ chat, journal });
        };
        fetchData();
    }, [userId]);

    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, createAdmin, logout, isLoading, getAllUsers, getUserData, updateProfile }}>
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
