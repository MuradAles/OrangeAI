/**
 * Utility Functions
 * Common helper functions used across cloud functions
 */

import * as logger from "firebase-functions/logger";

/**
 * Language name mapping for AI prompts
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
  ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
  tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish",
};

/**
 * Get language name from language code
 */
export function getLanguageName(languageCode: string): string {
  return LANGUAGE_NAMES[languageCode] || languageCode;
}

/**
 * Validate required string parameter
 */
export function validateStringParam(value: any, paramName: string): string {
  if (!value || typeof value !== "string") {
    throw new Error(`${paramName} is required and must be a string`);
  }
  return value;
}

/**
 * Validate required array parameter
 */
export function validateArrayParam(value: any, paramName: string): any[] {
  if (!Array.isArray(value)) {
    throw new Error(`${paramName} is required and must be an array`);
  }
  return value;
}

/**
 * Log function entry with parameters
 */
export function logFunctionEntry(functionName: string, params: Record<string, any>) {
  logger.info(`Function ${functionName} called`, params);
}

/**
 * Log function success
 */
export function logFunctionSuccess(functionName: string, result: any) {
  logger.info(`Function ${functionName} completed successfully`, {
    resultType: typeof result,
    hasSuccess: result?.success !== undefined,
  });
}

/**
 * Log function error
 */
export function logFunctionError(functionName: string, error: any) {
  logger.error(`Function ${functionName} failed`, {
    error: error.message,
    stack: error.stack,
  });
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format timestamp for logging
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Check if text contains emojis
 */
export function containsEmojis(text: string): boolean {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  return emojiRegex.test(text);
}

/**
 * Extract emojis from text
 */
export function extractEmojis(text: string): string[] {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  return text.match(emojiRegex) || [];
}

/**
 * Calculate text statistics
 */
export function calculateTextStats(text: string) {
  return {
    length: text.length,
    wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
    hasEmojis: containsEmojis(text),
    emojiCount: extractEmojis(text).length,
    hasPunctuation: /[.!?]/.test(text),
    hasMultiplePunctuation: /[!]{2,}|[.]{3,}|\?{2,}/.test(text),
  };
}
