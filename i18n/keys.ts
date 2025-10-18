export const UI_TEXT = {
  // Sidebar
  appSlogan: 'Simplify ANY document to ANY language',
  pasteTextLabel: 'Ask me anything...',
  pasteTextPlaceholder: 'Ask a question or paste text to simplify...',
  orSeparator: 'OR',
  uploadButtonDefault: 'Upload a file',
  removeFileButton: 'Remove file',
  simplifyIntoLabel: 'Translate response to',
  chooseLanguagePlaceholder: 'Choose preferred language',
  simplifyButton: 'Simplify',
  sendButton: 'Send message',
  processingButton: 'Thinking...',
  
  // Main Content
  welcomeMessage: 'Welcome to {brandName}',
  getStartedPrompt: 'You can ask me anything or paste text to simplify.',
  loadingMessage: 'Simplifying your document...',
  simplifiedDocumentTitle: 'Simplified Document',
  
  // Errors
  errorTitle: 'Error',
  languageError: 'Please select a language for the response.',
  textOrFileError: 'Please enter a message or upload a file.',
  
  // Audio Player
  playAudio: 'Play',
  pauseAudio: 'Pause',

  // Accessibility Menu
  accessibilityTitle: 'Accessibility',
  highContrastLabel: 'High Contrast',
  largeTextLabel: 'Larger Text',
};

export type UIKey = keyof typeof UI_TEXT;