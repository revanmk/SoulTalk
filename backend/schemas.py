
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    name: str
    country: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_number: Optional[str] = None
    profile_pic: Optional[str] = None
    is_admin: bool = False

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    is_verified: bool
    verification_token: Optional[str] = None # Exposed for demo/testing convenience
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

# --- Chat Schemas ---
class MessageCreate(BaseModel):
    role: str
    text: str 
    sentiment: Optional[str] = None 
    sentimentScore: Optional[float] = None
    emotionContext: Optional[str] = None 

class MessageResponse(BaseModel):
    id: str
    role: str
    text: str
    timestamp: datetime
    sentiment: Optional[str] = None
    sentimentScore: Optional[float] = None
    
    class Config:
        from_attributes = True

# --- Journal Schemas ---
class JournalEntryCreate(BaseModel):
    content: str
    mood: str
    tags: List[str] = []

class JournalEntryResponse(BaseModel):
    id: str
    content: str
    mood: str
    tags: Optional[List[str]] = []
    timestamp: datetime 
    
    class Config:
        from_attributes = True

# --- Content Schemas ---
class ExerciseBase(BaseModel):
    title: str
    description: str
    duration: str
    category: str
    visualizationType: str 
    steps: List[str]

class ExerciseResponse(ExerciseBase):
    id: str
    class Config:
        from_attributes = True

class SoundscapeBase(BaseModel):
    name: str
    url: str

class SoundscapeResponse(SoundscapeBase):
    id: str
    class Config:
        from_attributes = True
