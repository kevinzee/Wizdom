# backend/main.py (updated with consolidated imports)
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import io
from pypdf import PdfReader
from .gemini_client import simplify_text, simplify_extracted_text
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

@app.post("/simplify", response_model=SimplifyOut)
async def simplify(payload: SimplifyIn):
    simplified = simplify_text(payload.text)
    return {"simplified": simplified}

@app.post("/speak")
async def speak(payload: SimplifyIn):
    simplified = simplify_text(payload.text)
    audio_bytes = synthesize_speech(simplified)
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")

@app.post("/simplify_file", response_model=SimplifyOut)
async def simplify_file(file: UploadFile = File(...)):
    """
    Upload a file (PDF or TXT), extract text, and return simplified version.
    """
    supported_types = {"application/pdf", "text/plain"}
    
    if file.content_type not in supported_types:
        return _error("Only PDF or plain text files are supported.", 415)
    
    try:
        file_bytes = await file.read()
        
        if not file_bytes:
            return _error("Uploaded file is empty.", 422)
        
        # Extract text from file
        extracted_text = extract_text_from_file(file_bytes, file.content_type)
        
        if not extracted_text.strip():
            return _error("No extractable text found in file.", 422)
        
        # Simplify the extracted text
        simplified = simplify_extracted_text(extracted_text)
        
        return {"simplified": simplified}
    
    except ValueError as e:
        return _error(str(e), 422)
    except Exception as e:
        return _error(f"An error occurred processing the file: {str(e)}", 500)

@app.post("/speak_file")
async def speak_file(file: UploadFile = File(...)):
    """
    Upload a file, simplify it, and return audio narration.
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
        
        simplified = simplify_extracted_text(extracted_text)
        audio_bytes = synthesize_speech(simplified)
        
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")
    
    except ValueError as e:
        return _error(str(e), 422)
    except Exception as e:
        return _error(f"An error occurred processing the file: {str(e)}", 500)

@app.get("/")
def root():
    return {"message": "Welcome to the SpeakEasy API — use /simplify, /speak, /simplify_file, or /speak_file endpoints."}