/**
 * LoadingSpinner Component
 * 
 * Reusable loading indicator
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type LoadingSpinnerSize = 'small' | 'medium' | 'large';

export interface LoadingSpinnerProps {
  /**
   * Spinner size
   */
  size?: LoadingSpinnerSize | number;
  
  /**
   * Custom color (overrides theme)
   */
  color?: string;
  
  /**
   * Loading text (optional)
   */
  text?: string;
  
  /**
   * Full screen overlay
   */
  fullScreen?: boolean;
  
  /**
   * Custom container style
   */
  style?: ViewStyle;
}

/**
 * LoadingSpinner Component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color,
  text,
  fullScreen = false,
  style,
}) => {
  const theme = useTheme();
  
  // Map our size values to React Native's ActivityIndicator valid sizes
  // ActivityIndicator only accepts 'small' | 'large' | number
  const getActivityIndicatorSize = (): 'small' | 'large' | number => {
    if (typeof size === 'number') return size;
    
    switch (size) {
      case 'small':
        return 'small';
      case 'medium':
        return 'large'; // Map medium to large
      case 'large':
        return 'large';
      default:
        return 'large';
    }
  };
  
  const spinnerSize = getActivityIndicatorSize();
  const spinnerColor = color || theme.colors.primary;
  
  const containerStyle: ViewStyle = fullScreen
    ? {
        ...styles.fullScreen,
        backgroundColor: theme.colors.overlay,
      }
    : {
        ...styles.container,
        ...style,
      };
  
  const textStyle: TextStyle = {
    ...theme.typography.body,
    color: fullScreen ? theme.colors.textInverse : theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  };
  
  return (
    <View style={containerStyle}>
      <ActivityIndicator size={spinnerSize} color={spinnerColor} />
      {text && <Text style={textStyle}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});


