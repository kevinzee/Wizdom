from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
import io

from .gemini_client import simplify_text
from .elevenlabs_client import synthesize_speech

load_dotenv()

app = FastAPI(title="SpeakEasy API", version="1.0")


@app.post("/simplify")
async def simplify(request: Request):
    """
    Simplify complex text using Gemini.
    Example payload: { "text": "The mitochondria is the powerhouse of the cell." }
    """
    data = await request.json()
    text = data.get("text", "").strip()

    if not text:
        return JSONResponse({"error": "No text provided"}, status_code=400)

    simplified = simplify_text(text)
    return JSONResponse({"simplified": simplified})


@app.post("/speak")
async def speak(request: Request):
    """
    Simplify text and generate speech audio (MP3) using ElevenLabs.
    Example payload: { "text": "Explain academic integrity in simple terms." }
    """
    data = await request.json()
    text = data.get("text", "").strip()

    if not text:
        return JSONResponse({"error": "No text provided"}, status_code=400)

    # Step 1: Simplify text with Gemini
    simplified = simplify_text(text)

    # Step 2: Convert to speech with ElevenLabs
    audio_bytes = synthesize_speech(simplified)

    # Stream the MP3 back to the client
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


@app.get("/")
def root():
    return {"message": "Welcome to the SpeakEasy API — use /simplify or /speak endpoints."}
