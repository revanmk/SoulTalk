/**
 * Unified AI Service
 * 
 * Primary interface for all AI operations in the frontend.
 * Routes requests to backend AI endpoints (HuggingFace + MediaPipe).
 */

import {
  analyzeText,
  analyzeFaceEmotion,
  getChatResponse,
  mapToEmotion
} from './backendAIService';
import { Emotion } from '../../../types';
import type { Message } from '../../../types';

/**
 * Emotion analysis from webcam/base64 image.
 * Calls backend MediaPipe service.
 */
export const analyzeEmotion = async (base64Image: string): Promise<Emotion> => {
  try {
    const result = await analyzeFaceEmotion(base64Image);
    if (result && result.face_detected) {
      return mapToEmotion(result.emotion);
    }
    return Emotion.NEUTRAL;
  } catch (e) {
    console.warn('analyzeEmotion failed, defaulting to NEUTRAL:', e);
    return Emotion.NEUTRAL;
  }
};

export interface ChatProcessResult {
  response: string;
  crisisDetected: boolean;
  sentiment?: string;
  sentimentScore?: number;
}

/**
 * Process a chat message through the backend AI.
 * Uses HuggingFace for analysis and Gemini for response generation.
 */
export const processChatMessage = async (
  message: string,
  currentEmotion: Emotion
): Promise<ChatProcessResult> => {
  // 1. Analyze text for sentiment, emotion, crisis
  const analysisResult = await analyzeText(message);

  const crisisDetected = analysisResult?.is_crisis ?? false;
  const sentimentLabel = analysisResult?.sentiment;
  const sentimentScore = analysisResult?.sentiment_score;
  const detectedEmotion = analysisResult?.emotion ?? 'neutral';

  // 2. Get chat response from backend
  const chatResult = await getChatResponse(
    message,
    detectedEmotion,
    crisisDetected
  );

  const response = chatResult?.response ?? "I'm here with you. Tell me more.";

  return {
    response,
    crisisDetected,
    sentiment: sentimentLabel,
    sentimentScore,
  };
};

/**
 * Generate a simple summary of the conversation.
 * For now, uses local summary (backend summarization can be added).
 */
export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
  if (!messages || messages.length === 0) return 'No conversation yet.';

  // Take last few messages, join into a short string
  const last = messages.slice(-8).map(m => `${m.role}: ${m.text}`).join(' | ');
  return `Recent highlights: ${last}`;
};
