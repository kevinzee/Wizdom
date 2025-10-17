from fastapi import FastAPI, Body, Response
from dotenv import load_dotenv
import os

# Import your helper modules
from gemini_client import simplify_text
from elevenlabs_client import synthesize_speech

# Load .env variables (your API keys)
load_dotenv()

# Initialize FastAPI
app = FastAPI()

@app.get("/")
def root():
    return {"message": "SpeakEasy backend is running!"}


@app.post("/api/simplify")
def simplify(input_text: str = Body(..., embed=True)):
    """
    Simplifies text using Gemini and generates speech with ElevenLabs.
    Returns an MP3 audio file of the simplified text.
    """
    try:
        simplified_text = simplify_text(input_text)
        audio_bytes = synthesize_speech(simplified_text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        return {"error": str(e)}