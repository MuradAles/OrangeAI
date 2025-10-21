/**
 * Badge Component
 * 
 * Small circular badge for displaying counts (unread messages, notifications)
 * Supports numbers and text
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface BadgeProps {
  count?: number;
  text?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  size?: 'small' | 'medium' | 'large';
  maxCount?: number;
  style?: ViewStyle;
}

export const Badge = ({
  count,
  text,
  variant = 'primary',
  size = 'medium',
  maxCount = 99,
  style,
}: BadgeProps) => {
  const theme = useTheme();

  // Determine display text
  const displayText = text || (count !== undefined ? (count > maxCount ? `${maxCount}+` : String(count)) : '');

  // Don't render if no content
  if (!displayText) return null;

  // Size styles
  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
    },
    medium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 8,
    },
  };

  // Variant colors
  const variantColors = {
    primary: theme.colors.primary,
    secondary: theme.colors.textSecondary,
    success: theme.colors.success,
    error: theme.colors.error,
    warning: theme.colors.warning,
  };

  // Font sizes
  const fontSizes = {
    small: 10,
    medium: 11,
    large: 13,
  };

  return (
    <View
      style={[
        styles.container,
        sizeStyles[size],
        { backgroundColor: variantColors[variant] },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize: fontSizes[size],
            color: '#fff',
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

