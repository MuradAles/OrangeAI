/**
 * Theme Borders - SINGLE SOURCE OF TRUTH
 * 
 * All border radius and border width values.
 * Components must import from here - NO hardcoded border values allowed.
 */

/**
 * Border radius scale
 */
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,                   // Fully rounded (e.g., for circular buttons)
};

/**
 * Component-specific border radius
 */
export const componentBorderRadius = {
  button: 12,
  buttonRound: 999,
  input: 12,
  card: 16,
  modal: 20,
  messageBubble: 18,            // Message bubble corners
  messageBubbleGrouped: 4,      // Message bubble corners when grouped
  avatar: 999,                  // Circular avatars
  image: 12,                    // Image thumbnails
  badge: 10,                    // Badge corners
  chip: 16,                     // Chip/tag corners
  sheet: 16,                    // Bottom sheet corners
};

/**
 * Border widths
 */
export const borderWidth = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3,
};

/**
 * Component-specific border widths
 */
export const componentBorderWidth = {
  input: 1,
  inputFocused: 2,
  button: 1,
  card: 0,                      // Cards typically have no border
  divider: 1,
  avatar: 0,
  badge: 0,
};

/**
 * Border styles
 */
export const borderStyle = {
  solid: 'solid' as const,
  dashed: 'dashed' as const,
  dotted: 'dotted' as const,
};

/**
 * Message bubble border radius helpers
 * These create the distinctive message bubble shapes
 */
export const messageBubbleRadius = {
  // Sent messages (right-aligned, blue)
  sent: {
    topLeft: 18,
    topRight: 18,
    bottomLeft: 18,
    bottomRight: 4,             // Small radius on bottom right
  },
  
  sentGrouped: {
    topLeft: 18,
    topRight: 4,                // Small radius when grouped
    bottomLeft: 18,
    bottomRight: 4,
  },
  
  // Received messages (left-aligned, gray)
  received: {
    topLeft: 18,
    topRight: 18,
    bottomLeft: 4,              // Small radius on bottom left
    bottomRight: 18,
  },
  
  receivedGrouped: {
    topLeft: 4,                 // Small radius when grouped
    topRight: 18,
    bottomLeft: 4,
    bottomRight: 18,
  },
};

/**
 * Helper function to get border radius for message bubbles
 */
export const getMessageBubbleRadius = (isSent: boolean, isGrouped: boolean) => {
  if (isSent) {
    return isGrouped ? messageBubbleRadius.sentGrouped : messageBubbleRadius.sent;
  } else {
    return isGrouped ? messageBubbleRadius.receivedGrouped : messageBubbleRadius.received;
  }
};

/**
 * Outline styles (for focus states)
 */
export const outline = {
  width: 2,
  offset: 2,
  style: 'solid' as const,
};


