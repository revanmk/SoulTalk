
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from backend import models, schemas, crud, database

# Create tables if they don't exist
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Enable CORS for React Frontend - Allow all for dev simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth Controller ---

@app.post("/api/login", response_model=schemas.UserResponse)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, creds.email)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    # Simple password check for demo
    if user.password_hash != creds.password:
        raise HTTPException(status_code=400, detail="Incorrect password")
    return user

@app.post("/api/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user)

@app.put("/api/users/{user_id}")
def update_user(user_id: str, updates: dict, db: Session = Depends(get_db)):
    crud.update_user(db, user_id, updates)
    return {"status": "success"}

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    return crud.get_users(db)

# --- Chat Controller ---

@app.get("/api/chat/{user_id}", response_model=List[schemas.MessageResponse])
def get_chat_history(user_id: str, db: Session = Depends(get_db)):
    history = crud.get_chat_history(db, user_id)
    # Map DB model to Pydantic Response
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
