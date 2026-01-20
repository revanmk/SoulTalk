
import { Emotion } from '../../../types';
// @ts-ignore
import { pipeline } from '@xenova/transformers';

// Safe access to global faceapi
const getFaceApi = () => (window as any).faceapi;

let sentimentPipeline: any = null;
let chatPipeline: any = null;
let areFaceModelsLoaded = false;
let isFaceModelLoading = false;
let isChatModelLoading = false;

// --- TEXT SENTIMENT (Transformers.js) ---

export const loadTextModel = async () => {
  if (sentimentPipeline) return;
  console.log("Loading Local Text Model...");
  // Use a small, quantized model optimized for browser
  sentimentPipeline = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
  console.log("Local Text Model Loaded");
};

export const detectLocalSentiment = async (text: string): Promise<{ score: number, label: string } | null> => {
  try {
    if (!sentimentPipeline) await loadTextModel();
    const result = await sentimentPipeline(text);
    // result is like [{ label: 'POSITIVE', score: 0.99 }]
    return result[0];
  } catch (err) {
    console.warn("Local Text Analysis Failed:", err);
    return null;
  }
};

// --- LOCAL CHAT (Transformers.js) ---

export const loadChatModel = async () => {
  if (chatPipeline || isChatModelLoading) return;
  isChatModelLoading = true;
  console.log("Loading Local Chat Model (LaMini-Flan-T5-248M)...");
  try {
    // LaMini-Flan-T5-248M is a good balance of instruction following and size (~300MB quantized)
    chatPipeline = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M');
    console.log("Local Chat Model Loaded");
  } catch (err) {
    console.error("Failed to load local chat model:", err);
  } finally {
    isChatModelLoading = false;
  }
};

export const generateLocalResponse = async (message: string, systemContext: string): Promise<string | null> => {
  // If model isn't loaded, trigger load and return null to fallback to cloud this time
  if (!chatPipeline) {
    if (!isChatModelLoading) loadChatModel();
    return null;
  }

  try {
    // Construct a prompt suitable for T5/Flan models
    const prompt = `Instruction: ${systemContext}
User: ${message}
SoulTalk:`;

    const result = await chatPipeline(prompt, {
      max_new_tokens: 150,
      temperature: 0.6,
      repetition_penalty: 1.2,
      do_sample: true
    });

    const text = result[0]?.generated_text;
    if (text && text.trim().length > 0) {
      return text.trim();
    }
    return null;
  } catch (err) {
    console.warn("Local Chat Generation Failed:", err);
    return null;
  }
};

export const summarizeLocalText = async (text: string): Promise<string | null> => {
    if (!chatPipeline) {
        if (!isChatModelLoading) loadChatModel();
        return null;
    }

    try {
        // LaMini-Flan-T5 handles "Summarize:" prompts well
        const prompt = `Summarize this conversation briefly:\n\n${text}`;

        const result = await chatPipeline(prompt, {
            max_new_tokens: 100,
            temperature: 0.5,
            do_sample: false // Deterministic for summaries
        });

        const summary = result[0]?.generated_text;
        return summary || null;
    } catch (err) {
        console.warn("Local Summarization Failed:", err);
        return null;
    }
};

// --- FACE EMOTION (face-api.js) ---

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const loadFaceModels = async () => {
  if (areFaceModelsLoaded || isFaceModelLoading) return;
  
  const faceapi = getFaceApi();
  if (!faceapi) {
      console.warn("face-api.js not loaded yet");
      return;
  }

  isFaceModelLoading = true;

  try {
    console.log("Loading Local Face Models (TinyFace)...");
    // Switch to TinyFaceDetector for better performance/reliability on web
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
    ]);
    areFaceModelsLoaded = true;
    console.log("Local Face Models Loaded Successfully");
  } catch (err) {
    console.error("Failed to load local face models. Check network/CORS.", err);
  } finally {
    isFaceModelLoading = false;
  }
};

export const detectLocalFaceEmotion = async (imageElement: HTMLImageElement | HTMLVideoElement): Promise<Emotion | null> => {
  const faceapi = getFaceApi();
  if (!faceapi) return null;

  if (!areFaceModelsLoaded) {
    await loadFaceModels();
  }
  
  if (!areFaceModelsLoaded) {
      console.warn("Skipping detection: Models not loaded.");
      return null;
  }
  
  try {
    // Use TinyFaceDetectorOptions
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const detections = await faceapi.detectSingleFace(imageElement, options).withFaceExpressions();
    
    if (!detections) {
        // console.log("No face detected in frame");
        return null;
    }

    // expressions is an object { neutral: 0.9, happy: 0.1 ... }
    const expressions = detections.expressions;
    
    // Find expression with highest probability
    const sorted = Object.entries(expressions).sort((a: any, b: any) => b[1] - a[1]);
    const topEmotion = sorted[0][0] as string; // e.g., 'happy'

    // Map face-api emotions to our Emotion Enum
    const map: Record<string, Emotion> = {
      neutral: Emotion.NEUTRAL,
      happy: Emotion.HAPPY,
      sad: Emotion.SAD,
      angry: Emotion.ANGRY,
      fearful: Emotion.ANXIOUS,
      disgusted: Emotion.ANGRY, // Map disgust to angry for simplicity
      surprised: Emotion.SURPRISED
    };

    return map[topEmotion] || Emotion.NEUTRAL;
  } catch (err) {
    console.warn("Local Face Detection Runtime Error:", err);
    return null;
  }
};

// Helper to check for crisis keywords locally (Hybrid Approach)
const CRISIS_KEYWORDS_EXTENDED = [
  'suicide', 'kill myself', 'die', 'end it', 'hurt myself', 'cutting', 'overdose'
];

export const detectLocalCrisis = async (text: string): Promise<boolean> => {
  const lower = text.toLowerCase();
  const keywordMatch = CRISIS_KEYWORDS_EXTENDED.some(k => lower.includes(k));
  
  if (keywordMatch) return true;

  return false;
};
