
import { User, Message, JournalEntry, Exercise, Soundscape } from '../types';
import { DEFAULT_EXERCISES, DEFAULT_SOUNDSCAPES } from '../constants';

/**
 * MOCK DATABASE SERVICE (Client-Side Only)
 * Uses LocalStorage to simulate backend persistence for testing.
 */

const STORAGE_KEYS = {
    USERS: 'soultalk_users',
    CHATS: 'soultalk_chats',
    JOURNAL: 'soultalk_journal',
    EXERCISES: 'soultalk_custom_exercises',
    SOUNDSCAPES: 'soultalk_custom_soundscapes'
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getFromStorage = <T>(key: string, defaultVal: T): T => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
};

const saveToStorage = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const dbService = {
  // USER AUTH
  getUserByEmail: async (email: string): Promise<User | null> => {
     await delay(300);
     const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
     return users.find(u => u.email === email) || null;
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<User> => {
    await delay(500);
    const users = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
    
    if (users.find(u => u.email === userData.email)) {
        throw new Error("Email already registered");
    }

    const verificationToken = crypto.randomUUID();

    const newUser: User = {
        id: crypto.randomUUID(),
        email: userData.email!,
        name: userData.name!,
        country: userData.country,
        emergencyContactName: userData.emergencyContactName,
        emergencyContactNumber: userData.emergencyContactNumber,
        profilePic: userData.profilePic,
        isAdmin: userData.isAdmin || false,
        isVerified: true, // Auto-verified by default now
        verificationToken: verificationToken
    };

    // Store password (insecurely for mock)
    const userWithPass = { ...newUser, password: userData.password };
    users.push(userWithPass);
    saveToStorage(STORAGE_KEYS.USERS, users);
    
    return newUser;
  },

  verifyUser: async (token: string): Promise<boolean> => {
      await delay(500);
      const users = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
      const userIndex = users.findIndex(u => u.verificationToken === token);
      
      if (userIndex !== -1) {
          users[userIndex].isVerified = true;
          users[userIndex].verificationToken = undefined; // Consume token
          saveToStorage(STORAGE_KEYS.USERS, users);
          return true;
      }
      return false;
  },

  loginUser: async (creds: {email: string, password: string}): Promise<User> => {
    await delay(500);

    // --- DEFAULT ADMIN FOR TESTING ---
    if (creds.email === 'admin@soultalk.ai' && creds.password === 'admin123') {
        const adminUser: User = {
            id: 'admin-001',
            name: 'System Admin',
            email: 'admin@soultalk.ai',
            isAdmin: true,
            isVerified: true,
            country: 'United States',
            profilePic: undefined
        };
        
        // Auto-seed into storage if not present
        const currentUsers = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
        if (!currentUsers.find(u => u.email === adminUser.email)) {
            currentUsers.push({ ...adminUser, password: 'admin123' });
            saveToStorage(STORAGE_KEYS.USERS, currentUsers);
        }
        
        return adminUser;
    }
    // --------------------------------

    const users = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email === creds.email && u.password === creds.password);
    
    if (!user) {
        throw new Error("Invalid credentials");
    }
    
    const { password, ...safeUser } = user;
    return safeUser as User;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<void> => {
    await delay(300);
    const users = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === id);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...userData };
        saveToStorage(STORAGE_KEYS.USERS, users);
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    await delay(300);
    const users = getFromStorage<any[]>(STORAGE_KEYS.USERS, []);
    return users.map(({ password, ...u }) => u as User);
  },

  // CHAT
  getChatHistory: async (userId: string): Promise<Message[]> => {
    await delay(300);
    const chats = getFromStorage<Record<string, Message[]>>(STORAGE_KEYS.CHATS, {});
    const userChats = chats[userId] || [];
    // Restore Date objects
    return userChats.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  },

  saveMessage: async (userId: string, message: Message): Promise<Message> => {
    await delay(100);
    const chats = getFromStorage<Record<string, Message[]>>(STORAGE_KEYS.CHATS, {});
    if (!chats[userId]) chats[userId] = [];
    
    const msgToSave = { ...message, timestamp: message.timestamp }; 
    chats[userId].push(msgToSave);
    saveToStorage(STORAGE_KEYS.CHATS, chats);
    
    return message;
  },

  // JOURNAL
  getJournalEntries: async (userId: string): Promise<JournalEntry[]> => {
    await delay(300);
    const allJournals = getFromStorage<Record<string, JournalEntry[]>>(STORAGE_KEYS.JOURNAL, {});
    const entries = allJournals[userId] || [];
    return entries.map(e => ({ ...e, timestamp: e.timestamp }));
  },

  createJournalEntry: async (userId: string, entry: JournalEntry): Promise<JournalEntry> => {
    await delay(200);
    const allJournals = getFromStorage<Record<string, JournalEntry[]>>(STORAGE_KEYS.JOURNAL, {});
    if (!allJournals[userId]) allJournals[userId] = [];
    
    allJournals[userId].unshift(entry); // Add to beginning
    saveToStorage(STORAGE_KEYS.JOURNAL, allJournals);
    
    return entry;
  },

  // CONTENT (Exercises/Sounds)
  getExercises: async (): Promise<Exercise[]> => {
    await delay(200);
    const custom = getFromStorage<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
    return [...DEFAULT_EXERCISES, ...custom];
  },

  createExercise: async (exercise: Exercise): Promise<Exercise> => {
    await delay(200);
    const custom = getFromStorage<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
    const newEx = { ...exercise, id: crypto.randomUUID() };
    custom.push(newEx);
    saveToStorage(STORAGE_KEYS.EXERCISES, custom);
    return newEx;
  },

  deleteExercise: async (id: string): Promise<void> => {
    await delay(200);
    let custom = getFromStorage<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
    custom = custom.filter(e => e.id !== id);
    saveToStorage(STORAGE_KEYS.EXERCISES, custom);
  },

  getSoundscapes: async (): Promise<Soundscape[]> => {
    await delay(200);
    const custom = getFromStorage<Soundscape[]>(STORAGE_KEYS.SOUNDSCAPES, []);
    return [...DEFAULT_SOUNDSCAPES, ...custom];
  },

  createSoundscape: async (sound: Soundscape): Promise<Soundscape> => {
    await delay(200);
    const custom = getFromStorage<Soundscape[]>(STORAGE_KEYS.SOUNDSCAPES, []);
    const newSound = { ...sound, id: crypto.randomUUID() };
    custom.push(newSound);
    saveToStorage(STORAGE_KEYS.SOUNDSCAPES, custom);
    return newSound;
  },

  deleteSoundscape: async (id: string): Promise<void> => {
    await delay(200);
    let custom = getFromStorage<Soundscape[]>(STORAGE_KEYS.SOUNDSCAPES, []);
    custom = custom.filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.SOUNDSCAPES, custom);
  }
};
