
import * as localAI from './localAIService';
import * as geminiService from './geminiService';
import type { Message } from '../../../types';
import { Emotion } from '../../../types';

// --- CACHE CONFIGURATION ---
const CACHE_LIMIT = 50; // Maximum number of cached responses
const localResponseCache = new Map<string, string>();

// --- EMOTION DETECTION ---

export const analyzeEmotion = async (base64Image: string): Promise<Emotion> => {
  // 1. Try Local Model First
  try {
    // We need to convert base64 to an Image element for face-api
    const img = new Image();
    img.src = base64Image;
    
    // Wait for load, but with a timeout safety to avoid hanging
    await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(() => reject(new Error("Image load timeout")), 2000);
    });

    const localResult = await localAI.detectLocalFaceEmotion(img);
    
    if (localResult) {
      console.log("Using Local AI for Emotion:", localResult);
      return localResult;
    }
  } catch (e) {
    // Silent fail for local detection to allow fallback
    console.debug("Local emotion detection skipped/failed:", e);
  }

  // 2. Fallback to Gemini Cloud
  // Only use cloud if local failed.
  console.log("Using Cloud AI for Emotion...");
  return await geminiService.analyzeEmotion(base64Image);
};

// --- CHAT & SENTIMENT ---

export interface ChatProcessResult {
  response: string;
  crisisDetected: boolean;
  sentiment?: string;
  sentimentScore?: number;
}

// Helper to call backend AI engine
const analyzeTextBackend = async (text: string) => {
    try {
        const response = await fetch('http://localhost:8000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn("Backend analysis failed, falling back to client-side heuristics", e);
    }
    return null;
};

export const processChatMessage = async (
  message: string, 
  currentEmotion: Emotion
): Promise<ChatProcessResult> => {
  
  // 1. Analysis (Backend Preferred -> Local Heuristic Fallback)
  let isCrisis = false;
  let sentimentTag = "NEUTRAL";
  let sentimentData: { label: string, score: number } | null = null;

  const backendAnalysis = await analyzeTextBackend(message);

  if (backendAnalysis) {
      // Use Backend Results (Trained Models)
      console.log("Using Backend AI Analysis:", backendAnalysis);
      isCrisis = backendAnalysis.is_crisis;
      sentimentTag = backendAnalysis.sentiment;
      // Map string sentiment to object structure if needed, or just use string
      sentimentData = { label: backendAnalysis.sentiment, score: 0.9 }; // Mock score for backend
      
      if (backendAnalysis.emotion && backendAnalysis.emotion !== 'Neutral') {
          sentimentTag += ` | Emotion: ${backendAnalysis.emotion}`;
      }
  } else {
      // Fallback to client-side logic
      isCrisis = await localAI.detectLocalCrisis(message);
      
      try {
         const sentiment = await localAI.detectLocalSentiment(message);
         if (sentiment) {
           sentimentData = sentiment;
           sentimentTag = `${sentiment.label} (${(sentiment.score * 100).toFixed(0)}%)`;
           console.log("Local Sentiment:", sentimentTag);
         }
      } catch (e) {
         console.warn("Local sentiment failed");
      }
  }

  // 2. Generate Response (Priority: Local LLM -> Cloud Gemini)
  let responseText: string | null = null;

  // --- CACHE CHECK ---
  // Key based on message content and emotion to handle context variations
  const cacheKey = `${message.trim().toLowerCase()}|${currentEmotion}`;
  if (localResponseCache.has(cacheKey)) {
      console.log(`[Cache Hit] Using cached local response for: "${message.substring(0, 15)}..."`);
      responseText = localResponseCache.get(cacheKey) || null;
  }
  
  // Short context for Local LLM to keep tokens low
  const localContext = "You are SoulTalk, an empathetic mental health assistant. Be kind, brief, and supportive.";
  
  if (!responseText) {
      try {
        console.log("Attempting Local LLM Response...");
        responseText = await localAI.generateLocalResponse(message, localContext);
        if (responseText) {
            console.log("Using Local LLM Response:", responseText);
            
            // --- UPDATE CACHE ---
            if (localResponseCache.size >= CACHE_LIMIT) {
                // Remove oldest entry if limit reached
                const firstKey = localResponseCache.keys().next().value;
                if (firstKey) localResponseCache.delete(firstKey);
            }
            localResponseCache.set(cacheKey, responseText);
        }
      } catch (e) {
        console.warn("Local LLM failed:", e);
      }
  }

  // Fallback to Gemini if local failed or returned empty
  if (!responseText) {
    console.log("Falling back to Gemini Cloud...");
    let prompt = message;
    
    // Inject detected context for Gemini
    if (currentEmotion !== Emotion.NEUTRAL) {
      prompt = `[System: User is ${currentEmotion}. Sentiment: ${sentimentTag}] ${message}`;
    }

    try {
        responseText = await geminiService.sendMessageToSoulTalk(prompt);
    } catch (e) {
        responseText = "I'm having trouble connecting right now, but I'm here for you.";
        console.error("Gemini Fallback Failed:", e);
    }
  }

  // 3. Check Crisis in Response (Reflection)
  // Use heuristic for response safety to avoid loops, or simple backend check
  const isResponseCrisis = await localAI.detectLocalCrisis(responseText || "");

  return {
    response: responseText || "I'm here to listen. What's on your mind?",
    crisisDetected: isCrisis || isResponseCrisis,
    sentiment: sentimentData?.label,
    sentimentScore: sentimentData?.score
  };
};

export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
    if (messages.length === 0) return "No conversation history.";

    // Take last 10 messages to avoid token limits for local model
    const recentMessages = messages.slice(-10);
    const transcript = recentMessages.map(m => `${m.role === 'user' ? 'User' : 'SoulTalk'}: ${m.text}`).join('\n');

    let summary: string | null = null;

    // 1. Try Local Summary
    try {
        console.log("Attempting Local Summarization...");
        summary = await localAI.summarizeLocalText(transcript);
        if (summary) {
            console.log("Local Summary Generated:", summary);
            return summary;
        }
    } catch (e) {
        console.warn("Local summarization failed, falling back to cloud.", e);
    }

    // 2. Fallback to Gemini
    console.log("Fallback to Cloud Summarization...");
    return await geminiService.summarizeChatHistory(transcript);
};
