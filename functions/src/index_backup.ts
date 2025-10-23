/**
 * MessageAI Cloud Functions
 * AI-powered translation and conversation features
 */

import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { TranslationService } from "./services/TranslationService";

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
export const translateMessage = onCall(async (request) => {
  try {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to translate messages"
      );
    }

    const {messageId, chatId, targetLanguage} = request.data;

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

    logger.info("Translating message", {
      messageId,
      chatId,
      targetLanguage,
      userId: request.auth.uid,
    });

    // Call translation service
    const result = await translationService.translateMessage({
      messageId,
      chatId,
      targetLanguage,
      messageText: "", // Backup file - not used
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
});

