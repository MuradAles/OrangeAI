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
// import { EmbeddingService } from "./services/EmbeddingService"; // REMOVED - Using ChatContext instead
import { CulturalAnalysisService } from "./services/CulturalAnalysisService";
import { TranslationService } from "./services/TranslationService";
// import { testAIPipeline } from "./test-function";

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

      // Step 1: Detect the language of the incoming message
      const detectedLanguage = await translationService.detectLanguage(messageData.text);
      
      // Step 2: Get user's preferred language (default to English for now)
      const userPreferredLanguage = 'en'; // TODO: Get from user settings
      
      // Step 3: Check if translation is needed
      const needsTranslation = detectedLanguage !== userPreferredLanguage;
      
      if (!needsTranslation) {
        logger.info('No translation needed - same language', {
          messageId: event.params.messageId,
          detectedLanguage,
          userPreferredLanguage
        });
        
        // Still run cultural analysis even without translation (now mood-aware)
        try {
          // Load chat context for mood-aware cultural analysis
          const chatContext = await ChatContextService.loadContext(event.params.chatId);
          
          const culturalAnalysis = await CulturalAnalysisService.analyzeCulturalContext(
            messageData.text,
            detectedLanguage,
            event.params.messageId,
            chatContext?.mood,
            chatContext?.relationship
          );

          if (culturalAnalysis.culturalPhrases.length > 0 || culturalAnalysis.slangExpressions.length > 0) {
            await event.data?.ref.update({
              culturalAnalysis: culturalAnalysis,
              culturalPhrasesCount: culturalAnalysis.culturalPhrases.length,
              slangExpressionsCount: culturalAnalysis.slangExpressions.length,
            });

            logger.info('Mood-aware cultural analysis completed (no translation)', {
              messageId: event.params.messageId,
              culturalPhrasesCount: culturalAnalysis.culturalPhrases.length,
              slangExpressionsCount: culturalAnalysis.slangExpressions.length,
              chatMood: chatContext?.mood || 'none'
            });
          }
        } catch (error) {
          logger.error('Cultural analysis error (no translation):', error);
        }
        
        return;
      }

      // Step 4: Check if auto-translate is enabled for this chat
      // TODO: Check SQLite for chat settings
      const autoTranslateEnabled = true; // For now, always enabled

      if (!autoTranslateEnabled) {
        logger.info('Auto-translate disabled for this chat', {
          messageId: event.params.messageId,
          chatId: event.params.chatId
        });
        return;
      }

      // Step 5: Translate the message
      const translationResult = await translationService.translateMessage({
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        targetLanguage: userPreferredLanguage,
        messageText: messageData.text,
        userId: messageData.userId,
      });

      if (translationResult.success) {
        // Step 6: Save translation and cultural analysis back to Firestore
        const updateData: any = {
          autoTranslated: true,
          translation: translationResult.translated,
          detectedLanguage: translationResult.detectedLanguage,
          formalityLevel: translationResult.formalityLevel,
          formalityIndicators: translationResult.formalityIndicators,
          translatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Add cultural analysis data if available
        if (translationResult.culturalAnalysis) {
          updateData.culturalAnalysis = translationResult.culturalAnalysis;
          updateData.culturalPhrasesCount = translationResult.culturalAnalysis.culturalPhrases.length;
          updateData.slangExpressionsCount = translationResult.culturalAnalysis.slangExpressions.length;
        }

        await event.data?.ref.update(updateData);

        logger.info('Auto-translate completed successfully', {
          messageId: event.params.messageId,
          detectedLanguage: translationResult.detectedLanguage,
          formalityLevel: translationResult.formalityLevel,
          culturalPhrasesCount: translationResult.culturalAnalysis?.culturalPhrases.length || 0,
          slangExpressionsCount: translationResult.culturalAnalysis?.slangExpressions.length || 0
        });
      } else {
        logger.error('Auto-translate failed', {
          messageId: event.params.messageId,
          error: translationResult.error
        });
      }

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

      const { chatId } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== 'string') {
        throw new HttpsError(
          'invalid-argument',
          'chatId is required and must be a string'
        );
      }

      logger.info('Generating chat summary', {
        chatId,
        userId: request.auth.uid
      });

      // Generate summary
      const summary = await ChatContextService.generateUserSummary(chatId);

      logger.info('Chat summary generated successfully', {
        chatId,
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
 * Test function to verify AI pipeline
 */
// export { testAIPipeline };

