/**
 * Input Component
 * 
 * Reusable text input with error states and validation
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

export interface InputProps extends TextInputProps {
  /**
   * Input label
   */
  label?: string;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text (shown below input)
   */
  helperText?: string;
  
  /**
   * Left icon component
   */
  leftIcon?: React.ReactNode;
  
  /**
   * Right icon component
   */
  rightIcon?: React.ReactNode;
  
  /**
   * Show character count
   */
  showCharacterCount?: boolean;
  
  /**
   * Maximum length (for character count)
   */
  maxLength?: number;
  
  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;
  
  /**
   * Custom input style
   */
  inputStyle?: TextStyle;
  
  /**
   * Multiline input (textarea)
   */
  multiline?: boolean;
  
  /**
   * Number of lines (for multiline)
   */
  numberOfLines?: number;
  
  /**
   * Password input toggle visibility
   */
  secureTextEntry?: boolean;
}

/**
 * Input Component
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  showCharacterCount,
  maxLength,
  containerStyle,
  inputStyle,
  multiline = false,
  numberOfLines = 1,
  secureTextEntry = false,
  value,
  onChangeText,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const hasError = !!error;
  const characterCount = value?.length || 0;
  
  // Determine border color based on state
  const getBorderColor = () => {
    if (hasError) return theme.colors.error;
    if (isFocused) return theme.colors.borderFocus;
    return theme.colors.border;
  };
  
  // Determine border width based on state
  const getBorderWidth = () => {
    return isFocused 
      ? theme.componentBorderWidth.inputFocused 
      : theme.componentBorderWidth.input;
  };
  
  const inputContainerStyle: ViewStyle = {
    borderColor: getBorderColor(),
    borderWidth: getBorderWidth(),
    borderRadius: theme.componentBorderRadius.input,
    backgroundColor: theme.colors.backgroundInput,
    paddingHorizontal: theme.componentSpacing.inputPadding,
    paddingVertical: multiline ? theme.componentSpacing.inputPadding : theme.spacing.sm,
    minHeight: multiline ? numberOfLines * 24 + theme.componentSpacing.inputPadding * 2 : 48,
    ...theme.innerShadow,
  };
  
  const textInputStyle: TextStyle = {
    ...theme.typography.input,
    color: theme.colors.text,
    flex: 1,
    ...(multiline && {
      textAlignVertical: 'top',
      minHeight: numberOfLines * 24,
    }),
    ...inputStyle,
  };
  
  const labelStyle: TextStyle = {
    ...theme.typography.label,
    color: hasError ? theme.colors.error : theme.colors.textSecondary,
    marginBottom: theme.componentSpacing.inputLabelGap,
  };
  
  const helperStyle: TextStyle = {
    ...theme.typography.caption,
    color: hasError ? theme.colors.error : theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && <Text style={labelStyle}>{label}</Text>}
      
      {/* Input Container */}
      <View style={[styles.inputContainer, inputContainerStyle]}>
        {/* Left Icon */}
        {leftIcon && (
          <View style={styles.iconLeft}>
            {leftIcon}
          </View>
        )}
        
        {/* Text Input */}
        <TextInput
          style={textInputStyle}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={theme.colors.textTertiary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
        />
        
        {/* Password Toggle or Right Icon */}
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.iconRight}
          >
            <Text style={{ color: theme.colors.textSecondary }}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.iconRight}>
            {rightIcon}
          </View>
        ) : null}
      </View>
      
      {/* Helper Text / Error / Character Count */}
      <View style={styles.footer}>
        {(error || helperText) && (
          <Text style={helperStyle}>
            {error || helperText}
          </Text>
        )}
        
        {showCharacterCount && maxLength && (
          <Text style={[helperStyle, styles.characterCount]}>
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterCount: {
    marginLeft: 8,
  },
});


