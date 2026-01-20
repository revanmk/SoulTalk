
import os
import joblib
import warnings

# Suppress sklearn warnings about version mismatch if any
warnings.filterwarnings("ignore")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

class AIEngine:
    def __init__(self):
        self.sentiment_model = self._load_model("sentiment_model.pkl")
        self.emotion_model = self._load_model("emotion_model.pkl")
        self.crisis_model = self._load_model("crisis_model.pkl")
        
        # Crisis keywords fallback
        self.crisis_keywords = [
            'suicide', 'kill myself', 'die', 'end it', 'hurt myself', 
            'cutting', 'overdose', 'depressed', 'anxiety', 'help me'
        ]

    def _load_model(self, filename):
        path = os.path.join(MODEL_DIR, filename)
        if os.path.exists(path):
            try:
                print(f"Loading model: {filename}")
                return joblib.load(path)
            except Exception as e:
                print(f"Failed to load {filename}: {e}")
        return None

    def analyze_text(self, text):
        result = {
            "sentiment": "Neutral",
            "emotion": "Neutral",
            "is_crisis": False,
            "confidence": 0.0
        }
        
        if not text:
            return result

        # 1. Sentiment Analysis
        if self.sentiment_model:
            try:
                result["sentiment"] = self.sentiment_model.predict([text])[0]
            except:
                pass
        
        # 2. Emotion Detection
        if self.emotion_model:
            try:
                result["emotion"] = self.emotion_model.predict([text])[0]
            except:
                pass
        
        # 3. Crisis Detection
        if self.crisis_model:
            try:
                # Assuming model returns 1 for crisis, 0 for normal
                pred = self.crisis_model.predict([text])[0]
                # Check mapping. Usually 1 is positive class (crisis/mental health issue)
                if str(pred) == '1' or str(pred).lower() == 'true' or str(pred) == 'crisis':
                    result["is_crisis"] = True
            except:
                pass
        else:
            # Fallback
            if any(k in text.lower() for k in self.crisis_keywords):
                result["is_crisis"] = True
        
        return result

# Singleton instance
ai_engine = AIEngine()
