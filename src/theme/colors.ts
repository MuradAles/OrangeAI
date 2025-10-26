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
  backgroundGap: string;            // Gap color between cards
  
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
  successLight: string;
  error: string;
  errorLight: string;
  errorBackground: string;
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
  backgroundGap: '#FFFFFF', // Same as background in light mode
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#0084FF', // Blue for sent messages (brand color)
  messageReceived: '#E5E5E5', // Light gray for received messages
  messageText: '#FFFFFF', // White text on blue
  messageTextReceived: '#000000', // Black text on light gray
  
  // Status
  success: '#34C759',
  successLight: 'rgba(52, 199, 89, 0.1)',
  error: '#FF3B30',
  errorLight: 'rgba(255, 59, 48, 0.1)',
  errorBackground: 'rgba(255, 59, 48, 0.15)',
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
 * Ocean Theme (Blue/Teal)
 */
export const oceanColors: ColorPalette = {
  // Primary
  primary: '#00B8D4',
  primaryDark: '#0097A7',
  primaryLight: '#26C6DA',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#F1F8FA',
  backgroundInput: '#E0F2F7',
  backgroundGap: '#FFFFFF',
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#546E7A',
  textTertiary: '#90A4AE',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#00B8D4',
  messageReceived: '#E0F2F7',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#00C853',
  successLight: 'rgba(0, 200, 83, 0.1)',
  error: '#FF3B30',
  errorLight: 'rgba(255, 59, 48, 0.1)',
  errorBackground: 'rgba(255, 59, 48, 0.15)',
  warning: '#FF9500',
  info: '#0097A7',
  
  // Indicators
  online: '#00C853',
  offline: '#CFD8DC',
  typing: '#546E7A',
  
  // Message status
  statusSending: '#90A4AE',
  statusSent: '#90A4AE',
  statusDelivered: '#90A4AE',
  statusRead: '#00B8D4',
  
  // Borders
  border: '#CFD8DC',
  borderLight: '#ECEFF1',
  borderFocus: '#00B8D4',
  
  // Badge
  badge: '#FF3B30',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#00B8D4',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E0F2F7',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#CFD8DC',
  buttonDisabledText: '#90A4AE',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Sunset Theme (Orange/Red)
 */
export const sunsetColors: ColorPalette = {
  // Primary
  primary: '#FF6B35',
  primaryDark: '#E85D31',
  primaryLight: '#FF8558',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#FFF4F1',
  backgroundInput: '#FFE8E1',
  backgroundGap: '#FFFFFF',
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#6D4C41',
  textTertiary: '#A1887F',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#FF6B35',
  messageReceived: '#FFE8E1',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.1)',
  error: '#EF5350',
  errorLight: 'rgba(239, 83, 80, 0.1)',
  errorBackground: 'rgba(239, 83, 80, 0.15)',
  warning: '#FFA726',
  info: '#FF6B35',
  
  // Indicators
  online: '#66BB6A',
  offline: '#BCAAA4',
  typing: '#6D4C41',
  
  // Message status
  statusSending: '#A1887F',
  statusSent: '#A1887F',
  statusDelivered: '#A1887F',
  statusRead: '#FF6B35',
  
  // Borders
  border: '#D7CCC8',
  borderLight: '#EFEBE9',
  borderFocus: '#FF6B35',
  
  // Badge
  badge: '#EF5350',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#FF6B35',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FFE8E1',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#D7CCC8',
  buttonDisabledText: '#A1887F',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Forest Theme (Green)
 */
export const forestColors: ColorPalette = {
  // Primary
  primary: '#2E7D32',
  primaryDark: '#1B5E20',
  primaryLight: '#4CAF50',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#F1F8F4',
  backgroundInput: '#E8F5E9',
  backgroundGap: '#FFFFFF',
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#33691E',
  textTertiary: '#7CB342',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#2E7D32',
  messageReceived: '#E8F5E9',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.1)',
  error: '#E53935',
  errorLight: 'rgba(229, 57, 53, 0.1)',
  errorBackground: 'rgba(229, 57, 53, 0.15)',
  warning: '#FB8C00',
  info: '#1B5E20',
  
  // Indicators
  online: '#66BB6A',
  offline: '#C5E1A5',
  typing: '#33691E',
  
  // Message status
  statusSending: '#7CB342',
  statusSent: '#7CB342',
  statusDelivered: '#7CB342',
  statusRead: '#2E7D32',
  
  // Borders
  border: '#C8E6C9',
  borderLight: '#E8F5E9',
  borderFocus: '#2E7D32',
  
  // Badge
  badge: '#E53935',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#2E7D32',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E8F5E9',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#C8E6C9',
  buttonDisabledText: '#7CB342',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Midnight Theme (Purple/Dark)
 */
export const midnightColors: ColorPalette = {
  // Primary
  primary: '#7B1FA2',
  primaryDark: '#6A1B9A',
  primaryLight: '#9C27B0',
  
  // Background
  background: '#1A0B2E',
  backgroundElevated: '#241435',
  backgroundInput: '#2E1F3F',
  backgroundGap: '#0D0618',
  
  // Surface
  surface: '#1A0B2E',
  surfaceVariant: '#241435',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#E1BEE7',
  textTertiary: '#BA68C8',
  textInverse: '#000000',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#7B1FA2',
  messageReceived: '#2E1F3F',
  messageText: '#FFFFFF',
  messageTextReceived: '#FFFFFF',
  
  // Status
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.15)',
  error: '#EF5350',
  errorLight: 'rgba(239, 83, 80, 0.15)',
  errorBackground: 'rgba(239, 83, 80, 0.2)',
  warning: '#FFA726',
  info: '#9C27B0',
  
  // Indicators
  online: '#66BB6A',
  offline: '#4A4458',
  typing: '#BA68C8',
  
  // Message status
  statusSending: '#BA68C8',
  statusSent: '#BA68C8',
  statusDelivered: '#BA68C8',
  statusRead: '#7B1FA2',
  
  // Borders
  border: '#4A4458',
  borderLight: '#3A3246',
  borderFocus: '#7B1FA2',
  
  // Badge
  badge: '#EF5350',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#7B1FA2',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#2E1F3F',
  buttonSecondaryText: '#FFFFFF',
  buttonDisabled: '#3A3246',
  buttonDisabledText: '#6A5678',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Rose Theme (Pink/Rose Gold)
 */
export const roseColors: ColorPalette = {
  // Primary
  primary: '#E91E63',
  primaryDark: '#C2185B',
  primaryLight: '#F06292',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#FFF0F5',
  backgroundInput: '#FCE4EC',
  backgroundGap: '#FFFFFF',
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#880E4F',
  textTertiary: '#AD1457',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#E91E63',
  messageReceived: '#FCE4EC',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.1)',
  error: '#E53935',
  errorLight: 'rgba(229, 57, 53, 0.1)',
  errorBackground: 'rgba(229, 57, 53, 0.15)',
  warning: '#FB8C00',
  info: '#C2185B',
  
  // Indicators
  online: '#66BB6A',
  offline: '#F8BBD0',
  typing: '#880E4F',
  
  // Message status
  statusSending: '#AD1457',
  statusSent: '#AD1457',
  statusDelivered: '#AD1457',
  statusRead: '#E91E63',
  
  // Borders
  border: '#F8BBD0',
  borderLight: '#FCE4EC',
  borderFocus: '#E91E63',
  
  // Badge
  badge: '#E53935',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#E91E63',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#FCE4EC',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#F8BBD0',
  buttonDisabledText: '#AD1457',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Arctic Theme (Cool Blue-White/Ice)
 */
export const arcticColors: ColorPalette = {
  // Primary
  primary: '#29B6F6',
  primaryDark: '#0288D1',
  primaryLight: '#4FC3F7',
  
  // Background
  background: '#FFFFFF',
  backgroundElevated: '#F0F9FF',
  backgroundInput: '#E1F5FE',
  backgroundGap: '#FFFFFF',
  
  // Surface
  surface: '#F0EFF4',
  surfaceVariant: '#FFFFFF',
  
  // Text
  text: '#000000',
  textSecondary: '#01579B',
  textTertiary: '#0277BD',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#29B6F6',
  messageReceived: '#E1F5FE',
  messageText: '#FFFFFF',
  messageTextReceived: '#000000',
  
  // Status
  success: '#66BB6A',
  successLight: 'rgba(102, 187, 106, 0.1)',
  error: '#EF5350',
  errorLight: 'rgba(239, 83, 80, 0.1)',
  errorBackground: 'rgba(239, 83, 80, 0.15)',
  warning: '#FFA726',
  info: '#0288D1',
  
  // Indicators
  online: '#66BB6A',
  offline: '#B3E5FC',
  typing: '#01579B',
  
  // Message status
  statusSending: '#0277BD',
  statusSent: '#0277BD',
  statusDelivered: '#0277BD',
  statusRead: '#29B6F6',
  
  // Borders
  border: '#B3E5FC',
  borderLight: '#E1F5FE',
  borderFocus: '#29B6F6',
  
  // Badge
  badge: '#EF5350',
  badgeText: '#FFFFFF',
  
  // Buttons
  buttonPrimary: '#29B6F6',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#E1F5FE',
  buttonSecondaryText: '#000000',
  buttonDisabled: '#B3E5FC',
  buttonDisabledText: '#0277BD',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

/**
 * Dark Mode Colors
 */
export const darkColors: ColorPalette = {
  // Primary
  primary: '#4990CF', // Silco blue for buttons/accent
  primaryDark: '#3a5f77',
  primaryLight: '#6aa5c4',
  
  // Background
  background: '#111717', // Dark gray primary background
  backgroundElevated: '#111717', // Dark gray for elevated surfaces
  backgroundInput: '#233444', // Less dark for input fields
  backgroundGap: '#000000', // Pure black for gaps between cardsr
  
  // Surface
  surface: '#111717', // Dark gray for profile/cards
  surfaceVariant: '#111717',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  textInverse: '#000000',
  textOnPrimary: '#FFFFFF',
  
  // Message bubbles
  messageSent: '#4990CF', // Silco blue for sent messages
  messageReceived: '#233444', // Dark blue-gray for received messages
  messageText: '#FFFFFF', // White text on sent
  messageTextReceived: '#FFFFFF', // White text on received
  
  // Status
  success: '#32D74B',
  successLight: 'rgba(50, 215, 75, 0.15)',
  error: '#FF453A',
  errorLight: 'rgba(255, 69, 58, 0.15)',
  errorBackground: 'rgba(255, 69, 58, 0.2)',
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


