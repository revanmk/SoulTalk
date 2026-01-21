import { GoogleGenAI, Chat } from '@google/genai';
import { SOUL_TALK_SYSTEM_INSTRUCTION } from '../../constants';

let genAI: GoogleGenAI | null = null;
let chat: Chat | null = null;

const getAI = () => {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY
    });
  }
  return genAI;
};

export const startChatSession = async () => {
  const ai = getAI();
  chat = ai.chats.create({
    model: 'gemini-flash-latest',
    config: { systemInstruction: SOUL_TALK_SYSTEM_INSTRUCTION }
  });
  return chat;
};

export const sendMessageToSoulTalk = async (
  message: string
): Promise<string> => {
  if (!chat) await startChatSession();
  const res = await chat!.sendMessage({ message });
  return res.text || "I'm here with you.";
};

export const summarizeChatHistory = async (
  transcript: string
): Promise<string> => {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: { role: 'user', parts: [{ text: transcript }] }
  });
  return res.text || 'Summary unavailable.';
};
