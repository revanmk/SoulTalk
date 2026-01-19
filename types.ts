
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  profilePic?: string; // Base64 string
  country?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isError?: boolean;
  // New fields for Local AI Metadata
  sentiment?: string; 
  sentimentScore?: number;
  emotionContext?: string;
}

export enum Emotion {
  NEUTRAL = 'Neutral',
  HAPPY = 'Happy',
  SAD = 'Sad',
  ANGRY = 'Angry',
  ANXIOUS = 'Anxious',
  SURPRISED = 'Surprised',
  TIRED = 'Tired'
}

export interface JournalEntry {
  id: string;
  timestamp: string; // ISO string for storage safety
  content: string;
  mood: Emotion;
  tags: string[];
}

export type VisualizationType = 'BREATHING_CIRCLE' | 'COUNTDOWN' | 'LIST';

export interface Exercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: 'Breathing' | 'Meditation' | 'Grounding' | 'Physical';
  steps: string[];
  visualizationType: VisualizationType;
}

export interface Soundscape {
  id: string;
  name: string;
  url: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, country: string, emergencyContactName: string, emergencyContactNumber: string, profilePic?: string) => Promise<boolean>;
  createAdmin: (email: string, password: string, name: string) => Promise<boolean>;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  getAllUsers: () => User[]; // Admin function
  getUserData: (userId: string) => { journal: JournalEntry[], chat: Message[] }; // Admin function
}

export interface WebcamRef {
  getScreenshot: () => string | null;
}
