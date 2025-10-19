import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { SpinnerIcon } from './icons/Icons';
import { useLocalization } from '../context/LocalizationContext';

interface MainContentProps {
  isLoading: boolean;
  messages: ChatMessage[];
  onPlayStateChange: (isPlaying: boolean) => void;
  onAudioError: () => void;
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-2">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
  </div>
);

const ChatBubble: React.FC<{ message: ChatMessage; onPlayStateChange: (isPlaying: boolean) => void; onAudioError: () => void; }> = ({ message, onPlayStateChange, onAudioError }) => {
  const isUser = message.role === 'user';
  const isError = message.role === 'system-error';

  const bubbleClasses = {
    base: 'p-4 rounded-2xl max-w-xl lg:max-w-3xl whitespace-pre-wrap',
    user: 'bg-purple-600 text-white self-end',
    model: 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 self-start shadow-md',
    error: 'bg-red-100 dark:bg-red-900/50 border border-red-500 text-red-700 dark:text-red-300 self-start',
  };
  
  const roleClass = isUser ? bubbleClasses.user : (isError ? bubbleClasses.error : bubbleClasses.model);

  return (
    <div className={`${bubbleClasses.base} ${roleClass}`}>
      <p>{message.text}</p>
      {message.audioUrl && (
        <div className="mt-4">
          <AudioPlayer 
            src={message.audioUrl} 
            onPlayStateChange={onPlayStateChange} 
            onError={onAudioError}
          />
        </div>
      )}
    </div>
  );
};

export const MainContent: React.FC<MainContentProps> = ({ isLoading, messages, onPlayStateChange, onAudioError }) => {
  const { t } = useLocalization();
  const bottomOfChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const renderContent = () => {
    if (messages.length === 0 && !isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
          <div>
            <h2 className="text-3xl font-semibold text-gray-600 dark:text-gray-400">{t('welcomeMessage', { brandName: 'Wizdom' })}</h2>
            <p className="mt-2">{t('getStartedPrompt')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4">
        {messages.map((msg, index) => (
          <ChatBubble key={index} message={msg} onPlayStateChange={onPlayStateChange} onAudioError={onAudioError} />
        ))}
        {isLoading && (
          <div className="p-4 rounded-2xl max-w-sm bg-white dark:bg-gray-800 self-start shadow-md">
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomOfChatRef} />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow">{renderContent()}</div>
    </div>
  );
};
