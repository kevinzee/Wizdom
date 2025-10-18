# backend/main.py (drop-in upgrade)
from fastapi import FastAPI, Request, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import io

from .gemini_client import simplify_text
from .elevenlabs_client import synthesize_speech

load_dotenv()
app = FastAPI(title="SpeakEasy API", version="1.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.141.141.54:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Schemas =====
class SimplifyIn(BaseModel):
    text: str = Field(..., min_length=1, description="Raw text to simplify")

class SimplifyOut(BaseModel):
    simplified: str

# ===== Utilities =====
def _error(msg: str, code: int = 400):
    return JSONResponse({"error": msg}, status_code=code)

# ===== Endpoints =====
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/simplify", response_model=SimplifyOut)
async def simplify(payload: SimplifyIn):
    simplified = simplify_text(payload.text)
    return {"simplified": simplified}

@app.post("/speak")
async def speak(payload: SimplifyIn):
    simplified = simplify_text(payload.text)
    audio_bytes = synthesize_speech(simplified)
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")

# Optional: upload a PDF or .txt and simplify server-side
@app.post("/simplify_file", response_model=SimplifyOut)
async def simplify_file(file: UploadFile = File(...)):
    if file.content_type not in {"application/pdf", "text/plain"}:
        return _error("Only PDF or plain text files are supported.", 415)

    if file.content_type == "text/plain":
        text = (await file.read()).decode("utf-8", errors="ignore")
    else:
        # lightweight PDF text extraction
        from pypdf import PdfReader  # pip install pypdf
        reader = PdfReader(file.file)
        text = "\n".join(p.extract_text() or "" for p in reader.pages)

    if not text.strip():
        return _error("No extractable text found in file.", 422)

    simplified = simplify_text(text)
    return {"simplified": simplified}

@app.get("/")
def root():
    return {"message": "Welcome to the SpeakEasy API — use /simplify or /speak endpoints."}
