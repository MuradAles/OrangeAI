/**
 * Cultural Service
 * Connects to Firebase Cloud Functions for cultural analysis
 */

import { CulturalAnalysisResult } from '@/shared/types/CulturalTypes';
import { httpsCallable } from 'firebase/functions';
import { functions } from './FirebaseConfig';

export interface CulturalAnalysisOptions {
  useWebSearch?: boolean;
  chatMood?: string;
  relationship?: string;
}

/**
 * Analyze a message for cultural context and slang
 */
export const analyzeCulturalContext = async (
  messageText: string,
  languageCode: string,
  options: CulturalAnalysisOptions = {}
): Promise<CulturalAnalysisResult> => {
  try {
    const analyzeFn = httpsCallable<
      { text: string; language: string; useWebSearch?: boolean; chatMood?: string; relationship?: string },
      { analysis: CulturalAnalysisResult }
    >(functions, 'analyzeCulturalContext');

    const result = await analyzeFn({
      text: messageText,
      language: languageCode,
      useWebSearch: options.useWebSearch ?? true,
      chatMood: options.chatMood,
      relationship: options.relationship,
    });

    return result.data.analysis;
  } catch (error) {
    console.error('Failed to analyze cultural context:', error);
    throw error;
  }
};

/**
 * Generate a chat summary using the ChatContextService
 * @param chatId - The chat ID to summarize
 * @param preferredLanguage - User's preferred language code (e.g., 'en', 'es', 'ru')
 */
export const generateChatSummary = async (
  chatId: string,
  preferredLanguage?: string
): Promise<string> => {
  try {
    const summaryFn = httpsCallable<
      { chatId: string; preferredLanguage?: string },
      { summary: string }
    >(functions, 'generateChatSummary');

    const result = await summaryFn({ chatId, preferredLanguage });
    return result.data.summary;
  } catch (error) {
    console.error('Failed to generate chat summary:', error);
    throw error;
  }
};

export const CulturalService = {
  analyzeCulturalContext,
  generateChatSummary,
};

