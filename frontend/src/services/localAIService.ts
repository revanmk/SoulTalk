// src/services/localAIService.ts

import { Emotion } from '../../../types';

const getFaceApi = () => (window as any).faceapi;

/* ---------------- STATE ---------------- */

let areFaceModelsLoaded = false;
let isFaceModelLoading = false;

/* ---------------- TEXT SENTIMENT (DISABLED LOCAL MODEL) ---------------- */

// For now we skip loading the heavy Transformers.js sentiment model to avoid
// network/HTML errors in constrained environments. This function simply
// returns null so callers can gracefully fall back (e.g. to cloud models).
export const detectLocalSentiment = async (
  _text: string
): Promise<{ label: string; score: number } | null> => {
  return null;
};

/* ---------------- FACE EMOTION ---------------- */

// Prefer local models in /public/face-models, fallback to CDN if missing
const MODEL_URLS = [
  '/face-models',
  'https://justadudewhohacks.github.io/face-api.js/models'
];

export const loadFaceModels = async () => {
  if (areFaceModelsLoaded || isFaceModelLoading) return;

  const faceapi = getFaceApi();
  if (!faceapi) return;

  isFaceModelLoading = true;
  try {
    for (const url of MODEL_URLS) {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(url),
          faceapi.nets.faceExpressionNet.loadFromUri(url)
        ]);
        areFaceModelsLoaded = true;
        break;
      } catch (err) {
        console.warn(`Face model load failed from ${url}, trying next if available`, err);
      }
    }
  } catch (err) {
    console.error("Face Model Loading Error:", err);
  } finally {
    isFaceModelLoading = false;
  }
};

export const detectLocalFaceEmotion = async (
  img: HTMLImageElement | HTMLVideoElement
): Promise<Emotion | null> => {
  const faceapi = getFaceApi();
  if (!faceapi) return null;

  if (!areFaceModelsLoaded) await loadFaceModels();
  if (!areFaceModelsLoaded) return null;

  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions();

  if (!detection) return null;

  const top = Object.entries(detection.expressions).sort(
    (a: any, b: any) => b[1] - a[1]
  )[0][0];

  const map: Record<string, Emotion> = {
    happy: Emotion.HAPPY,
    sad: Emotion.SAD,
    angry: Emotion.ANGRY,
    fearful: Emotion.ANXIOUS,
    surprised: Emotion.SURPRISED,
    neutral: Emotion.NEUTRAL,
    disgusted: Emotion.ANGRY
  };

  return map[top] || Emotion.NEUTRAL;
};

/* ---------------- BASE64 IMAGE SUPPORT ---------------- */

export const detectLocalFaceEmotionFromBase64 = async (
  base64: string
): Promise<Emotion | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const emotion = await detectLocalFaceEmotion(img);
      resolve(emotion);
    };
    img.onerror = () => resolve(null);
    img.src = base64;
  });
};

/* ---------------- CRISIS WORD DETECTION ---------------- */

const CRISIS_WORDS = [
  'suicide',
  'kill myself',
  'end it',
  'hurt myself',
  'cutting',
  'die',
  'kill',
  'death'
];

export const detectLocalCrisis = async (text: string): Promise<boolean> =>
  CRISIS_WORDS.some((w) => text.toLowerCase().includes(w));

/* ---------------- RESPONSE GENERATION ---------------- */

export const generateLocalResponse = (ctx: {
  emotion: Emotion;
  sentiment?: { label: string; score: number };
  crisis: boolean;
}): string => {
  if (ctx.crisis) {
    return "I'm really glad you reached out. You don’t have to face this alone. I'm here with you.";
  }

  // Optionally, you can also modify based on sentiment
  if (ctx.sentiment?.label === 'NEGATIVE') {
    return "I hear you. That sounds tough. Can you tell me more about it?";
  }

  switch (ctx.emotion) {
    case Emotion.SAD:
      return "It sounds like you're feeling low. Want to talk about what's weighing on you?";
    case Emotion.ANGRY:
      return "I can sense frustration. What happened?";
    case Emotion.HAPPY:
      return "That’s good to hear 🙂 What’s been going well?";
    case Emotion.ANXIOUS:
      return "It seems like something is worrying you. Take a breath—I'm listening.";
    case Emotion.SURPRISED:
      return "Oh! That sounds unexpected. Tell me more.";
    default:
      return "I'm here for you. Tell me more.";
  }
};
