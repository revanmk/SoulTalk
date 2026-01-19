
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Exercise, Soundscape } from '../types';
import { dbService } from '../services/databaseService';

interface ContentContextType {
  exercises: Exercise[];
  soundscapes: Soundscape[];
  addExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  addSoundscape: (soundscape: Soundscape) => void;
  deleteSoundscape: (id: string) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>([]);

  const loadContent = async () => {
    try {
       const ex = await dbService.getExercises();
       setExercises(ex);
    } catch (e) {
       console.warn("Failed to load exercises from backend:", e);
       // Optional: Fallback to defaults here if dbService didn't already
    }

    try {
       const sn = await dbService.getSoundscapes();
       setSoundscapes(sn);
    } catch (e) {
       console.warn("Failed to load soundscapes from backend:", e);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const addExercise = async (exercise: Exercise) => {
    try {
      const newEx = await dbService.createExercise(exercise);
      setExercises(prev => [...prev, newEx]);
    } catch (e) {
      console.error("Failed to add exercise:", e);
      alert("Could not save exercise to database.");
    }
  };

  const deleteExercise = async (id: string) => {
    try {
      await dbService.deleteExercise(id);
      setExercises(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error("Failed to delete exercise:", e);
    }
  };

  const addSoundscape = async (soundscape: Soundscape) => {
    try {
      const newSound = await dbService.createSoundscape(soundscape);
      setSoundscapes(prev => [...prev, newSound]);
    } catch (e) {
      console.error("Failed to add soundscape:", e);
    }
  };

  const deleteSoundscape = async (id: string) => {
    try {
      await dbService.deleteSoundscape(id);
      setSoundscapes(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error("Failed to delete soundscape:", e);
    }
  };

  return (
    <ContentContext.Provider value={{ 
      exercises, 
      soundscapes, 
      addExercise, 
      deleteExercise, 
      addSoundscape, 
      deleteSoundscape 
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
