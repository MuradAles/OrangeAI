/**
 * Theme Spacing - SINGLE SOURCE OF TRUTH
 * 
 * All spacing, margin, and padding values.
 * Components must import from here - NO hardcoded spacing allowed.
 */

/**
 * Base spacing scale (4px base unit)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

/**
 * Screen-level spacing
 */
export const screenSpacing = {
  horizontal: 16,               // Side padding for screens
  vertical: 16,                 // Top/bottom padding for screens
  safeArea: 20,                 // Safe area padding
};

/**
 * Component-specific spacing
 */
export const componentSpacing = {
  // Card
  cardPadding: 16,
  cardMargin: 12,
  cardGap: 12,                  // Gap between elements inside card
  
  // List items
  listItemPadding: 16,
  listItemGap: 8,               // Gap between list items
  listItemHeight: 72,           // Standard list item height
  
  // Input
  inputPadding: 12,
  inputMargin: 8,
  inputLabelGap: 4,             // Gap between label and input
  
  // Button
  buttonPadding: 16,
  buttonPaddingSmall: 12,
  buttonPaddingLarge: 20,
  buttonGap: 8,                 // Gap between icon and text
  buttonMargin: 8,
  
  // Message bubble
  messageBubblePadding: 12,
  messageBubbleMargin: 4,       // Vertical margin between messages
  messageGroupGap: 16,          // Gap between different senders
  messageAvatarSize: 32,
  messageAvatarMargin: 8,
  
  // Header
  headerHeight: 56,
  headerPadding: 16,
  
  // Tab bar
  tabBarHeight: 60,
  tabBarPadding: 8,
  
  // Modal
  modalPadding: 24,
  modalMargin: 16,
  
  // Avatar
  avatarSizeSmall: 32,
  avatarSizeMedium: 48,
  avatarSizeLarge: 80,
  avatarSizeXLarge: 120,
  
  // Badge
  badgeSize: 20,
  badgePadding: 4,
  badgeOffset: -4,              // Offset from corner
  
  // Icon
  iconSizeSmall: 16,
  iconSizeMedium: 24,
  iconSizeLarge: 32,
  iconSizeXLarge: 48,
  
  // Divider
  dividerThickness: 1,
  dividerMargin: 16,
};

/**
 * Layout spacing
 */
export const layoutSpacing = {
  sectionGap: 24,               // Gap between sections
  groupGap: 16,                 // Gap within a group
  elementGap: 8,                // Gap between related elements
  minTouchTarget: 44,           // Minimum touch target size (accessibility)
};

/**
 * Chat-specific spacing
 */
export const chatSpacing = {
  messagePadding: 12,           // Padding inside message bubble
  messageMargin: 4,             // Vertical space between messages
  messageGroupGap: 16,          // Space between message groups (different senders)
  messageMaxWidth: 280,         // Max width of message bubble
  inputHeight: 48,              // Height of message input
  inputPadding: 12,             // Padding inside input
  attachmentSize: 40,           // Attachment button size
  sendButtonSize: 40,           // Send button size
  typingIndicatorHeight: 24,    // Height of typing indicator
};

/**
 * Grid system
 */
export const grid = {
  columns: 12,
  gutter: 16,
  margin: 16,
};

/**
 * Helper function to get spacing value
 */
export const getSpacing = (scale: keyof typeof spacing): number => {
  return spacing[scale];
};

/**
 * Helper function to calculate vertical rhythm
 */
export const verticalRhythm = (multiplier: number): number => {
  return spacing.xs * multiplier;
};


