/**
 * MessageAI Cloud Functions
 * AI-powered translation and conversation features
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ChatContextService } from "./services/ChatContextService";
import { CulturalAnalysisService } from "./services/CulturalAnalysisService";
import { EmbeddingService } from "./services/EmbeddingService";
import { TranslationService } from "./services/TranslationService";
// import { testAIPipeline } from "./test-function";

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// Initialize services
const translationService = new TranslationService();

/**
 * Translate a single message
 * Callable from React Native app
 */
export const translateMessage = onCall(
  {
    // Allow unauthenticated invocations (auth is checked in function body)
    invoker: "public",
  },
  async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to translate messages"
      );
    }

    const {messageId, chatId, targetLanguage, messageText} = request.data;

    // Validate required parameters
    if (!messageId || typeof messageId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "messageId is required and must be a string"
      );
    }

    if (!chatId || typeof chatId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "chatId is required and must be a string"
      );
    }

    if (!targetLanguage || typeof targetLanguage !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "targetLanguage is required and must be a string (e.g., 'es', 'fr', 'de')"
      );
    }

    if (!messageText || typeof messageText !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "messageText is required and must be a string"
      );
    }

    logger.info("Translating message", {
      messageId,
      chatId,
      targetLanguage,
      messageText: messageText.substring(0, 100) + "...", // Log first 100 chars
      userId: request.auth.uid,
    });

    // Call translation service
    const result = await translationService.translateMessage({
      messageId,
      chatId,
      targetLanguage,
      messageText,
      userId: request.auth.uid,
    });

    if (!result.success) {
      throw new HttpsError(
        "internal",
        result.error || "Translation failed"
      );
    }

    logger.info("Translation successful", {
      messageId,
      detectedLanguage: result.detectedLanguage,
      targetLanguage,
    });

    return result;
  } catch (error: any) {
    logger.error("Translation function error:", error);

    // Re-throw HttpsError if it's already one
    if (error instanceof HttpsError) {
      throw error;
    }

    // Wrap other errors
    throw new HttpsError(
      "internal",
      "Translation failed",
      error.message
    );
  }
  }
);

/**
 * Batch translate multiple messages in parallel
 * Returns results progressively as they complete
 * 🚀 FAST: Processes up to 10 messages at once
 */
export const batchTranslateMessages = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated to translate messages"
        );
      }

      const { messages, chatId, targetLanguage } = request.data;

      // Validate required parameters
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new HttpsError(
          "invalid-argument",
          "messages must be a non-empty array"
        );
      }

      if (messages.length > 20) {
        throw new HttpsError(
          "invalid-argument",
          "Maximum 20 messages per batch"
        );
      }

      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      if (!targetLanguage || typeof targetLanguage !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "targetLanguage is required and must be a string"
        );
      }

      logger.info("Batch translating messages", {
        messageCount: messages.length,
        chatId,
        targetLanguage,
        userId: request.auth.uid,
      });

      // Process all messages in parallel
      const userId = request.auth!.uid; // Already checked above
      const results = await Promise.allSettled(
        messages.map(async (msg: { messageId: string; messageText: string }) => {
          try {
            const result = await translationService.translateMessage({
              messageId: msg.messageId,
              chatId,
              targetLanguage,
              messageText: msg.messageText,
              userId,
            });

            return {
              messageId: msg.messageId,
              success: result.success,
              translated: result.translated,
              detectedLanguage: result.detectedLanguage,
              culturalAnalysis: result.culturalAnalysis,
              formalityLevel: result.formalityLevel,
            };
          } catch (error: any) {
            logger.error(`Failed to translate message ${msg.messageId}:`, error.message);
            return {
              messageId: msg.messageId,
              success: false,
              error: error.message || "Translation failed",
            };
          }
        })
      );

      // Extract results (both successful and failed)
      const translations = results.map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || "Translation failed",
          };
        }
      });

      logger.info("Batch translation completed", {
        total: messages.length,
        successful: translations.filter((t: any) => t.success).length,
        failed: translations.filter((t: any) => !t.success).length,
      });

      return {
        success: true,
        translations,
      };
    } catch (error: any) {
      logger.error("Batch translation function error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Batch translation failed",
        error.message
      );
    }
  }
);

/**
 * REMOVED: generateMessageEmbedding
 * 
 * Previously generated per-message embeddings for semantic search (RAG).
 * Now using per-chat context summaries instead (ChatContextService).
 * 
 * Benefits of new approach:
 * - 1000x more storage efficient (6KB vs 6MB per chat)
 * - Full conversation context (not just last 15 messages)
 * - Mood and topic awareness
 * - Much more cost-effective
 * 
 * See ChatContextService for the new implementation.
 */

/**
 * Simple translation preview (no cultural analysis, fast)
 * 🚀 FAST: ~1-2 seconds response time
 * Callable from React Native app (for message input preview)
 */
export const translatePreview = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { messageText, targetLanguage } = request.data;

      // Validate required parameters
      if (!messageText || typeof messageText !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "messageText is required and must be a string"
        );
      }

      if (!targetLanguage || typeof targetLanguage !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "targetLanguage is required and must be a string"
        );
      }

      logger.info("Preview translation requested", {
        textLength: messageText.length,
        targetLanguage,
        userId: request.auth.uid,
      });

      // Call preview translation service
      const result = await translationService.translatePreview(
        messageText,
        targetLanguage
      );

      logger.info("Preview translation completed", {
        detectedLanguage: result.detectedLanguage,
        translatedLength: result.translated.length,
      });

      return {
        success: true,
        translated: result.translated,
        detectedLanguage: result.detectedLanguage,
      };
    } catch (error: any) {
      logger.error("Preview translation error:", error);

      // Re-throw HttpsError if it's already one
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError(
        "internal",
        "Preview translation failed",
        error.message
      );
    }
  }
);

/**
 * Detect languages used in a chat (scan recent messages)
 * Returns list of languages detected in the chat
 * Callable from React Native app
 */
export const detectChatLanguages = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { chatId, limit = 50 } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      logger.info("Detecting chat languages", {
        chatId,
        limit,
        userId: request.auth.uid,
      });

      // Load recent messages
      const messagesSnapshot = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(limit)
        .get();

      if (messagesSnapshot.empty) {
        return {
          success: true,
          languages: [],
          languageCounts: {},
        };
      }

      // Detect language for each message
      const languageCounts: Record<string, number> = {};
      
      for (const doc of messagesSnapshot.docs) {
        const data = doc.data();
        const text = data.text || data.caption;
        
        if (text && text.trim().length >= 5) {
          // Use quick detection
          const detected = await translationService.quickDetectLanguage(text);
          
          if (detected.language !== 'unknown' && detected.confidence > 0.7) {
            languageCounts[detected.language] = (languageCounts[detected.language] || 0) + 1;
          }
        }
      }

      // Sort languages by frequency
      const sortedLanguages = Object.entries(languageCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([lang]) => lang);

      logger.info("Chat languages detected", {
        chatId,
        languages: sortedLanguages,
        counts: languageCounts,
      });

      return {
        success: true,
        languages: sortedLanguages,
        languageCounts,
      };
    } catch (error: any) {
      logger.error("Detect chat languages error:", error);

      // Re-throw HttpsError if it's already one
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError(
        "internal",
        "Failed to detect chat languages",
        error.message
      );
    }
  }
);

/**
 * Quick language detection (uses only first 5-7 words for speed)
 * 🚀 ULTRA-FAST: ~200ms response time
 * Callable from React Native app
 */
export const quickDetectLanguage = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { text } = request.data;

      // Validate required parameters
      if (!text || typeof text !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "text is required and must be a string"
        );
      }

      logger.info("Quick language detection requested", {
        textLength: text.length,
        userId: request.auth.uid,
      });

      // Call quick detection service
      const result = await translationService.quickDetectLanguage(text);

      logger.info("Quick language detection completed", {
        language: result.language,
        confidence: result.confidence,
      });

      return {
        success: true,
        language: result.language,
        confidence: result.confidence,
      };
    } catch (error: any) {
      logger.error("Quick language detection error:", error);

      // Re-throw HttpsError if it's already one
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError(
        "internal",
        "Language detection failed",
        error.message
      );
    }
  }
);

/**
 * Auto-translate incoming messages when language differs from user preference
 * Triggers automatically when new messages are created
 */
export const autoTranslateMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    
    // Only process text messages from other users
    if (!messageData?.text || 
        messageData.text.trim().length === 0 ||
        messageData.senderId === messageData.userId) { // Skip own messages
      logger.info('Skipping auto-translate - not a text message from other user', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        senderId: messageData?.senderId,
        userId: messageData?.userId
      });
      return;
    }

    try {
      logger.info('Starting auto-translate for incoming message', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        textLength: messageData.text.length,
        senderId: messageData.senderId
      });

      // DISABLE automatic Cloud Function translation
      // Frontend handles translation based on user settings
      logger.info('Skipping auto-translate - handled by frontend', {
        messageId: event.params.messageId,
        chatId: event.params.chatId
      });
      return;

      // NOTE: Code below is disabled - frontend handles translation
      // keeping for reference in case we want to re-enable server-side auto-translate

    } catch (error: any) {
      logger.error('Auto-translate error:', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        error: error.message
      });
      // Don't throw - let message exist without translation
    }
  }
);

/**
 * NEW: Update chat context on every message
 * Triggers context updates based on message count and mood shifts
 */
export const updateChatContext = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;

    // Only process text messages
    if (!messageData?.text || messageData.text.trim().length === 0) {
      logger.info('Skipping context update - no text content', {
        messageId,
        chatId
      });
      return;
    }

    try {
      logger.info('Checking chat context update triggers', {
        messageId,
        chatId
      });

      // Get total message count for this chat
      const messageCount = await admin.firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .count()
        .get()
        .then(snapshot => snapshot.data().count);

      logger.info('Message count retrieved', {
        chatId,
        messageCount
      });

      // Check update triggers
      let shouldUpdate = false;
      let trigger: 'interval' | 'mood_shift' | 'full' | null = null;

      // Trigger 1: Every 20 messages (incremental update)
      if (messageCount % 20 === 0) {
        shouldUpdate = true;
        trigger = 'interval';
        logger.info('20-message interval trigger activated', {
          chatId,
          messageCount
        });
      }

      // Trigger 2: Every 100 messages (full regeneration)
      if (messageCount % 100 === 0) {
        shouldUpdate = true;
        trigger = 'full';
        logger.info('100-message full regeneration trigger activated', {
          chatId,
          messageCount
        });
      }

      // Trigger 3: Check for mood shift (only if context exists)
      if (!shouldUpdate && messageCount > 5) {
        const currentContext = await ChatContextService.loadContext(chatId);
        
        if (currentContext) {
          // Load last 5 messages
          const recentMessages = await admin.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get()
            .then(snapshot => {
              return snapshot.docs.reverse().map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  text: data.text || '',
                  senderName: data.senderName || 'User',
                  senderId: data.senderId || '',
                  timestamp: data.timestamp || 0,
                };
              });
            });

          const moodShifted = await ChatContextService.detectMoodShift(
            recentMessages,
            currentContext.mood
          );

          if (moodShifted) {
            shouldUpdate = true;
            trigger = 'mood_shift';
            logger.info('Mood shift detected', {
              chatId,
              oldMood: currentContext.mood
            });
          }
        }
      }

      // Update context if triggered
      if (shouldUpdate && trigger) {
        logger.info('Updating chat context', {
          chatId,
          trigger,
          messageCount
        });

        await ChatContextService.updateContext(chatId, trigger);

        logger.info('Chat context updated successfully', {
          chatId,
          trigger
        });
      } else {
        logger.info('No context update needed', {
          chatId,
          messageCount
        });
      }

    } catch (error: any) {
      logger.error('Chat context update error:', {
        messageId,
        chatId,
        error: error.message
      });
      // Don't throw - let message exist without context update
    }
  }
);

/**
 * NEW: Generate user-facing chat summary on request
 * Callable from React Native app
 */
export const generateChatSummary = onCall(
  { invoker: 'public' },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'User must be authenticated to generate chat summaries'
        );
      }

      const { chatId, preferredLanguage } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== 'string') {
        throw new HttpsError(
          'invalid-argument',
          'chatId is required and must be a string'
        );
      }

      // Get target language (default to English if not provided)
      const targetLanguage = preferredLanguage || 'en';

      logger.info('Generating chat summary', {
        chatId,
        targetLanguage,
        userId: request.auth.uid
      });

      // Generate summary in user's preferred language
      const summary = await ChatContextService.generateUserSummary(chatId, targetLanguage);

      logger.info('Chat summary generated successfully', {
        chatId,
        targetLanguage,
        summaryLength: summary.length
      });

      return {
        success: true,
        summary
      };

    } catch (error: any) {
      logger.error('Chat summary generation error:', error);

      // Re-throw HttpsError if it's already one
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError(
        'internal',
        'Failed to generate chat summary',
        error.message
      );
    }
  }
);

/**
 * Analyze message for cultural context and slang
 * Callable from React Native app
 */
export const analyzeCulturalContext = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { text, language, chatMood, relationship } = request.data;

      // Validate required parameters
      if (!text || typeof text !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "text is required and must be a string"
        );
      }

      if (!language || typeof language !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "language is required and must be a string"
        );
      }

      logger.info("Analyzing cultural context", {
        textLength: text.length,
        language,
        userId: request.auth.uid,
        chatMood,
        relationship
      });

      // Generate a temporary message ID for analysis
      const tempMessageId = `temp_${Date.now()}`;

      // Call cultural analysis service
      const analysis = await CulturalAnalysisService.analyzeCulturalContext(
        text,
        language,
        tempMessageId,
        chatMood,
        relationship
      );

      logger.info("Cultural analysis complete", {
        culturalPhrasesFound: analysis.culturalPhrases.length,
        slangExpressionsFound: analysis.slangExpressions.length
      });

      return {
        success: true,
        analysis
      };

    } catch (error: any) {
      logger.error("Cultural analysis error:", error);

      // Re-throw HttpsError if it's already one
      if (error instanceof HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new HttpsError(
        "internal",
        "Failed to analyze cultural context",
        error.message
      );
    }
  }
);

/**
 * Generate embeddings for recent messages in a chat
 * Used for RAG (semantic search) in chat summarization
 * 
 * Generates embeddings for the last 50 messages (if not already generated)
 */
export const generateChatEmbeddings = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { chatId, limit = 50 } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      logger.info("Generating embeddings for chat", {
        chatId,
        limit,
        userId: request.auth.uid,
      });

      // Get recent messages without embeddings
      const messagesRef = admin
        .firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .where("type", "==", "text") // Only text messages
        .orderBy("timestamp", "desc")
        .limit(limit);

      const snapshot = await messagesRef.get();

      if (snapshot.empty) {
        logger.info("No messages found in chat", { chatId });
        return {
          success: true,
          generated: 0,
          skipped: 0,
          message: "No messages found",
        };
      }

      let generated = 0;
      let skipped = 0;

      // Process messages in batches
      const batch = admin.firestore().batch();

      for (const doc of snapshot.docs) {
        const message = doc.data();

        // Skip if embedding already exists
        if (message.embeddingGenerated) {
          skipped++;
          continue;
        }

        // Skip if message text is too short
        if (!message.text || message.text.trim().length < 3) {
          skipped++;
          continue;
        }

        try {
          // Generate embedding
          const result = await EmbeddingService.generateEmbedding(message.text);

          // Update message with embedding
          batch.update(doc.ref, {
            embedding: result.embedding,
            embeddingGenerated: true,
            embeddingGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          generated++;

          logger.info("Generated embedding for message", {
            messageId: doc.id,
            textLength: message.text.length,
            dimensions: result.embedding.length,
          });
        } catch (error: any) {
          logger.error("Failed to generate embedding for message", {
            messageId: doc.id,
            error: error.message,
          });
          // Continue with other messages
          skipped++;
        }
      }

      // Commit batch updates
      if (generated > 0) {
        await batch.commit();
        logger.info("Batch committed embeddings", {
          chatId,
          generated,
        });
      }

      return {
        success: true,
        generated,
        skipped,
        message: `Generated ${generated} embeddings, skipped ${skipped}`,
      };
    } catch (error: any) {
      logger.error("Generate embeddings error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to generate embeddings",
        error.message
      );
    }
  }
);

/**
 * Search messages across all user's chats
 * Global semantic search powered by RAG
 */
export const searchAllChats = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { query, limit = 20 } = request.data;

      // Validate query
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        throw new HttpsError(
          "invalid-argument",
          "Query must be at least 2 characters"
        );
      }

      logger.info("Global search across all chats", {
        userId: request.auth.uid,
        query,
        limit,
      });

      // Get all user's chats
      const userChatsSnapshot = await admin
        .firestore()
        .collection("chats")
        .where("participants", "array-contains", request.auth.uid)
        .get();

      if (userChatsSnapshot.empty) {
        logger.info("No chats found for user", { userId: request.auth.uid });
        return {
          success: true,
          results: [],
          message: "No chats found",
        };
      }

      const chatIds = userChatsSnapshot.docs.map(doc => doc.id);
      logger.info("Searching across chats", {
        userId: request.auth.uid,
        chatCount: chatIds.length,
      });

      // Search each chat in parallel
      const searchPromises = chatIds.map(async (chatId) => {
        try {
          // Get chat info
          const chatDoc = userChatsSnapshot.docs.find(d => d.id === chatId);
          const chatData = chatDoc?.data();

          // Get proper chat name
          let chatName = "Unknown Chat";
          const currentUserId = request.auth!.uid;
          
          if (chatData?.isGroup) {
            // For groups, use group name
            chatName = chatData.name || "Unnamed Group";
          } else if (chatData?.participants && Array.isArray(chatData.participants)) {
            // For 1-on-1, get other participant's name
            const otherUserId = chatData.participants.find((id: string) => id !== currentUserId);
            if (otherUserId) {
              try {
                const userDoc = await admin.firestore().collection("users").doc(otherUserId).get();
                const userData = userDoc.data();
                chatName = userData?.displayName || userData?.username || "Unknown User";
              } catch (error) {
                logger.warn("Could not fetch user data", { userId: otherUserId });
                chatName = "Unknown User";
              }
            }
          }

          // Load messages with embeddings from this chat
          const messagesSnapshot = await admin
            .firestore()
            .collection("chats")
            .doc(chatId)
            .collection("messages")
            .where("embeddingGenerated", "==", true)
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();

          logger.info("Messages loaded for search", {
            chatId,
            messagesWithEmbeddings: messagesSnapshot.size,
          });

          if (messagesSnapshot.empty) {
            logger.warn("No messages with embeddings in chat", { chatId });
            return null;
          }

          const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              chatId,
              text: data.text || '',
              embedding: data.embedding as number[] | undefined,
              timestamp: data.timestamp || 0,
            };
          });

          // Perform semantic search on this chat
          const results = await EmbeddingService.findSimilar(
            query,
            messages.map(m => ({
              text: m.text,
              embedding: m.embedding,
              messageId: m.id,
              timestamp: m.timestamp,
            })),
            5  // Top 5 per chat
          );

          logger.info("Search results for chat", {
            chatId,
            resultsFound: results.length,
            topScore: results[0]?.score,
            topText: results[0]?.text?.substring(0, 50),
          });

          if (results.length === 0) {
            return null;
          }

          // Return chat info with results
          return {
            chatId,
            chatName,
            isGroup: chatData?.isGroup || false,
            results: results.map(r => ({
              messageId: r.messageId,
              text: r.text,
              score: r.score,
              timestamp: r.timestamp,
            })),
          };
        } catch (chatError: any) {
          logger.error("Error searching chat", {
            chatId,
            error: chatError.message,
          });
          return null;
        }
      });

      // Wait for all searches to complete
      const allResults = await Promise.all(searchPromises);

      // Filter out nulls and sort by best match
      const validResults = allResults
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map(chat => ({
          ...chat,
          bestScore: Math.max(...chat.results.map(r => r.score)),
        }))
        .sort((a, b) => b.bestScore - a.bestScore);

      logger.info("Global search completed", {
        userId: request.auth.uid,
        chatsSearched: chatIds.length,
        chatsWithResults: validResults.length,
        totalMatches: validResults.reduce((sum, r) => sum + r.results.length, 0),
      });

      return {
        success: true,
        results: validResults,
        chatsSearched: chatIds.length,
        message: `Found matches in ${validResults.length} chats`,
      };
    } catch (error: any) {
      logger.error("Global search error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to search messages",
        error.message
      );
    }
  }
);

/**
 * Firestore Trigger: Auto-generate embeddings for new messages
 * Fires when a message is created in any chat
 */
export const onMessageCreated = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No snapshot data");
      return;
    }

    const messageData = snapshot.data();
    const messageId = event.params.messageId;
    const chatId = event.params.chatId;

    try {
      // Only generate embeddings for text messages
      if (messageData.type !== "text" || !messageData.text) {
        logger.debug("Skipping non-text message", { messageId, type: messageData.type });
        return;
      }

      // Skip if embedding already exists
      if (messageData.embeddingGenerated || messageData.embedding) {
        logger.debug("Embedding already exists", { messageId });
        return;
      }

      // Skip very short messages (< 3 chars)
      const text = messageData.text.trim();
      if (text.length < 3) {
        logger.debug("Message too short for embedding", { messageId, length: text.length });
        return;
      }

      logger.info("Generating embedding for new message", {
        chatId,
        messageId,
        textLength: text.length,
      });

      // Generate embedding
      const result = await EmbeddingService.generateEmbedding(text);

      // Update message document with embedding
      await admin
        .firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId)
        .update({
          embedding: result.embedding,
          embeddingGenerated: true,
          embeddingGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info("Embedding generated successfully", {
        chatId,
        messageId,
        dimensions: result.embedding.length,
        tokensUsed: result.usage.total_tokens,
      });
    } catch (error: any) {
      logger.error("Failed to generate embedding", {
        chatId,
        messageId,
        error: error.message,
      });
      // Don't throw - we don't want to fail message creation
    }
  }
);

/**
 * Test function to verify AI pipeline
 */
// export { testAIPipeline };

