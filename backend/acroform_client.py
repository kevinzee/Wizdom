# backend/acroform_client.py
import io
from typing import List, Dict, Any
from pypdf import PdfReader
from pydantic import BaseModel

class FormField(BaseModel):
    name: str
    type: str  # "text", "checkbox", "radio", "dropdown", etc.
    value: str = ""

class FormSchema(BaseModel):
    has_form_fields: bool
    fields: List[FormField] = []

def extract_form_fields(pdf_bytes: bytes) -> FormSchema:
    """
    Extract AcroForm fields from a PDF using pypdf.
    Returns field names, types, and current values.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        
        # Check if PDF has AcroForm fields
        if not reader.get_fields():
            return FormSchema(has_form_fields=False, fields=[])
        
        fields = []
        for field_name, field_obj in reader.get_fields().items():
            field_type = field_obj.get("/FT", "").strip("/")
            field_value = field_obj.get("/V", "")
            
            # Map PDF field types to user-friendly types
            type_mapping = {
                "Tx": "text",
                "Ch": "dropdown",
                "Btn": "checkbox",
                "Sig": "signature"
            }
            
            friendly_type = type_mapping.get(field_type, "text")
            
            fields.append(FormField(
                name=field_name,
                type=friendly_type,
                value=str(field_value) if field_value else ""
            ))
        
        return FormSchema(has_form_fields=True, fields=fields)
    
    except Exception as e:
        raise ValueError(f"Failed to extract form fields: {str(e)}")