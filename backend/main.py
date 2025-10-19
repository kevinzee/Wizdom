# backend/main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import io
import base64
from pypdf import PdfReader
from .gemini_client import simplify_text, simplify_extracted_text, translate_text
from .elevenlabs_client import synthesize_speech

load_dotenv()

app = FastAPI(title="Wizdom API", version="1.1")
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
class TranslateIn(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    target_language: str = Field(..., description="Target language (e.g., 'Spanish', 'French', 'Mandarin')")

class TranslateOut(BaseModel):
    translated: str

class SpeakOut(BaseModel):
    text: str
    audio: str  # Base64 encoded audio

# ===== Utilities =====
def _error(msg: str, code: int = 400):
    return JSONResponse({"error": msg}, status_code=code)

def extract_text_from_file(file_bytes: bytes, content_type: str) -> str:
    """Extract text from PDF or TXT files."""
    if content_type == "text/plain":
        return file_bytes.decode("utf-8", errors="ignore").strip()
    elif content_type == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text_parts = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
            return "\n".join(text_parts).strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    else:
        raise ValueError(f"Unsupported file type: {content_type}")

# ===== Endpoints =====
@app.get("/health")
def health():
    return {"ok": True}

# ===== SPEAK Endpoints (Text + Audio Output) =====
@app.post("/speak_text_input", response_model=SpeakOut)
async def speak_text_input(payload: TranslateIn):
    """
    Simplify text, translate to target language, narrate it, and return both text and audio.
    Example: {"text": "Hello world", "target_language": "Spanish"}
    """
    try:
        # Step 1: Simplify
        simplified = simplify_text(payload.text)
        
        # Step 2: Translate
        translated = translate_text(simplified, payload.target_language)
        
        # Step 3: Speak
        audio_bytes = synthesize_speech(translated)
        
        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "text": translated,
            "audio": audio_base64
        }
    except Exception as e:
        return _error(f"Simplification, translation, or speech synthesis failed: {str(e)}", 500)

@app.post("/speak_file_input", response_model=SpeakOut)
async def speak_file_input(
    file: UploadFile = File(...),
    target_language: str = ""
):
    """
    Upload a file, simplify it, translate to target language, narrate it, and return both text and audio.
    Query parameter: target_language (required)
    """
    supported_types = {"application/pdf", "text/plain"}
    
    if file.content_type not in supported_types:
        return _error("Only PDF or plain text files are supported.", 415)
    
    try:
        file_bytes = await file.read()
        
        if not file_bytes:
            return _error("Uploaded file is empty.", 422)
        
        extracted_text = extract_text_from_file(file_bytes, file.content_type)
        
        if not extracted_text.strip():
            return _error("No extractable text found in file.", 422)
        
        # Step 1: Simplify
        simplified = simplify_extracted_text(extracted_text)
        
        # Step 2: Translate
        translated = translate_text(simplified, target_language)
        
        # Step 3: Speak
        audio_bytes = synthesize_speech(translated)
        
        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "text": translated,
            "audio": audio_base64
        }
    
    except ValueError as e:
        return _error(str(e), 422)
    except Exception as e:
        return _error(f"Simplification, translation, or speech synthesis failed: {str(e)}", 500)

# ===== TRANSLATE Endpoint (UI Localization) =====
@app.post("/translate", response_model=TranslateOut)
async def translate(payload: TranslateIn):
    """
    Translate text to a target language.
    Used for UI localization and content translation.
    Example: {"text": "Hello world", "target_language": "Spanish"}
    """
    try:
        translated = translate_text(payload.text, payload.target_language)
        return {"translated": translated}
    except Exception as e:
        return _error(f"Translation failed: {str(e)}", 500)

@app.get("/")
def root():
    return {"message": "Welcome to the Wizdom API — use /speak_text_input, /speak_file_input, or /translate endpoints."}