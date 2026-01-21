# Environment Variables Setup Guide

This guide will help you set up the required environment variables for SoulTalk.

## Backend Setup

1. Navigate to the `backend` directory
2. Create a `.env` file with the following content:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_NAME=soultalk_db

# Gemini API Configuration (optional - only needed if using Gemini features)
GEMINI_API_KEY=your_gemini_api_key_here

# Backend Server Configuration
BACKEND_PORT=8000
```

3. Update the values according to your database setup
4. If you want to use Gemini API, get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey) and replace `your_gemini_api_key_here`

## Frontend Setup

1. Navigate to the `frontend` directory
2. Create a `.env` file with the following content:

```env
# Frontend Environment Variables
# Note: Vite requires VITE_ prefix for environment variables exposed to client

# Gemini API Key (will be used directly in frontend)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

3. Replace `your_gemini_api_key_here` with your actual Gemini API key
4. Update `VITE_API_BASE_URL` if your backend runs on a different port

## Installing Python Dependencies

After setting up the backend `.env` file, install the required Python packages:

```bash
cd backend
pip install -r requirements.txt
```

Or if you're using a virtual environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Notes

- The `.env` files are gitignored and should not be committed to version control
- Make sure your database is running before starting the backend
- The Gemini API key is optional - the app will work with local models if the key is not provided, but some features may be limited
