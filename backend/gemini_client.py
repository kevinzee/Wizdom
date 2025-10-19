# backend/gemini_client.py
import google.generativeai as genai
from dotenv import load_dotenv
import os
from typing import Optional

# Load environment variables
load_dotenv()

# Configure the API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create a model instance once
model = genai.GenerativeModel("gemini-2.5-flash")

def simplify_text(text: str, target_grade: int = 7) -> str:
    """
    Simplify plain text input using Gemini.
    """
    prompt = f"""
You are an expert text simplifier trained to make complex documents—such as legal, academic, or policy texts—easy to understand for non-native English speakers and the general public.

Goal: Rewrite the input text in clear, natural English that remains accurate and complete, without sounding overly formal or academic.

Instructions:
- Summarize the text into no more than three paragraphs (around 15 sentences total) and don't use em dashes.
- Keep all essential information and maintain factual accuracy.
- Use plain, natural English and short, direct sentences.
- Replace any jargon or technical terms with simple explanations (in parentheses) when needed.
- Maintain a neutral and professional tone, without examples, bullet points, or section headers.
- The output should read like a short, informative summary written for a general audience.

Output format:
Simplified Summary: [two to three short paragraphs that capture all key points in clear language]

Text to simplify:
{text}
    """
    response = model.generate_content(prompt)
    return (response.text or "").strip()


def simplify_extracted_text(text: str, target_grade: int = 7) -> str:
    """
    Simplify text that has been extracted from a file.
    Uses the same logic as simplify_text (kept separate for clarity if you want different behavior later).
    """
    return simplify_text(text, target_grade)


def simplify_large_text_chunked(text: str, chunk_size: int = 5000) -> str:
    """
    For files that are very large, split into chunks and simplify each,
    then combine the simplified chunks.
    This prevents hitting token limits with Gemini.
    """
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0
    
    for word in words:
        current_chunk.append(word)
        current_length += len(word) + 1
        
        if current_length > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = []
            current_length = 0
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    # Simplify each chunk
    simplified_chunks = [simplify_text(chunk) for chunk in chunks]
    
    # Combine simplified chunks and do a final simplification pass
    combined = "\n\n".join(simplified_chunks)
    return simplify_text(combined)

def translate_text(text: str, target_language: str) -> str:
    """
    Translate text to a target language using Gemini.
    
    Args:
        text: The text to translate
        target_language: Language name to translate to (e.g., "Spanish", "French", "Mandarin")
    
    Returns:
        Translated text
    """
    prompt = f"""
You are an expert translator. Translate the following text to {target_language}.

Requirements:
- Maintain the meaning and tone of the original text
- Keep it natural and conversational
- Do NOT include any explanations or notes, just the translation
- If the text is already in {target_language}, return it as-is

Text to translate:
{text}
    """
    response = model.generate_content(prompt)
    return (response.text or "").strip()


if __name__ == "__main__":
    print(
        simplify_text(
            "Artificial intelligence learns patterns from data to make predictions."
        )
    )