
from sqlalchemy.orm import Session
from backend import models, schemas
import uuid

# --- Users ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session):
    return db.query(models.User).all()

def create_user(db: Session, user: schemas.UserCreate):
    # In production, hash the password here
    db_user = models.User(
        email=user.email,
        password_hash=user.password, 
        name=user.name,
        country=user.country,
        emergency_contact_name=user.emergency_contact_name,
        emergency_contact_number=user.emergency_contact_number,
        profile_pic=user.profile_pic,
        is_admin=user.is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: str, updates: dict):
    db.query(models.User).filter(models.User.id == user_id).update(updates)
    db.commit()

# --- Chat ---
def get_chat_history(db: Session, user_id: str):
    return db.query(models.ChatMessage).filter(models.ChatMessage.user_id == user_id).order_by(models.ChatMessage.timestamp.asc()).all()

def create_message(db: Session, user_id: str, message: schemas.MessageCreate):
    db_message = models.ChatMessage(
        user_id=user_id,
        role=message.role,
        content=message.text,
        detected_emotion=message.sentiment,
        sentiment_score=message.sentimentScore
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

# --- Journal ---
def get_journal_entries(db: Session, user_id: str):
    return db.query(models.JournalEntry).filter(models.JournalEntry.user_id == user_id).order_by(models.JournalEntry.created_at.desc()).all()

def create_journal_entry(db: Session, user_id: str, entry: schemas.JournalEntryCreate):
    db_entry = models.JournalEntry(
        user_id=user_id,
        content=entry.content,
        mood=entry.mood,
        tags=entry.tags
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

# --- Content ---
def get_exercises(db: Session):
    return db.query(models.Exercise).all()

def create_exercise(db: Session, exercise: schemas.ExerciseBase):
    db_ex = models.Exercise(
        title=exercise.title,
        description=exercise.description,
        duration=exercise.duration,
        category=exercise.category,
        visualization_type=exercise.visualizationType,
        steps=exercise.steps
    )
    db.add(db_ex)
    db.commit()
    db.refresh(db_ex)
    return db_ex

def delete_exercise(db: Session, exercise_id: str):
    db.query(models.Exercise).filter(models.Exercise.id == exercise_id).delete()
    db.commit()

def get_soundscapes(db: Session):
    return db.query(models.Soundscape).all()

def create_soundscape(db: Session, sound: schemas.SoundscapeBase):
    db_sound = models.Soundscape(name=sound.name, url=sound.url)
    db.add(db_sound)
    db.commit()
    db.refresh(db_sound)
    return db_sound

def delete_soundscape(db: Session, sound_id: str):
    db.query(models.Soundscape).filter(models.Soundscape.id == sound_id).delete()
    db.commit()
