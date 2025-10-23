/**
 * Profile Picture Generator
 * 
 * Utilities for generating profile pictures and colored circles
 */

/**
 * Profile color palette
 * Vibrant, accessible colors for profile pictures
 */
export const PROFILE_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#32ADE6', // Light Blue
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#AF52DE', // Pink
  '#FF2D55', // Magenta
];

/**
 * Get the first letter of a name for avatar display
 * Handles emojis, special characters, and edge cases
 */
export const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return '?';
  
  const cleanName = name.trim();
  
  // Return first character uppercase
  return cleanName[0].toUpperCase();
};

// Alias for backwards compatibility
export const getInitial = getInitials;

/**
 * Generate a deterministic color for a user based on their name
 * Same name always returns the same color
 */
export const generateProfileColor = (name: string = ''): string => {
  // Handle null/undefined
  if (!name) {
    return PROFILE_COLORS[0];
  }
  
  // Convert to string if needed
  const nameStr = String(name);
  
  // Generate hash from name
  let hash = 0;
  for (let i = 0; i < nameStr.length; i++) {
    hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Get color index from hash
  const index = Math.abs(hash) % PROFILE_COLORS.length;
  return PROFILE_COLORS[index];
};

// Alias for backwards compatibility
export const generateAvatarColor = generateProfileColor;

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


