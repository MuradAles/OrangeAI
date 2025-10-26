/**
 * MessageAI Cloud Functions - Main Entry Point
 * 
 * This file serves as the main entry point and exports all cloud functions
 * from their respective modules for better organization and maintainability.
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// Export all functions from their respective modules

// Translation Functions
export {
  batchTranslateMessages, detectChatLanguages,
  quickDetectLanguage, translateMessage, translatePreview
} from "./functions/translation";

// AI Assistant Functions
export {
  aiAssistant,
  generateSmartReplies
} from "./functions/ai-assistant";

// Search Functions
export {
  generateChatEmbeddings,
  generateConversationChunks, searchAllChats
} from "./functions/search";

// Chat Context Functions
export {
  adjustFormality, generateChatSummary
} from "./functions/chat-context";

// Cultural Analysis Functions
export {
  analyzeCulturalContext
} from "./functions/cultural-analysis";

// Firestore Triggers
export {
  autoTranslateMessage, onMessageCreated, updateChatContext
} from "./functions/triggers";
