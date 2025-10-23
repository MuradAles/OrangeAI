/**
 * useTheme Hook
 * 
 * Custom hook to access the current theme (light or dark mode)
 * Now supports manual theme toggle with persistence
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

import { useThemeContext } from '@/shared/context/ThemeContext';
import { Theme } from '@/theme';

/**
 * Hook to get the current theme
 * Uses ThemeContext for manual toggle support
 */
export const useTheme = (): Theme => {
  const { theme } = useThemeContext();
  return theme;
};

/**
 * Hook to get the current color scheme name
 */
export const useThemeColorScheme = (): 'light' | 'dark' => {
  const { isDark } = useThemeContext();
  return isDark ? 'dark' : 'light';
};

/**
 * Hook to get theme mode and toggle function
 */
export const useThemeMode = () => {
  const { themeMode, setThemeMode } = useThemeContext();
  return { themeMode, setThemeMode };
};

