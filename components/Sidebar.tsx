import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { LANGUAGES } from '../constants';
import { Mascot } from './Mascot';
import { ArrowRightIcon, PaperclipIcon, CollapseLeftIcon, ExpandRightIcon, SunIcon, MoonIcon, SmallSpinnerIcon, SendIcon } from './icons/Icons';
import { useLocalization } from '../context/LocalizationContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  onSubmit: (text: string, language: string, file: UploadedFile | null) => void;
  isLoading: boolean;
  isAudioPlaying: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setMobileOpen,
  isCollapsed,
  setCollapsed,
  onSubmit,
  isLoading,
  isAudioPlaying,
  theme,
  toggleTheme,
}) => {
  const [text, setText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language, setLanguage, isLoading: isTranslating } = useLocalization();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    
    if (file.type.startsWith('image/')) {
      // Handle images
      reader.onload = (e) => {
        setUploadedFile({ name: file.name, type: 'image', content: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      // Handle text files
      reader.onload = (e) => {
        setUploadedFile({ name: file.name, type: 'text', content: e.target?.result as string });
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Handle PDFs - read as base64
      reader.onload = (e) => {
        setUploadedFile({ name: file.name, type: 'pdf', content: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setError('Only images (PNG, JPG, etc.), text files (.txt), and PDFs are supported.');
      return;
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!language) {
      setError(t('languageError'));
      return;
    }
    if (!text && !uploadedFile) {
      setError(t('textOrFileError'));
      return;
    }
    setError(null);
    onSubmit(text, language, uploadedFile);
    setText(''); // Clear input after sending
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  }


  const collapsedContent = (
    <div className="h-full">
        <div className="p-6 flex justify-center">
            <button
                onClick={() => setCollapsed(false)}
                className="p-2 text-white rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Expand Sidebar"
            >
                <ExpandRightIcon />
            </button>
        </div>
    </div>
  );

  const fullContent = (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
        <div className="flex items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
                <button onClick={toggleTheme} className="p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
                <button
                    onClick={() => setCollapsed(true)}
                    className="p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 hidden md:inline-flex"
                    aria-label="Collapse Sidebar"
                >
                    <CollapseLeftIcon />
                </button>
            </div>
        </div>

        <div className="flex flex-col items-center">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Wizdom</h1>
  <div className="mt-2 mb-1 transform translate-y-2 scale-105">
        <Mascot isAudioPlaying={isAudioPlaying} />
      </div>
            <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
                {t('appSlogan')}
            </p>
        </div>

  <form onSubmit={handleSubmit} className="mt-4 space-y-4 flex-grow flex flex-col">
      <div className="flex-grow space-y-4">

            {uploadedFile && (
              <div className="flex items-center justify-between bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg">
                  <span className="text-sm text-purple-700 dark:text-purple-300 truncate pl-2">{uploadedFile.name}</span>
                  <button onClick={handleRemoveFile} type="button" className="text-purple-500 hover:text-purple-700 text-xs font-bold p-1 rounded-full bg-white/50 dark:bg-black/20">
                      &#x2715;
                  </button>
              </div>
            )}
            
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
            
      {/* Move language select closer to the chat box */}
      <div className="mb-2">
        <label htmlFor="language-select" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('simplifyIntoLabel')}
        </label>
        <div className="relative">
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLoading}
            required
            className={`w-full p-3 text-sm bg-white border border-gray-300 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 focus:ring-purple-500 focus:border-purple-500 ${!language ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}
          >
            <option value="" disabled>
              {t('chooseLanguagePlaceholder')}
            </option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          {isTranslating && <div className="absolute right-3 top-1/2 -translate-y-1/2"><SmallSpinnerIcon /></div>}
        </div>
      </div>

      <div className="mt-2 relative">
              <label htmlFor="chat-input" className="sr-only">{t('pasteTextLabel')}</label>
        <textarea
          id="chat-input"
          rows={6}
          className="w-full p-3 pr-20 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500 transition-all resize-none min-h-[8rem]"
                  placeholder={t('pasteTextPlaceholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
              ></textarea>
              <div className="absolute bottom-2 right-2 flex items-center">
                  <input type="file" id="file-upload" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,text/plain,.pdf,.doc,.docx" />
                  <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="p-2 text-gray-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label={t('uploadButtonDefault')}
                  >
                      <PaperclipIcon />
                  </button>
                  <button
                      type="submit"
                      disabled={isLoading || (!text && !uploadedFile) || !language}
                      className="p-2 text-white bg-purple-600 rounded-full hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-800/50"
                      aria-label={t('sendButton')}
                  >
                    {isLoading ? <SmallSpinnerIcon/> : <SendIcon/>}
                  </button>
              </div>
          </div>
        </form>
    </div>
  );
  
  const sidebarContent = isCollapsed ? collapsedContent : fullContent;

  const sidebarDesktopClasses = `
    h-full hidden md:block transition-all duration-200 ease-in-out
    ${isCollapsed 
        ? 'bg-gradient-to-b from-purple-700 via-purple-800 to-indigo-900 shadow-2xl border-r-2 border-black/20' 
        : 'bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800'}
  `;
  const sidebarMobileClasses = `
    fixed inset-y-0 left-0 z-40 w-full max-w-sm
    bg-gray-100 dark:bg-gray-900
    transform transition-transform duration-200 ease-in-out
    md:hidden
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      <div className={sidebarMobileClasses}>
        {fullContent}
      </div>
      <div className={sidebarDesktopClasses}>
        {sidebarContent}
      </div>
    </>
  );
};