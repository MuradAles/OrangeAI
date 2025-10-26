/**
 * Chat Context Functions
 * Handles chat context updates, summaries, and formality adjustment
 */

import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ChatContextService } from "../services/ChatContextService";

/**
 * Generate user-facing chat summary on request
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
 * Adjust message formality/tone
 * Uses ChatContext for smart suggestions
 * Callable from React Native app
 */
export const adjustFormality = onCall(
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

      const { messageText, formalityLevel, chatId, customInstruction, targetLanguage } = request.data;
      const userId = request.auth.uid;

      // Validate parameters
      if (!messageText || typeof messageText !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "messageText is required and must be a string"
        );
      }

      if (!formalityLevel || typeof formalityLevel !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "formalityLevel is required (casual, formal, professional, friendly, custom)"
        );
      }

      // Language names for instructions
      const languageNames: Record<string, string> = {
        en: "English", es: "Spanish", fr: "French", de: "German",
        it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
        ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
        tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish",
      };
      const languageName = targetLanguage ? (languageNames[targetLanguage] || targetLanguage) : "the same language";

      logger.info("Formality adjustment requested", {
        formalityLevel,
        chatId: chatId || "unknown",
        userId,
        messageLength: messageText.length,
        hasCustomInstruction: !!customInstruction,
      });

      // Get chat context if chatId provided (for smart suggestions)
      let chatContext = null;
      let suggestedTone = formalityLevel;

      if (chatId) {
        try {
          chatContext = await ChatContextService.loadContext(chatId);
          
          // Smart suggestion based on chat mood/formality
          if (formalityLevel === "auto" && chatContext) {
            if (chatContext.formality === "formal" || chatContext.mood === "professional") {
              suggestedTone = "professional";
            } else if (chatContext.relationship === "family") {
              suggestedTone = "casual";
            } else {
              suggestedTone = "friendly";
            }
            logger.info("Auto-detected formality", {
              chatMood: chatContext.mood,
              chatFormality: chatContext.formality,
              suggestedTone,
            });
          }
        } catch (error) {
          logger.warn("Could not load chat context", error);
        }
      }

      // Build instruction based on formality level
      let instruction = "";
      
      switch (suggestedTone) {
        case "casual":
          instruction = "Rewrite this message in a casual, friendly, and informal tone. Use contractions, casual phrases, and keep it relaxed.";
          break;
        case "formal":
          instruction = "Rewrite this message in a formal, polite, and respectful tone. Use proper grammar, avoid contractions, and maintain professionalism.";
          break;
        case "professional":
          instruction = "Rewrite this message in a professional, business-appropriate tone. Be clear, concise, and respectful while maintaining authority.";
          break;
        case "friendly":
          instruction = "Rewrite this message in a warm, friendly, and approachable tone. Be kind and personable while staying respectful.";
          break;
        case "custom":
          if (!customInstruction) {
            throw new HttpsError(
              "invalid-argument",
              "customInstruction is required when formalityLevel is 'custom'"
            );
          }
          instruction = customInstruction;
          break;
        default:
          instruction = "Rewrite this message in a neutral tone.";
      }

      // Call AI to adjust formality
      const { generateText } = await import("ai");
      const aiConfig = await import("../config/ai-sdk.config.js");
      const aiModel = aiConfig.aiModel;

      const prompt = `
${instruction}

**CRITICAL: Your response MUST be in ${languageName}.**

Original message: "${messageText}"

Requirements:
- Maintain the core meaning and intent
- Apply the requested tone naturally
- Keep it concise and clear
- Preserve any important details or information
- **RESPOND ONLY IN ${languageName}**
- Only return the rewritten message, nothing else

Rewritten message in ${languageName}:`;

      const result = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.7,
      });

      const adjustedMessage = result.text.trim();

      logger.info("Formality adjustment completed", {
        originalLength: messageText.length,
        adjustedLength: adjustedMessage.length,
        formalityLevel: suggestedTone,
      });

      return {
        success: true,
        originalMessage: messageText,
        adjustedMessage: adjustedMessage,
        appliedTone: suggestedTone,
        suggestion: chatContext ? `Based on your ${chatContext.mood} chat mood` : null,
      };

    } catch (error: any) {
      logger.error("Formality adjustment failed", {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
      });

      throw new HttpsError(
        "internal",
        error.message || "Failed to adjust formality"
      );
    }
  }
);
