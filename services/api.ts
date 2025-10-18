

import { SimplifiedData, UploadedFile, ChatMessage } from '../types';
import { LANGUAGES } from '../constants';
import { GoogleGenAI, Chat } from '@google/genai';

let genAI: GoogleGenAI | undefined;
let chatSession: Chat | undefined;

try {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatSession = genAI.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a friendly and helpful assistant named SpeakEasy. Your primary function is to simplify complex text provided by the user. You can also answer questions about the text or any other topic. When you provide a simplified explanation, you MUST also provide a placeholder audio URL in your response. The user may also provide an image.`,
      },
    });
  } else {
    console.warn("API_KEY environment variable not set. API calls will be disabled.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI. Make sure the API key is valid.", error);
}

export const sendChatMessage = async (
  message: string, 
  language: string, 
  file: UploadedFile | null
): Promise<SimplifiedData> => {
  if (!chatSession) {
    throw new Error("Gemini AI Chat is not initialized. Please configure your API key.");
  }

  const languageName = LANGUAGES.find(l => l.code === language)?.name || 'the selected language';
  
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
    // FIX: The `sendMessage` method for chat expects a `message` property, not `parts`. The `message` property can accept an array of strings and Parts for multimodal input.
    response = await chatSession.sendMessage({ message: [prompt, imagePart] });
  } else {
    response = await chatSession.sendMessage({ message: prompt });
  }

  return {
    simplifiedText: response.text,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder audio
  };
};

const translationsCache: Record<string, Record<string, string>> = {};

export const getTranslations = async (
  languageName: string,
  defaultStrings: Record<string, string>
): Promise<Record<string, string>> => {
    if (translationsCache[languageName]) {
        return translationsCache[languageName];
    }
    if (!genAI) {
        console.warn("Gemini AI not initialized. Skipping UI translation.");
        return {};
    }
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
        }
      });
      let jsonText = result.text;
      
      jsonText = jsonText.trim().replace(/^```json\n/, '').replace(/\n```$/, '');
      
      const translations = JSON.parse(jsonText);
      translationsCache[languageName] = translations;
      return translations;
    } catch (error) {
      console.error(`Failed to get translations for ${languageName}:`, error);
      return {}; 
    }
};