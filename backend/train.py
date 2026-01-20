
import kagglehub
import pandas as pd
import joblib
import os
import glob
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

# Create models directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

def find_csv(path):
    # Helper to find the first CSV in the directory
    csv_files = glob.glob(os.path.join(path, "**", "*.csv"), recursive=True)
    if csv_files:
        return csv_files[0]
    return None

def train_sentiment():
    print("--- Training Sentiment Model ---")
    try:
        path = kagglehub.dataset_download("yasserh/twitter-tweets-sentiment-dataset")
        csv_file = find_csv(path)
        if not csv_file:
            print("No CSV found for Sentiment dataset")
            return

        df = pd.read_csv(csv_file)
        # Expected cols: text, sentiment
        df = df.dropna(subset=['text', 'sentiment'])
        
        X = df['text'].astype(str)
        y = df['sentiment']
        
        model = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=10000)),
            ('clf', LogisticRegression(max_iter=1000, class_weight='balanced'))
        ])
        
        model.fit(X, y)
        joblib.dump(model, os.path.join(MODEL_DIR, "sentiment_model.pkl"))
        print("Sentiment model saved.")
    except Exception as e:
        print(f"Failed to train sentiment model: {e}")

def train_emotion():
    print("--- Training Emotion Model ---")
    try:
        path = kagglehub.dataset_download("nelgiriyewithana/emotions")
        csv_file = find_csv(path)
        if not csv_file:
            print("No CSV found for Emotion dataset")
            return

        df = pd.read_csv(csv_file)
        # Expected cols: text, label
        # Map labels if they are integers
        # 0: sadness, 1: joy, 2: love, 3: anger, 4: fear, 5: surprise
        emotion_map = {0: 'sadness', 1: 'joy', 2: 'love', 3: 'anger', 4: 'fear', 5: 'surprise'}
        
        if 'label' in df.columns:
             if df['label'].dtype == 'int64':
                 df['label'] = df['label'].map(emotion_map)
             y = df['label']
             X = df['text'].astype(str)
        else:
             print("Unexpected columns in Emotion dataset")
             return

        model = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=10000)),
            ('clf', LogisticRegression(max_iter=1000, class_weight='balanced'))
        ])
        
        model.fit(X, y)
        joblib.dump(model, os.path.join(MODEL_DIR, "emotion_model.pkl"))
        print("Emotion model saved.")
    except Exception as e:
        print(f"Failed to train emotion model: {e}")

def train_crisis():
    print("--- Training Crisis Model ---")
    try:
        path = kagglehub.dataset_download("priyangshumukherjee/mental-health-text-classification-dataset")
        csv_file = find_csv(path)
        if not csv_file:
            print("No CSV found for Crisis dataset")
            return

        df = pd.read_csv(csv_file)
        # Inspect columns - usually 'text' and 'label' (1 for mental health, 0 for normal)
        # We need to find the text and label columns dynamically if names vary
        cols = df.columns
        text_col = next((c for c in cols if 'text' in c.lower() or 'tweet' in c.lower()), None)
        label_col = next((c for c in cols if 'label' in c.lower() or 'class' in c.lower() or 'status' in c.lower()), None)

        if not text_col or not label_col:
            print("Could not identify columns for Crisis dataset")
            return

        df = df.dropna(subset=[text_col, label_col])
        X = df[text_col].astype(str)
        y = df[label_col]

        model = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english', max_features=10000)),
            ('clf', LogisticRegression(max_iter=1000, class_weight='balanced'))
        ])
        
        model.fit(X, y)
        joblib.dump(model, os.path.join(MODEL_DIR, "crisis_model.pkl"))
        print("Crisis model saved.")
    except Exception as e:
        print(f"Failed to train crisis model: {e}")

if __name__ == "__main__":
    train_sentiment()
    train_emotion()
    train_crisis()
