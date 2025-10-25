/**
 * Message Utilities
 * 
 * Pure functions for message processing, sorting, and filtering
 */

import { Message } from '@/shared/types';

export type ListItem = 
  | { type: 'message'; data: Message }
  | { type: 'date'; data: Date }
  | { type: 'unread'; data: number };

/**
 * Process messages into list items with date separators
 */
export function processMessagesToListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  let lastDate: string | null = null;
  
  // Sort messages by timestamp (oldest first for display)
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
    const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
    return timeA - timeB;
  });

  sortedMessages.forEach((message) => {
    // Ensure timestamp is valid
    const messageDate = typeof message.timestamp === 'number' 
      ? new Date(message.timestamp)
      : new Date(message.timestamp);
    
    if (isNaN(messageDate.getTime())) {
      return; // Skip invalid timestamps
    }
    
    const currentDate = messageDate.toDateString();

    // Add date separator if date changed
    if (currentDate !== lastDate) {
      items.push({ type: 'date', data: messageDate });
      lastDate = currentDate;
    }

    // Add message
    items.push({ type: 'message', data: message });
  });

  // Return items in chronological order: oldest at top (index 0), newest at bottom (last index)
  return items;
}

/**
 * Check if we should show avatar for a message at given index
 */
export function shouldShowAvatar(listItems: ListItem[], index: number): boolean {
  // Normal order: index 0 is oldest, length-1 is newest
  // Show avatar for last message in group (next message is from different sender or too far apart)
  
  const currentItem = listItems[index];
  const nextItem = listItems[index + 1]; // Next item is newer
  
  if (!nextItem) return true; // Last item (newest message) always shows avatar
  
  if (currentItem.type !== 'message' || nextItem.type !== 'message') {
    return true;
  }
  
  const currentMsg = currentItem.data;
  const nextMsg = nextItem.data;
  
  // Different sender - show avatar for current message (last in this sender's group)
  if (currentMsg.senderId !== nextMsg.senderId) {
    return true;
  }
  
  // More than 1 minute apart - show avatar
  const currentTime = typeof currentMsg.timestamp === 'number' 
    ? currentMsg.timestamp 
    : new Date(currentMsg.timestamp).getTime();
  const nextTime = typeof nextMsg.timestamp === 'number' 
    ? nextMsg.timestamp 
    : new Date(nextMsg.timestamp).getTime();
  const timeDiff = nextTime - currentTime;
  return timeDiff > 60000;
}

/**
 * Get language name from language code
 */
export function getLanguageName(langCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'tr': 'Turkish',
  };
  
  return languageMap[langCode] || langCode.toUpperCase();
}

/**
 * Check if message is deleted for user
 */
export function isMessageDeletedForUser(message: Message, userId: string): boolean {
  return message.deletedForEveryone || (message.deletedFor || []).includes(userId);
}

/**
 * Get text content from message (handles both text and image captions)
 */
export function getMessageText(message: Message): string | undefined {
  return message.type === 'image' && message.caption 
    ? message.caption 
    : message.text;
}
