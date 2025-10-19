import React from 'react';

// Runtime import for image
const wizardImage = new URL('../assets/wizard.png', import.meta.url).href;

interface MascotProps {
  isAudioPlaying: boolean;
  isCollapsed?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({ isAudioPlaying, isCollapsed }) => {
  // Slightly larger outer and inner sizes so the mascot reads a bit bigger
  const sizeClasses = isCollapsed ? 'w-20 h-20 my-6' : 'w-64 h-64 my-12';
  const innerSizeClasses = isCollapsed ? 'w-16 h-16' : 'w-56 h-56';

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-500 ${sizeClasses}`}
      style={{
        // moves mascot slightly downward
        marginTop: '2rem',
      }}
    >
      {/* ✨ Halo / fade background */}
      <div
        className={`absolute -inset-20 rounded-full transition-all duration-1000 blur-[100px] ${
          isAudioPlaying
            ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.3)_0%,rgba(147,51,234,0.18)_40%,rgba(139,92,246,0.06)_70%,rgba(147,51,234,0)_100%)] animate-[pulse_3s_ease-in-out_infinite]'
            : 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.22)_0%,rgba(147,51,234,0.12)_45%,rgba(147,51,234,0.0)_100%)] opacity-80'
        }`}
      ></div>

      {/* 🪄 Inner faded orb */}
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-full transition-all duration-700 ${innerSizeClasses}`}
        style={{
          background:
            'radial-gradient(circle at center, rgba(147, 51, 234, 0.35) 0%, rgba(139, 92, 246, 0.18) 55%, rgba(147, 51, 234, 0.0) 100%)',
          boxShadow: isAudioPlaying
            ? '0 0 60px 15px rgba(167, 139, 250, 0.25)'
            : '0 0 40px 10px rgba(167, 139, 250, 0.15)',
        }}
      >
        {/* 🧙‍♂️ Wizard Image (centered, larger, slightly lower) */}
        <img
          src={wizardImage}
          alt="Wizdom Wizard Mascot"
          className={`object-contain transition-transform duration-700 ease-in-out ${
            isAudioPlaying ? 'scale-115 opacity-100' : 'scale-105 opacity-95'
          }`}
          style={{
            width: '96%',
            height: 'auto',
            marginTop: '6%', // slight downward offset for visual balance
          }}
        />
      </div>
    </div>
  );
};
