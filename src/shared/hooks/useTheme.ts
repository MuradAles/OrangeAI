/**
 * useTheme Hook
 * 
 * Custom hook to access the current theme (light or dark mode)
 * 
 * Usage:
 * const theme = useTheme();
 * const styles = StyleSheet.create({
 *   container: {
 *     backgroundColor: theme.colors.background,
 *     padding: theme.spacing.md,
 *   }
 * });
 */

import { darkTheme, lightTheme, Theme } from '@/theme';
import { useColorScheme } from 'react-native';

/**
 * Hook to get the current theme based on system color scheme
 * 
 * TODO: Phase 5 - Add theme persistence and manual toggle
 * For now, follows system theme automatically
 */
export const useTheme = (): Theme => {
  const colorScheme = useColorScheme();
  
  // Return theme based on system preference
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};

/**
 * Hook to get the current color scheme name
 */
export const useThemeColorScheme = (): 'light' | 'dark' => {
  const systemColorScheme = useColorScheme();
  return systemColorScheme === 'dark' ? 'dark' : 'light';
};

