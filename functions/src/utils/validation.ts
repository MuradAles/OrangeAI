/**
 * Validation Utilities
 * Common validation functions for cloud functions
 */

import { HttpsError } from "firebase-functions/v2/https";

/**
 * Validate authentication
 */
export function validateAuth(auth: any): string {
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }
  return auth.uid;
}

/**
 * Validate string parameter
 */
export function validateString(value: any, paramName: string): string {
  if (!value || typeof value !== "string") {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} is required and must be a string`
    );
  }
  return value;
}

/**
 * Validate optional string parameter
 */
export function validateOptionalString(value: any, paramName: string, defaultValue: string = ""): string {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "string") {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} must be a string`
    );
  }
  return value;
}

/**
 * Validate array parameter
 */
export function validateArray(value: any, paramName: string): any[] {
  if (!Array.isArray(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} is required and must be an array`
    );
  }
  return value;
}

/**
 * Validate non-empty array parameter
 */
export function validateNonEmptyArray(value: any, paramName: string): any[] {
  const array = validateArray(value, paramName);
  if (array.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} must be a non-empty array`
    );
  }
  return array;
}

/**
 * Validate number parameter
 */
export function validateNumber(value: any, paramName: string): number {
  if (typeof value !== "number" || isNaN(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} is required and must be a number`
    );
  }
  return value;
}

/**
 * Validate optional number parameter
 */
export function validateOptionalNumber(value: any, paramName: string, defaultValue: number): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value !== "number" || isNaN(value)) {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} must be a number`
    );
  }
  return value;
}

/**
 * Validate boolean parameter
 */
export function validateBoolean(value: any, paramName: string): boolean {
  if (typeof value !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      `${paramName} is required and must be a boolean`
    );
  }
  return value;
}

/**
 * Validate chat ID parameter
 */
export function validateChatId(chatId: any): string {
  return validateString(chatId, "chatId");
}

/**
 * Validate message ID parameter
 */
export function validateMessageId(messageId: any): string {
  return validateString(messageId, "messageId");
}

/**
 * Validate user ID parameter
 */
export function validateUserId(userId: any): string {
  return validateString(userId, "userId");
}

/**
 * Validate language code parameter
 */
export function validateLanguageCode(languageCode: any): string {
  const code = validateString(languageCode, "languageCode");
  
  // Basic validation for common language codes
  const validCodes = ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi", "tr", "nl", "pl", "sv"];
  if (!validCodes.includes(code.toLowerCase())) {
    throw new HttpsError(
      "invalid-argument",
      `Invalid language code: ${code}. Supported codes: ${validCodes.join(", ")}`
    );
  }
  
  return code.toLowerCase();
}

/**
 * Validate query parameter (for search functions)
 */
export function validateQuery(query: any): string {
  const q = validateString(query, "query");
  if (q.trim().length < 2) {
    throw new HttpsError(
      "invalid-argument",
      "Query must be at least 2 characters"
    );
  }
  return q.trim();
}

/**
 * Validate limit parameter
 */
export function validateLimit(limit: any, maxLimit: number = 100): number {
  const l = validateOptionalNumber(limit, "limit", 20);
  if (l < 1 || l > maxLimit) {
    throw new HttpsError(
      "invalid-argument",
      `Limit must be between 1 and ${maxLimit}`
    );
  }
  return l;
}
