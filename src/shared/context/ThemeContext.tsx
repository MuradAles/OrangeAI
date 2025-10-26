/**
 * ThemeContext - Theme management with multiple theme options
 * 
 * Features:
 * - Multiple color themes (Light, Dark, Ocean, Sunset, Forest, Midnight)
 * - AsyncStorage persistence
 * - System theme fallback
 */

import { arcticTheme, darkTheme, forestTheme, lightTheme, midnightTheme, oceanTheme, roseTheme, sunsetTheme, Theme } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

const THEME_STORAGE_KEY = '@theme_preference';

export type ThemeMode = 'light' | 'dark' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'rose' | 'arctic' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from AsyncStorage on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const validThemes: ThemeMode[] = ['light', 'dark', 'ocean', 'sunset', 'forest', 'midnight', 'rose', 'arctic', 'system'];
      if (savedTheme && validThemes.includes(savedTheme as ThemeMode)) {
        setThemeModeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Determine which theme to use based on themeMode
  const getTheme = (): Theme => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
    
    switch (themeMode) {
      case 'dark':
        return darkTheme;
      case 'ocean':
        return oceanTheme;
      case 'sunset':
        return sunsetTheme;
      case 'forest':
        return forestTheme;
      case 'midnight':
        return midnightTheme;
      case 'rose':
        return roseTheme;
      case 'arctic':
        return arcticTheme;
      case 'light':
      default:
        return lightTheme;
    }
  };
  
  const theme = getTheme();
  const isDark = themeMode === 'dark' || themeMode === 'midnight' || (themeMode === 'system' && systemColorScheme === 'dark');

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};

