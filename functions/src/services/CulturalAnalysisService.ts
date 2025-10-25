/**
 * Cultural Analysis Service
 * Detects cultural phrases, slang, and idioms using AI SDK
 */

import { generateText } from 'ai';
import * as logger from 'firebase-functions/logger';
import { aiModel } from '../config/ai-sdk.config';

export interface CulturalPhrase {
  phrase: string;
  position: [number, number];
  explanation: string;
  culturalContext: string;
  examples: string[];
  confidence: number;
  // New fields for mapping
  englishPhrase?: string;
  englishPosition?: [number, number];
}

export interface SlangExpression {
  slang: string;
  position: [number, number];
  standardMeaning: string;
  usage: string;
  confidence: number;
  // New fields for mapping
  englishSlang?: string;
  englishPosition?: [number, number];
}

export interface CulturalAnalysisResult {
  messageId: string;
  messageExplanation: string; // Overall explanation of what the message means
  culturalPhrases: CulturalPhrase[];
  slangExpressions: SlangExpression[];
  analysisTimestamp: number;
  webSearchUsed: boolean;
}

export class CulturalAnalysisService {
  /**
   * Helper to get language name from code
   */
  private static getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'tr': 'Turkish',
    };
    return languageNames[code] || 'English';
  }
  
  /**
   * Analyze text for cultural phrases and slang expressions in ONE API call
   * @param targetLanguage - Language for explanations (e.g., 'ru' for Russian explanations)
   */
  static async analyzeCulturalContext(
    originalText: string,
    translatedText: string,
    language: string,
    messageId: string,
    chatMood?: string,
    relationship?: string,
    targetLanguage?: string
  ): Promise<CulturalAnalysisResult> {
    try {
      logger.info('Starting single-call cultural analysis', {
        messageId,
        originalTextLength: originalText.length,
        translatedTextLength: translatedText.length,
        language,
        chatMood: chatMood || 'none',
        relationship: relationship || 'none'
      });

      // Skip ONLY extremely simple messages (< 3 chars)
      if (originalText.trim().length < 3) {
        logger.info('Skipping extremely simple message', { messageId, length: originalText.trim().length });
        return {
          messageId,
          messageExplanation: originalText,
          culturalPhrases: [],
          slangExpressions: [],
          analysisTimestamp: Date.now(),
          webSearchUsed: false
        };
      }

      // Do everything in ONE AI call
      const result = await this.performSingleCallAnalysis(
        originalText,
        translatedText,
        language,
        chatMood,
        relationship,
        targetLanguage
      );

      const finalResult: CulturalAnalysisResult = {
        messageId,
        messageExplanation: result.messageExplanation || translatedText || originalText,
        culturalPhrases: result.culturalPhrases,
        slangExpressions: result.slangExpressions,
        analysisTimestamp: Date.now(),
        webSearchUsed: false,
      };

      logger.info('Single-call cultural analysis completed', {
        messageId,
        culturalPhrasesCount: finalResult.culturalPhrases.length,
        slangExpressionsCount: finalResult.slangExpressions.length,
        chatMood: chatMood || 'none'
      });

      return finalResult;
    } catch (error: any) {
      logger.error('Cultural analysis error:', {
        messageId,
        error: error.message
      });
      
      // Return empty result on error
      return {
        messageId,
        messageExplanation: originalText,
        culturalPhrases: [],
        slangExpressions: [],
        analysisTimestamp: Date.now(),
        webSearchUsed: false
      };
    }
  }

  /**
   * Perform simple cultural analysis with word mapping
   */
  private static async performSingleCallAnalysis(
    originalText: string,
    translatedText: string,
    language: string,
    chatMood?: string,
    relationship?: string,
    targetLanguage?: string
  ): Promise<{ messageExplanation: string, culturalPhrases: CulturalPhrase[], slangExpressions: SlangExpression[] }> {
    try {
      const explanationLanguage = targetLanguage ? this.getLanguageName(targetLanguage) : 'English';
      
      let prompt = `Analyze this text for cultural phrases, slang, and idioms. `;
      
      if (chatMood) {
        prompt += `Conversation mood: "${chatMood}". `;
      }
      
      if (relationship) {
        prompt += `Relationship: "${relationship}". `;
      }
      
      prompt += `⚠️ IMPORTANT: Provide ALL explanations in ${explanationLanguage}. 

ORIGINAL TEXT: "${originalText}"
TRANSLATED TEXT: "${translatedText}"
ORIGINAL LANGUAGE: ${language}

TASK: 
1. Explain the OVERALL meaning and context of this message
2. Find cultural phrases and slang in the ORIGINAL text
3. Provide simple word mappings to the TRANSLATED text

Respond with ONLY a JSON object in this exact format:
{
  "messageExplanation": "A comprehensive 2-3 sentence explanation of what this message means, including tone, intent, and cultural context",
  "culturalPhrases": [
    {
      "phrase": "qué chévere",
      "position": [0, 10],
      "explanation": "This is a Colombian expression used to express excitement or approval about something. It's similar to saying 'how cool' or 'how awesome' in English, but carries a distinctly Latin American casual and friendly tone.",
      "culturalContext": "This phrase is particularly popular in Colombian Spanish and other Latin American countries. It reflects the warm, expressive communication style common in these cultures.",
      "examples": ["¡Qué chévere tu casa!", "Está chévere la fiesta", "Qué chévere que viniste"],
      "confidence": 95,
      "englishPhrase": "how cool"
    }
  ],
  "slangExpressions": [
    {
      "slang": "chévere",
      "position": [4, 10],
      "standardMeaning": "This means 'cool', 'awesome', or 'nice' when describing something positive or agreeable.",
      "usage": "Used in casual conversations among friends and family to express approval, excitement, or agreement. Common in everyday speech throughout Latin America.",
      "confidence": 98,
      "englishSlang": "cool"
    }
  ]
}

CRITICAL MAPPING RULES:
- "phrase" field: Extract from ORIGINAL TEXT (e.g. "qué chévere" if original is Spanish)
- "englishPhrase" field: Extract the equivalent from TRANSLATED TEXT (e.g. "how cool" if translated to English, or "qué genial" if translated to Spanish)
- "slang" field: Extract from ORIGINAL TEXT (e.g. "chévere" if original is Spanish)
- "englishSlang" field: Extract the equivalent from TRANSLATED TEXT (e.g. "cool" if translated to English, or "genial" if translated to Spanish)
- The "englishPhrase/englishSlang" fields are MISNAMED but must be used - they should contain the phrase in the TARGET LANGUAGE (from TRANSLATED TEXT), NOT always English!
- BOTH FIELDS ARE REQUIRED for every item - always extract both the original and translated versions

CRITICAL: ONLY DETECT ACTUAL CULTURAL CONTENT!

❌ DO NOT DETECT (Skip these):
- Simple nouns (sunglasses, car, phone, shoes, house, etc.)
- Basic verbs (eat, run, sleep, walk, etc.)
- Common adjectives (big, small, red, blue, etc.)
- Direct 1-to-1 translations with no cultural meaning
- Everyday vocabulary that exists in all languages
- Standard words that are just part of normal speech

✅ ONLY DETECT (Flag these):
- Idioms: Phrases with non-literal meaning ("break a leg", "piece of cake")
- Slang: Informal expressions specific to a group ("that's fire", "no cap", "qué chévere")
- Regional expressions: Words/phrases unique to a culture ("y'all", "mate", "güey")
- Cultural references: References to traditions, holidays, local customs
- Metaphors: Figurative language that needs explanation
- Proverbs/sayings: Traditional wisdom phrases
- Expressions that DON'T translate word-for-word

STRICT RULES:
- messageExplanation: 2-3 sentences explaining the meaning, tone, and intent
- BE STRICT: Only flag if it TRULY needs cultural explanation
- Single common words = SKIP (unless they're slang)
- If it translates literally = SKIP
- If a 5-year-old would understand = SKIP
- Minimum confidence score: 85 (be confident!)
- Language-agnostic: detect expressions in ANY language

EXPLANATION DETAILS (provide full sentences):
- Explanation: 2-3 sentences explaining what the phrase means, why it's cultural, and how it's used
- CulturalContext: 1-2 sentences about the cultural/regional origin and significance
- StandardMeaning: 1 clear sentence explaining the literal meaning
- Usage: 1 sentence describing when and how people use this expression
- Examples: Provide 2-3 real usage examples in the original language
${chatMood ? `- Adjust to mood: "${chatMood}"` : ''}
${relationship === 'close friends' || relationship === 'family' ? '- Include informal expressions' : ''}`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.3,
      });

      // Parse JSON response - handle markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const result = JSON.parse(cleanResponse);
      
      // Filter to only include items with confidence >= 85 (strict threshold)
      const filteredCulturalPhrases = Array.isArray(result.culturalPhrases) 
        ? result.culturalPhrases.filter((p: CulturalPhrase) => p.confidence >= 85)
        : [];
      
      const filteredSlangExpressions = Array.isArray(result.slangExpressions) 
        ? result.slangExpressions.filter((s: SlangExpression) => s.confidence >= 85)
        : [];
      
      const messageExplanation = result.messageExplanation || translatedText;
      
      logger.info('Simple word mapping analysis completed', {
        hasExplanation: !!messageExplanation,
        culturalPhrasesDetected: filteredCulturalPhrases.length,
        slangExpressionsDetected: filteredSlangExpressions.length,
        minConfidence: 85
      });
      
      return {
        messageExplanation,
        culturalPhrases: filteredCulturalPhrases,
        slangExpressions: filteredSlangExpressions
      };
    } catch (error) {
      logger.error('Simple word mapping analysis error:', error);
      return {
        messageExplanation: translatedText || originalText,
        culturalPhrases: [],
        slangExpressions: []
      };
    }
  }


}
