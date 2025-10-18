# backend/elevenlabs_client.py
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
from typing import Iterable, Union

load_dotenv()
_client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

def synthesize_speech(
    text: str,
    *,
    voice_id: str = "JBFqnCBsd6RMkjVDRZzb",
    model_id: str = "eleven_multilingual_v2",
    output_format: str = "mp3_44100_128",
    stream: bool = False,
) -> Union[bytes, Iterable[bytes]]:
    audio_iter = _client.text_to_speech.convert(
        text=text,
        voice_id=voice_id,
        model_id=model_id,
        output_format=output_format,
    )
    if stream:
        return audio_iter
    return b"".join(chunk for chunk in audio_iter)

if __name__ == "__main__":
    # Optional local demo, never runs on import
    from elevenlabs.play import play
    play(synthesize_speech("Hello from ElevenLabs!", stream=True))
