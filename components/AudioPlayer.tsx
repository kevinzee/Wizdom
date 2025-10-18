import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon } from './icons/Icons';

interface AudioPlayerProps {
  src: string;
  onPlayStateChange: (isPlaying: boolean) => void;
  onError: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, onPlayStateChange, onError }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onPlayStateChange(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
          console.error("Audio playback error:", err);
          onError();
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onTimeUpdate = () => {
     if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
     }
  };

  const onEnded = () => {
    setIsPlaying(false);
  };
  
  const handleProgressChange = () => {
    if (audioRef.current && progressBarRef.current) {
        audioRef.current.currentTime = Number(progressBarRef.current.value);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="w-full bg-white/70 dark:bg-gray-800/50 p-4 rounded-lg shadow-lg flex items-center space-x-4 backdrop-blur-sm">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
        preload="metadata"
      />
      <button
        onClick={togglePlayPause}
        className="p-3 bg-purple-600 hover:bg-purple-700 rounded-full text-white transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="flex-grow flex items-center space-x-3">
        <span className="text-sm text-gray-600 dark:text-gray-400 w-10 text-center">{formatTime(currentTime)}</span>
        <input
          ref={progressBarRef}
          type="range"
          value={currentTime}
          max={duration || 0}
          onChange={handleProgressChange}
          className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400 w-10 text-center">{formatTime(duration)}</span>
      </div>
    </div>
  );
};