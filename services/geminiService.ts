
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { SOUL_TALK_SYSTEM_INSTRUCTION, EMOTION_PROMPT } from '../constants';
import { Emotion } from '../types';

let genAI: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAI = (): GoogleGenAI => {
  if (!genAI) {
    if (!process.env.API_KEY) {
      throw new Error("API Key not found");
    }
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return genAI;
};

export const startChatSession = async (): Promise<Chat> => {
  const ai = getAI();
  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SOUL_TALK_SYSTEM_INSTRUCTION,
      temperature: 0.7, // Slightly creative for warmth
    },
  });
  return chatSession;
};

export const sendMessageToSoulTalk = async (message: string): Promise<string> => {
  if (!chatSession) {
    await startChatSession();
  }
  if (!chatSession) {
     throw new Error("Failed to initialize chat");
  }

  try {
    const result: GenerateContentResponse = await chatSession.sendMessage({ message });
    return result.text || "I'm here, but I'm having trouble finding the right words properly. Can you say that again?";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm sorry, I seem to be having connection issues. But I'm still listening.";
  }
};

export const summarizeChatHistory = async (transcript: string): Promise<string> => {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Summarize the following conversation in 2-3 sentences, focusing on the user's emotional state and key topics:\n\n${transcript}`,
        });
        return response.text || "Could not generate summary.";
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        return "Unable to generate summary at this time.";
    }
};

export const analyzeEmotion = async (base64Image: string): Promise<Emotion> => {
  const ai = getAI();
  
  // Clean base64 string if it contains metadata header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          { text: EMOTION_PROMPT }
        ]
      }
    });

    const text = response.text?.trim();
    // Validate if it matches our Enum
    if (text && Object.values(Emotion).includes(text as Emotion)) {
      return text as Emotion;
    }
    return Emotion.NEUTRAL;
  } catch (error) {
    console.error("Emotion Detection Error:", error);
    return Emotion.NEUTRAL;
  }
};
