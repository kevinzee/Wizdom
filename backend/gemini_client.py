# backend/gemini_client.py
import google.generativeai as genai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configure the API key (this replaces Client initialization)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create a model instance once
model = genai.GenerativeModel("gemini-2.5-flash")  # or "gemini-2.5-flash" if available


def simplify_text(text: str, target_grade: int = 6) -> str:
    prompt = f"""
You are an expert text simplifier trained to make complex documents—such as legal, academic, or policy texts—easy to understand for non-native English speakers and the general public.

Goal: Rewrite the input text in clear, natural English that remains accurate and complete, without sounding overly formal or academic.

Instructions:
Summarize the text into no more than three paragraphs (around 15 sentences total) and don't use em dashes.
Keep all essential information and maintain factual accuracy.
Use plain, natural English and short, direct sentences.
Replace any jargon or technical terms with simple explanations (in parentheses) when needed.
Maintain a neutral and professional tone, without examples, bullet points, or section headers.
The output should read like a short, informative summary written for a general audience.

Output format:
• Simplified Summary: [two short paragraphs that capture all key points in clear language]

Text to simplify:
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
