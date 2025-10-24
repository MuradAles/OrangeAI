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
   * Analyze text for cultural phrases and slang expressions (now mood-aware)
   */
  static async analyzeCulturalContext(
    text: string,
    language: string,
    messageId: string,
    chatMood?: string,
    relationship?: string
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

      // Step 1: Detect cultural phrases (now mood-aware)
      const culturalPhrases = await this.detectCulturalPhrases(
        text,
        language,
        chatMood,
        relationship
      );

      // Step 2: Detect slang expressions (now mood-aware)
      const slangExpressions = await this.detectSlangExpressions(
        text,
        language,
        chatMood,
        relationship
      );

      // Step 3: Enhance with web search for high-confidence phrases
      const enhancedPhrases = await this.enhanceWithWebSearch(culturalPhrases, language);

      const result: CulturalAnalysisResult = {
        messageId,
        culturalPhrases: enhancedPhrases,
        slangExpressions,
        analysisTimestamp: Date.now(),
        webSearchUsed: enhancedPhrases.some(p => p.confidence > 0.8)
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
   * Detect cultural phrases using AI SDK (now mood-aware)
   */
  private static async detectCulturalPhrases(
    text: string,
    language: string,
    chatMood?: string,
    relationship?: string
  ): Promise<CulturalPhrase[]> {
    try {
      let prompt = `Analyze this text for cultural phrases, idioms, metaphors, and culture-specific expressions. `;
      
      if (chatMood) {
        prompt += `Conversation mood: "${chatMood}". `;
      }
      
      if (relationship) {
        prompt += `Relationship: "${relationship}". `;
      }
      
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

WHAT TO DETECT (BE VERY GENEROUS):
✅ Idioms and metaphors (e.g., "break a leg", "red as a tomato", "spill the tea")
✅ Cultural references that only locals would understand
✅ Expressions unique to that culture/language
✅ Figurative language and colorful expressions
✅ Traditional sayings or proverbs
✅ Pop culture references
✅ Regional expressions
✅ ANY phrase that might confuse someone from another culture

IMPORTANT RULES:
- BE GENEROUS: If it sounds like it might have cultural meaning, INCLUDE IT
- Don't limit to specific words - analyze the actual meaning
- Language-agnostic: detect cultural expressions in ANY language
- Explanation = MAXIMUM 5 WORDS
- CulturalContext = MAXIMUM 3 WORDS
- Better to include too many than miss important ones
${chatMood ? `- Adjust to mood: "${chatMood}"` : ''}
${relationship === 'close friends' || relationship === 'family' ? '- Include informal expressions' : ''}`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.1, // Low temperature for consistent analysis
      });

      // Parse JSON response - handle markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const phrases = JSON.parse(cleanResponse);
      
      return Array.isArray(phrases) ? phrases : [];
    } catch (error) {
      logger.error('Cultural phrase detection error:', error);
      return [];
    }
  }

  /**
   * Detect slang expressions using AI SDK (now mood-aware)
   */
  private static async detectSlangExpressions(
    text: string,
    language: string,
    chatMood?: string,
    relationship?: string
  ): Promise<SlangExpression[]> {
    try {
      let prompt = `Analyze this text for slang, informal language, abbreviations, and trendy expressions. `;
      
      if (chatMood) {
        prompt += `Conversation mood: "${chatMood}". `;
      }
      
      if (relationship) {
        prompt += `Relationship: "${relationship}". `;
      }
      
      prompt += `Respond with ONLY a JSON array in this exact format:
[
  {
    "slang": "fire",
    "position": [15, 19],
    "standardMeaning": "Very cool",
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

WHAT TO DETECT (BE VERY GENEROUS):
✅ Internet slang and text speak (e.g., "lol", "brb", "ngl", "fr")
✅ Informal contractions (e.g., "tryna", "gonna", "wanna", "gotta")
✅ Trendy expressions (e.g., "fire", "lit", "cap", "bussin", "slay", "vibe")
✅ Casual address terms (e.g., "bro", "dude", "homie", "fam")
✅ Generation-specific slang (Gen Z, Millennial, etc.)
✅ Platform-specific lingo (TikTok, Twitter, etc.)
✅ Regional/dialect informal words
✅ Shortened words and abbreviations
✅ ANY informal or trendy expression in ANY language

IMPORTANT RULES:
- BE VERY GENEROUS: If it sounds informal/casual/trendy, INCLUDE IT
- Don't hardcode specific words - analyze what sounds casual in context
- Language-agnostic: detect informal expressions in ANY language
- StandardMeaning = MAXIMUM 3 WORDS
- Usage = MAXIMUM 2 WORDS (e.g., "greeting", "praise", "dismissal")
- Better to over-include than miss slang
${chatMood && (chatMood.includes('playful') || chatMood.includes('casual')) ? '- Extra casual/playful mood - include more' : ''}
${relationship === 'colleagues' || relationship === 'professional' ? '- Focus on professional jargon too' : '- Include all casual language'}`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.1, // Low temperature for consistent analysis
      });

      // Parse JSON response - handle markdown code blocks
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      
      const slang = JSON.parse(cleanResponse);
      
      return Array.isArray(slang) ? slang : [];
    } catch (error) {
      logger.error('Slang detection error:', error);
      return [];
    }
  }

  /**
   * Enhance cultural phrases with web search for high-confidence phrases
   */
  private static async enhanceWithWebSearch(
    phrases: CulturalPhrase[],
    language: string
  ): Promise<CulturalPhrase[]> {
    try {
      const enhancedPhrases: CulturalPhrase[] = [];

      for (const phrase of phrases) {
        if (phrase.confidence > 0.8) {
          // For high-confidence phrases, try to get more detailed context
          const enhanced = await this.searchCulturalContext(phrase.phrase, language);
          if (enhanced) {
            enhancedPhrases.push({
              ...phrase,
              explanation: enhanced.explanation,
              culturalContext: enhanced.culturalContext,
              examples: enhanced.examples
            });
          } else {
            enhancedPhrases.push(phrase);
          }
        } else {
          enhancedPhrases.push(phrase);
        }
      }

      return enhancedPhrases;
    } catch (error) {
      logger.error('Web search enhancement error:', error);
      return phrases; // Return original phrases if enhancement fails
    }
  }

  /**
   * Search for cultural context using AI SDK (simulated web search)
   */
  private static async searchCulturalContext(
    phrase: string,
    language: string
  ): Promise<{ explanation: string; culturalContext: string; examples: string[] } | null> {
    try {
      const prompt = `Provide detailed cultural context for this phrase. 
Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Detailed explanation of the phrase",
  "culturalContext": "Cultural background and significance",
  "examples": ["Example 1", "Example 2", "Example 3"]
}

Phrase: "${phrase}"
Language: ${language}

Provide comprehensive cultural context including:
- Origin and history
- Cultural significance
- When and how it's used
- Regional variations
- Modern usage`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt: prompt,
        temperature: 0.3, // Slightly higher for more creative explanations
      });

      // Parse JSON response
      const context = JSON.parse(response.trim());
      
      return context;
    } catch (error) {
      logger.error('Cultural context search error:', error);
      return null;
    }
  }
}
