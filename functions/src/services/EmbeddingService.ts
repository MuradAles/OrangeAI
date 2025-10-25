/**
 * Embedding Service
 * Handles vector embeddings for semantic search using OpenAI
 */

import * as logger from 'firebase-functions/logger';
import { OpenAI } from 'openai';

// Lazy initialization to avoid issues during deployment
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface SearchResult {
  text: string;
  score: number;
  messageId?: string;
  timestamp?: number;
}

export class EmbeddingService {
  /**
   * Generate embedding for text using OpenAI
   * Uses text-embedding-3-small (1536 dimensions, cheap)
   */
  static async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Skip very short text
      if (!text || text.trim().length < 3) {
        throw new Error('Text too short for embedding');
      }

      logger.info('Generating embedding', { 
        textLength: text.length,
        preview: text.substring(0, 50) 
      });

      const openai = getOpenAIClient();
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      logger.info('Embedding generated successfully', {
        dimensions: embedding.length,
        usage: response.usage,
      });

      return {
        embedding,
        model: response.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          total_tokens: response.usage.total_tokens,
        },
      };
    } catch (error: any) {
      logger.error('Failed to generate embedding', {
        error: error.message,
        textLength: text?.length,
      });
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * Returns value between -1 (opposite) and 1 (identical)
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimensions');
    }

    // Calculate dot product
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);

    // Calculate magnitudes
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    // Avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most semantically similar items from a list
   * @param query - The query text or embedding
   * @param items - Array of items with embeddings to search
   * @param limit - Maximum number of results to return
   * @returns Top matching items sorted by relevance
   */
  static async findSimilar(
    query: string | number[],
    items: { text: string; embedding?: number[]; messageId?: string; timestamp?: number }[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding if string provided
      const queryEmbedding = typeof query === 'string' 
        ? (await this.generateEmbedding(query)).embedding
        : query;

      logger.info('Starting similarity search', {
        queryType: typeof query === 'string' ? 'text' : 'embedding',
        itemCount: items.length,
        limit,
      });

      // Filter items that have embeddings
      const itemsWithEmbeddings = items.filter(item => 
        item.embedding && Array.isArray(item.embedding) && item.embedding.length > 0
      );

      if (itemsWithEmbeddings.length === 0) {
        logger.warn('No items with embeddings found');
        return [];
      }

      // Calculate similarity scores
      const scored = itemsWithEmbeddings.map(item => ({
        text: item.text,
        messageId: item.messageId,
        timestamp: item.timestamp,
        score: this.cosineSimilarity(queryEmbedding, item.embedding!),
      }));

      // Sort by score (highest first) and limit results
      const results = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      logger.info('Similarity search completed', {
        resultsFound: results.length,
        totalItems: itemsWithEmbeddings.length,
        topScore: results[0]?.score,
        bottomScore: results[results.length - 1]?.score,
        avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0,
        allScores: results.map(r => ({ score: r.score, text: r.text.substring(0, 30) })),
      });

      // Return ALL results for debugging (remove threshold)
      return results;
    } catch (error: any) {
      logger.error('Similarity search failed', {
        error: error.message,
        itemCount: items.length,
      });
      throw new Error(`Similarity search failed: ${error.message}`);
    }
  }

  /**
   * Batch generate embeddings for multiple texts
   * More efficient than individual calls
   */
  static async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Filter out empty/short texts
      const validTexts = texts.filter(t => t && t.trim().length >= 3);

      if (validTexts.length === 0) {
        return [];
      }

      logger.info('Batch generating embeddings', { 
        count: validTexts.length 
      });

      const openai = getOpenAIClient();
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: validTexts,
        encoding_format: 'float',
      });

      const embeddings = response.data.map(d => d.embedding);

      logger.info('Batch embeddings generated', {
        count: embeddings.length,
        usage: response.usage,
      });

      return embeddings;
    } catch (error: any) {
      logger.error('Batch embedding generation failed', {
        error: error.message,
        textCount: texts.length,
      });
      throw new Error(`Batch embedding failed: ${error.message}`);
    }
  }
}

