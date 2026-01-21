"""
Gemini Service - Fallback AI for chat responses.

Uses Google's Gemini API for generating contextual chat responses
when primary models are unavailable or for complex conversations.
"""

import os
from typing import Optional, List, Dict, Any

# Lazy loading
_genai = None
_chat_session = None

SYSTEM_INSTRUCTION = """You are SoulTalk, a compassionate and supportive mental health companion AI.

Your role is to:
1. Listen actively and empathetically to users
2. Provide emotional support without judgment
3. Offer gentle coping strategies when appropriate
4. Recognize signs of distress and respond with care
5. Encourage professional help when needed

Guidelines:
- Be warm, understanding, and patient
- Use "I" statements and validate feelings
- Don't diagnose or prescribe medications
- If someone is in crisis, prioritize safety and suggest crisis resources
- Keep responses concise but caring (2-4 sentences usually)
- Mirror the user's emotional tone appropriately

Remember: You are a supportive companion, not a replacement for professional mental health care.
"""


def _get_genai():
    """Lazy load Gemini client."""
    global _genai
    if _genai is None:
        try:
            import google.generativeai as genai
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                _genai = genai
                print("Gemini SDK initialized successfully")
            else:
                print("WARNING: GEMINI_API_KEY not found in environment")
                _genai = "no_key"
        except Exception as e:
            print(f"Failed to initialize Gemini: {e}")
            _genai = "failed"
    return _genai if _genai not in ["failed", "no_key"] else None


def _get_or_create_chat():
    """Get or create a chat session."""
    global _chat_session
    genai = _get_genai()
    
    if not genai:
        return None
    
    if _chat_session is None:
        try:
            model = genai.GenerativeModel(
                model_name='gemini-2.0-flash',
                system_instruction=SYSTEM_INSTRUCTION
            )
            _chat_session = model.start_chat(history=[])
            print("Gemini chat session created")
        except Exception as e:
            print(f"Failed to create chat session: {e}")
            return None
    
    return _chat_session


def generate_chat_response(
    message: str,
    emotion_context: Optional[str] = None,
    is_crisis: bool = False,
    conversation_history: Optional[List[Dict]] = None
) -> Dict[str, Any]:
    """
    Generate a chat response using Gemini.
    
    Args:
        message: User's message
        emotion_context: Detected emotion (e.g., "sad", "happy")
        is_crisis: Whether crisis was detected
        conversation_history: Optional list of previous messages
    
    Returns:
        {
            "response": str,
            "source": "gemini" | "fallback",
            "error": str (if any)
        }
    """
    # Crisis override - always use safe response
    if is_crisis:
        return {
            "response": (
                "I hear you, and I'm really glad you reached out. What you're feeling matters, "
                "and you don't have to face this alone. If you're in immediate danger, please "
                "contact a crisis helpline or emergency services. I'm here to listen and support you."
            ),
            "source": "crisis_protocol"
        }
    
    chat = _get_or_create_chat()
    
    if chat:
        try:
            # Build context-aware prompt
            context_prefix = ""
            if emotion_context:
                context_prefix = f"[User seems to be feeling {emotion_context}] "
            
            full_message = context_prefix + message
            
            response = chat.send_message(full_message)
            
            return {
                "response": response.text,
                "source": "gemini"
            }
        except Exception as e:
            print(f"Gemini response generation failed: {e}")
            # Fall through to fallback
    
    # === PRIORITY 3: Rule-based fallback ===
    
    # Enhanced fallback responses - multiple options per emotion for variety
    import random
    import hashlib
    
    fallback_responses = {
        "happy": [
            "That's wonderful to hear! 😊 What's bringing you joy today?",
            "I love hearing that! What made today special for you?",
            "That positivity is contagious! Want to share what's going well?",
            "Happiness looks good on you! Tell me more about it.",
            "That's great! Celebrating the good moments is so important. What happened?"
        ],
        "joy": [
            "Such joyful energy! What's making you feel this way?",
            "That's beautiful! I'd love to hear more about what's bringing you joy.",
            "Wonderful! Let's savor this good feeling together. What's the story?"
        ],
        "sad": [
            "I hear you. It's okay to feel this way. Would you like to talk about what's on your mind?",
            "That sounds really hard. I'm here to listen whenever you're ready to share.",
            "It takes courage to acknowledge when we're feeling down. What's weighing on your heart?",
            "I'm sorry you're going through this. Sometimes just talking helps - what's happening?",
            "Feeling sad is part of being human. You don't have to carry this alone. What's going on?"
        ],
        "sadness": [
            "I can sense you're going through something difficult. Want to talk about it?",
            "It's okay to not be okay. I'm here for you - what's troubling you?",
            "Sometimes life gets heavy. I'm listening. What would help to get off your chest?"
        ],
        "angry": [
            "It sounds like something is frustrating you. Take a deep breath - I'm here to listen.",
            "I can hear the frustration. What's going on that's making you feel this way?",
            "Anger is a signal that something matters to you. What happened?",
            "It's okay to feel angry. Let it out - what's bothering you?",
            "That sounds really frustrating. Tell me what's going on."
        ],
        "anger": [
            "Those feelings are valid. What triggered this frustration?",
            "I hear you. Sometimes we need to vent. What's on your mind?",
            "Anger can be overwhelming. Let's talk through it - what happened?"
        ],
        "fearful": [
            "I understand that can feel scary. You're safe here. What's worrying you?",
            "Fear is a tough emotion. You're not alone in this. What's on your mind?",
            "It's brave to acknowledge when we're scared. What's making you feel this way?",
            "I'm here with you. Let's work through those worries together."
        ],
        "fear": [
            "That sounds unsettling. What specifically is making you feel afraid?",
            "Fear can be overwhelming, but you don't have to face it alone. Tell me more."
        ],
        "anxious": [
            "It's natural to feel anxious sometimes. Let's take this one step at a time.",
            "Anxiety can be overwhelming. Take a breath - I'm here with you.",
            "I understand that feeling. What's making you anxious right now?",
            "Let's slow down together. What's weighing on your mind?",
            "Anxiety is tough. Sometimes talking through it helps. What's going on?"
        ],
        "surprised": [
            "Oh! That sounds unexpected. Tell me more about what happened.",
            "Wow, that sounds like quite a surprise! What's the story?",
            "Life can throw curveballs! How are you processing this surprise?"
        ],
        "surprise": [
            "That caught you off guard! How do you feel about it?",
            "Unexpected moments can be a lot to handle. Tell me more."
        ],
        "neutral": [
            "I'm here for you. What would you like to talk about?",
            "How can I support you today?",
            "I'm listening. What's on your mind?",
            "Tell me what's going on with you today.",
            "I'm here whenever you're ready to share."
        ],
        "disgust": [
            "That sounds really unpleasant. What happened?",
            "I can hear that was disturbing. Want to talk about it?"
        ]
    }
    
    # Get responses for the detected emotion
    emotion_key = (emotion_context or "neutral").lower()
    response_options = fallback_responses.get(emotion_key, fallback_responses["neutral"])
    
    # Use message hash to pick a consistent response for similar messages
    # But different messages get different responses
    message_hash = int(hashlib.md5(message.encode()).hexdigest(), 16)
    response_index = message_hash % len(response_options)
    response = response_options[response_index]
    
    return {
        "response": response,
        "source": "fallback",
        "error": "Gemini unavailable, using rule-based response"
    }


def reset_chat_session():
    """Reset the chat session for a new conversation."""
    global _chat_session
    _chat_session = None
    print("Chat session reset")


def summarize_conversation(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Generate a summary of the conversation using Gemini.
    
    Args:
        messages: List of {"role": str, "text": str} dicts
    
    Returns:
        {"summary": str, "source": "gemini" | "fallback"}
    """
    genai = _get_genai()
    
    if not genai or not messages:
        # Fallback: simple concatenation
        if not messages:
            return {"summary": "No conversation yet.", "source": "empty"}
        
        recent = messages[-5:]
        summary = " | ".join([f"{m.get('role', 'unknown')}: {m.get('text', '')[:50]}" for m in recent])
        return {"summary": f"Recent: {summary}", "source": "fallback"}
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Format messages for summarization
        transcript = "\n".join([
            f"{m.get('role', 'User')}: {m.get('text', '')}" 
            for m in messages
        ])
        
        prompt = f"""Summarize this mental health support conversation in 2-3 sentences. 
Focus on the key emotions and topics discussed.

Conversation:
{transcript}

Summary:"""
        
        response = model.generate_content(prompt)
        
        return {
            "summary": response.text,
            "source": "gemini"
        }
    except Exception as e:
        print(f"Summarization failed: {e}")
        recent = messages[-3:]
        summary = " → ".join([m.get('text', '')[:30] for m in recent])
        return {"summary": f"Topics: {summary}...", "source": "fallback"}
