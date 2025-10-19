export type AppState = 'idle' | 'loading' | 'success' | 'error';

export interface SimplifiedData {
  simplifiedText: string;
  audioUrl: string;
}

export type ChatRole = 'user' | 'model' | 'system-error';

export interface ChatMessage {
  role: ChatRole;
  text: string;
  audioUrl?: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface UploadedFile {
  name: string;
  type: 'text' | 'image' | 'pdf';
  content: string; // File content for text files, base64 data URL for images
}
