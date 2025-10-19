import requests
import base64
import json
import os
import subprocess

BASE_URL = "http://localhost:8000"

def save_audio(audio_base64: str, filename: str) -> str:
    """Decode base64 audio and save to file."""
    audio_bytes = base64.b64decode(audio_base64)
    filepath = os.path.join(os.getcwd(), filename)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    return filepath

def play_audio(filepath: str):
    """Play audio file (macOS)."""
    try:
        subprocess.run(["open", filepath], check=True)
        print(f"Playing {filepath}")
    except Exception as e:
        print(f"Could not play audio: {e}")

def test_speak_text_input():
    """Test /speak_text_input endpoint."""
    print("\n" + "="*50)
    print("Testing /speak_text_input")
    print("="*50)
    
    payload = {
        "text": "The Federal Reserve is an independent agency of the federal government charged with managing the money supply and interest rates to promote maximum employment and stable prices.",
        "target_language": "Polish"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/speak_text_input", json=payload)
        response.raise_for_status()
        
        data = response.json()
        print(f"\nRequest successful")
        print(f"Simplified + Translated Text:\n{data['text']}\n")
        
        # Save and play audio
        filepath = save_audio(data['audio'], "test_speak_text_input.mp3")
        play_audio(filepath)
        
    except Exception as e:
        print(f"Error: {e}")

def test_speak_file_input():
    """Test /speak_file_input endpoint."""
    print("\n" + "="*50)
    print("Testing /speak_file_input")
    print("="*50)
    
    file_path = "/Users/kevinzielinski/Downloads/test.pdf"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    try:
        with open(file_path, "rb") as f:
            files = {"file": (f.name, f, "application/pdf")}
            params = {"target_language": "French"}
            response = requests.post(f"{BASE_URL}/speak_file_input", files=files, params=params)
        
        response.raise_for_status()
        
        data = response.json()
        print(f"\nRequest successful")
        print(f"Simplified + Translated Text:\n{data['text']}\n")
        
        # Save and play audio
        filepath = save_audio(data['audio'], "test_speak_file_input.mp3")
        play_audio(filepath)
        
    except Exception as e:
        print(f"Error: {e}")

def test_translate():
    """Test /translate endpoint."""
    print("\n" + "="*50)
    print("Testing /translate")
    print("="*50)
    
    payload = {
        "text": "Welcome to Wizdom",
        "target_language": "German"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/translate", json=payload)
        response.raise_for_status()
        
        data = response.json()
        print(f"\nRequest successful")
        print(f"Original: {payload['text']}")
        print(f"Translated: {data['translated']}\n")
        
    except Exception as e:
        print(f"Error: {e}")

def test_health():
    """Test /health endpoint."""
    print("\n" + "="*50)
    print("Testing /health")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        response.raise_for_status()
        
        data = response.json()
        print(f"\nServer is healthy: {data}\n")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Wizdom API Test Suite")
    
    # Test health first
    test_health()
    
    # Test all endpoints
    test_translate()
    test_speak_text_input()
    test_speak_file_input()
    
    print("\n" + "="*50)
    print("All tests completed!")
    print("="*50)