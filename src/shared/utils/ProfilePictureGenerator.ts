/**
 * Profile Picture Generator
 * 
 * Utilities for generating profile pictures and colored circles
 */

import { getAvatarColor } from '@/theme';

/**
 * Get the first letter of a name for avatar display
 * Handles emojis, special characters, and edge cases
 */
export const getInitial = (name: string): string => {
  if (!name || name.trim().length === 0) return '?';
  
  const cleanName = name.trim();
  
  // Handle emojis and special characters
  // Get the first character that's a letter or number
  const match = cleanName.match(/[a-zA-Z0-9]/);
  
  if (match) {
    return match[0].toUpperCase();
  }
  
  // If no letters/numbers, return first character
  return cleanName[0].toUpperCase();
};

/**
 * Generate a deterministic color for a user based on their name
 * Same name always returns the same color
 */
export const generateAvatarColor = (name: string): string => {
  return getAvatarColor(name);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate image file type
 */
export const isValidImageType = (mimeType: string): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(mimeType.toLowerCase());
};

/**
 * Validate image file size (max 10MB)
 */
export const isValidImageSize = (bytes: number): boolean => {
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  return bytes <= maxSize;
};

/**
 * Generate a random avatar color (for testing or when no name available)
 */
export const getRandomAvatarColor = (): string => {
  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE',
    '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
  ];
  
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
};


