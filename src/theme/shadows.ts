/**
 * Theme Shadows - SINGLE SOURCE OF TRUTH
 * 
 * All shadow styles for elevation and depth.
 * Components must import from here - NO hardcoded shadow values allowed.
 */

import { Platform, ViewStyle } from 'react-native';

/**
 * Shadow configuration type
 */
export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;              // Android elevation
}

/**
 * Create shadow style based on elevation level
 */
const createShadow = (elevation: number): ShadowStyle => {
  if (Platform.OS === 'android') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation,
    };
  }
  
  // iOS shadows
  const shadowOpacity = 0.15 + (elevation * 0.02);
  const shadowRadius = elevation * 2;
  const shadowHeight = elevation;
  
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: shadowHeight },
    shadowOpacity: Math.min(shadowOpacity, 0.3),
    shadowRadius,
    elevation,
  };
};

/**
 * Shadow elevation levels
 */
export const shadows = {
  none: createShadow(0),
  sm: createShadow(2),
  md: createShadow(4),
  lg: createShadow(8),
  xl: createShadow(12),
  xxl: createShadow(16),
};

/**
 * Component-specific shadows
 */
export const componentShadows = {
  card: shadows.sm,
  cardElevated: shadows.md,
  button: shadows.sm,
  modal: shadows.xl,
  bottomSheet: shadows.xxl,
  floatingButton: shadows.lg,
  header: shadows.sm,
  tabBar: shadows.sm,
  dropdown: shadows.md,
  tooltip: shadows.sm,
};

/**
 * Pressed state shadows (reduced elevation)
 */
export const pressedShadows = {
  none: createShadow(0),
  sm: createShadow(1),
  md: createShadow(2),
  lg: createShadow(4),
  xl: createShadow(6),
  xxl: createShadow(8),
};

/**
 * Get shadow style based on component and state
 */
export const getShadow = (
  component: keyof typeof componentShadows,
  pressed: boolean = false
): ShadowStyle => {
  const shadow = componentShadows[component];
  if (pressed) {
    const elevation = shadow.elevation;
    const pressedElevation = Math.max(0, elevation - 2);
    return createShadow(pressedElevation);
  }
  return shadow;
};

/**
 * Inner shadow (used for inputs and depressed surfaces)
 * Note: React Native doesn't support inner shadows natively
 * This creates a similar effect using border/background tricks
 */
export const innerShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  android: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  default: {},
}) as ViewStyle;

/**
 * Glow effect (for focused states)
 */
export const createGlow = (color: string, intensity: number = 0.3): ShadowStyle => {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: intensity,
    shadowRadius: 8,
    elevation: 4,
  };
};

/**
 * Text shadows (for contrast on images)
 */
export const textShadows = {
  none: {},
  sm: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  md: {
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  lg: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
};


