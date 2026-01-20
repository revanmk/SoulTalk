
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
import models
import schemas
import crud
import database
import security
import time
from ai_engine import ai_engine  # Import the AI Engine

# Create tables if they don't exist
try:
    print("Creating/Verifying tables...")
    models.Base.metadata.create_all(bind=database.engine)
    print("Tables verified.")
except Exception as e:
    print(f"CRITICAL ERROR: Could not connect to Database. Error: {e}")

app = FastAPI()

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Middleware for Logging ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"INCOMING REQUEST: {request.method} {request.url}")
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        print(f"REQUEST FAILED: {e}")
        raise e

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup_db_check():
    db = database.SessionLocal()
    try:
        user_count = db.query(models.User).count()
        print(f"--- STARTUP DIAGNOSTICS ---")
        print(f"Database connected successfully.")
        print(f"Existing Users in DB: {user_count}")
        if user_count > 0:
            first_user = db.query(models.User).first()
            print(f"Sample User: {first_user.email} (ID: {first_user.id})")
        print(f"---------------------------")
    except Exception as e:
        print(f"Startup DB Check Failed: {e}")
    finally:
        db.close()

@app.get("/")
def health_check(db: Session = Depends(get_db)):
    try:
        # Simple query to verify DB connection
        db.execute(text("SELECT 1"))
        return {"status": "online", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}

# --- Auth Controller ---

@app.post("/api/login", response_model=schemas.UserResponse)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    print(f"Login attempt for: {creds.email}")
    user = crud.get_user_by_email(db, creds.email)
    if not user:
        print("Login failed: User not found")
        raise HTTPException(status_code=400, detail="User not found")
    
    if not security.verify_password(creds.password, user.password_hash):
        print("Login failed: Incorrect password")
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    # Removed email verification check to unblock signup/login flow
    
    print("Login successful")
    return user

@app.post("/api/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    print(f"Signup request for: {user.email}")
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        print("Signup failed: Email exists")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = crud.create_user(db, user)
    print(f"DEBUG: User created successfully. Verification pending. ID: {new_user.id}")
    return new_user

@app.get("/api/verify/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    success = crud.verify_user_token(db, token)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    return {"status": "verified", "message": "Email verified successfully. You may now login."}

@app.put("/api/users/{user_id}")
def update_user(user_id: str, updates: dict, db: Session = Depends(get_db)):
    crud.update_user(db, user_id, updates)
    return {"status": "success"}

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    users = crud.get_users(db)
    print(f"Returning {len(users)} users")
    return users

# --- AI Analysis Controller ---

class TextAnalysisRequest(BaseModel):
    text: str

class TextAnalysisResponse(BaseModel):
    sentiment: str
    emotion: str
    is_crisis: bool

@app.post("/api/analyze", response_model=TextAnalysisResponse)
def analyze_text(request: TextAnalysisRequest):
    result = ai_engine.analyze_text(request.text)
    return TextAnalysisResponse(
        sentiment=result["sentiment"],
        emotion=result["emotion"],
        is_crisis=result["is_crisis"]
    )

# --- Crisis Alerting ---

class CrisisAlert(BaseModel):
    user_name: str
    contact_name: str
    contact_number: str
    message: str
    location: Optional[str] = None

def send_email_notification(alert: CrisisAlert):
    print(f"--- [MOCK EMAIL SENT] ---")
    print(f"To: {alert.contact_name} ({alert.contact_number})")
    print(f"Subject: URGENT: Crisis Alert for {alert.user_name}")
    print(f"Body: {alert.message}")
    if alert.location:
        print(f"Location: {alert.location}")
    print("---------------------------")

@app.post("/api/alert")
def trigger_alert(alert: CrisisAlert, background_tasks: BackgroundTasks):
    background_tasks.add_task(send_email_notification, alert)
    return {"status": "alert_queued"}

# --- Chat Controller ---

@app.get("/api/chat/{user_id}", response_model=List[schemas.MessageResponse])
def get_chat_history(user_id: str, db: Session = Depends(get_db)):
    history = crud.get_chat_history(db, user_id)
    return [
        schemas.MessageResponse(
            id=msg.id,
            role=msg.role,
            text=msg.content,
            timestamp=msg.timestamp,
            sentiment=msg.detected_emotion,
            sentimentScore=msg.sentiment_score
        ) for msg in history
    ]

@app.post("/api/chat/{user_id}", response_model=schemas.MessageResponse)
def save_message(user_id: str, message: schemas.MessageCreate, db: Session = Depends(get_db)):
    msg = crud.create_message(db, user_id, message)
    return schemas.MessageResponse(
        id=msg.id,
        role=msg.role,
        text=msg.content,
        timestamp=msg.timestamp,
        sentiment=msg.detected_emotion,
        sentimentScore=msg.sentiment_score
    )

# --- Journal Controller ---

@app.get("/api/journal/{user_id}", response_model=List[schemas.JournalEntryResponse])
def get_journal(user_id: str, db: Session = Depends(get_db)):
    entries = crud.get_journal_entries(db, user_id)
    return [
        schemas.JournalEntryResponse(
            id=entry.id,
            content=entry.content,
            mood=entry.mood,
            tags=entry.tags if entry.tags else [],
            timestamp=entry.created_at
        ) for entry in entries
    ]

@app.post("/api/journal/{user_id}", response_model=schemas.JournalEntryResponse)
def create_entry(user_id: str, entry: schemas.JournalEntryCreate, db: Session = Depends(get_db)):
    new_entry = crud.create_journal_entry(db, user_id, entry)
    return schemas.JournalEntryResponse(
        id=new_entry.id,
        content=new_entry.content,
        mood=new_entry.mood,
        tags=new_entry.tags if new_entry.tags else [],
        timestamp=new_entry.created_at
    )

# --- Content Controller ---

@app.get("/api/exercises", response_model=List[schemas.ExerciseResponse])
def get_exercises(db: Session = Depends(get_db)):
    exs = crud.get_exercises(db)
    return [
        schemas.ExerciseResponse(
            id=e.id,
            title=e.title,
            description=e.description,
            duration=e.duration,
            category=e.category,
            visualizationType=e.visualization_type,
            steps=e.steps if e.steps else []
        ) for e in exs
    ]

@app.post("/api/exercises", response_model=schemas.ExerciseResponse)
def create_exercise(exercise: schemas.ExerciseBase, db: Session = Depends(get_db)):
    e = crud.create_exercise(db, exercise)
    return schemas.ExerciseResponse(
        id=e.id,
        title=e.title,
        description=e.description,
        duration=e.duration,
        category=e.category,
        visualizationType=e.visualization_type,
        steps=e.steps
    )

@app.delete("/api/exercises/{ex_id}")
def delete_exercise(ex_id: str, db: Session = Depends(get_db)):
    crud.delete_exercise(db, ex_id)
    return {"status": "deleted"}

@app.get("/api/soundscapes", response_model=List[schemas.SoundscapeResponse])
def get_soundscapes(db: Session = Depends(get_db)):
    return crud.get_soundscapes(db)

@app.post("/api/soundscapes", response_model=schemas.SoundscapeResponse)
def create_soundscape(sound: schemas.SoundscapeBase, db: Session = Depends(get_db)):
    return crud.create_soundscape(db, sound)

@app.delete("/api/soundscapes/{sound_id}")
def delete_soundscape(sound_id: str, db: Session = Depends(get_db)):
    crud.delete_soundscape(db, sound_id)
    return {"status": "deleted"}
