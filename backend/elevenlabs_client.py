# backend/elevenlabs_client.py
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
from typing import Iterable, Union

load_dotenv()
_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

def get_account_info():
    """Get your ElevenLabs account info including credits remaining."""
    try:
        user = _client.user.get()
        return {
            "subscription_tier": user.subscription.tier,
            "character_limit": user.subscription.character_limit,
            "character_count": user.subscription.character_count,
            "credits": user.subscription.credit_summary.available_credits,
        }
    except Exception as e:
        return {"error": str(e)}

def synthesize_speech(
    text: str,
    *,
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb",
    model_id: str = "eleven_multilingual_v2",
    output_format: str = "mp3_44100_128",
    stream: bool = False,
) -> Union[bytes, Iterable[bytes]]:
    # Show credits before
    account_before = get_account_info()
    print(f"[BEFORE] Credits: {account_before.get('credits', 'N/A')}")
    
    audio_iter = _client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
        output_format=output_format,
    )
    
    result = b"".join(chunk for chunk in audio_iter) if not stream else audio_iter
    
    # Show credits after
    account_after = get_account_info()
    print(f"[AFTER] Credits: {account_after.get('credits', 'N/A')}")
    
    return result

if __name__ == "__main__":
    # Check account info
    print("Account Info:")
    print(get_account_info())
    print()
    
    # Optional local demo, never runs on import
    from elevenlabs.play import play
    print("Generating speech...")
    play(synthesize_speech("Hello from ElevenLabs!", stream=True))