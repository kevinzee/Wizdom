import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { clarifyDocument } from './services/api';
import { AppState, SimplifiedData, UploadedFile } from './types';
import { useAccessibility } from './hooks/useAccessibility';
import { useTheme } from './hooks/useTheme';
import { Toast } from './components/Toast';
import { MenuIcon, CloseIcon } from './components/icons/Icons';
import { AccessibilityMenu } from './components/AccessibilityMenu';

export default function App() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [appState, setAppState] = useState<AppState>('idle');
  const [simplifiedData, setSimplifiedData] = useState<SimplifiedData | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const { isHighContrast, isLargeText, toggleHighContrast, toggleLargeText } = useAccessibility();
  const { theme, toggleTheme } = useTheme();
  
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const isResizing = useRef(false);

  const handleSubmit = useCallback(async (text: string, language: string, file: UploadedFile | null) => {
    setAppState('loading');
    setSimplifiedData(null);
    setError(null);
    setIsMobileSidebarOpen(false);
    try {
      const data = await clarifyDocument(text, language, file);
      setSimplifiedData(data);
      setAppState('success');
    } catch (err) {
      setError('Failed to simplify the document. Please try again.');
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
          onSubmit={handleSubmit}
          isLoading={appState === 'loading'}
          isAudioPlaying={isAudioPlaying}
          theme={theme}
          toggleTheme={toggleTheme}
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
          <MainContent
            appState={appState}
            data={simplifiedData}
            error={error}
            onPlayStateChange={setIsAudioPlaying}
            onAudioError={handleAudioError}
          />
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