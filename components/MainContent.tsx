import React from 'react';
import { AppState, SimplifiedData } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { SpinnerIcon } from './icons/Icons';

interface MainContentProps {
  appState: AppState;
  data: SimplifiedData | null;
  error: string | null;
  onPlayStateChange: (isPlaying: boolean) => void;
  onAudioError: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({ appState, data, error, onPlayStateChange, onAudioError }) => {

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <SpinnerIcon />
            <p className="mt-4 text-lg">Simplifying your document...</p>
          </div>
        );
      case 'success':
        return (
          data && (
            <div className="flex flex-col h-full">
              <div className="flex-grow overflow-y-auto bg-white/50 dark:bg-gray-800/30 p-6 rounded-lg shadow-inner">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Simplified Document</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{data.simplifiedText}</p>
              </div>
              <div className="flex-shrink-0 mt-6">
                <AudioPlayer 
                  src={data.audioUrl} 
                  onPlayStateChange={onPlayStateChange} 
                  onError={onAudioError} 
                />
              </div>
            </div>
          )
        );
      case 'error':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-100 dark:bg-red-900/50 border border-red-500 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
            <div>
              <h2 className="text-3xl font-semibold text-gray-600 dark:text-gray-400">Welcome to SpeakEasy</h2>
              <p className="mt-2">Enter some text or upload a file on the left to get started.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow">{renderContent()}</div>
    </div>
  );
};