"""
AI Controller - API endpoints for AI services.

Exposes endpoints for text analysis, face emotion detection, and chat.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from services.text_analysis_service import (
    analyze_sentiment,
    analyze_emotion,
    detect_crisis,
    analyze_text_complete
)
from services.vision_service import detect_face_emotion
from services.gemini_service import (
    generate_chat_response,
    summarize_conversation,
    reset_chat_session
)


router = APIRouter(prefix="/api/ai", tags=["AI"])


# --- Request/Response Models ---

class TextAnalysisRequest(BaseModel):
    text: str


class TextAnalysisResponse(BaseModel):
    text: str
    sentiment: str
    sentiment_score: float
    emotion: str
    emotion_confidence: float
    is_crisis: bool
    crisis_confidence: float
    crisis_triggers: List[str]
    sources: Dict[str, str]


class FaceEmotionRequest(BaseModel):
    image: str  # Base64 encoded image


class FaceEmotionResponse(BaseModel):
    emotion: str
    confidence: float
    face_detected: bool
    source: str
    metrics: Optional[Dict[str, float]] = None
    error: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    emotion_context: Optional[str] = None
    is_crisis: Optional[bool] = False


class ChatResponse(BaseModel):
    response: str
    source: str
    error: Optional[str] = None


class ConversationMessage(BaseModel):
    role: str
    text: str


class SummarizeRequest(BaseModel):
    messages: List[ConversationMessage]


class SummarizeResponse(BaseModel):
    summary: str
    source: str


# --- Endpoints ---

@router.post("/analyze-text", response_model=TextAnalysisResponse)
async def analyze_text_endpoint(request: TextAnalysisRequest):
    """
    Complete text analysis: sentiment, emotion, and crisis detection.
    Uses HuggingFace models with keyword fallback.
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    result = analyze_text_complete(request.text)
    return TextAnalysisResponse(**result)


@router.post("/sentiment")
async def sentiment_endpoint(request: TextAnalysisRequest):
    """Analyze sentiment only."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return analyze_sentiment(request.text)


@router.post("/emotion")
async def emotion_endpoint(request: TextAnalysisRequest):
    """Detect emotion only."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return analyze_emotion(request.text)


@router.post("/crisis")
async def crisis_endpoint(request: TextAnalysisRequest):
    """Detect crisis only."""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    emotion_result = analyze_emotion(request.text)
    return detect_crisis(request.text, emotion_result)


@router.post("/analyze-face", response_model=FaceEmotionResponse)
async def analyze_face_endpoint(request: FaceEmotionRequest):
    """
    Detect emotion from a face image.
    Uses MediaPipe FaceMesh for landmark analysis.
    """
    if not request.image:
        raise HTTPException(status_code=400, detail="Image cannot be empty")
    
    # Log that we received a face analysis request
    image_size = len(request.image) if request.image else 0
    print(f"[FACE EMOTION] Received image ({image_size} chars)")
    
    result = detect_face_emotion(request.image)
    
    # Log the result
    print(f"[FACE EMOTION] Result: emotion={result.get('emotion')}, confidence={result.get('confidence'):.2f}, face_detected={result.get('face_detected')}, source={result.get('source')}")
    if result.get('metrics'):
        m = result['metrics']
        print(f"[FACE EMOTION] Metrics: smile={m.get('smile', 0):.3f}, mouth_open={m.get('mouth_open', 0):.3f}, eye_openness={m.get('eye_openness', 0):.3f}, brow_raise={m.get('brow_raise', 0):.3f}")
    
    return FaceEmotionResponse(**result)


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Generate a contextual chat response.
    Uses Gemini with fallback to rule-based responses.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    result = generate_chat_response(
        message=request.message,
        emotion_context=request.emotion_context,
        is_crisis=request.is_crisis or False
    )
    return ChatResponse(**result)


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(request: SummarizeRequest):
    """
    Summarize a conversation.
    Uses Gemini with fallback to simple concatenation.
    """
    messages = [{"role": m.role, "text": m.text} for m in request.messages]
    result = summarize_conversation(messages)
    return SummarizeResponse(**result)


@router.post("/reset-chat")
async def reset_chat_endpoint():
    """Reset the Gemini chat session."""
    reset_chat_session()
    return {"status": "ok", "message": "Chat session reset"}


@router.get("/health")
async def health_check():
    """Check AI services health."""
    return {
        "status": "ok",
        "services": {
            "text_analysis": "available",
            "vision": "available",
            "gemini": "available"
        }
    }
