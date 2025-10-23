/**
 * Theme System - Main Export
 * 
 * Central export for the complete theme system.
 * Import from here to access all theme values in components.
 * 
 * Usage:
 * import { useTheme } from '@/shared/hooks/useTheme';
 * const theme = useTheme();
 * 
 * Or for direct access:
 * import { lightTheme, darkTheme, spacing, typography } from '@/theme';
 */

import {
    borderRadius,
    borderStyle,
    borderWidth,
    componentBorderRadius,
    componentBorderWidth,
    getMessageBubbleRadius,
    messageBubbleRadius,
    outline
} from './borders';
import { ColorPalette, avatarColors, darkColors, getAvatarColor, lightColors } from './colors';
import {
    componentShadows,
    createGlow,
    getShadow,
    innerShadow,
    shadows,
    textShadows
} from './shadows';
import {
    chatSpacing,
    componentSpacing,
    getSpacing,
    layoutSpacing,
    screenSpacing,
    spacing,
    verticalRhythm
} from './spacing';
import {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight,
    textAlign,
    textDecoration,
    textTransform,
    typography
} from './typography';

/**
 * Complete theme type
 */
export interface Theme {
  colors: ColorPalette;
  spacing: typeof spacing;
  screenSpacing: typeof screenSpacing;
  componentSpacing: typeof componentSpacing;
  layoutSpacing: typeof layoutSpacing;
  chatSpacing: typeof chatSpacing;
  fontFamily: typeof fontFamily;
  fontWeight: typeof fontWeight;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  typography: typeof typography;
  letterSpacing: typeof letterSpacing;
  textTransform: typeof textTransform;
  textAlign: typeof textAlign;
  textDecoration: typeof textDecoration;
  borderRadius: typeof borderRadius;
  componentBorderRadius: typeof componentBorderRadius;
  borderWidth: typeof borderWidth;
  componentBorderWidth: typeof componentBorderWidth;
  borderStyle: typeof borderStyle;
  messageBubbleRadius: typeof messageBubbleRadius;
  shadows: typeof shadows;
  componentShadows: typeof componentShadows;
  innerShadow: typeof innerShadow;
  textShadows: typeof textShadows;
  // Helper functions
  getSpacing: typeof getSpacing;
  verticalRhythm: typeof verticalRhythm;
  getMessageBubbleRadius: typeof getMessageBubbleRadius;
  getShadow: typeof getShadow;
  createGlow: typeof createGlow;
  getAvatarColor: typeof getAvatarColor;
}

/**
 * Light Theme
 */
export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  screenSpacing,
  componentSpacing,
  layoutSpacing,
  chatSpacing,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  typography,
  letterSpacing,
  textTransform,
  textAlign,
  textDecoration,
  borderRadius,
  componentBorderRadius,
  borderWidth,
  componentBorderWidth,
  borderStyle,
  messageBubbleRadius,
  shadows,
  componentShadows,
  innerShadow,
  textShadows,
  getSpacing,
  verticalRhythm,
  getMessageBubbleRadius,
  getShadow,
  createGlow,
  getAvatarColor,
};

/**
 * Dark Theme
 */
export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  screenSpacing,
  componentSpacing,
  layoutSpacing,
  chatSpacing,
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  typography,
  letterSpacing,
  textTransform,
  textAlign,
  textDecoration,
  borderRadius,
  componentBorderRadius,
  borderWidth,
  componentBorderWidth,
  borderStyle,
  messageBubbleRadius,
  shadows,
  componentShadows,
  innerShadow,
  textShadows,
  getSpacing,
  verticalRhythm,
  getMessageBubbleRadius,
  getShadow,
  createGlow,
  getAvatarColor,
};

/**
 * Export individual theme parts for direct import
 */
export {
    avatarColors,
    // Borders
    borderRadius, borderStyle, borderWidth, chatSpacing, componentBorderRadius, componentBorderWidth, componentShadows, componentSpacing, createGlow, darkColors,
    // Typography
    fontFamily, fontSize, fontWeight, getAvatarColor, getMessageBubbleRadius, getShadow, getSpacing, innerShadow, layoutSpacing, letterSpacing,
    // Colors
    lightColors, lineHeight, messageBubbleRadius, outline, screenSpacing,
    // Shadows
    shadows,
    // Spacing
    spacing, textAlign,
    textDecoration, textShadows, textTransform, typography, verticalRhythm
};

/**
 * Export types
 */
    export type { ShadowStyle } from './shadows';
    export type { ColorPalette };


