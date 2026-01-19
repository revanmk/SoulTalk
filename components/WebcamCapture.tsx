
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { analyzeEmotion } from '../services/unifiedAIService';
import { Emotion } from '../types';

interface WebcamCaptureProps {
  onEmotionDetected: (emotion: Emotion) => void;
  isChatActive: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onEmotionDetected, isChatActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const startCamera = async () => {
    try {
      // Small resolution for faster local processing
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
        setPermissionError(false);
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setPermissionError(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  const handleToggleConsent = () => {
    if (hasConsent) {
      setHasConsent(false);
      stopCamera();
    } else {
      setHasConsent(true);
    }
  };

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageSrc = canvas.toDataURL('image/jpeg');
      
      // unifiedAIService will attempt local first, then cloud
      const emotion = await analyzeEmotion(imageSrc);
      onEmotionDetected(emotion);
    }
  }, [streamActive, onEmotionDetected]);

  useEffect(() => {
    if (hasConsent) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [hasConsent]);

  // Poll for emotion
  useEffect(() => {
    if (!isChatActive || !streamActive || !hasConsent) return;

    // Polling interval can be faster now that we have local models (e.g., 3s instead of 10s)
    const intervalId = setInterval(() => {
      captureAndAnalyze();
    }, 5000); 

    return () => clearInterval(intervalId);
  }, [isChatActive, streamActive, hasConsent, captureAndAnalyze]);

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

  if (permissionError) {
    return (
      <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-200">
        Camera access denied.
      </div>
    );
  }

  return (
    <div className="relative group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-32 object-cover rounded-lg border-2 border-indigo-100 shadow-sm transition-opacity duration-500 ${streamActive ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className="hidden" />
      
      <button 
        onClick={handleToggleConsent}
        className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white p-1 rounded-full backdrop-blur-sm transition-colors"
        title="Disable Camera"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute bottom-1 right-1 bg-indigo-600/80 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm animate-pulse">
        AI Active
      </div>
    </div>
  );
};

export default WebcamCapture;
