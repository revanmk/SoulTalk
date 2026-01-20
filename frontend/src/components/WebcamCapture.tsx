
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { analyzeEmotion } from '../services/unifiedAIService';
import type { Emotion } from '../../../types';

interface WebcamCaptureProps {
  onEmotionDetected: (emotion: Emotion) => void;
  isChatActive: boolean;
}

// Custom hook to manage MediaStream state robustly
const useCameraStream = (hasConsent: boolean) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    const initCamera = async () => {
      if (!hasConsent) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const constraints = { video: { width: 320, height: 240, facingMode: 'user' } };
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (isMounted) {
          activeStream = mediaStream;
          setStream(mediaStream);
        } else {
          // Component unmounted during load, cleanup immediately
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera Error:", err);
          setError("Access denied or camera not available.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (hasConsent) {
      initCamera();
    } else {
      setStream(null);
    }

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasConsent]);

  return { stream, error, isLoading };
};

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onEmotionDetected, isChatActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasConsent, setHasConsent] = useState(false);
  
  // Use custom hook
  const { stream, error, isLoading } = useCameraStream(hasConsent);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;
    
    const video = videoRef.current;
    
    // Crucial check: Ensure video has valid dimensions and data
    if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get data URL
      const imageSrc = canvas.toDataURL('image/jpeg', 0.8);
      
      // Analyze
      try {
         const emotion = await analyzeEmotion(imageSrc);
         if (emotion) onEmotionDetected(emotion);
      } catch (e) {
         console.warn("Analysis failed:", e);
      }
    }
  }, [stream, onEmotionDetected]);

  // Polling Effect
  useEffect(() => {
    if (!isChatActive || !hasConsent || !stream) return;

    const intervalId = setInterval(captureAndAnalyze, 3000); // 3 seconds interval
    return () => clearInterval(intervalId);
  }, [isChatActive, hasConsent, stream, captureAndAnalyze]);

  const handleToggleConsent = () => {
    setHasConsent(prev => !prev);
  };

  if (!hasConsent) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
         <div className="text-2xl mb-2">📷</div>
         <p className="text-xs text-slate-500 mb-3">
           Enable camera to let SoulTalk understand your emotions better using secure local AI.
         </p>
         <button 
           onClick={handleToggleConsent}
           className="bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs px-3 py-2 rounded-md transition-colors"
         >
           Enable Emotion AI
         </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-200 flex flex-col items-center gap-2">
        <span>{error}</span>
        <button 
           onClick={() => setHasConsent(false)}
           className="text-red-700 underline hover:no-underline"
        >
          Try Again / Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Feed */}
      <div className="relative rounded-lg overflow-hidden border-2 border-indigo-100 shadow-sm bg-black">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-32 object-cover transform scale-x-[-1] transition-opacity duration-500 ${!isLoading && stream ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
      
      {/* Controls Overlay */}
      <button 
        onClick={handleToggleConsent}
        className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors z-20"
        title="Disable Camera"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {stream && !isLoading && (
        <div className="absolute bottom-2 right-2 bg-indigo-600/90 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm animate-pulse z-20 shadow-sm flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          Live
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;
