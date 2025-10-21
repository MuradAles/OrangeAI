/**
 * Button Component
 * 
 * Reusable button with variants (primary, secondary, outline)
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
    ViewStyle
} from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /**
   * Button text
   */
  title: string;
  
  /**
   * Button variant
   */
  variant?: ButtonVariant;
  
  /**
   * Button size
   */
  size?: ButtonSize;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Disabled state
   */
  disabled?: boolean;
  
  /**
   * Full width button
   */
  fullWidth?: boolean;
  
  /**
   * Custom container style
   */
  style?: ViewStyle;
  
  /**
   * Custom text style
   */
  textStyle?: TextStyle;
  
  /**
   * Icon component (optional)
   */
  icon?: React.ReactNode;
  
  /**
   * Icon position
   */
  iconPosition?: 'left' | 'right';
}

/**
 * Button Component
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  onPress,
  ...props
}) => {
  const theme = useTheme();
  
  // Determine if button is disabled (either explicitly or while loading)
  const isDisabled = disabled || loading;
  
  // Get variant-specific styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled 
              ? theme.colors.buttonDisabled 
              : theme.colors.buttonPrimary,
            ...theme.componentShadows.button,
          },
          text: {
            color: isDisabled 
              ? theme.colors.buttonDisabledText 
              : theme.colors.buttonPrimaryText,
          },
        };
        
      case 'secondary':
        return {
          container: {
            backgroundColor: isDisabled
              ? theme.colors.buttonDisabled
              : theme.colors.buttonSecondary,
          },
          text: {
            color: isDisabled
              ? theme.colors.buttonDisabledText
              : theme.colors.buttonSecondaryText,
          },
        };
        
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: theme.componentBorderWidth.button,
            borderColor: isDisabled
              ? theme.colors.buttonDisabled
              : theme.colors.primary,
          },
          text: {
            color: isDisabled
              ? theme.colors.buttonDisabledText
              : theme.colors.primary,
          },
        };
        
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: isDisabled
              ? theme.colors.buttonDisabledText
              : theme.colors.primary,
          },
        };
    }
  };
  
  // Get size-specific styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'small':
        return {
          container: {
            paddingVertical: theme.componentSpacing.buttonPaddingSmall,
            paddingHorizontal: theme.spacing.md,
            height: 36,
          },
          text: theme.typography.buttonSmall,
        };
        
      case 'medium':
        return {
          container: {
            paddingVertical: theme.componentSpacing.buttonPadding,
            paddingHorizontal: theme.spacing.lg,
            height: 48,
          },
          text: theme.typography.button,
        };
        
      case 'large':
        return {
          container: {
            paddingVertical: theme.componentSpacing.buttonPaddingLarge,
            paddingHorizontal: theme.spacing.xl,
            height: 56,
          },
          text: theme.typography.buttonLarge,
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  
  const containerStyle: ViewStyle = {
    ...styles.container,
    borderRadius: theme.componentBorderRadius.button,
    ...variantStyles.container,
    ...sizeStyles.container,
    ...(fullWidth && styles.fullWidth),
    ...style,
  };
  
  const textStyles: TextStyle = {
    ...sizeStyles.text,
    ...variantStyles.text,
    ...textStyle,
  };
  
  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variantStyles.text.color} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={{ marginRight: theme.componentSpacing.buttonGap }}>
                {icon}
              </View>
            )}
            <Text style={textStyles}>{title}</Text>
            {icon && iconPosition === 'right' && (
              <View style={{ marginLeft: theme.componentSpacing.buttonGap }}>
                {icon}
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});


