import { generateText } from 'ai';
import * as admin from "firebase-admin";
import * as logger from 'firebase-functions/logger';
import { AI_CONFIG, aiModel } from '../config/ai-sdk.config';
import { ChatContext } from '../shared/types/ChatContext';
import { ChatContextService } from './ChatContextService';
import { CulturalAnalysisResult } from './CulturalAnalysisService';
// import { EmbeddingService } from './EmbeddingService'; // Will be removed

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface TranslationResult {
  success: boolean;
  original: string;
  translated?: string;
  targetLanguage?: string;
  detectedLanguage?: string;
  messageId?: string;
  chatId?: string;
  formalityLevel?: 'casual' | 'formal' | 'professional' | 'friendly';
  formalityIndicators?: string[];
  culturalAnalysis?: CulturalAnalysisResult;
  error?: string;
}

interface FormalityDetection {
  level: 'casual' | 'formal' | 'professional' | 'friendly';
  confidence: number; // 0-100
  indicators: string[]; // What made us detect this level
}

interface TranslationParams {
  messageId: string;
  chatId: string;
  targetLanguage: string;
  messageText: string;
  userId: string;
}

export class TranslationService {
  /**
   * Translate a message with chat context (mood-aware)
   */
  async translateMessage(params: TranslationParams): Promise<TranslationResult> {
    try {
      const messageText = params.messageText;

      if (!messageText || messageText.trim().length === 0) {
        return {
          success: false,
          original: "",
          error: "No text to translate",
        };
      }

      logger.info("Starting mood-aware translation", {
        messageId: params.messageId,
        chatId: params.chatId,
        targetLanguage: params.targetLanguage,
        textLength: messageText.length
      });

      // Step 1: Load chat context (replaces RAG embeddings)
      const chatContext = await ChatContextService.loadContext(params.chatId);

      // Step 2: Load recent messages for immediate context
      const recentMessages = await this.loadRecentMessages(params.chatId, params.messageId, 10);

      // Step 3: Build mood-aware prompt
      const prompt = this.buildMoodAwarePrompt({
        message: messageText,
        chatContext: chatContext,
        recentMessages: recentMessages,
        targetLang: params.targetLanguage,
      });

      // Step 4: Call AI SDK for translation
      const translation = await this.translateWithAISDK(prompt);

      // Step 5: Detect source language
      const detectedLanguage = await this.detectLanguage(messageText);

      // Step 6: Detect formality level (now informed by chat context)
      const formalityDetection = await this.detectFormality(
        messageText,
        chatContext?.mood
      );

      // Step 7: Cultural analysis ON TRANSLATION ONLY
      // Analyze the TRANSLATED text for cultural phrases and slang
      // This allows users to tap on highlighted words in translations
      const { CulturalAnalysisService } = await import('./CulturalAnalysisService.js');
      const culturalAnalysis = await CulturalAnalysisService.analyzeCulturalContext(
        translation, // Analyze TRANSLATED text (e.g., English translation)
        params.targetLanguage, // Language code
        params.messageId, // Message ID
        chatContext?.mood, // Chat mood (optional)
        chatContext?.relationship // Relationship (optional)
      );

      logger.info("Mood-aware translation with cultural analysis completed successfully", {
        messageId: params.messageId,
        detectedLanguage,
        formalityLevel: formalityDetection.level,
        formalityConfidence: formalityDetection.confidence,
        chatMood: chatContext?.mood || 'none',
        chatTopics: chatContext?.topics?.join(', ') || 'none',
        culturalPhrasesFound: culturalAnalysis.culturalPhrases.length,
        slangExpressionsFound: culturalAnalysis.slangExpressions.length,
      });

      return {
        success: true,
        original: messageText,
        translated: translation,
        targetLanguage: params.targetLanguage,
        detectedLanguage: detectedLanguage,
        formalityLevel: formalityDetection.level,
        formalityIndicators: formalityDetection.indicators,
        culturalAnalysis: culturalAnalysis, // Include cultural analysis for highlighting
        messageId: params.messageId,
        chatId: params.chatId,
      };
    } catch (error: any) {
      logger.error("Translation error:", error);
      return {
        success: false,
        original: "",
        error: error.message || "Translation failed",
      };
    }
  }

  /**
   * Load recent messages for immediate context (replaces RAG)
   */
  private async loadRecentMessages(
    chatId: string,
    currentMessageId: string,
    limit: number = 10
  ): Promise<string> {
    try {
      logger.info("Loading recent messages for context", {
        chatId,
        currentMessageId,
        limit
      });

      const snapshot = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("timestamp", "desc")
        .limit(limit + 1) // +1 to exclude current message
        .get();

      if (snapshot.empty) {
        return "";
      }

      const messages = snapshot.docs
        .filter((doc) => doc.id !== currentMessageId)
        .slice(0, limit)
        .reverse() // Oldest to newest
        .map((doc) => {
          const data = doc.data();
          const senderName = data.senderName || "User";
          return `- ${senderName}: ${data.text}`;
        });

      logger.info("Recent messages loaded", {
        chatId,
        messageCount: messages.length
      });

      return messages.join("\n");
    } catch (error) {
      logger.error("Failed to load recent messages", {
        chatId,
        error: error
      });
      return "";
    }
  }

  /**
   * Build mood-aware translation prompt (NEW)
   */
  private buildMoodAwarePrompt(data: {
    message: string;
    chatContext: ChatContext | null;
    recentMessages: string;
    targetLang: string;
  }): string {
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ru: "Russian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      hi: "Hindi",
      tr: "Turkish",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      no: "Norwegian",
      da: "Danish",
      fi: "Finnish",
      el: "Greek",
      he: "Hebrew",
      th: "Thai",
      vi: "Vietnamese",
      id: "Indonesian",
      ms: "Malay",
      fil: "Filipino",
    };

    const targetLanguage = languageNames[data.targetLang] || data.targetLang;

    let prompt = "You are a professional translator specializing in natural, context-aware translations.\n\n";

    // Add chat context if available
    if (data.chatContext) {
      prompt += `CHAT CONTEXT:\n`;
      prompt += `- Conversation mood: ${data.chatContext.mood}\n`;
      prompt += `- Relationship: ${data.chatContext.relationship}\n`;
      prompt += `- Formality: ${data.chatContext.formality}\n`;
      prompt += `- Main topics: ${data.chatContext.topics.join(", ")}\n`;
      prompt += `- Summary: ${data.chatContext.summary}\n\n`;
    }

    // Add recent messages
    if (data.recentMessages) {
      prompt += `RECENT CONVERSATION:\n${data.recentMessages}\n\n`;
    }

    prompt += `CURRENT MESSAGE TO TRANSLATE:\n"${data.message}"\n\n`;
    prompt += `TASK:\n`;
    prompt += `Translate this message to ${targetLanguage} naturally, preserving slang and cultural expressions.\n\n`;
    
    if (data.chatContext) {
      prompt += `CONTEXT-AWARE TRANSLATION:\n`;
      prompt += `- Match the conversation mood: ${data.chatContext.mood}\n`;
      prompt += `- Match the formality level: ${data.chatContext.formality}\n`;
      prompt += `- Consider the relationship: ${data.chatContext.relationship}\n`;
      prompt += `- Keep the same vibe as the conversation summary above\n\n`;
    }
    
    prompt += `IMPORTANT RULES:\n`;
    prompt += `1. Preserve slang terms and cultural phrases in translation (e.g., "Bro" → "Bro", not "Brother")\n`;
    prompt += `2. Keep idiomatic expressions natural (e.g., "red as a tomato" → keep the imagery)\n`;
    prompt += `3. Maintain the same level of informality/slang as the original\n`;
    prompt += `4. Keep emojis unchanged\n`;
    prompt += `5. Preserve formatting\n`;
    prompt += `6. If it's casual/slang in the original, keep it casual/slang in translation\n\n`;
    prompt += `Respond with ONLY the translation, no explanations or additional text.`;

    return prompt.trim();
  }

  /**
   * Call AI SDK for translation (replaces callOpenAI)
   */
  private async translateWithAISDK(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: AI_CONFIG.temperature,
      });

      if (!text || text.trim().length === 0) {
        throw new Error("Empty translation received from AI SDK");
      }

      return text.trim();
    } catch (error: any) {
      logger.error("AI SDK translation error:", error);
      throw new Error(`Translation API failed: ${error.message}`);
    }
  }

  /**
   * Detect the source language of a message using AI SDK
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      const { text: languageCode } = await generateText({
        model: aiModel,
        prompt: `Detect the language of the following text. Respond with ONLY the two-letter ISO 639-1 language code (e.g., 'en', 'es', 'fr'). Nothing else.\n\nText: ${text}`,
        temperature: 0,
      });

      return languageCode?.trim().toLowerCase() || "unknown";
    } catch (error) {
      logger.error("Language detection error:", error);
      return "unknown";
    }
  }

  /**
   * Detect the formality level of a message using AI SDK (now mood-aware)
   */
  private async detectFormality(
    text: string,
    chatMood?: string
  ): Promise<FormalityDetection> {
    try {
      let prompt = `Analyze the formality level of this message. `;
      
      if (chatMood) {
        prompt += `The overall conversation mood is: "${chatMood}". `;
      }
      
      prompt += `Respond with ONLY a JSON object in this exact format:
{
  "level": "casual|formal|professional|friendly",
  "confidence": 85,
  "indicators": ["informal greeting", "slang", "contractions"]
}

Message: "${text}"

Examples:
- "Hey dude!" → {"level": "casual", "confidence": 95, "indicators": ["informal greeting", "slang"]}
- "Good morning, sir." → {"level": "formal", "confidence": 92, "indicators": ["formal greeting", "title"]}
- "Let's schedule a meeting" → {"level": "professional", "confidence": 88, "indicators": ["business language"]}
- "How are you doing, friend?" → {"level": "friendly", "confidence": 90, "indicators": ["warm tone", "friend"]}`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.1, // Low temperature for consistent classification
      });

      // Parse JSON response
      const parsed = JSON.parse(response.trim());
      
      return {
        level: parsed.level,
        confidence: parsed.confidence || 0,
        indicators: parsed.indicators || []
      };
    } catch (error) {
      logger.error("Formality detection error:", error);
      // Return default friendly formality on error
      return {
        level: "friendly",
        confidence: 50,
        indicators: ["error fallback"]
      };
    }
  }
}