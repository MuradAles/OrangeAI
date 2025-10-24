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
}

export interface SlangExpression {
  slang: string;
  position: [number, number];
  standardMeaning: string;
  usage: string;
  confidence: number;
}

export interface CulturalAnalysisResult {
  messageId: string;
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
   * Analyze text for cultural phrases and slang expressions (now mood-aware)
   * @param targetLanguage - Language for explanations (e.g., 'ru' for Russian explanations)
   */
  static async analyzeCulturalContext(
    text: string,
    language: string,
    messageId: string,
    chatMood?: string,
    relationship?: string,
    targetLanguage?: string
  ): Promise<CulturalAnalysisResult> {
    try {
      logger.info('Starting mood-aware cultural analysis', {
        messageId,
        textLength: text.length,
        language,
        chatMood: chatMood || 'none',
        relationship: relationship || 'none'
      });

      // Skip ONLY extremely simple messages (< 3 chars)
      if (text.trim().length < 3) {
        logger.info('Skipping extremely simple message', { messageId, length: text.trim().length });
        return {
          messageId,
          culturalPhrases: [],
          slangExpressions: [],
          analysisTimestamp: Date.now(),
          webSearchUsed: false
        };
      }

      // Step 1: Detect cultural phrases (now mood-aware and localized)
      const culturalPhrases = await this.detectCulturalPhrases(
        text,
        language,
        chatMood,
        relationship,
        targetLanguage
      );

      // Step 2: Detect slang expressions (now mood-aware and localized)
      const slangExpressions = await this.detectSlangExpressions(
        text,
        language,
        chatMood,
        relationship,
        targetLanguage
      );

      // Step 3: REMOVED fake web search enhancement (was adding 2-5 seconds with no real benefit)

      const result: CulturalAnalysisResult = {
        messageId,
        culturalPhrases: culturalPhrases,
        slangExpressions,
        analysisTimestamp: Date.now(),
        webSearchUsed: false, // No longer using web search
      };

      logger.info('Mood-aware cultural analysis completed', {
        messageId,
        culturalPhrasesCount: result.culturalPhrases.length,
        slangExpressionsCount: result.slangExpressions.length,
        webSearchUsed: result.webSearchUsed,
        chatMood: chatMood || 'none'
      });

      return result;
    } catch (error: any) {
      logger.error('Cultural analysis error:', {
        messageId,
        error: error.message
      });
      
      // Return empty result on error
      return {
        messageId,
        culturalPhrases: [],
        slangExpressions: [],
        analysisTimestamp: Date.now(),
        webSearchUsed: false
      };
    }
  }

  /**
   * Detect cultural phrases using AI SDK (now mood-aware and localized)
   */
  private static async detectCulturalPhrases(
    text: string,
    language: string,
    chatMood?: string,
    relationship?: string,
    targetLanguage?: string
  ): Promise<CulturalPhrase[]> {
    try {
      const explanationLanguage = targetLanguage ? this.getLanguageName(targetLanguage) : 'English';
      
      let prompt = `Analyze this text for cultural phrases, idioms, metaphors, and culture-specific expressions. `;
      
      if (chatMood) {
        prompt += `Conversation mood: "${chatMood}". `;
      }
      
      if (relationship) {
        prompt += `Relationship: "${relationship}". `;
      }
      
      prompt += `⚠️ IMPORTANT: Provide ALL explanations in ${explanationLanguage}. `;
      prompt += `Respond with ONLY a JSON array in this exact format:
[
  {
    "phrase": "break a leg",
    "position": [0, 12],
    "explanation": "Good luck wish",
    "culturalContext": "Theater idiom",
    "examples": [],
    "confidence": 95
  }
]

Text to analyze: "${text}"
Language: ${language}

POSITION CALCULATION:
- Count characters from start (index 0)
- Include ALL characters (letters, spaces, punctuation)
- Position = [startIndex, endIndex]
- VERIFY position matches the actual text before responding

WHAT TO DETECT (BE EXTREMELY GENEROUS - INCLUDE EVERYTHING):
✅ Idioms and metaphors (e.g., "break a leg", "red as a tomato", "spill the tea", "blow off steam")
✅ Cultural references that only locals would understand
✅ Expressions unique to that culture/language
✅ Figurative language and colorful expressions
✅ Traditional sayings or proverbs
✅ Pop culture references (movies, TV, memes, etc.)
✅ Regional expressions and local slang
✅ Food/sports/historical references
✅ Expressions with non-literal meanings
✅ Comparisons and similes ("like a...", "as...as...")
✅ ANY phrase that might confuse someone from another culture
✅ WHEN IN DOUBT, INCLUDE IT!

IMPORTANT RULES:
- BE EXTREMELY GENEROUS: When uncertain if something is cultural, ALWAYS INCLUDE IT
- Lower your detection threshold - we want MORE results, not fewer
- Borderline cases? INCLUDE THEM
- Might be cultural? INCLUDE IT
- Could be confusing? INCLUDE IT
- Don't limit to specific words - analyze the actual meaning
- Language-agnostic: detect cultural expressions in ANY language
- Explanation = MAXIMUM 6 WORDS (can be longer if needed)
- CulturalContext = MAXIMUM 4 WORDS (can be longer if needed)
- It's BETTER to include too many than to miss any
- Minimum confidence score: 60 (even low-confidence matches should be included)
${chatMood ? `- Adjust to mood: "${chatMood}"` : ''}
${relationship === 'close friends' || relationship === 'family' ? '- Include informal expressions' : ''}`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.3, // Higher temperature for more generous detection
      });

      // Parse JSON response - handle markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const phrases = JSON.parse(cleanResponse);
      
      // Filter to only include items with confidence >= 60 (very permissive)
      const filteredPhrases = Array.isArray(phrases) 
        ? phrases.filter((p: CulturalPhrase) => p.confidence >= 60)
        : [];
      
      logger.info('Cultural phrase detection completed', {
        totalDetected: phrases.length,
        afterFiltering: filteredPhrases.length,
        minConfidence: 60
      });
      
      return filteredPhrases;
    } catch (error) {
      logger.error('Cultural phrase detection error:', error);
      return [];
    }
  }

  /**
   * Detect slang expressions using AI SDK (now mood-aware and localized)
   */
  private static async detectSlangExpressions(
    text: string,
    language: string,
    chatMood?: string,
    relationship?: string,
    targetLanguage?: string
  ): Promise<SlangExpression[]> {
    try {
      const explanationLanguage = targetLanguage ? this.getLanguageName(targetLanguage) : 'English';
      
      let prompt = `Analyze this text for slang, informal language, abbreviations, and trendy expressions. `;
      
      if (chatMood) {
        prompt += `Conversation mood: "${chatMood}". `;
      }
      
      if (relationship) {
        prompt += `Relationship: "${relationship}". `;
      }
      
      prompt += `⚠️ IMPORTANT: Provide ALL explanations (standardMeaning and usage) in ${explanationLanguage}. `;
      prompt += `Respond with ONLY a JSON array in this exact format:
[
  {
    "slang": "fire",
    "position": [15, 19],
    "standardMeaning": "Very cool",
    "translatedWord": "огонь",
    "fullExplanation": "This slang term means something is very cool, exciting, or impressive. It's commonly used to express admiration or approval.",
    "usage": "Praise",
    "confidence": 98
  }
]

Text to analyze: "${text}"
Language: ${language}

POSITION CALCULATION:
- Count characters from start (index 0)
- Include ALL characters (letters, spaces, punctuation)
- Position = [startIndex, endIndex]
- VERIFY position matches the actual text before responding

WHAT TO DETECT (BE EXTREMELY GENEROUS - INCLUDE EVERYTHING):
✅ Internet slang and text speak (e.g., "lol", "brb", "ngl", "fr", "omg", "tbh", "imo")
✅ Informal contractions (e.g., "tryna", "gonna", "wanna", "gotta", "kinda", "sorta")
✅ Trendy expressions (e.g., "fire", "lit", "cap", "bussin", "slay", "vibe", "bet", "mood", "tea", "facts")
✅ Casual address terms (e.g., "bro", "dude", "homie", "fam", "sis", "bestie", "mate")
✅ Generation-specific slang (Gen Z, Millennial, Gen X, etc.)
✅ Platform-specific lingo (TikTok, Twitter, Instagram, Discord, etc.)
✅ Regional/dialect informal words (UK, US, Aussie, etc.)
✅ Shortened words and abbreviations ("congrats", "thx", "pls", "ur")
✅ Intensifiers and emphasis words ("so", "really", "totally", "absolutely" when used casually)
✅ Filler words used informally ("like", "literally", "basically", "actually")
✅ ANY informal, trendy, or casual expression in ANY language
✅ WHEN IN DOUBT, INCLUDE IT!

IMPORTANT RULES:
- BE EXTREMELY GENEROUS: When uncertain if something is slang, ALWAYS INCLUDE IT
- Lower your detection threshold - we want MORE results, not fewer
- Borderline cases? INCLUDE THEM
- Might be informal? INCLUDE IT
- Could be slang? INCLUDE IT
- Sounds casual or trendy? INCLUDE IT
- Don't hardcode specific words - analyze what sounds casual in context
- Language-agnostic: detect informal expressions in ANY language
- StandardMeaning = MAXIMUM 4 WORDS (can be longer if needed)
- Usage = MAXIMUM 3 WORDS (can be more specific)
- It's BETTER to over-include than to miss any slang
- Minimum confidence score: 60 (even low-confidence matches should be included)
${chatMood && (chatMood.includes('playful') || chatMood.includes('casual')) ? '- Extra casual/playful mood - include more' : ''}
${relationship === 'colleagues' || relationship === 'professional' ? '- Focus on professional jargon too' : '- Include all casual language'}

TRANSLATION REQUIREMENTS:
- translatedWord: Provide a direct translation of the slang term in ${explanationLanguage}
- fullExplanation: Provide a complete 1-2 sentence explanation in ${explanationLanguage} explaining what the slang means and how it's used
- Example: If slang is "fire" and target language is Russian:
  - translatedWord: "огонь" 
  - fullExplanation: "Этот сленговый термин означает, что что-то очень крутое, захватывающее или впечатляющее. Обычно используется для выражения восхищения или одобрения."`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.3, // Higher temperature for more generous detection
      });

      // Parse JSON response - handle markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const slang = JSON.parse(cleanResponse);
      
      // Filter to only include items with confidence >= 60 (very permissive)
      const filteredSlang = Array.isArray(slang) 
        ? slang.filter((s: SlangExpression) => s.confidence >= 60)
        : [];
      
      logger.info('Slang detection completed', {
        totalDetected: slang.length,
        afterFiltering: filteredSlang.length,
        minConfidence: 60
      });
      
      return filteredSlang;
    } catch (error) {
      logger.error('Slang detection error:', error);
      return [];
    }
  }

}
