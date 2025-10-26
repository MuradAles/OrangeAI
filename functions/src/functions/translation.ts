/**
 * Translation Functions
 * Handles all translation-related cloud functions
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { TranslationService } from "../services/TranslationService";

// Initialize translation service
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

      const { messageId, chatId, targetLanguage, messageText } = request.data;

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
