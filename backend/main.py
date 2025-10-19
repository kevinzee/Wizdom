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
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://10.141.141.54:3000",
        "http://10.141.141.54:3001",
        "https://connector-austin-however-disclaimer.trycloudflare.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== Schemas =====
class TranslateIn(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    target_language: str = Field(
        ..., description="Target language (e.g., 'Spanish', 'French', 'Mandarin')"
    )


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
        print(f"DEBUG: Simplifying text: {payload.text[:50]}...")
        simplified = simplify_text(payload.text)
        print(f"DEBUG: Simplified: {simplified[:50]}...")

        # Step 2: Translate
        print(f"DEBUG: Translating to {payload.target_language}")
        translated = translate_text(simplified, payload.target_language)
        print(f"DEBUG: Translated: {translated[:50]}...")

        # Step 3: Speak
        print(f"DEBUG: Synthesizing speech")
        audio_bytes = synthesize_speech(translated)
        print(f"DEBUG: Audio generated, size: {len(audio_bytes)}")

        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        return {"text": translated, "audio": audio_base64}
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback

        traceback.print_exc()
        return _error(
            f"Simplification, translation, or speech synthesis failed: {str(e)}", 500
        )


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
        print(f"DEBUG: Reading file: {file.filename}")
        file_bytes = await file.read()
        
        if not file_bytes:
            return _error("Uploaded file is empty.", 422)
        
        print(f"DEBUG: File size: {len(file_bytes)} bytes")
        print(f"DEBUG: Extracting text from {file.content_type}")
        extracted_text = extract_text_from_file(file_bytes, file.content_type)
        print(f"DEBUG: Extracted text length: {len(extracted_text)} characters")
        
        if not extracted_text.strip():
            return _error("No extractable text found in file.", 422)
        
        # Step 1: Simplify
        print(f"DEBUG: Simplifying extracted text...")
        simplified = simplify_extracted_text(extracted_text)
        print(f"DEBUG: Simplified text length: {len(simplified)} characters")
        
        # Step 2: Translate
        print(f"DEBUG: Translating to {target_language}")
        translated = translate_text(simplified, target_language)
        print(f"DEBUG: Translated text length: {len(translated)} characters")
        
        # Step 3: Speak
        print(f"DEBUG: Synthesizing speech")
        audio_bytes = synthesize_speech(translated)
        print(f"DEBUG: Audio generated, size: {len(audio_bytes)} bytes")
        
        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        
        return {
            "text": translated,
            "audio": audio_base64
        }
    
    except ValueError as e:
        print(f"ERROR: ValueError - {str(e)}")
        return _error(str(e), 422)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
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
        print(f"DEBUG: Translating text: {payload.text[:50]}...")
        print(f"DEBUG: Target language: {payload.target_language}")
        translated = translate_text(payload.text, payload.target_language)
        print(f"DEBUG: Raw translated text: {translated[:50]}...")
        
        # Strip markdown code blocks if present
        print(f"DEBUG: Checking for markdown code blocks...")
        translated = translated.strip()
        if translated.startswith('```json'):
            print(f"DEBUG: Found ```json block, removing...")
            translated = translated.replace('```json\n', '', 1).replace('\n```', '', 1)
        elif translated.startswith('```'):
            print(f"DEBUG: Found ``` block, removing...")
            translated = translated.replace('```\n', '', 1).replace('\n```', '', 1)
        
        print(f"DEBUG: Final translated text: {translated[:50]}...")
        print(f"DEBUG: Translation complete, length: {len(translated)} characters")
        return {"translated": translated}
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error(f"Translation failed: {str(e)}", 500)

@app.get("/")
def root():
    return {"message": "Welcome to the SpeakEasy API — use /speak_text_input, /speak_file_input, or /translate endpoints."}