/**
 * Card Component
 * 
 * Reusable card container with elevation
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

export interface CardProps extends ViewProps {
  /**
   * Card elevation (adds shadow)
   */
  elevated?: boolean;
  
  /**
   * Custom padding (overrides default)
   */
  padding?: number;
  
  /**
   * Remove default padding
   */
  noPadding?: boolean;
  
  /**
   * Children components
   */
  children: React.ReactNode;
}

/**
 * Card Component
 */
export const Card: React.FC<CardProps> = ({
  elevated = false,
  padding,
  noPadding = false,
  children,
  style,
  ...props
}) => {
  const theme = useTheme();
  
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.backgroundElevated,
    borderRadius: theme.componentBorderRadius.card,
    padding: noPadding ? 0 : (padding ?? theme.componentSpacing.cardPadding),
    ...(elevated ? theme.componentShadows.cardElevated : theme.componentShadows.card),
    ...(style as ViewStyle),
  };
  
  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};


