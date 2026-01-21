"""
Vision Service using MediaPipe Tasks for facial emotion detection.

Uses MediaPipe Face Landmarker (new Tasks API) to analyze facial expressions
and map them to emotion categories.
"""

import base64
import os
from typing import Dict, Any, Optional

# Lazy loading
_face_landmarker = None
_landmarker_initialized = False


def _download_model():
    """Download the face landmarker model if not present."""
    import urllib.request
    
    model_path = os.path.join(os.path.dirname(__file__), "face_landmarker.task")
    
    if os.path.exists(model_path):
        return model_path
    
    print("Downloading face landmarker model...")
    model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    
    try:
        urllib.request.urlretrieve(model_url, model_path)
        print(f"Model downloaded to {model_path}")
        return model_path
    except Exception as e:
        print(f"Failed to download model: {e}")
        return None


def _get_face_landmarker():
    """Lazy load MediaPipe Face Landmarker."""
    global _face_landmarker, _landmarker_initialized
    
    if _landmarker_initialized:
        return _face_landmarker
    
    _landmarker_initialized = True
    
    try:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        
        # Download model if needed
        model_path = _download_model()
        if not model_path:
            print("Face landmarker model not available")
            return None
        
        # Create options
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=True,
            num_faces=1
        )
        
        _face_landmarker = vision.FaceLandmarker.create_from_options(options)
        print("MediaPipe Face Landmarker loaded successfully")
        return _face_landmarker
        
    except Exception as e:
        print(f"Failed to load MediaPipe Face Landmarker: {e}")
        return None


def _decode_base64_image(base64_string: str):
    """Decode base64 image string to MediaPipe Image."""
    try:
        import numpy as np
        import mediapipe as mp
        
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to numpy array using PIL (more reliable)
        from PIL import Image
        import io
        
        pil_image = Image.open(io.BytesIO(image_data))
        rgb_image = pil_image.convert('RGB')
        numpy_image = np.array(rgb_image)
        
        # Create MediaPipe Image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=numpy_image)
        
        return mp_image
        
    except Exception as e:
        print(f"Failed to decode base64 image: {e}")
        return None


def _blendshapes_to_emotion(blendshapes: list) -> tuple:
    """
    Map face blendshapes to emotion category.
    
    Key blendshapes for emotions:
    - mouthSmileLeft/Right: happiness
    - browDownLeft/Right: anger
    - browInnerUp: surprise/sadness
    - eyeSquintLeft/Right: happiness
    - jawOpen: surprise
    - mouthFrownLeft/Right: sadness
    """
    # Create a dict for easy access
    shapes = {}
    for shape in blendshapes:
        shapes[shape.category_name] = shape.score
    
    # Get key metrics
    smile = (shapes.get('mouthSmileLeft', 0) + shapes.get('mouthSmileRight', 0)) / 2
    frown = (shapes.get('mouthFrownLeft', 0) + shapes.get('mouthFrownRight', 0)) / 2
    brow_down = (shapes.get('browDownLeft', 0) + shapes.get('browDownRight', 0)) / 2
    brow_up = shapes.get('browInnerUp', 0)
    jaw_open = shapes.get('jawOpen', 0)
    eye_wide = (shapes.get('eyeWideLeft', 0) + shapes.get('eyeWideRight', 0)) / 2
    eye_squint = (shapes.get('eyeSquintLeft', 0) + shapes.get('eyeSquintRight', 0)) / 2
    
    # Log metrics for debugging
    print(f"[BLENDSHAPES] smile={smile:.3f}, frown={frown:.3f}, brow_down={brow_down:.3f}, brow_up={brow_up:.3f}, jaw_open={jaw_open:.3f}, eye_wide={eye_wide:.3f}")
    
    # Decision logic
    if smile > 0.3 and eye_squint > 0.2:
        return ("happy", min(0.5 + smile, 1.0))
    elif frown > 0.3:
        return ("sad", 0.6 + frown * 0.3)
    elif brow_down > 0.3:
        return ("angry", 0.6 + brow_down * 0.3)
    elif jaw_open > 0.4 and eye_wide > 0.3:
        return ("surprised", 0.7)
    elif brow_up > 0.3 and eye_wide > 0.2:
        return ("fearful", 0.6)
    elif smile > 0.15:
        return ("happy", 0.5 + smile * 0.5)
    elif frown > 0.15:
        return ("sad", 0.5)
    else:
        return ("neutral", 0.5)


def detect_face_emotion(base64_image: str) -> Dict[str, Any]:
    """
    Detect emotion from a base64-encoded face image.
    
    Returns:
        {
            "emotion": str,
            "confidence": float,
            "face_detected": bool,
            "metrics": dict (optional blendshape metrics),
            "source": "mediapipe" | "error"
        }
    """
    landmarker = _get_face_landmarker()
    
    if not landmarker:
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
            "source": "error",
            "error": "Face landmarker not available"
        }
    
    # Decode image
    mp_image = _decode_base64_image(base64_image)
    
    if mp_image is None:
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
            "source": "decode_error"
        }
    
    try:
        # Detect faces
        result = landmarker.detect(mp_image)
        
        if not result.face_blendshapes or len(result.face_blendshapes) == 0:
            return {
                "emotion": "neutral",
                "confidence": 0.0,
                "face_detected": False,
                "source": "no_face"
            }
        
        # Get first face's blendshapes
        blendshapes = result.face_blendshapes[0]
        emotion, confidence = _blendshapes_to_emotion(blendshapes)
        
        # Extract key metrics for frontend
        shapes = {s.category_name: round(s.score, 3) for s in blendshapes}
        metrics = {
            "smile": (shapes.get('mouthSmileLeft', 0) + shapes.get('mouthSmileRight', 0)) / 2,
            "frown": (shapes.get('mouthFrownLeft', 0) + shapes.get('mouthFrownRight', 0)) / 2,
            "brow_down": (shapes.get('browDownLeft', 0) + shapes.get('browDownRight', 0)) / 2,
            "jaw_open": shapes.get('jawOpen', 0)
        }
        
        return {
            "emotion": emotion,
            "confidence": confidence,
            "face_detected": True,
            "metrics": metrics,
            "source": "mediapipe"
        }
        
    except Exception as e:
        print(f"Face emotion detection failed: {e}")
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
            "error": str(e),
            "source": "error"
        }


def detect_face_emotion_from_file(file_path: str) -> Dict[str, Any]:
    """Detect emotion from an image file path."""
    try:
        with open(file_path, "rb") as f:
            image_data = f.read()
        base64_string = base64.b64encode(image_data).decode("utf-8")
        return detect_face_emotion(base64_string)
    except Exception as e:
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "face_detected": False,
            "error": str(e),
            "source": "file_error"
        }
