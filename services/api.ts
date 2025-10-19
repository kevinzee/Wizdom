import { SimplifiedData, UploadedFile, ChatMessage } from '../types';
import { LANGUAGES } from '../constants';
import { GoogleGenAI, Chat } from '@google/genai';

// 👇 Use your Cloudflare public backend URL
const BACKEND_URL = "https://pgp-helps-inter-differential.trycloudflare.com";

let genAI: GoogleGenAI | undefined;
let chatSession: Chat | undefined;

try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    chatSession = genAI.chats.create({
      model: 'gemini-2.0-flash-lite',
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
// Form Filling Types
// ========================================================
export interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  value: string;
}

export interface ExtractFormResponse {
  has_form_fields: boolean;
  fields: FormField[];
}

// ========================================================
// File Upload Handler (for PDF/TXT files - Wizdom)
// ========================================================
export const sendFileMessage = async (
  file: UploadedFile,
  language: string
): Promise<SimplifiedData> => {
  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'the selected language';

  try {
    const formData = new FormData();
    
    let blob: Blob;
    if (file.content.startsWith('data:')) {
      const base64 = file.content.split(',')[1];
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      blob = new Blob([byteArray], { type: file.type === 'pdf' ? 'application/pdf' : 'text/plain' });
    } else {
      blob = new Blob([file.content], { type: 'text/plain' });
    }

    formData.append('file', blob, file.name);

    const response = await fetch(
      `${BACKEND_URL}/speak_file_input?target_language=${encodeURIComponent(languageName)}`,
      {
        method: "POST",
        body: formData,
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
  if (file && (file.type === 'text' || file.type === 'pdf')) {
    return sendFileMessage(file, language);
  }

  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'the selected language';

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
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    };
  }

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

    const translations = JSON.parse(data.translated);
    translationsCache[languageName] = translations;
    return translations;
  } catch (backendError) {
    console.warn("Backend translation not available, returning defaults.");
    return defaultStrings;
  }
};

// ========================================================
// Form Filling API Functions
// ========================================================

/**
 * Extract form fields from a PDF
 * @param file - PDF file to extract fields from
 * @returns Object with has_form_fields boolean and array of fields
 */
export const extractFormFields = async (file: File): Promise<ExtractFormResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_URL}/extract_form_fields`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Extracted form fields:", data);
    return data;
  } catch (error) {
    console.error("Failed to extract form fields:", error);
    throw new Error(`Form extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Populate form fields and generate a filled PDF
 * @param file - Original PDF file with form fields
 * @param fieldData - Object mapping field names to their values
 * @returns Blob of the generated PDF
 */
export const populateForm = async (file: File, fieldData: Record<string, string>): Promise<Blob> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field_data', JSON.stringify(fieldData));

    const response = await fetch(`${BACKEND_URL}/populate_form`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    const pdfBlob = await response.blob();
    console.log("Generated PDF size:", pdfBlob.size);
    return pdfBlob;
  } catch (error) {
    console.error("Failed to populate form:", error);
    throw new Error(`Form population failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Download a PDF blob to the user's computer
 * @param blob - PDF blob to download
 * @param filename - Name for the downloaded file
 */
export const downloadPDF = (blob: Blob, filename: string = 'filled_form.pdf') => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};