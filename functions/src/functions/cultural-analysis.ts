/**
 * Cultural Analysis Functions
 * Handles cultural context and slang analysis
 */

import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { CulturalAnalysisService } from "../services/CulturalAnalysisService";
import { TranslationService } from "../services/TranslationService";

// Initialize translation service for language detection
const translationService = new TranslationService();

/**
 * Analyze cultural context and slang for a specific message
 * Called on-demand when user wants cultural analysis
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
          "User must be authenticated to analyze cultural context"
        );
      }

      const { messageId, chatId, messageText, translatedText, targetLanguage } = request.data;

      // Validate required parameters
      if (!messageId || typeof messageId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "messageId is required and must be a string"
        );
      }

      if (!messageText || typeof messageText !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "messageText is required and must be a string"
        );
      }

      if (!translatedText || typeof translatedText !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "translatedText is required and must be a string"
        );
      }

      if (!targetLanguage || typeof targetLanguage !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "targetLanguage is required and must be a string"
        );
      }

      logger.info("Cultural analysis requested", {
        messageId,
        chatId: chatId || "unknown",
        targetLanguage,
        originalTextLength: messageText.length,
        translatedTextLength: translatedText.length,
        userId: request.auth.uid,
      });

      // Detect the original message language
      const langDetectResult = await translationService.quickDetectLanguage(messageText);
      const originalLanguage = langDetectResult.language || "en";

      logger.info("Detected original language", {
        messageId,
        originalLanguage,
        targetLanguage,
      });

      // Call cultural analysis service with CORRECT parameter order
      const result = await CulturalAnalysisService.analyzeCulturalContext(
        messageText,       // originalText
        translatedText,    // translatedText
        originalLanguage,  // language (original message language - NOT target!)
        messageId,         // messageId
        "neutral",         // chatMood
        "friend",          // relationship
        targetLanguage     // targetLanguage (user's preferred language for explanations!)
      );

      logger.info("Cultural analysis completed", {
        messageId,
        culturalPhrasesFound: result.culturalPhrases.length,
        slangExpressionsFound: result.slangExpressions.length,
      });

      return {
        success: true,
        culturalAnalysis: result,
      };

    } catch (error: any) {
      logger.error("Cultural analysis failed", {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
      });

      throw new HttpsError(
        "internal",
        error.message || "Cultural analysis failed"
      );
    }
  }
);
