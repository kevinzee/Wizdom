import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { FormFiller } from './components/FormFiller';
import { sendChatMessage } from './services/api';
import { AppState, UploadedFile, ChatMessage } from './types';
import { useAccessibility } from './hooks/useAccessibility';
import { useTheme } from './hooks/useTheme';
import { Toast } from './components/Toast';
import { MenuIcon, CloseIcon } from './components/icons/Icons';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { LocalizationProvider } from './context/LocalizationContext';

function AppContent() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [appState, setAppState] = useState<AppState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'simplify' | 'fill-form'>('simplify');
  
  const { isHighContrast, isLargeText, toggleHighContrast, toggleLargeText } = useAccessibility();
  const { theme, toggleTheme } = useTheme();
  
  const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth / 2);
  const isResizing = useRef(false);

  const handleSendMessage = useCallback(async (text: string, language: string, file: UploadedFile | null) => {
    setAppState('loading');
    setIsMobileSidebarOpen(false);

    setMessages(prev => [...prev, { role: 'user', text }]);
    
    try {
      const data = await sendChatMessage(text, language, file);
      setMessages(prev => [...prev, { role: 'model', text: data.simplifiedText, audioUrl: data.audioUrl }]);
      setAppState('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setMessages(prev => [...prev, { role: 'system-error', text: `Failed to get response: ${errorMessage}` }]);
      setAppState('error');
    }
  }, []);

  const handleAudioError = useCallback(() => {
    setAudioError('Failed to load audio. Please check the source and try again.');
    setTimeout(() => setAudioError(null), 5000);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = Math.max(280, Math.min(e.clientX, window.innerWidth / 2));
    setSidebarWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const accessibilityClass = `${isHighContrast ? 'high-contrast' : ''} ${isLargeText ? 'large-text' : ''}`;

  return (
    <div className={`flex h-screen font-sans ${accessibilityClass}`}>
      <div id="toast-container" className="absolute top-5 right-5 z-50">
        {audioError && <Toast message={audioError} type="error" />}
      </div>
      
      <div
        style={{ width: isSidebarCollapsed ? undefined : `${sidebarWidth}px` }}
        className={`relative flex-shrink-0 transition-all duration-150 ease-in-out ${isSidebarCollapsed ? 'w-20' : ''}`}
      >
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen}
          setMobileOpen={setIsMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setCollapsed={setIsSidebarCollapsed}
          onSubmit={handleSendMessage}
          isLoading={appState === 'loading'}
          isAudioPlaying={isAudioPlaying}
          theme={theme}
          toggleTheme={toggleTheme}
          activeMode={activeMode}
          setActiveMode={setActiveMode}
        />
      </div>

      {!isSidebarCollapsed && (
         <div onMouseDown={handleMouseDown} className="w-1.5 cursor-col-resize flex-shrink-0 bg-gray-200 dark:bg-gray-950 hover:bg-purple-500 transition-colors duration-100"/>
      )}

      <div className="flex-1 flex flex-col relative overflow-hidden">
         <header className="absolute top-0 left-0 z-20 p-2 md:hidden">
            <button
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
            >
              {isMobileSidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8">
          {activeMode === 'simplify' ? (
            <MainContent
              isLoading={appState === 'loading'}
              messages={messages}
              onPlayStateChange={setIsAudioPlaying}
              onAudioError={handleAudioError}
            />
          ) : (
            <FormFiller theme={theme} />
          )}
        </main>
      </div>
      <AccessibilityMenu 
        isHighContrast={isHighContrast}
        isLargeText={isLargeText}
        toggleHighContrast={toggleHighContrast}
        toggleLargeText={toggleLargeText}
      />
    </div>
  );
}

export default function App() {
  return (
    <LocalizationProvider>
      <AppContent />
    </LocalizationProvider>
  )
}