import React from 'react';

interface MascotProps {
  isAudioPlaying: boolean;
  isCollapsed?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({ isAudioPlaying, isCollapsed }) => {
  const haloClasses = `absolute inset-0 bg-purple-500 rounded-full blur-xl transition-all duration-500 ${isAudioPlaying ? 'halo-animate' : 'opacity-50'}`;
  const sizeClasses = isCollapsed ? 'w-16 h-16 my-4' : 'w-32 h-32 my-8';
  const innerSizeClasses = isCollapsed ? 'w-14 h-14' : 'w-28 h-28';
  const iconContainerClasses = isCollapsed ? 'w-10 h-10' : 'w-16 h-16';
  const iconClasses = isCollapsed ? 'w-6 h-6' : 'w-10 h-10';

  return (
    <div className={`relative flex items-center justify-center transition-all duration-150 ${sizeClasses}`}>
      <div className={haloClasses}></div>
      <div className={`relative bg-gradient-to-br from-purple-600 to-indigo-700 rounded-full shadow-lg flex items-center justify-center transition-all duration-150 ${innerSizeClasses}`}>
         <div className={`bg-white/20 rounded-full flex items-center justify-center transition-all duration-150 ${iconContainerClasses}`}>
            <svg className={`text-white transition-all duration-150 ${iconClasses}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
         </div>
      </div>
    </div>
  );
};