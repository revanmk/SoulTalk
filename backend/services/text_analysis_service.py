"""
Text Analysis Service using HuggingFace Transformers

Provides sentiment analysis, emotion detection, and crisis detection
using pre-trained models with Gemini as fallback.
"""

import os
from typing import Optional, Dict, Any
from functools import lru_cache

# Lazy loading for transformers to speed up startup
_sentiment_pipeline = None
_emotion_pipeline = None


def _get_sentiment_pipeline():
    """Lazy load sentiment analysis pipeline."""
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        try:
            from transformers import pipeline
            print("Loading sentiment model: cardiffnlp/twitter-roberta-base-sentiment-latest")
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=-1  # CPU
            )
            print("Sentiment model loaded successfully")
        except Exception as e:
            print(f"Failed to load sentiment model: {e}")
            _sentiment_pipeline = "failed"
    return _sentiment_pipeline if _sentiment_pipeline != "failed" else None


def _get_emotion_pipeline():
    """Lazy load emotion detection pipeline."""
    global _emotion_pipeline
    if _emotion_pipeline is None:
        try:
            from transformers import pipeline
            print("Loading emotion model: j-hartmann/emotion-english-distilroberta-base")
            _emotion_pipeline = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                device=-1,  # CPU
                top_k=None  # Return all scores
            )
            print("Emotion model loaded successfully")
        except Exception as e:
            print(f"Failed to load emotion model: {e}")
            _emotion_pipeline = "failed"
    return _emotion_pipeline if _emotion_pipeline != "failed" else None


# Crisis detection keywords as fallback
CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'kill me', 'want to die', 'end my life',
    'end it all', 'hurt myself', 'self harm', 'cutting myself',
    'overdose', 'not worth living', 'better off dead', 'no reason to live',
    'can\'t go on', 'give up', 'hopeless', 'worthless'
]

# High-risk emotions that may indicate crisis
CRISIS_EMOTIONS = ['fear', 'sadness', 'disgust']


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Analyze sentiment of text using HuggingFace model.
    
    Returns:
        {
            "label": "positive" | "negative" | "neutral",
            "score": float (0-1 confidence),
            "source": "huggingface" | "fallback"
        }
    """
    if not text or len(text.strip()) == 0:
        return {"label": "neutral", "score": 0.5, "source": "empty"}
    
    pipeline = _get_sentiment_pipeline()
    
    if pipeline:
        try:
            result = pipeline(text[:512])[0]  # Limit text length
            print(f"[SENTIMENT] HuggingFace result: {result}")
            # Map model labels to standard labels
            label_map = {
                "positive": "positive",
                "negative": "negative",
                "neutral": "neutral",
                "POSITIVE": "positive",
                "NEGATIVE": "negative",
                "NEUTRAL": "neutral",
                "LABEL_0": "negative",
                "LABEL_1": "neutral", 
                "LABEL_2": "positive"
            }
            mapped_label = label_map.get(result["label"], result["label"].lower())
            print(f"[SENTIMENT] Mapped label: {mapped_label}, Score: {result['score']:.4f}")
            return {
                "label": mapped_label,
                "score": result["score"],
                "source": "huggingface"
            }
        except Exception as e:
            print(f"Sentiment analysis failed: {e}")
    
    # Fallback: simple keyword-based
    print("[SENTIMENT] Using fallback keyword analysis")
    text_lower = text.lower()
    positive_words = ['happy', 'good', 'great', 'love', 'excellent', 'wonderful', 'amazing']
    negative_words = ['sad', 'bad', 'hate', 'terrible', 'awful', 'horrible', 'angry']
    
    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)
    
    if pos_count > neg_count:
        return {"label": "positive", "score": 0.6, "source": "fallback"}
    elif neg_count > pos_count:
        return {"label": "negative", "score": 0.6, "source": "fallback"}
    return {"label": "neutral", "score": 0.5, "source": "fallback"}


def analyze_emotion(text: str) -> Dict[str, Any]:
    """
    Detect emotion from text using HuggingFace model.
    """
    if not text or len(text.strip()) == 0:
        return {"emotion": "neutral", "confidence": 0.5, "all_emotions": {}, "source": "empty"}
    
    pipeline = _get_emotion_pipeline()
    
    if pipeline:
        try:
            results = pipeline(text[:512])[0]  # Returns list of all emotions
            print(f"[EMOTION] HuggingFace result: {results}")
            # Find top emotion
            if isinstance(results, list):
                emotions_dict = {r["label"]: r["score"] for r in results}
                top_emotion = max(results, key=lambda x: x["score"])
            else:
                emotions_dict = {results["label"]: results["score"]}
                top_emotion = results
            
            print(f"[EMOTION] Top emotion: {top_emotion['label']} ({top_emotion['score']:.4f})")
            return {
                "emotion": top_emotion["label"],
                "confidence": top_emotion["score"],
                "all_emotions": emotions_dict,
                "source": "huggingface"
            }
        except Exception as e:
            print(f"Emotion detection failed: {e}")
    
    # Fallback: keyword-based emotion detection
    text_lower = text.lower()
    emotion_keywords = {
        "joy": ["happy", "glad", "excited", "wonderful", "great", "love"],
        "sadness": ["sad", "depressed", "unhappy", "miserable", "crying", "lonely"],
        "anger": ["angry", "furious", "mad", "annoyed", "frustrated", "hate"],
        "fear": ["scared", "afraid", "worried", "anxious", "nervous", "terrified"],
        "surprise": ["surprised", "shocked", "amazed", "unexpected", "wow"]
    }
    
    for emotion, keywords in emotion_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return {"emotion": emotion, "confidence": 0.6, "all_emotions": {}, "source": "fallback"}
    
    return {"emotion": "neutral", "confidence": 0.5, "all_emotions": {}, "source": "fallback"}


def detect_crisis(text: str, emotion_result: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Detect if text indicates a mental health crisis.
    Uses keyword matching + emotion analysis for higher accuracy.
    
    Returns:
        {
            "is_crisis": bool,
            "confidence": float,
            "triggers": list of matched keywords/signals,
            "source": "keyword" | "emotion" | "combined"
        }
    """
    if not text or len(text.strip()) == 0:
        return {"is_crisis": False, "confidence": 0.0, "triggers": [], "source": "empty"}
    
    text_lower = text.lower()
    triggers = []
    
    # Check keywords
    for keyword in CRISIS_KEYWORDS:
        if keyword in text_lower:
            triggers.append(f"keyword:{keyword}")
    
    # Check if emotion indicates distress
    if emotion_result:
        emotion = emotion_result.get("emotion", "").lower()
        confidence = emotion_result.get("confidence", 0)
        if emotion in CRISIS_EMOTIONS and confidence > 0.7:
            triggers.append(f"emotion:{emotion}")
    
    # Determine crisis status
    keyword_match = any(t.startswith("keyword:") for t in triggers)
    emotion_match = any(t.startswith("emotion:") for t in triggers)
    
    if keyword_match and emotion_match:
        return {"is_crisis": True, "confidence": 0.95, "triggers": triggers, "source": "combined"}
    elif keyword_match:
        return {"is_crisis": True, "confidence": 0.85, "triggers": triggers, "source": "keyword"}
    elif emotion_match and len(text) > 50:  # Only flag emotions for longer texts
        return {"is_crisis": True, "confidence": 0.6, "triggers": triggers, "source": "emotion"}
    
    return {"is_crisis": False, "confidence": 0.1, "triggers": [], "source": "none"}


def analyze_text_complete(text: str) -> Dict[str, Any]:
    """
    Complete text analysis: sentiment, emotion, and crisis detection.
    
    Returns combined results from all analyzers.
    """
    sentiment_result = analyze_sentiment(text)
    emotion_result = analyze_emotion(text)
    crisis_result = detect_crisis(text, emotion_result)
    
    return {
        "text": text[:100] + "..." if len(text) > 100 else text,
        "sentiment": sentiment_result["label"],
        "sentiment_score": sentiment_result["score"],
        "emotion": emotion_result["emotion"],
        "emotion_confidence": emotion_result["confidence"],
        "is_crisis": crisis_result["is_crisis"],
        "crisis_confidence": crisis_result["confidence"],
        "crisis_triggers": crisis_result["triggers"],
        "sources": {
            "sentiment": sentiment_result["source"],
            "emotion": emotion_result["source"],
            "crisis": crisis_result["source"]
        }
    }
