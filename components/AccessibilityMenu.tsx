import React, { useState } from 'react';
import { AccessibilityIcon, CloseIcon } from './icons/Icons';
import { useLocalization } from '../context/LocalizationContext';

interface AccessibilityMenuProps {
  isHighContrast: boolean;
  isLargeText: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
}

export const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({ isHighContrast, isLargeText, toggleHighContrast, toggleLargeText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLocalization();

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 rounded-lg shadow-2xl mb-2 w-64 transition-all duration-150 origin-bottom-right">
          <h3 className="font-bold text-lg mb-3">{t('accessibilityTitle')}</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span>{t('highContrastLabel')}</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isHighContrast} onChange={toggleHighContrast} />
                <div className={`block w-10 h-6 rounded-full ${isHighContrast ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isHighContrast ? 'translate-x-full' : ''}`}></div>
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span>{t('largeTextLabel')}</span>
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={isLargeText} onChange={toggleLargeText} />
                <div className={`block w-10 h-6 rounded-full ${isLargeText ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isLargeText ? 'translate-x-full' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-purple-500"
        aria-label={t('accessibilityTitle')}
      >
        {isOpen ? <CloseIcon /> : <AccessibilityIcon />}
      </button>
    </div>
  );
};