
import React, { useState, useEffect, useRef } from 'react';
import { Exercise } from '../types';
import { useContent } from '../context/ContentContext';

interface ExercisePlayerProps {
  exercise: Exercise;
  onClose: () => void;
}

const ExercisePlayer: React.FC<ExercisePlayerProps> = ({ exercise, onClose }) => {
  const { soundscapes } = useContent();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // For timer-based exercises
  
  // Audio State
  const [audioTrack, setAudioTrack] = useState(soundscapes.length > 0 ? soundscapes[0] : null);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Breathing Specific State
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold-in' | 'exhale' | 'hold-out'>('inhale');
  const [breathInstruction, setBreathInstruction] = useState('Inhale');

  // Initialize Audio
  useEffect(() => {
    if (audioTrack) {
        audioRef.current = new Audio(audioTrack.url);
        audioRef.current.loop = true;
        audioRef.current.volume = volume;
    }
    
    // Cleanup
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Help garbage collection
        audioRef.current = null;
      }
    };
  }, []); // Run once on mount to create instance

  // Handle Track Change
  useEffect(() => {
    if (audioTrack) {
        if (!audioRef.current) {
            audioRef.current = new Audio(audioTrack.url);
            audioRef.current.loop = true;
        }

        // Check if URL actually changed to prevent reload on initial render if logic overlaps
        if (audioRef.current.src !== audioTrack.url) {
            const wasPlaying = !audioRef.current.paused || isPlaying; 
            audioRef.current.src = audioTrack.url;
            audioRef.current.volume = volume;
            if (wasPlaying && isPlaying) {
                audioRef.current.play().catch(e => console.warn("Audio play failed on track change:", e));
            }
        }
    }
  }, [audioTrack, isPlaying, volume]); 

  // Handle Volume Change specifically (optimization)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Handle Play/Pause of Session
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback error:", error);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Logic for Box Breathing / Breathing Circle (Visual Type Check)
  useEffect(() => {
    if (exercise.visualizationType !== 'BREATHING_CIRCLE' || !isPlaying) return;

    let timer: any;
    
    const runCycle = () => {
      // Inhale (4s)
      setBreathPhase('inhale');
      setBreathInstruction('Inhale deeply...');
      
      timer = setTimeout(() => {
        // Hold (4s)
        setBreathPhase('hold-in');
        setBreathInstruction('Hold breath...');
        
        timer = setTimeout(() => {
          // Exhale (4s)
          setBreathPhase('exhale');
          setBreathInstruction('Exhale slowly...');
          
          timer = setTimeout(() => {
            // Hold (4s)
            setBreathPhase('hold-out');
            setBreathInstruction('Hold empty...');
            
            timer = setTimeout(runCycle, 4000);
          }, 4000);
        }, 4000);
      }, 4000);
    };

    runCycle();

    return () => clearTimeout(timer);
  }, [exercise.visualizationType, isPlaying]);

  // Logic for Timer based exercises (List or Countdown)
  useEffect(() => {
    if (exercise.visualizationType === 'BREATHING_CIRCLE') return; 
    
    let interval: any;
    if (isPlaying && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeLeft, exercise.visualizationType]);

  // Initialize Timer based on duration string
  useEffect(() => {
    const mins = parseInt(exercise.duration);
    if (!isNaN(mins)) {
      setTimeLeft(mins * 60);
    }
  }, [exercise]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleNextStep = () => {
    if (currentStepIndex < exercise.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setIsPlaying(false); // Finished
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden relative animate-pop-in">
      {/* Header */}
      <div className="flex justify-between items-center p-4 z-10">
        <div>
          <h2 className="text-lg font-semibold">{exercise.title}</h2>
          <p className="text-xs text-slate-400">{exercise.category} • {exercise.duration}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-0">
        
        {/* BREATHING CIRCLE VISUALIZATION */}
        {exercise.visualizationType === 'BREATHING_CIRCLE' && (
          <div className="relative flex flex-col items-center justify-center h-72 w-72">
            {/* Outer Glow / Aura */}
            <div 
              className={`absolute inset-0 rounded-full blur-2xl transition-all duration-[4000ms] ease-in-out
                ${breathPhase === 'inhale' ? 'bg-cyan-500/40 scale-125 opacity-100' : ''}
                ${breathPhase === 'hold-in' ? 'bg-white/30 scale-125 opacity-80' : ''}
                ${breathPhase === 'exhale' ? 'bg-indigo-600/30 scale-75 opacity-60' : ''}
                ${breathPhase === 'hold-out' ? 'bg-slate-700/20 scale-50 opacity-20' : ''}
              `}
            ></div>

            {/* Main Circle */}
            <div 
              className={`relative z-10 w-48 h-48 border-[6px] rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out shadow-2xl
                ${breathPhase === 'inhale' ? 'scale-110 border-cyan-400 bg-cyan-900/20 shadow-cyan-500/20' : ''}
                ${breathPhase === 'hold-in' ? 'scale-110 border-white bg-white/10 shadow-[0_0_50px_rgba(255,255,255,0.3)]' : ''}
                ${breathPhase === 'exhale' ? 'scale-75 border-indigo-500 bg-indigo-900/20 shadow-indigo-500/20' : ''}
                ${breathPhase === 'hold-out' ? 'scale-75 border-slate-600 bg-slate-900/50 grayscale' : ''}
              `}
            >
              <div className="flex flex-col items-center z-20">
                 <span className={`text-xl font-light tracking-widest uppercase text-center transition-colors duration-500
                    ${breathPhase === 'hold-in' ? 'text-white font-normal drop-shadow-md' : 'text-slate-200'}
                    ${breathPhase === 'hold-out' ? 'text-slate-500' : ''}
                 `}>
                   {isPlaying ? breathInstruction : 'Ready?'}
                 </span>
              </div>
            </div>
            
             <div className="absolute -bottom-12 text-slate-400 text-xs font-mono uppercase tracking-widest opacity-70">
                {isPlaying ? (
                  breathPhase === 'inhale' ? 'Expanding' :
                  breathPhase === 'hold-in' ? 'Holding Full' :
                  breathPhase === 'exhale' ? 'Releasing' : 'Holding Empty'
                ) : 'Press Play'}
             </div>
          </div>
        )}

        {/* COUNTDOWN VISUALIZATION */}
        {exercise.visualizationType === 'COUNTDOWN' && (
          <div className="w-full max-w-md text-center space-y-8">
             <div className="text-6xl font-bold text-indigo-400">
                {exercise.steps.length - currentStepIndex}
             </div>
             <p className="text-2xl font-light leading-relaxed">
               {exercise.steps[currentStepIndex]}
             </p>
             <div className="flex justify-center gap-4 pt-4">
                <button 
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={handleNextStep}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors font-semibold"
                >
                  {currentStepIndex === exercise.steps.length - 1 ? 'Finish' : 'Next Step'}
                </button>
             </div>
          </div>
        )}

        {/* LIST VISUALIZATION (Timer based) */}
        {exercise.visualizationType === 'LIST' && (
           <div className="text-center space-y-8 max-w-lg">
              <div className="text-6xl font-mono font-light tracking-wider text-indigo-300">
                 {formatTime(timeLeft)}
              </div>
              <div className="h-48 overflow-y-auto p-4 bg-white/5 rounded-xl border border-white/10 custom-scrollbar">
                <ul className="space-y-4 text-left">
                  {exercise.steps.map((step, idx) => (
                    <li key={idx} className={`flex gap-3 text-lg ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>
                       <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                       <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
           </div>
        )}

      </div>

      {/* Control Bar */}
      <div className="bg-slate-800 p-4 pb-8 z-20 border-t border-slate-700">
         
         {/* Audio Controls */}
         <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-3xl mx-auto mb-6">
            
            {/* Play/Pause Button */}
            <div className="flex items-center gap-4">
               <button 
                 onClick={togglePlay}
                 className="w-12 h-12 bg-white text-indigo-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20"
               >
                 {isPlaying ? (
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                   </svg>
                 ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5">
                     <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                   </svg>
                 )}
               </button>
               <span className="text-sm font-medium text-slate-300">
                 {isPlaying ? 'Playing' : 'Paused'}
               </span>
            </div>

            {/* Track Selector */}
            {soundscapes.length > 0 && (
                <div className="flex items-center gap-2">
                   <span className="text-xs text-slate-500 uppercase font-bold">Sound:</span>
                   <div className="flex bg-slate-900 p-1 rounded-lg overflow-x-auto max-w-[150px] md:max-w-xs custom-scrollbar">
                      {soundscapes.map(sound => (
                        <button
                          key={sound.id}
                          onClick={() => setAudioTrack(sound)}
                          className={`px-3 py-1.5 text-xs rounded-md transition-all whitespace-nowrap ${
                            audioTrack?.id === sound.id 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {sound.name}
                        </button>
                      ))}
                   </div>
                </div>
            )}

            {/* Volume */}
            <div className="flex items-center gap-2 w-full md:w-32">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
               </svg>
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.01" 
                 value={volume} 
                 onChange={(e) => setVolume(parseFloat(e.target.value))}
                 className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
               />
            </div>
         </div>
      </div>
    </div>
  );
};

export default ExercisePlayer;
