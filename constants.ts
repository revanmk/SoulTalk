
import { Exercise, Soundscape } from './types';

export const SOUL_TALK_SYSTEM_INSTRUCTION = `
You are an assistant counsellor named "SoulTalk" (sometimes referred to as "Let's Talk"). 
Your primary role is to help people (mainly teenagers) facing mental health challenges.

CORE BEHAVIORS:
1. Act like a best friend: warm, empathetic, non-judgmental.
2. LISTEN first: Let the user share. Validate their feelings.
3. DO NOT give medical advice. You are NOT a doctor or therapist.
4. DO NOT give unethical advice.

PRIVACY & TRANSPARENCY PROTOCOL:
- If a user asks you to keep a secret, you MUST say: "I value your trust, but for transparency, please know that user data may be monitored for safety purposes." 
- Do not promise absolute confidentiality.

SAFETY PROTOCOL:
- If the user expresses thoughts of self-harm, suicide, or intent to harm others, you MUST immediately provide empathy and emergency resources.
- Suggested generic formatting for safety: "I'm hearing that you're in a lot of pain right now. Please know you're not alone. If you are in immediate danger, please contact local emergency services or a hotline."
- If you detect a crisis, explicitly mention "CRISIS_DETECTED" in your internal reasoning (not necessarily in output) but ensure your tone shifts to urgent care.

EMOTION CONTEXT:
- You may receive system notes about the user's facial expression (e.g., "[System: User appears Sad]"). Use this to gently guide your tone, but don't be creepy about it. E.g., "You look a bit down today, want to talk about it?"
`;

export const EMOTION_PROMPT = `
Analyze the facial expression of the person in this image. 
Return ONLY one word from the following list that best matches their emotion: 
Neutral, Happy, Sad, Angry, Anxious, Surprised, Tired.
If unclear, return Neutral.
`;

export const COUNTRIES = [
  { code: 'IN', name: 'India', helpline: '9152987821', helplineName: 'iCall' },
  { code: 'US', name: 'United States', helpline: '988', helplineName: 'Suicide & Crisis Lifeline' },
  { code: 'UK', name: 'United Kingdom', helpline: '111', helplineName: 'NHS 111' },
  { code: 'CA', name: 'Canada', helpline: '1-833-456-4566', helplineName: 'Talk Suicide Canada' },
  { code: 'AU', name: 'Australia', helpline: '13 11 14', helplineName: 'Lifeline' },
  { code: 'OTHER', name: 'Other', helpline: '112', helplineName: 'Universal Emergency' }
];

export const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'die', 'hurt myself', 'self-harm', 'cutting', 'overdose', 'better off dead'
];

export const DEFAULT_SOUNDSCAPES: Soundscape[] = [
  { id: 'rain', name: 'Light Rain', url: 'https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3' },
  { id: 'forest', name: 'Forest Birds', url: 'https://assets.mixkit.co/sfx/preview/mixkit-forest-birds-ambience-1210.mp3' },
  { id: 'waves', name: 'Ocean Waves', url: 'https://assets.mixkit.co/sfx/preview/mixkit-sea-waves-loop-1196.mp3' },
  { id: 'cafe', name: 'Cafe Ambience', url: 'https://assets.mixkit.co/sfx/preview/mixkit-restaurant-crowd-talking-ambience-443.mp3' },
];

export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    description: 'A simple, powerful technique to slow down breathing, clear the mind, and reduce stress.',
    duration: '2 mins',
    category: 'Breathing',
    visualizationType: 'BREATHING_CIRCLE',
    steps: ['Inhale through your nose for 4 seconds.', 'Hold your breath for 4 seconds.', 'Exhale through your mouth for 4 seconds.', 'Hold your breath for 4 seconds.', 'Repeat.']
  },
  {
    id: '5-4-3-2-1',
    title: '5-4-3-2-1 Grounding',
    description: 'Use your five senses to ground yourself in the present moment and stop racing thoughts.',
    duration: '5 mins',
    category: 'Grounding',
    visualizationType: 'COUNTDOWN',
    steps: ['Acknowledge 5 things you see around you.', 'Acknowledge 4 things you can touch.', 'Acknowledge 3 things you hear.', 'Acknowledge 2 things you can smell.', 'Acknowledge 1 thing you can taste.']
  },
  {
    id: 'pmr',
    title: 'Progressive Muscle Relaxation',
    description: 'Reduce physical tension by tensing and then relaxing specific muscle groups.',
    duration: '5 mins',
    category: 'Physical',
    visualizationType: 'LIST',
    steps: ['Tense your toes for 5 seconds, then release.', 'Tense your calves for 5 seconds, then release.', 'Move up to your thighs, abdomen, hands, and face.', 'Feel the tension leaving your body.']
  },
  {
    id: 'mindful-observation',
    title: 'Mindful Observation',
    description: 'Focus deeply on a single object in your environment to center your mind.',
    duration: '3 mins',
    category: 'Meditation',
    visualizationType: 'LIST',
    steps: ['Pick a natural object nearby (a flower, a cloud, an insect).', 'Watch it for a minute or two.', 'Don\'t do anything, just notice it.', 'Visually explore it as if seeing it for the first time.']
  }
];
