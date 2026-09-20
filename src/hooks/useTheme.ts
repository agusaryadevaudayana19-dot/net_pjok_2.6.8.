import { useState, useEffect } from 'react';
import { themeManager } from '../services/themeManager';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(themeManager.isDarkMode());
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(themeManager.getTheme());

  useEffect(() => {
    return themeManager.subscribe((dark, currentTheme) => {
      setIsDark(dark);
      setThemeState(currentTheme);
    });
  }, []);

  return {
    isDark,
    theme,
    toggleTheme: () => themeManager.toggleTheme(),
    setTheme: (t: 'light' | 'dark' | 'system') => themeManager.setTheme(t),
  };
}
