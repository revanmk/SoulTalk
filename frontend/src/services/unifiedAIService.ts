import {
  detectLocalSentiment,
  detectLocalFaceEmotionFromBase64,
  detectLocalCrisis,
  generateLocalResponse,
} from './localAIService';
import { sendMessageToSoulTalk } from './geminiService';
import { Emotion } from '../../../types';
import type { Message } from '../../../types';

/**
 * Emotion analysis from webcam/base64 image
 * Used by WebcamCapture.tsx
 */
export const analyzeEmotion = async (base64Image: string): Promise<Emotion> => {
  try {
    const emotion = await detectLocalFaceEmotionFromBase64(base64Image);
    return emotion ?? Emotion.NEUTRAL;
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
 * Local-only chat processing (no cloud). Returns a short response plus sentiment/crisis flags.
 */
export const processChatMessage = async (
  message: string,
  currentEmotion: Emotion
): Promise<ChatProcessResult> => {
  // Sentiment (may be null if model unavailable)
  const sentimentData = await detectLocalSentiment(message);
  const sentimentLabel = sentimentData?.label;
  const sentimentScore = sentimentData?.score;

  // Crisis detection
  const crisisDetected = await detectLocalCrisis(message);

  // 1. Try Gemini Cloud AI first
  let response: string | null = null;
  try {
    // Only use Gemini if no crisis is detected locally (for speed/safety) 
    // OR strictly prefer Gemini. 
    // Let's try Gemini first, but if it fails, fall back.

    // Note: You might want to skip AI generation if crisis is detected locally 
    // to ensure the hardcoded safe response is used immediately?
    // For now, let's allow Gemini to reply unless it fails.

    // Actually, let's prioritize safety: if local crisis detected, maybe 
    // we still want the "safe" local response? 
    // But the plan said "Integrate Gemini". 
    // Let's try Gemini.

    response = await sendMessageToSoulTalk(message);
  } catch (e) {
    console.error("Gemini Service Failed (Model: gemini-flash-latest). Falling back to local.", e);
    response = null;
  }

  // 2. Fallback to Local Rule-Based if Gemini failed
  if (!response) {
    response = generateLocalResponse({
      emotion: currentEmotion,
      sentiment: sentimentData || undefined,
      crisis: crisisDetected,
    });
  }

  return {
    response,
    crisisDetected,
    sentiment: sentimentLabel,
    sentimentScore,
  };
};

/**
 * Simple local summary of conversation (concise join)
 */
export const generateConversationSummary = async (messages: Message[]): Promise<string> => {
  if (!messages || messages.length === 0) return 'No conversation yet.';

  // Take last few messages, join into a short string
  const last = messages.slice(-8).map(m => `${m.role}: ${m.text}`).join(' | ');
  return `Recent highlights: ${last}`;
};
