/**
 * Avatar Component
 * 
 * User profile picture with fallback to colored circle + initial
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import { Image, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge' | number;

export interface AvatarProps {
  /**
   * User's display name (for fallback initial)
   */
  name: string;
  
  /**
   * Profile picture URL (optional)
   */
  imageUrl?: string | null;
  
  /**
   * Avatar size (preset string or custom number)
   */
  size?: AvatarSize;
  
  /**
   * Show online indicator
   */
  showOnline?: boolean;
  
  /**
   * Is user online
   */
  isOnline?: boolean;
  
  /**
   * Show border around avatar
   */
  showBorder?: boolean;
  
  /**
   * Custom container style
   */
  style?: ViewStyle;
  
  /**
   * Test ID for testing
   */
  testID?: string;
  
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
}

/**
 * Avatar Component
 */
export const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUrl,
  size = 'medium',
  showOnline = false,
  isOnline = false,
  showBorder = true,
  style,
  testID,
  accessibilityLabel,
}) => {
  const theme = useTheme();
  
  // Get size value
  const getSizeValue = (): number => {
    // If size is a number, use it directly
    if (typeof size === 'number') {
      return size;
    }
    
    // Otherwise use preset sizes
    switch (size) {
      case 'small':
        return theme.componentSpacing.avatarSizeSmall;
      case 'large':
        return theme.componentSpacing.avatarSizeLarge;
      case 'xlarge':
        return theme.componentSpacing.avatarSizeXLarge;
      case 'medium':
      default:
        return theme.componentSpacing.avatarSizeMedium;
    }
  };
  
  const sizeValue = getSizeValue();
  
  // Get first letter of name
  const getInitial = (): string => {
    if (!name) return '?';
    // Handle emojis and special characters
    const cleanName = name.trim();
    if (cleanName.length === 0) return '?';
    return cleanName[0].toUpperCase();
  };
  
  const initial = getInitial();
  const backgroundColor = theme.getAvatarColor(name);
  
  const containerStyle: ViewStyle = {
    width: sizeValue,
    height: sizeValue,
    borderRadius: sizeValue / 2, // Always circular (half of size)
    backgroundColor: imageUrl ? 'transparent' : backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: showBorder ? 1 : 0,
    borderColor: theme.colors.border,
    ...style,
  };
  
  const textStyle: TextStyle = {
    color: '#FFFFFF',
    fontSize: sizeValue * 0.4,
    fontWeight: theme.fontWeight.semiBold,
  };
  
  const onlineIndicatorSize = sizeValue * 0.25;
  const onlineIndicatorStyle: ViewStyle = {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: onlineIndicatorSize,
    height: onlineIndicatorSize,
    borderRadius: onlineIndicatorSize / 2,
    backgroundColor: isOnline ? theme.colors.online : theme.colors.offline,
    borderWidth: 2,
    borderColor: theme.colors.background,
  };
  
  return (
    <View 
      style={containerStyle}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `${name}'s avatar`}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : (
        <Text style={textStyle}>{initial}</Text>
      )}
      
      {showOnline && (
        <View style={onlineIndicatorStyle} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});


