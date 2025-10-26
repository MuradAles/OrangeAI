/**
 * Translation Utilities
 * 
 * Pure functions for translation helpers and language detection
 */

import { Message } from '@/shared/types';

/**
 * Check if message needs translation
 */
export function needsTranslation(
  message: Message,
  targetLanguage: string,
  userId: string
): boolean {
  return (
    message.senderId !== userId &&  // Skip my own messages
    message.type === 'text' &&       // Only text messages
    !!message.text &&               // Has text
    message.text.trim().length > 0 && // Not empty
    (!message.translations || !message.translations[targetLanguage]) && // Not already translated
    !message.isTranslating // Not currently being translated
  );
}

/**
 * Filter messages that need translation
 */
export function filterMessagesForTranslation(
  messages: Message[],
  targetLanguage: string,
  userId: string
): Message[] {
  return messages.filter(msg => needsTranslation(msg, targetLanguage, userId));
}

/**
 * Get text to translate from message
 */
export function getTextToTranslate(message: Message): string | undefined {
  return message.type === 'text' ? message.text : message.caption || undefined;
}

/**
 * Check if translation already exists
 */
export function hasTranslation(message: Message, targetLanguage: string): boolean {
  return !!(message.translations && message.translations[targetLanguage]);
}

/**
 * Build translation object with cultural analysis
 */
export function buildTranslationObject(translationResult: any) {
  return {
    text: translationResult.translated,
    formalityLevel: translationResult.formalityLevel,
    formalityIndicators: translationResult.formalityIndicators,
    culturalAnalysis: translationResult.culturalAnalysis ? {
      culturalPhrases: translationResult.culturalAnalysis.culturalPhrases || [],
      slangExpressions: translationResult.culturalAnalysis.slangExpressions || [],
    } : undefined,
  };
}

/**
 * Update message with translation
 */
export function updateMessageWithTranslation(
  message: Message,
  targetLanguage: string,
  translationData: any,
  detectedLanguage?: string
): Message {
  return {
    ...message,
    translations: {
      ...message.translations,
      [targetLanguage]: translationData,
    },
    detectedLanguage: detectedLanguage || message.detectedLanguage,
  };
}

/**
 * Get first N words from text for quick language detection
 */
export function getFirstWords(text: string, wordCount: number = 5): string {
  return text.split(/\s+/).slice(0, wordCount).join(' ');
}

/**
 * Check if detected language is same as target language
 */
export function isSameLanguage(detectedLang: string, targetLang: string): boolean {
  return detectedLang === targetLang;
}
