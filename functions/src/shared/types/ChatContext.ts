/**
 * Chat Context Types
 * Per-chat context with mood and topic tracking
 */

export interface ChatContext {
  chatId: string;
  
  // Core context
  topics: string[];              // ["books", "travel", "cooking"]
  mood: string;                  // "playful, casual, joking"
  relationship: string;          // "close friends" | "colleagues" | "family"
  formality: string;             // "very casual" | "neutral" | "formal"
  
  // Summary
  summary: string;               // Human-readable summary
  
  // Metadata
  messageCount: number;          // Total messages analyzed
  lastUpdated: number;           // Timestamp
  lastMoodShift: number;         // When mood last changed
  updateHistory: UpdateHistoryEntry[];
}

export interface UpdateHistoryEntry {
  timestamp: number;
  trigger: 'interval' | 'mood_shift' | 'full';
  messagesAnalyzed: number;
}

export interface ContextGenerationResult {
  topics: string[];
  mood: string;
  relationship: string;
  formality: string;
  summary: string;
}

export interface Message {
  id: string;
  text: string;
  senderName: string;
  senderId: string;
  timestamp: number;
}

export type ContextUpdateTrigger = 'interval' | 'mood_shift' | 'full';
export type ContextGenerationMode = 'incremental' | 'full';

