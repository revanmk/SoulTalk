
import * as localAI from './localAIService';
import * as geminiService from './geminiService';
import { Emotion } from '../types';

// --- EMOTION DETECTION ---

export const analyzeEmotion = async (base64Image: string): Promise<Emotion> => {
  // 1. Try Local Model First
  try {
    // We need to convert base64 to an Image element for face-api
    const img = new Image();
    img.src = base64Image;
    await img.decode(); // Wait for load

    const localResult = await localAI.detectLocalFaceEmotion(img);
    
    if (localResult) {
      console.log("Using Local AI for Emotion:", localResult);
      return localResult;
    }
  } catch (e) {
    console.warn("Local emotion detection failed, falling back to cloud", e);
  }

  // 2. Fallback to Gemini Cloud
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

export const processChatMessage = async (
  message: string, 
  currentEmotion: Emotion
): Promise<ChatProcessResult> => {
  
  // 1. Local Crisis Detection
  const isCrisis = await localAI.detectLocalCrisis(message);

  // 2. Local Sentiment Analysis (to tag metadata)
  let sentimentTag = "NEUTRAL";
  let sentimentData: { label: string, score: number } | null = null;
  
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

  // 3. Generate Response (Priority: Local LLM -> Cloud Gemini)
  let responseText: string | null = null;
  
  // Short context for Local LLM to keep tokens low
  const localContext = "You are SoulTalk, an empathetic mental health assistant. Be kind, brief, and supportive.";
  
  try {
    console.log("Attempting Local LLM Response...");
    responseText = await localAI.generateLocalResponse(message, localContext);
    if (responseText) {
        console.log("Using Local LLM Response:", responseText);
    }
  } catch (e) {
    console.warn("Local LLM failed:", e);
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

  // 4. Check Crisis in Response (Reflection) - ensure AI didn't say something dangerous
  const isResponseCrisis = await localAI.detectLocalCrisis(responseText || "");

  return {
    response: responseText || "...",
    crisisDetected: isCrisis || isResponseCrisis,
    sentiment: sentimentData?.label,
    sentimentScore: sentimentData?.score
  };
};
