import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { LANGUAGES } from '../constants';
import { Mascot } from './Mascot';
import { ArrowRightIcon, PaperclipIcon, CollapseLeftIcon, ExpandRightIcon, SunIcon, MoonIcon } from './icons/Icons';

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
  const [language, setLanguage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    const isTextFile = file.type === 'text/plain' || file.name.endsWith('.txt');

    if (file.type.startsWith('image/')) {
      reader.onload = (e) => {
        setUploadedFile({
          name: file.name,
          type: 'image',
          content: e.target?.result as string,
        });
        setText(''); // Clear text area when image is uploaded
      };
      reader.readAsDataURL(file);
    } else if (isTextFile) {
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        setText(fileContent);
        setUploadedFile({
          name: file.name,
          type: 'text',
          content: fileContent,
        });
      };
      reader.readAsText(file);
    } else {
      // For other file types like PDF, don't read content, just store info.
      setText(''); // Clear textarea for non-text files
      setUploadedFile({
        name: file.name,
        type: 'text',
        content: `File: ${file.name}, Type: ${file.type}`,
      });
    }

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!language) {
      setError('Please select a preferred language.');
      return;
    }
    if (!text && !uploadedFile) {
      setError('Please enter some text or upload a file.');
      return;
    }
    setError(null);
    onSubmit(text, language, uploadedFile);
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    if(uploadedFile?.type === 'text') {
        setText('');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if(uploadedFile) {
        handleRemoveFile();
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">SpeakEasy</h1>
            <Mascot isAudioPlaying={isAudioPlaying} />
            <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
                Simplify any document to any language
            </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
                <label htmlFor="document-text" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paste your text here
                </label>
                <textarea
                    id="document-text"
                    rows={6}
                    className="w-full p-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Enter text..."
                    value={text}
                    onChange={handleTextChange}
                    disabled={isLoading || (!!uploadedFile && uploadedFile.type === 'text')}
                ></textarea>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-100 dark:bg-gray-900 text-gray-500">OR</span>
                </div>
            </div>

            <div>
                <input type="file" id="file-upload" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*,text/plain,.pdf,.doc,.docx" />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-purple-700 bg-purple-100 border border-transparent rounded-lg dark:bg-purple-900/50 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                    <PaperclipIcon />
                    <span className="ml-2 truncate">
                        {uploadedFile ? uploadedFile.name : 'Upload a document'}
                    </span>
                </button>
                {uploadedFile && (
                    <button onClick={handleRemoveFile} type="button" className="text-xs text-red-500 hover:text-red-700 mt-1 w-full text-right">Remove file</button>
                )}
            </div>

            <div>
                <label htmlFor="language-select" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Simplify into
                </label>
                <select
                    id="language-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isLoading}
                    required
                    className={`w-full p-3 text-sm bg-white border border-gray-300 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-600 focus:ring-purple-500 focus:border-purple-500 ${!language ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}
                >
                    <option value="" disabled>
                        Choose preferred language
                    </option>
                    {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>
            </div>
            
            {error && <p className="text-sm text-red-500">{error}</p>}
            
            <button
                type="submit"
                disabled={isLoading || (!text && !uploadedFile) || !language}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-purple-600 border border-transparent rounded-lg shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-purple-400 dark:disabled:bg-purple-800/50 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-lg hover:shadow-purple-500/40"
            >
                {isLoading ? 'Processing...' : 'Simplify'}
                {!isLoading && <ArrowRightIcon />}
            </button>
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
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}
      {/* Mobile Sidebar */}
      <div className={sidebarMobileClasses}>
        {fullContent}
      </div>
      {/* Desktop Sidebar */}
      <div className={sidebarDesktopClasses}>
        {sidebarContent}
      </div>
    </>
  );
};