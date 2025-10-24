import { generateObject } from 'ai';
import * as admin from "firebase-admin";
import * as logger from 'firebase-functions/logger';
import { z } from 'zod';
import { AI_CONFIG, aiModel } from '../config/ai-sdk.config';
import { ChatContext } from '../shared/types/ChatContext';
import { ChatContextService } from './ChatContextService';
import { CulturalAnalysisResult } from './CulturalAnalysisService';

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

interface TranslationParams {
  messageId: string;
  chatId: string;
  targetLanguage: string;
  messageText: string;
  userId: string;
}

// Zod schema for structured AI output
const translationSchema = z.object({
  translated: z.string().describe('The translated text'),
  detectedLanguage: z.string().describe('Two-letter ISO 639-1 language code of the source text (e.g., en, es, fr)'),
  formalityLevel: z.enum(['casual', 'formal', 'professional', 'friendly']).describe('Detected formality level of the message'),
  formalityIndicators: z.array(z.string()).default([]).describe('Indicators that led to formality detection (e.g., "informal greeting", "slang")'),
  culturalPhrases: z.array(z.object({
    phrase: z.string().describe('The cultural phrase or idiom found'),
    position: z.array(z.number()).length(2).describe('Start and end character positions as array [startIndex, endIndex]'),
    explanation: z.string().describe('Brief explanation (max 5 words) in target language'),
    culturalContext: z.string().describe('Cultural context (max 3 words) in target language'),
    examples: z.array(z.string()).describe('Usage examples in target language'),
    confidence: z.number().min(0).max(100).describe('Confidence score 0-100'),
  })).default([]).describe('Cultural phrases and idioms found in the TRANSLATED text. Return empty array if none found.'),
  slangExpressions: z.array(z.object({
    slang: z.string().describe('The slang term found'),
    position: z.array(z.number()).length(2).describe('Start and end character positions as array [startIndex, endIndex]'),
    standardMeaning: z.string().describe('Standard meaning (max 3 words) in target language'),
    usage: z.string().describe('Usage context (max 2 words) in target language'),
    confidence: z.number().min(0).max(100).describe('Confidence score 0-100'),
  })).default([]).describe('Slang expressions found in the TRANSLATED text. Return empty array if none found.'),
});

export class TranslationService {
  /**
   * Fast language detection using only first few words (optimized for speed)
   * 🚀 ULTRA-FAST: Only sends 5-7 words to AI (~200ms response)
   */
  async quickDetectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    try {
      // Take only first 5-7 words for fast detection
      const words = text.trim().split(/\s+/);
      const sample = words.slice(0, Math.min(7, words.length)).join(' ');

      // If text is too short, return lower confidence
      if (words.length < 3) {
        return { language: 'unknown', confidence: 0.3 };
      }

      logger.info('Quick language detection', {
        originalLength: text.length,
        sampleLength: sample.length,
        wordCount: words.length,
      });

      // Ultra-fast AI call with minimal prompt
      const response = await generateObject({
        model: aiModel,
        schema: z.object({
          language: z.string().describe('Two-letter ISO 639-1 language code (e.g., en, es, ru, fr)'),
          confidence: z.number().min(0).max(100).describe('Confidence level 0-100'),
        }),
        prompt: `Detect the language of this text. Respond with only the two-letter ISO 639-1 code and confidence.

Text: "${sample}"

Examples:
- "Hello everyone" → {"language": "en", "confidence": 95}
- "Привет всем" → {"language": "ru", "confidence": 98}
- "Hola amigos" → {"language": "es", "confidence": 95}`,
        temperature: 0, // Deterministic for language detection
      });

      logger.info('Quick language detection completed', {
        language: response.object.language,
        confidence: response.object.confidence,
      });

      return {
        language: response.object.language,
        confidence: response.object.confidence / 100, // Convert to 0-1 range
      };
    } catch (error: any) {
      logger.error('Quick language detection error:', error);
      return { language: 'unknown', confidence: 0 };
    }
  }

  /**
   * Simple translation for preview (fast, no cultural analysis)
   * 🚀 FAST: Only returns translation and detected language (1-2 seconds)
   */
  async translatePreview(
    messageText: string,
    targetLanguage: string
  ): Promise<{ translated: string; detectedLanguage: string }> {
    try {
      logger.info('Starting preview translation', {
        textLength: messageText.length,
        targetLanguage,
      });

      // Simple schema - only translation and detection
      const previewSchema = z.object({
        translated: z.string().describe('The translated text'),
        detectedLanguage: z.string().describe('Two-letter ISO 639-1 language code of the source text'),
      });

      // Simple prompt - no context, no cultural analysis
      const languageNames: Record<string, string> = {
        en: "English", es: "Spanish", fr: "French", de: "German",
        it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
        ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
        tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish",
      };

      const targetLangName = languageNames[targetLanguage] || targetLanguage;

      const prompt = `Translate this text to ${targetLangName}. Also detect the source language.

Text to translate: "${messageText}"

Provide:
1. The translation in ${targetLangName}
2. The detected source language (ISO 639-1 code: en, es, ru, etc.)

Keep the translation natural and preserve the tone.`;

      const result = await generateObject({
        model: aiModel,
        schema: previewSchema,
        prompt: prompt,
        temperature: 0.3,
      });

      logger.info('Preview translation completed', {
        detectedLanguage: result.object.detectedLanguage,
        translatedLength: result.object.translated.length,
      });

      return {
        translated: result.object.translated,
        detectedLanguage: result.object.detectedLanguage,
      };
    } catch (error: any) {
      logger.error('Preview translation error:', error);
      throw new Error(`Preview translation failed: ${error.message}`);
    }
  }

  /**
   * Translate a message with chat context (mood-aware) - OPTIMIZED with single AI call
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

      // Step 0: Quick language detection to avoid unnecessary translation
      const quickLanguageCheck = await this.quickDetectLanguage(messageText);
      if (quickLanguageCheck.language === params.targetLanguage) {
        logger.info("Skipping translation - message already in target language", {
          messageId: params.messageId,
          detectedLanguage: quickLanguageCheck.language,
          targetLanguage: params.targetLanguage,
          confidence: quickLanguageCheck.confidence
        });
        
        return {
          success: true,
          original: messageText,
          translated: messageText, // Return original as "translated"
          targetLanguage: params.targetLanguage,
          detectedLanguage: quickLanguageCheck.language,
          formalityLevel: 'casual',
          formalityIndicators: [],
          culturalAnalysis: {
            messageId: params.messageId,
            culturalPhrases: [],
            slangExpressions: [],
            analysisTimestamp: Date.now(),
            webSearchUsed: false,
          },
        };
      }

      logger.info("Starting optimized mood-aware translation", {
        messageId: params.messageId,
        chatId: params.chatId,
        targetLanguage: params.targetLanguage,
        detectedLanguage: quickLanguageCheck.language,
        textLength: messageText.length
      });

      // Check if source language equals target language - skip translation
      if (quickLanguageCheck.language === params.targetLanguage) {
        logger.info("⏭️ Skipping translation - same language", {
          messageId: params.messageId,
          language: quickLanguageCheck.language,
        });
        
        return {
          success: true,
          original: messageText,
          translated: messageText, // Return original text
          targetLanguage: params.targetLanguage,
          detectedLanguage: quickLanguageCheck.language,
          formalityLevel: 'casual',
          formalityIndicators: [],
          culturalAnalysis: {
            messageId: params.messageId,
            culturalPhrases: [],
            slangExpressions: [],
            analysisTimestamp: Date.now(),
            webSearchUsed: false,
          },
          messageId: params.messageId,
          chatId: params.chatId,
        };
      }

      // Step 1: Load chat context (now with caching!)
      const chatContext = await ChatContextService.loadContext(params.chatId);

      // Step 2: Load recent messages for immediate context
      const recentMessages = await this.loadRecentMessages(params.chatId, params.messageId, 10);

      // Step 3: Check if message is too simple for cultural analysis
      const isSimpleMessage = this.isSimpleMessage(messageText);

      // Step 4: Build comprehensive prompt for single AI call
      const prompt = this.buildComprehensivePrompt({
        message: messageText,
        chatContext: chatContext,
        recentMessages: recentMessages,
        targetLang: params.targetLanguage,
        skipCulturalAnalysis: isSimpleMessage,
      });

      // Step 5: SINGLE AI CALL - gets everything at once! 🚀
      let result: any;
      
      try {
        result = await generateObject({
          model: aiModel,
          schema: translationSchema,
          prompt: prompt,
          temperature: AI_CONFIG.temperature, // 0.3
        });
      } catch (error: any) {
        logger.error('❌ AI generateObject error (attempt 1):', {
          error: error.message,
          messageLength: messageText.length,
          targetLanguage: params.targetLanguage,
        });
        
        try {
          // Fallback 1: Try with all fields optional
          const minimalSchema = z.object({
            translated: z.string(),
            detectedLanguage: z.string(),
            formalityLevel: z.enum(['casual', 'formal', 'professional', 'friendly']).optional().default('casual'),
            formalityIndicators: z.array(z.string()).optional().default([]),
            culturalPhrases: z.array(z.any()).optional().default([]),
            slangExpressions: z.array(z.any()).optional().default([]),
          });
          
          logger.info('🔄 Retrying with minimal schema (attempt 2)...');
          result = await generateObject({
            model: aiModel,
            schema: minimalSchema,
            prompt: prompt,
            temperature: AI_CONFIG.temperature,
          });
        } catch (retryError: any) {
          logger.error('❌ Retry also failed (attempt 2):', retryError.message);
          
          // Final fallback: Use text generation and parse manually
          logger.warn('⚠️ Using final fallback: text-only translation');
          
          try {
            const { generateText } = await import('ai');
            const simplePrompt = `Translate this text to ${params.targetLanguage}: "${messageText}"\n\nRespond in JSON format:\n{"translated": "...", "detectedLanguage": "two-letter code"}`;
            
            const textResult = await generateText({
              model: aiModel,
              prompt: simplePrompt,
              temperature: 0.3,
            });
            
            try {
              const parsed = JSON.parse(textResult.text);
              result = {
                object: {
                  translated: parsed.translated || messageText,
                  detectedLanguage: parsed.detectedLanguage || 'en',
                  formalityLevel: 'casual',
                  formalityIndicators: [],
                  culturalPhrases: [],
                  slangExpressions: [],
                }
              };
            } catch {
              // Absolute worst case: return the text as-is
              result = {
                object: {
                  translated: textResult.text,
                  detectedLanguage: 'en',
                  formalityLevel: 'casual',
                  formalityIndicators: [],
                  culturalPhrases: [],
                  slangExpressions: [],
                }
              };
            }
          } catch (finalError: any) {
            logger.error('❌ Final fallback also failed:', finalError.message);
            // Ultimate fallback: return original text
            result = {
              object: {
                translated: messageText,
                detectedLanguage: 'en',
                formalityLevel: 'casual',
                formalityIndicators: [],
                culturalPhrases: [],
                slangExpressions: [],
              }
            };
            logger.warn('⚠️ Using ultimate fallback: original text');
          }
        }
      }

      const culturalAnalysis: CulturalAnalysisResult = {
        messageId: params.messageId,
        culturalPhrases: (result.object.culturalPhrases || []).filter((p: any) => p && p.phrase).map((p: any) => ({
          phrase: p.phrase,
          position: [p.position?.[0] || 0, p.position?.[1] || 0] as [number, number],
          explanation: p.explanation || '',
          culturalContext: p.culturalContext || '',
          examples: p.examples || [],
          confidence: p.confidence || 50,
        })),
        slangExpressions: (result.object.slangExpressions || []).filter((s: any) => s && s.slang).map((s: any) => ({
          slang: s.slang,
          position: [s.position?.[0] || 0, s.position?.[1] || 0] as [number, number],
          standardMeaning: s.standardMeaning || '',
          usage: s.usage || '',
          confidence: s.confidence || 50,
        })),
        analysisTimestamp: Date.now(),
        webSearchUsed: false, // No longer using fake web search
      };

      logger.info("Optimized translation completed successfully (SINGLE AI CALL)", {
        messageId: params.messageId,
        detectedLanguage: result.object.detectedLanguage,
        formalityLevel: result.object.formalityLevel,
        chatMood: chatContext?.mood || 'none',
        chatTopics: chatContext?.topics?.join(', ') || 'none',
        culturalPhrasesFound: culturalAnalysis.culturalPhrases.length,
        slangExpressionsFound: culturalAnalysis.slangExpressions.length,
        wasSimpleMessage: isSimpleMessage,
      });

      return {
        success: true,
        original: messageText,
        translated: result.object.translated,
        targetLanguage: params.targetLanguage,
        detectedLanguage: result.object.detectedLanguage,
        formalityLevel: result.object.formalityLevel,
        formalityIndicators: result.object.formalityIndicators,
        culturalAnalysis: culturalAnalysis,
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
   * Check if message is too simple for cultural analysis
   */
  private isSimpleMessage(text: string): boolean {
    const trimmed = text.trim();
    
    // Skip very short messages
    if (trimmed.length < 5) {
      return true;
    }
    
    // Skip emoji-only messages
    const emojiOnlyRegex = /^[\s\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]*$/u;
    if (emojiOnlyRegex.test(trimmed)) {
      return true;
    }
    
    // Skip common short responses
    const simpleResponses = ['ok', 'okay', 'yes', 'no', 'yeah', 'nope', 'yep', 'sure', 'thanks', 'thank you', 'hi', 'hello', 'hey', 'bye', 'goodbye'];
    if (simpleResponses.includes(trimmed.toLowerCase())) {
      return true;
    }
    
    return false;
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
   * Build comprehensive prompt for single AI call - OPTIMIZED! 🚀
   */
  private buildComprehensivePrompt(data: {
    message: string;
    chatContext: ChatContext | null;
    recentMessages: string;
    targetLang: string;
    skipCulturalAnalysis: boolean;
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

    let prompt = `🚨 CRITICAL: ALL explanations, meanings, and cultural context MUST be in ${targetLanguage}. No other language allowed for explanations.\n\n`;
    
    prompt += "You are a professional translator specializing in natural, context-aware translations.\n\n";

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
    
    prompt += `YOUR TASKS (all in ONE response):\n\n`;
    
    prompt += `1. DETECT SOURCE LANGUAGE:\n`;
    prompt += `   - Identify the two-letter ISO 639-1 code (e.g., 'en', 'es', 'ru')\n\n`;
    
    prompt += `2. TRANSLATE TO ${targetLanguage}:\n`;
    prompt += `   - Natural, context-aware translation\n`;
    prompt += `   - Preserve slang and cultural expressions (e.g., "Bro" stays "Bro")\n`;
    prompt += `   - Keep idiomatic expressions natural\n`;
    prompt += `   - Maintain same formality level\n`;
    prompt += `   - Keep emojis unchanged\n`;
    if (data.chatContext) {
      prompt += `   - Match conversation mood: ${data.chatContext.mood}\n`;
      prompt += `   - Match formality: ${data.chatContext.formality}\n`;
    }
    prompt += `\n`;
    
    prompt += `3. DETECT FORMALITY:\n`;
    prompt += `   - Classify as: casual, formal, professional, or friendly\n`;
    prompt += `   - Provide indicators (e.g., "informal greeting", "slang", "contractions")\n\n`;
    
    if (data.skipCulturalAnalysis) {
      prompt += `4. CULTURAL ANALYSIS: SKIP (message too simple)\n`;
      prompt += `   - REQUIRED: Return empty arrays [] for BOTH culturalPhrases AND slangExpressions\n\n`;
    } else {
      prompt += `4. ANALYZE CULTURAL PHRASES in the TRANSLATED text:\n`;
      prompt += `   - Find idioms, metaphors, culture-specific expressions\n`;
      prompt += `   - If NO cultural phrases found, return EMPTY ARRAY []\n`;
      prompt += `   - For each phrase:\n`;
      prompt += `     * phrase: the exact text\n`;
      prompt += `     * position: [startIndex, endIndex] character positions\n`;
      prompt += `     * explanation: Brief meaning (max 5 words) in ${targetLanguage}\n`;
      prompt += `     * culturalContext: Context (max 3 words) in ${targetLanguage}\n`;
      prompt += `     * examples: Usage examples in ${targetLanguage}\n`;
      prompt += `     * confidence: 0-100 score\n`;
      prompt += `   - Be generous - include any phrase that might confuse non-natives\n\n`;
      
      prompt += `5. ANALYZE SLANG in the TRANSLATED text:\n`;
      prompt += `   - Find slang, informal language, abbreviations, trendy expressions\n`;
      prompt += `   - If NO slang found, return EMPTY ARRAY []\n`;
      prompt += `   - For each slang term:\n`;
      prompt += `     * slang: the exact term\n`;
      prompt += `     * position: [startIndex, endIndex] character positions\n`;
      prompt += `     * standardMeaning: Formal meaning (max 3 words) in ${targetLanguage}\n`;
      prompt += `     * usage: Context (max 2 words) in ${targetLanguage}\n`;
      prompt += `     * confidence: 0-100 score\n`;
      prompt += `   - Be generous - include informal/casual/trendy expressions\n\n`;
    }
    
    prompt += `🚨 REMINDER: ALL explanations (explanation, culturalContext, standardMeaning, usage) must be in ${targetLanguage}!\n\n`;
    
    prompt += `POSITION CALCULATION:\n`;
    prompt += `- Count characters from start of TRANSLATED text (index 0)\n`;
    prompt += `- Include ALL characters (letters, spaces, punctuation)\n`;
    prompt += `- Position format: [startIndex, endIndex]\n`;

    return prompt.trim();
  }

}