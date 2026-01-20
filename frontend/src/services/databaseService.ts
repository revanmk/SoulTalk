
import type { User, Message, JournalEntry, Exercise, Soundscape } from '../../../types';

/**
 * DATABASE SERVICE
 * Uses backend API for persistence.
 */

const API_BASE = 'http://localhost:8000';

// Helper functions to convert between snake_case (backend) and camelCase (frontend)
const convertUserFromBackend = (data: any): User => ({
  id: data.id,
  email: data.email,
  name: data.name,
  country: data.country,
  emergencyContactName: data.emergency_contact_name,
  emergencyContactNumber: data.emergency_contact_number,
  profilePic: data.profile_pic,
  isAdmin: data.is_admin,
  isVerified: data.is_verified,
  verificationToken: data.verification_token
});

const convertUserToBackend = (user: Partial<User> & { password?: string }): any => ({
  email: user.email,
  name: user.name,
  password: user.password,
  country: user.country,
  emergency_contact_name: user.emergencyContactName,
  emergency_contact_number: user.emergencyContactNumber,
  profile_pic: user.profilePic,
  is_admin: user.isAdmin
});

const convertMessageFromBackend = (data: any): Message => ({
  id: data.id,
  role: data.role,
  text: data.text,
  timestamp: new Date(data.timestamp),
  sentiment: data.sentiment,
  sentimentScore: data.sentimentScore
});

const convertMessageToBackend = (msg: Partial<Message>): any => ({
  role: msg.role,
  text: msg.text,
  sentiment: msg.sentiment,
  sentimentScore: msg.sentimentScore
});

const convertJournalEntryFromBackend = (data: any): JournalEntry => ({
  id: data.id,
  timestamp: data.timestamp,
  content: data.content,
  mood: data.mood,
  tags: data.tags
});

const convertJournalEntryToBackend = (entry: Partial<JournalEntry>): any => ({
  timestamp: entry.timestamp,
  content: entry.content,
  mood: entry.mood,
  tags: entry.tags
});

const convertExerciseFromBackend = (data: any): Exercise => ({
  id: data.id,
  title: data.title,
  description: data.description,
  category: data.category,
  duration: data.duration,
  steps: data.steps,
  visualizationType: data.visualizationType
});

const convertExerciseToBackend = (ex: Partial<Exercise>): any => ({
  title: ex.title,
  description: ex.description,
  category: ex.category,
  duration: ex.duration,
  steps: ex.steps
});

const convertSoundscapeFromBackend = (data: any): Soundscape => ({
  id: data.id,
  name: data.name,
  url: data.url
});

const convertSoundscapeToBackend = (sound: Partial<Soundscape>): any => ({
  name: sound.name,
  url: sound.url
});

export const dbService = {
  // USER AUTH
  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      if (res.ok) {
        const users = await res.json();
        const user = users.find((u: any) => u.email === email);
        return user ? convertUserFromBackend(user) : null;
      }
    } catch (e) {
      console.error('getUserByEmail failed:', e);
    }
    return null;
  },

  loginUser: async ({email, password}: {email: string, password: string}): Promise<User> => {
    // --- DEFAULT ADMIN FOR TESTING ---
    if (email === 'admin@soultalk.ai' && password === 'admin123') {
        const adminUser: User = {
            id: 'admin-001',
            name: 'System Admin',
            email: 'admin@soultalk.ai',
            isAdmin: true,
            isVerified: true,
            country: 'United States',
            profilePic: undefined
        };
        return adminUser;
    }
    // --------------------------------

    const res = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });
    if (res.ok) {
      const data = await res.json();
      return convertUserFromBackend(data);
    }
    throw new Error('Login failed');
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<User> => {
    const backendData = convertUserToBackend(userData);
    const res = await fetch(`${API_BASE}/api/signup`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (res.ok) {
      const data = await res.json();
      return convertUserFromBackend(data);
    }
    throw new Error('Signup failed');
  },

  verifyUser: async (token: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/api/verify/${token}`);
    return res.ok;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<void> => {
    const backendData = convertUserToBackend(userData);
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (!res.ok) {
      throw new Error('Update user failed');
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/api/users`);
    if (res.ok) {
      const data = await res.json();
      return data.map(convertUserFromBackend);
    }
    return [];
  },

  // CHAT
  getChatHistory: async (userId: string): Promise<Message[]> => {
    const res = await fetch(`${API_BASE}/api/chat/${userId}`);
    if (res.ok) {
      const data = await res.json();
      return data.map(convertMessageFromBackend);
    }
    return [];
  },

  saveMessage: async (userId: string, message: Message): Promise<Message> => {
    const backendData = convertMessageToBackend(message);
    const res = await fetch(`${API_BASE}/api/chat/${userId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (res.ok) {
      const data = await res.json();
      return convertMessageFromBackend(data);
    }
    throw new Error('Save message failed');
  },

  // JOURNAL
  getJournalEntries: async (userId: string): Promise<JournalEntry[]> => {
    const res = await fetch(`${API_BASE}/api/journal/${userId}`);
    if (res.ok) {
      const data = await res.json();
      return data.map(convertJournalEntryFromBackend);
    }
    return [];
  },

  createJournalEntry: async (userId: string, entry: JournalEntry): Promise<JournalEntry> => {
    const backendData = convertJournalEntryToBackend(entry);
    const res = await fetch(`${API_BASE}/api/journal/${userId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (res.ok) {
      const data = await res.json();
      return convertJournalEntryFromBackend(data);
    }
    throw new Error('Create journal entry failed');
  },

  // CONTENT (Exercises/Sounds)
  getExercises: async (): Promise<Exercise[]> => {
    const res = await fetch(`${API_BASE}/api/exercises`);
    if (res.ok) {
      const data = await res.json();
      return data.map(convertExerciseFromBackend);
    }
    throw new Error('Get exercises failed');
  },

  createExercise: async (exercise: Exercise): Promise<Exercise> => {
    const backendData = convertExerciseToBackend(exercise);
    const res = await fetch(`${API_BASE}/api/exercises`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (res.ok) {
      const data = await res.json();
      return convertExerciseFromBackend(data);
    }
    throw new Error('Create exercise failed');
  },

  deleteExercise: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/exercises/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Delete exercise failed');
    }
  },

  getSoundscapes: async (): Promise<Soundscape[]> => {
    const res = await fetch(`${API_BASE}/api/soundscapes`);
    if (res.ok) {
      const data = await res.json();
      return data.map(convertSoundscapeFromBackend);
    }
    throw new Error('Get soundscapes failed');
  },

  createSoundscape: async (sound: Soundscape): Promise<Soundscape> => {
    const backendData = convertSoundscapeToBackend(sound);
    const res = await fetch(`${API_BASE}/api/soundscapes`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backendData)
    });
    if (res.ok) {
      const data = await res.json();
      return convertSoundscapeFromBackend(data);
    }
    throw new Error('Create soundscape failed');
  },

  deleteSoundscape: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/soundscapes/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error('Delete soundscape failed');
    }
  }
};
