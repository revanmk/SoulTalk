
import { User, Message, JournalEntry, Exercise, Soundscape } from '../types';

/**
 * DATABASE SERVICE (Connected to Python FastAPI Backend)
 * 
 * Assumes backend is running at http://localhost:8000
 */

const API_URL = 'http://localhost:8000/api';

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        let errorMsg = 'API Error';
        try {
            const err = await res.json();
            errorMsg = err.detail || errorMsg;
        } catch {
            // response was not json
        }
        throw new Error(errorMsg);
    }
    return res.json();
};

// Helper wrapper to catch "Failed to fetch" (Network Error)
const fetchWrapper = async (url: string, options?: RequestInit) => {
    try {
        const res = await fetch(url, options);
        return handleResponse(res);
    } catch (error: any) {
        console.error(`DB Service Error [${url}]:`, error);
        if (error.message === 'Failed to fetch') {
            throw new Error("Cannot connect to server. Is the backend running?");
        }
        throw error;
    }
};

export const dbService = {
  // USER AUTH
  getUserByEmail: async (email: string): Promise<User | null> => {
     return null; 
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<User> => {
    return fetchWrapper(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
  },

  loginUser: async (creds: {email: string, password: string}): Promise<User> => {
    return fetchWrapper(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
    });
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<void> => {
    await fetchWrapper(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
  },

  getAllUsers: async (): Promise<User[]> => {
    return fetchWrapper(`${API_URL}/users`);
  },

  // CHAT
  getChatHistory: async (userId: string): Promise<Message[]> => {
    const msgs = await fetchWrapper(`${API_URL}/chat/${userId}`);
    return msgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
  },

  saveMessage: async (userId: string, message: Message): Promise<Message> => {
    const res = await fetchWrapper(`${API_URL}/chat/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
    });
    return { ...res, timestamp: new Date(res.timestamp) };
  },

  // JOURNAL
  getJournalEntries: async (userId: string): Promise<JournalEntry[]> => {
    const entries = await fetchWrapper(`${API_URL}/journal/${userId}`);
    return entries.map((e: any) => ({ ...e, timestamp: e.timestamp }));
  },

  createJournalEntry: async (userId: string, entry: JournalEntry): Promise<JournalEntry> => {
    return fetchWrapper(`${API_URL}/journal/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
    });
  },

  // CONTENT (Exercises/Sounds)
  getExercises: async (): Promise<Exercise[]> => {
    try {
        const ex = await fetchWrapper(`${API_URL}/exercises`);
        if (ex.length === 0) {
            // Seed if empty
            const { DEFAULT_EXERCISES } = await import('../constants');
            // Try to seed backend, but don't block if it fails
            for (const e of DEFAULT_EXERCISES) {
               try { await dbService.createExercise(e); } catch {}
            }
            return DEFAULT_EXERCISES;
        }
        return ex;
    } catch (e) {
        console.warn("Backend offline, using default exercises");
        const { DEFAULT_EXERCISES } = await import('../constants');
        return DEFAULT_EXERCISES;
    }
  },

  createExercise: async (exercise: Exercise): Promise<Exercise> => {
    return fetchWrapper(`${API_URL}/exercises`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exercise)
    });
  },

  deleteExercise: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/exercises/${id}`, { method: 'DELETE' });
  },

  getSoundscapes: async (): Promise<Soundscape[]> => {
    try {
        const sounds = await fetchWrapper(`${API_URL}/soundscapes`);
        if (sounds.length === 0) {
            const { DEFAULT_SOUNDSCAPES } = await import('../constants');
            for (const s of DEFAULT_SOUNDSCAPES) {
                try { await dbService.createSoundscape(s); } catch {}
            }
            return DEFAULT_SOUNDSCAPES;
        }
        return sounds;
    } catch (e) {
        console.warn("Backend offline, using default soundscapes");
        const { DEFAULT_SOUNDSCAPES } = await import('../constants');
        return DEFAULT_SOUNDSCAPES;
    }
  },

  createSoundscape: async (sound: Soundscape): Promise<Soundscape> => {
    return fetchWrapper(`${API_URL}/soundscapes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sound)
    });
  },

  deleteSoundscape: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/soundscapes/${id}`, { method: 'DELETE' });
  }
};
