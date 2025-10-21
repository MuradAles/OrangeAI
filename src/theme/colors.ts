/**
 * Theme Colors - SINGLE SOURCE OF TRUTH
 * 
 * All color values for light and dark modes.
 * Components must import from here - NO hardcoded colors allowed.
 */

/**
 * Color palette type
 */
export interface ColorPalette {
  // Primary brand colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  
  // Background colors
  background: string;
  backgroundElevated: string;       // Cards, elevated surfaces
  backgroundInput: string;          // Input fields
  
  // Surface colors
  surface: string;
  surfaceVariant: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnPrimary: string;
  
  // Message bubble colors
  messageSent: string;              // Sent messages (blue)
  messageReceived: string;          // Received messages (gray)
  messageText: string;              // Text in sent messages
  messageTextReceived: string;      // Text in received messages
  
  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Indicator colors
  online: string;                   // Green dot (user online)
  offline: string;                  // Gray dot (user offline)
  typing: string;                   // Typing indicator
  
  // Message status colors
  statusSending: string;            // Clock icon
  statusSent: string;               // Single checkmark
  statusDelivered: string;          // Double checkmark
  statusRead: string;               // Blue double checkmark
  
  // Border colors
  border: string;
  borderLight: string;
  borderFocus: string;
  
  // Badge colors
  badge: string;                    // Unread count badge background
  badgeText: string;                // Unread count badge text
  
  // Button colors
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  buttonDisabled: string;
  buttonDisabledText: string;
  
  // Overlay colors
  overlay: string;                  // Modal overlay
  shadow: string;                   // Shadow color
}

/**
 * Light Mode Colors
 */
export const lightColors: ColorPalette = {
  // Primary
  primary: '#0084FF',
  primaryDark: '#0066CC',
  primaryLight: '#4DA6FF',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#F8F8F8',
  backgroundInput: '#F0F0F0',
  
  // Surface
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  
  // Text
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#0084FF',
  messageReceived: '#F0F0F0',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  
  // Indicators
  online: '#34C759',
  offline: '#C7C7CC',
  typing: '#666666',
  
  // Message status
  statusSending: '#999999',
  statusSent: '#999999',
  statusDelivered: '#999999',
  statusRead: '#0084FF',
  
  // Borders
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  borderFocus: '#0084FF',
  
  // Badge
  badge: '#FF3B30',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#0084FF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#F0F0F0',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#E5E5E5',
  buttonDisabledText: '#999999',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Dark Mode Colors
 */
export const darkColors: ColorPalette = {
  // Primary
  primary: '#0A84FF',
  primaryDark: '#0066CC',
  primaryLight: '#409CFF',
  
  // Background
  background: '#000000',
  backgroundElevated: '#1C1C1E',
  backgroundInput: '#2C2C2E',
  
  // Surface
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textInverse: '#000000',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#0A84FF',
  messageReceived: '#1C1C1E',
  messageText: '#FFFFFF',
  messageTextReceived: '#FFFFFF',
  
  // Status
  success: '#32D74B',
  error: '#FF453A',
  warning: '#FF9F0A',
  info: '#0A84FF',
  
  // Indicators
  online: '#32D74B',
  offline: '#48484A',
  typing: '#8E8E93',
  
  // Message status
  statusSending: '#8E8E93',
  statusSent: '#8E8E93',
  statusDelivered: '#8E8E93',
  statusRead: '#0A84FF',
  
  // Borders
  border: '#38383A',
  borderLight: '#2C2C2E',
  borderFocus: '#0A84FF',
  
  // Badge
  badge: '#FF453A',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#0A84FF',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#2C2C2E',
  buttonSecondaryText: '#FFFFFF',
  buttonDisabled: '#1C1C1E',
  buttonDisabledText: '#48484A',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Profile picture fallback colors (colored circles)
 * Used when user has no profile picture
 */
export const avatarColors = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#32ADE6', // Light Blue
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
];

/**
 * Get a deterministic color for a user based on their name
 */
export const getAvatarColor = (name: string): string => {
  if (!name) return avatarColors[0];
  
  // Generate hash from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use hash to select color
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};


