import { openai } from '@ai-sdk/openai';

/**
 * AI SDK Configuration
 * Using OpenAI GPT-3.5-turbo and text-embedding-3-small
 */

export const aiModel = openai('gpt-4o-mini');

export const embeddingModel = openai.embedding('text-embedding-3-small');

export const AI_CONFIG = {
  maxTokens: 500,
  temperature: 0.3,
  topP: 1.0,
};
