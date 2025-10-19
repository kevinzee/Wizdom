# backend/main.py
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import io
import base64
import json
from pypdf import PdfReader

# SpeakEasy imports
from .gemini_client import simplify_text, simplify_extracted_text, translate_text
from .elevenlabs_client import synthesize_speech
from .acroform_client import extract_form_fields, FormSchema
from .pdf_generator import generate_filled_form_pdf

load_dotenv()

app = FastAPI(title="SpeakEasy API", version="2.0")

# ===== CORS Middleware =====
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
        "https://hide-military-development-summer.trycloudflare.com",
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

# ===== Utility Functions =====
def _error(msg: str, code: int = 400):
    """Return a standardized error response"""
    return JSONResponse({"error": msg}, status_code=code)

def extract_text_from_file(file_bytes: bytes, content_type: str) -> str:
    """Extract text from PDF or TXT files."""
    print(f"[DEBUG] extract_text_from_file called with content_type: {content_type}, file_size: {len(file_bytes)} bytes")
    
    if content_type == "text/plain":
        print(f"[DEBUG] Processing as plain text file")
        return file_bytes.decode("utf-8", errors="ignore").strip()
    elif content_type == "application/pdf":
        try:
            print(f"[DEBUG] Processing as PDF file")
            reader = PdfReader(io.BytesIO(file_bytes))
            print(f"[DEBUG] PDF loaded, page count: {len(reader.pages)}")
            
            text_parts = []
            for idx, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
                    print(f"[DEBUG] Page {idx}: extracted {len(extracted)} characters")
            
            result = "\n".join(text_parts).strip()
            print(f"[DEBUG] Total extracted text: {len(result)} characters")
            return result
        except Exception as e:
            print(f"[ERROR] Failed to extract PDF: {str(e)}")
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    else:
        print(f"[ERROR] Unsupported file type: {content_type}")
        raise ValueError(f"Unsupported file type: {content_type}")

# ===== Health Check =====
@app.get("/health")
def health():
    """Health check endpoint"""
    print("[DEBUG] Health check called")
    return {"ok": True}

# ===== SIMPLIFY & SPEAK: Text Input =====
@app.post("/speak_text_input", response_model=SpeakOut)
async def speak_text_input(payload: TranslateIn):
    """
    Simplify text, translate to target language, narrate it, and return both text and audio.
    """
    print(f"[DEBUG] /speak_text_input called")
    print(f"[DEBUG] Text length: {len(payload.text)}, Target language: {payload.target_language}")
    
    try:
        print(f"[DEBUG] Simplifying text...")
        simplified = simplify_text(payload.text)
        print(f"[DEBUG] Simplified text length: {len(simplified)}")
        
        print(f"[DEBUG] Translating to {payload.target_language}...")
        translated = translate_text(simplified, payload.target_language)
        print(f"[DEBUG] Translated text length: {len(translated)}")
        
        print(f"[DEBUG] Synthesizing speech...")
        audio_bytes = synthesize_speech(translated)
        print(f"[DEBUG] Audio generated: {len(audio_bytes)} bytes")
        
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        print(f"[DEBUG] Base64 encoded audio: {len(audio_base64)} characters")
        
        print(f"[DEBUG] Returning response")
        return {"text": translated, "audio": audio_base64}
    except Exception as e:
        print(f"[ERROR] /speak_text_input failed: {str(e)}")
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
    """
    print(f"[DEBUG] /speak_file_input called")
    print(f"[DEBUG] File: {file.filename}, Content-Type: {file.content_type}")
    print(f"[DEBUG] Target language: {target_language}")
    
    supported_types = {"application/pdf", "text/plain"}
    
    if file.content_type not in supported_types:
        print(f"[ERROR] Unsupported file type: {file.content_type}")
        return _error("Only PDF or plain text files are supported.", 415)
    
    try:
        print(f"[DEBUG] Reading file...")
        file_bytes = await file.read()
        print(f"[DEBUG] File read: {len(file_bytes)} bytes")
        
        if not file_bytes:
            print(f"[ERROR] File is empty")
            return _error("Uploaded file is empty.", 422)
        
        print(f"[DEBUG] Extracting text from file...")
        extracted_text = extract_text_from_file(file_bytes, file.content_type)
        
        if not extracted_text.strip():
            print(f"[ERROR] No text extracted from file")
            return _error("No extractable text found in file.", 422)
        
        print(f"[DEBUG] Simplifying extracted text...")
        simplified = simplify_extracted_text(extracted_text)
        print(f"[DEBUG] Simplified text length: {len(simplified)}")
        
        print(f"[DEBUG] Translating to {target_language}...")
        translated = translate_text(simplified, target_language)
        print(f"[DEBUG] Translated text length: {len(translated)}")
        
        print(f"[DEBUG] Synthesizing speech...")
        audio_bytes = synthesize_speech(translated)
        print(f"[DEBUG] Audio generated: {len(audio_bytes)} bytes")
        
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
        print(f"[DEBUG] Base64 encoded audio: {len(audio_base64)} characters")
        
        print(f"[DEBUG] Returning response")
        return {"text": translated, "audio": audio_base64}
    
    except ValueError as e:
        print(f"[ERROR] ValueError in /speak_file_input: {str(e)}")
        return _error(str(e), 422)
    except Exception as e:
        print(f"[ERROR] /speak_file_input failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error(f"Simplification, translation, or speech synthesis failed: {str(e)}", 500)

# ===== TRANSLATE =====
@app.post("/translate", response_model=TranslateOut)
async def translate(payload: TranslateIn):
    """
    Translate text to a target language.
    """
    print(f"[DEBUG] /translate called")
    print(f"[DEBUG] Text length: {len(payload.text)}, Target language: {payload.target_language}")
    
    try:
        print(f"[DEBUG] Calling translate_text()...")
        translated = translate_text(payload.text, payload.target_language)
        print(f"[DEBUG] Raw translation length: {len(translated)}")
        
        # Strip markdown code blocks if present
        translated = translated.strip()
        if translated.startswith('```json'):
            print(f"[DEBUG] Removing ```json code block")
            translated = translated.replace('```json\n', '', 1).replace('\n```', '', 1)
        elif translated.startswith('```'):
            print(f"[DEBUG] Removing ``` code block")
            translated = translated.replace('```\n', '', 1).replace('\n```', '', 1)
        
        print(f"[DEBUG] Final translation length: {len(translated)}")
        print(f"[DEBUG] Returning response")
        return {"translated": translated}
    except Exception as e:
        print(f"[ERROR] /translate failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error(f"Translation failed: {str(e)}", 500)

# ===== PDF FORM FILLING =====
@app.post("/extract_form_fields", response_model=FormSchema)
async def extract_form(file: UploadFile = File(...)):
    """
    Upload a PDF and extract all AcroForm fields.
    """
    print(f"[DEBUG] /extract_form_fields called")
    print(f"[DEBUG] File: {file.filename}, Content-Type: {file.content_type}")
    
    if file.content_type != "application/pdf":
        print(f"[ERROR] Invalid file type: {file.content_type}")
        return _error("Only PDF files are supported.", 415)
    
    try:
        print(f"[DEBUG] Reading PDF file...")
        pdf_bytes = await file.read()
        print(f"[DEBUG] PDF file read: {len(pdf_bytes)} bytes")
        
        if not pdf_bytes:
            print(f"[ERROR] PDF file is empty")
            return _error("Uploaded file is empty.", 422)
        
        print(f"[DEBUG] Extracting form fields...")
        form_schema = extract_form_fields(pdf_bytes)
        print(f"[DEBUG] Form has fields: {form_schema.has_form_fields}, field count: {len(form_schema.fields)}")
        
        return form_schema
    
    except ValueError as e:
        print(f"[ERROR] ValueError: {str(e)}")
        return _error(str(e), 422)
    except Exception as e:
        print(f"[ERROR] /extract_form_fields failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error(f"An error occurred extracting form fields: {str(e)}", 500)

@app.post("/populate_form")
async def populate_form(
    file: UploadFile = File(...),
    field_data: str = Form(...)
):
    """
    Upload a PDF with AcroForm fields and generate a new filled PDF.
    """
    print(f"[DEBUG] /populate_form called")
    print(f"[DEBUG] File: {file.filename}, Content-Type: {file.content_type}")
    print(f"[DEBUG] field_data length: {len(field_data)} characters")
    
    if file.content_type != "application/pdf":
        print(f"[ERROR] Invalid file type: {file.content_type}")
        return _error("Only PDF files are supported.", 415)
    
    try:
        print(f"[DEBUG] Reading PDF file...")
        pdf_bytes = await file.read()
        print(f"[DEBUG] PDF file read: {len(pdf_bytes)} bytes")
        
        if not pdf_bytes:
            print(f"[ERROR] PDF file is empty")
            return _error("Uploaded file is empty.", 422)
        
        if not field_data.strip():
            print(f"[ERROR] field_data is empty")
            return _error("field_data parameter is required.", 422)
        
        # Parse field_data JSON
        try:
            print(f"[DEBUG] Parsing field_data JSON...")
            filled_data = json.loads(field_data)
            print(f"[DEBUG] Parsed {len(filled_data)} fields from JSON")
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON parse error: {str(e)}")
            return _error(f"Invalid field_data JSON format: {str(e)}", 422)
        
        # Extract form fields from the original PDF
        print(f"[DEBUG] Extracting form fields from PDF...")
        form_schema = extract_form_fields(pdf_bytes)
        print(f"[DEBUG] PDF has {len(form_schema.fields)} form fields")
        
        if not form_schema.has_form_fields:
            print(f"[ERROR] PDF has no form fields")
            return _error("PDF has no form fields.", 422)
        
        # Generate a new filled PDF
        print(f"[DEBUG] Generating filled PDF...")
        filled_pdf = generate_filled_form_pdf(
            form_title="Filled Form",
            filled_data=filled_data,
            form_fields=[f.dict() for f in form_schema.fields]
        )
        print(f"[DEBUG] Filled PDF generated: {len(filled_pdf)} bytes")
        
        # Return as downloadable file
        print(f"[DEBUG] Returning PDF as stream")
        return StreamingResponse(
            io.BytesIO(filled_pdf),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=filled_form.pdf"}
        )
    
    except ValueError as e:
        print(f"[ERROR] ValueError: {str(e)}")
        return _error(str(e), 422)
    except Exception as e:
        print(f"[ERROR] /populate_form failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return _error(f"An error occurred: {str(e)}", 500)

# ===== Root Endpoint =====
@app.get("/")
def root():
    """Welcome message with available endpoints"""
    print("[DEBUG] Root endpoint called")
    return {
        "message": "Welcome to the SpeakEasy API",
        "endpoints": {
            "simplify_and_speak": [
                "/speak_text_input - Simplify, translate, and narrate text",
                "/speak_file_input - Simplify, translate, and narrate files (PDF/TXT)"
            ],
            "translate": [
                "/translate - Translate text to target language"
            ],
            "form_filling": [
                "/extract_form_fields - Extract form fields from PDF",
                "/populate_form - Fill and generate PDF with form data"
            ],
            "health": "/health"
        }
    }