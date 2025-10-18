
import { useState, useEffect, useCallback } from 'react';

export const useAccessibility = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);

  useEffect(() => {
    const highContrast = localStorage.getItem('highContrast') === 'true';
    const largeText = localStorage.getItem('largeText') === 'true';
    setIsHighContrast(highContrast);
    setIsLargeText(largeText);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrast(prev => {
      const newValue = !prev;
      localStorage.setItem('highContrast', String(newValue));
      return newValue;
    });
  }, []);

  const toggleLargeText = useCallback(() => {
    setIsLargeText(prev => {
      const newValue = !prev;
      localStorage.setItem('largeText', String(newValue));
      return newValue;
    });
  }, []);

  return { isHighContrast, isLargeText, toggleHighContrast, toggleLargeText };
};
