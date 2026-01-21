/**
 * Backend AI Service
 * 
 * Calls the new backend AI endpoints for all AI operations.
 * Replaces local AI processing with server-side HuggingFace + MediaPipe.
 */

import { Emotion } from '../../../types';

const API_BASE = 'http://localhost:8000/api/ai';

// --- Types ---

interface TextAnalysisResult {
    text: string;
    sentiment: string;
    sentiment_score: number;
    emotion: string;
    emotion_confidence: number;
    is_crisis: boolean;
    crisis_confidence: number;
    crisis_triggers: string[];
    sources: Record<string, string>;
}

interface FaceEmotionResult {
    emotion: string;
    confidence: number;
    face_detected: boolean;
    source: string;
    metrics?: Record<string, number>;
    error?: string;
}

interface ChatResult {
    response: string;
    source: string;
    error?: string;
}

// --- API Functions ---

/**
 * Analyze text for sentiment, emotion, and crisis detection.
 */
export const analyzeText = async (text: string): Promise<TextAnalysisResult | null> => {
    try {
        const response = await fetch(`${API_BASE}/analyze-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            console.error('Text analysis failed:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Text analysis error:', error);
        return null;
    }
};

/**
 * Detect emotion from a face image (base64).
 */
export const analyzeFaceEmotion = async (base64Image: string): Promise<FaceEmotionResult | null> => {
    try {
        const response = await fetch(`${API_BASE}/analyze-face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            console.error('Face analysis failed:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Face analysis error:', error);
        return null;
    }
};

/**
 * Get a chat response from the AI.
 */
export const getChatResponse = async (
    message: string,
    emotionContext?: string,
    isCrisis?: boolean
): Promise<ChatResult | null> => {
    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                emotion_context: emotionContext,
                is_crisis: isCrisis
            })
        });

        if (!response.ok) {
            console.error('Chat failed:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Chat error:', error);
        return null;
    }
};

/**
 * Summarize a conversation.
 */
export const summarizeConversation = async (
    messages: Array<{ role: string; text: string }>
): Promise<string> => {
    try {
        const response = await fetch(`${API_BASE}/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            return 'Summary unavailable.';
        }

        const result = await response.json();
        return result.summary;
    } catch (error) {
        console.error('Summarize error:', error);
        return 'Summary unavailable.';
    }
};

/**
 * Reset the chat session on the backend.
 */
export const resetChatSession = async (): Promise<void> => {
    try {
        await fetch(`${API_BASE}/reset-chat`, { method: 'POST' });
    } catch (error) {
        console.warn('Failed to reset chat session:', error);
    }
};

/**
 * Check if the AI backend is healthy.
 */
export const checkAIHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
    } catch {
        return false;
    }
};

// --- Helpers for Emotion Mapping ---

const emotionMap: Record<string, Emotion> = {
    happy: Emotion.HAPPY,
    joy: Emotion.HAPPY,
    sad: Emotion.SAD,
    sadness: Emotion.SAD,
    angry: Emotion.ANGRY,
    anger: Emotion.ANGRY,
    fearful: Emotion.ANXIOUS,
    fear: Emotion.ANXIOUS,
    anxious: Emotion.ANXIOUS,
    surprised: Emotion.SURPRISED,
    surprise: Emotion.SURPRISED,
    neutral: Emotion.NEUTRAL,
    disgust: Emotion.ANGRY
};

/**
 * Map backend emotion string to Emotion enum.
 */
export const mapToEmotion = (emotionStr: string): Emotion => {
    return emotionMap[emotionStr.toLowerCase()] || Emotion.NEUTRAL;
};
