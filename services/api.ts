import { SimplifiedData, UploadedFile, ChatMessage } from '../types';
import { LANGUAGES } from '../constants';
import { GoogleGenAI, Chat } from '@google/genai';

// 👇 Use your Cloudflare public backend URL
const BACKEND_URL = "https://connector-austin-however-disclaimer.trycloudflare.com";

let genAI: GoogleGenAI | undefined;
let chatSession: Chat | undefined;

try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    chatSession = genAI.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a friendly and helpful assistant named Wizdom. Your primary function is to simplify complex text provided by the user. You can also answer questions about the text or any other topic. When you provide a simplified explanation, you MUST also provide a placeholder audio URL in your response. The user may also provide an image.`,
      },
    });
  } else {
    console.warn("GEMINI_API_KEY environment variable not set. Local Gemini will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. Make sure the API key is valid.", error);
}

// ========================================================
// File Upload Handler (for PDF/TXT files)
// ========================================================
export const sendFileMessage = async (
  file: UploadedFile,
  language: string
): Promise<SimplifiedData> => {
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'the selected language';

  try {
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Convert base64 or text content back to Blob
    let blob: Blob;
    if (file.content.startsWith('data:')) {
      // It's base64 encoded (shouldn't happen for text files, but just in case)
      const base64 = file.content.split(',')[1];
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([byteArray], { type: file.type === 'pdf' ? 'application/pdf' : 'text/plain' });
    } else {
      // It's plain text
      blob = new Blob([file.content], { type: 'text/plain' });
    }

    formData.append('file', blob, file.name);

    // Send to backend /speak_file_input endpoint with target_language as query param
    const response = await fetch(
      `${BACKEND_URL}/speak_file_input?target_language=${encodeURIComponent(languageName)}`,
      {
        method: "POST",
        body: formData,
        // Note: Don't set Content-Type header; browser will set it with boundary
      }
    );

    if (!response.ok) {
      throw new Error(`Backend file error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      simplifiedText: data.text,
      audioUrl: `data:audio/mp3;base64,${data.audio}`,
    };
  } catch (error) {
    console.error("File upload failed:", error);
    throw new Error(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// ========================================================
// Main chat function (File first, then Gemini, then backend)
// ========================================================
export const sendChatMessage = async (
  message: string, 
  language: string, 
  file: UploadedFile | null
): Promise<SimplifiedData> => {
  // IMPORTANT: Check for files FIRST before trying Gemini
  // This ensures file uploads go to /speak_file_input, not local Gemini
  if (file && (file.type === 'text' || file.type === 'pdf')) {
    return sendFileMessage(file, language);
  }

  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'the selected language';

  // Try using local Gemini logic second (only for text/image, not files)
  if (chatSession) {
    const prompt = `
      User input: "${message}"
      ${file ? `(Reference file: ${file.name})` : ''}
      ---
      Task: First, address the user's input (simplify text, answer a question, or describe an image). Then, translate your entire response into ${languageName}.
    `;

    let response;
    if (file && file.type === 'image') {
      const imagePart = {
        inlineData: {
          mimeType: file.content.match(/data:(.*);base64,/)?.[1] || 'image/jpeg',
          data: file.content.split(',')[1],
        },
      };
      response = await chatSession.sendMessage({ message: [prompt, imagePart] });
    } else {
      response = await chatSession.sendMessage({ message: prompt });
    }

    return {
      simplifiedText: response.text,
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder audio
    };
  }

  // If Gemini isn't configured locally, call backend
  try {
    const response = await fetch(`${BACKEND_URL}/speak_text_input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        target_language: languageName,
      }),
    });

    if (!response.ok) throw new Error(`Backend error: ${response.statusText}`);

    const data = await response.json();

    return {
      simplifiedText: data.text,
      audioUrl: `data:audio/mp3;base64,${data.audio}`,
    };
  } catch (backendError) {
    console.error("Backend call failed:", backendError);
    throw new Error("Both Gemini and backend requests failed.");
  }
};

// ========================================================
// Translations logic (UI localization)
// ========================================================
const translationsCache: Record<string, Record<string, string>> = {};

export const getTranslations = async (
  languageName: string,
  defaultStrings: Record<string, string>
): Promise<Record<string, string>> => {
  if (translationsCache[languageName]) {
    return translationsCache[languageName];
  }

  // Try Gemini translation first
  if (genAI) {
    const modelName = 'gemini-2.5-flash';
    const prompt = `Translate the JSON values into an informal and casual tone of '${languageName}'. IMPORTANT: Any placeholder text in curly braces (like "{brandName}") must be preserved exactly as is in the translated strings. Do not translate the text inside the curly braces. Return only a valid JSON object with the identical keys.
    Input:
    ${JSON.stringify(defaultStrings, null, 2)}
    `;

    try {
      const result = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let jsonText = result.text;
      jsonText = jsonText.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
      const translations = JSON.parse(jsonText);
      translationsCache[languageName] = translations;
      return translations;
    } catch (error) {
      console.error(`Failed to get translations via Gemini for ${languageName}:`, error);
    }
  }

  // Fallback: use backend translation
  try {
    const res = await fetch(`${BACKEND_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: JSON.stringify(defaultStrings),
        target_language: languageName,
      }),
    });

    if (!res.ok) throw new Error("Backend translation failed");
    const data = await res.json();

    // Backend returns { translated: string }
    const translations = JSON.parse(data.translated);
    translationsCache[languageName] = translations;
    return translations;
  } catch (backendError) {
    console.warn("Backend translation not available, returning defaults.");
    return defaultStrings;
  }
};