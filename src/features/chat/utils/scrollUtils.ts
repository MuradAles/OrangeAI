/**
 * Scroll Utilities
 * 
 * Pure functions for scroll position calculations and AsyncStorage helpers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScrollPosition {
  scrollY: number;
  timestamp: number;
}

/**
 * Save scroll position to AsyncStorage
 */
export async function saveScrollPosition(chatId: string, scrollY: number): Promise<void> {
  try {
    await AsyncStorage.setItem(`scroll_${chatId}`, JSON.stringify({
      scrollY,
      timestamp: Date.now()
    }));
    console.log('💾 Saved scroll position:', scrollY);
  } catch (error) {
    console.log('Failed to save scroll position:', error);
  }
}

/**
 * Load scroll position from AsyncStorage
 */
export async function loadScrollPosition(chatId: string): Promise<ScrollPosition | null> {
  try {
    const savedData = await AsyncStorage.getItem(`scroll_${chatId}`);
    if (savedData) {
      return JSON.parse(savedData);
    }
    return null;
  } catch (error) {
    console.log('Failed to load scroll position:', error);
    return null;
  }
}

/**
 * Check if scroll position is recent (within 5 minutes)
 */
export function isScrollPositionRecent(position: ScrollPosition): boolean {
  return Date.now() - position.timestamp < 5 * 60 * 1000;
}

/**
 * Check if user is near bottom of scroll
 */
export function isNearBottom(
  contentOffset: { y: number },
  contentSize: { height: number },
  layoutMeasurement: { height: number },
  threshold: number = 50
): boolean {
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold;
}

/**
 * Calculate scroll position for FlashList contentOffset
 */
export function calculateContentOffset(
  isAtBottom: boolean,
  lastScrollY: number
): { x: number; y: number } | undefined {
  return !isAtBottom && lastScrollY > 0 
    ? { x: 0, y: lastScrollY } 
    : undefined;
}
