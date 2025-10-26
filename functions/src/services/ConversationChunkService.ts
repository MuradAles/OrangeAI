/**
 * ConversationChunkService
 * 
 * Creates overlapping chunks of conversations for better semantic search.
 * Uses sliding window approach: chunks of 10 messages with 5-message overlap.
 * 
 * Example:
 * Messages 1-50 becomes:
 * - Chunk 1: Messages 1-10
 * - Chunk 2: Messages 6-15
 * - Chunk 3: Messages 11-20
 * - Chunk 4: Messages 16-25
 * ... and so on
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { EmbeddingService } from './EmbeddingService';

const CHUNK_SIZE = 10; // Number of messages per chunk
const OVERLAP = 5; // Number of messages to overlap between chunks

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface ConversationChunk {
  chatId: string;
  chunkIndex: number;
  messageIds: string[];
  messages: {
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
  }[];
  fullText: string; // Formatted text for embedding
  startTimestamp: number;
  endTimestamp: number;
  embedding?: number[];
  embeddingGenerated: boolean;
  createdAt: number;
  updatedAt: number;
}

export class ConversationChunkService {
  /**
   * Generate chunks for a specific chat
   * This is the main entry point for chunking conversations
   */
  static async generateChunksForChat(chatId: string): Promise<number> {
    try {
      logger.info('Starting chunk generation', { chatId });

      // Get all messages for this chat (ordered by timestamp)
      const messages = await this.loadMessages(chatId);

      if (messages.length < 3) {
        logger.info('Not enough messages to chunk', { 
          chatId, 
          messageCount: messages.length 
        });
        return 0;
      }

      // Create overlapping chunks
      const chunks = this.createSlidingWindowChunks(chatId, messages);

      logger.info('Created chunks', { 
        chatId, 
        chunkCount: chunks.length,
        messageCount: messages.length 
      });

      // Store chunks in Firestore with embeddings
      let chunksCreated = 0;
      for (const chunk of chunks) {
        try {
          // Generate embedding for this chunk
          const embeddingResult = await EmbeddingService.generateEmbedding(
            chunk.fullText
          );

          chunk.embedding = embeddingResult.embedding;
          chunk.embeddingGenerated = true;

          // Store in Firestore
          await admin
            .firestore()
            .collection('chats')
            .doc(chatId)
            .collection('conversationChunks')
            .doc(`chunk_${chunk.chunkIndex}`)
            .set(chunk);

          chunksCreated++;

          logger.info('Chunk created', { 
            chatId, 
            chunkIndex: chunk.chunkIndex,
            messageCount: chunk.messages.length 
          });
        } catch (error: any) {
          logger.error('Failed to create chunk', {
            chatId,
            chunkIndex: chunk.chunkIndex,
            error: error.message,
          });
        }
      }

      logger.info('Chunk generation completed', { 
        chatId, 
        chunksCreated 
      });

      return chunksCreated;
    } catch (error: any) {
      logger.error('Failed to generate chunks for chat', {
        chatId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update chunks when new messages arrive
   * Only regenerates the last few chunks to save resources
   */
  static async updateChunksForNewMessages(
    chatId: string,
    newMessageCount: number = 1
  ): Promise<void> {
    try {
      logger.info('Updating chunks for new messages', { 
        chatId, 
        newMessageCount 
      });

      // Get total message count
      const totalMessages = await this.getMessageCount(chatId);

      if (totalMessages < 3) {
        logger.info('Not enough messages to chunk', { chatId, totalMessages });
        return;
      }

      // Determine which chunks need updating
      // If we have 50 messages and add 1 new message, we need to update the last 2-3 chunks
      const chunksToUpdate = Math.ceil((CHUNK_SIZE + newMessageCount) / (CHUNK_SIZE - OVERLAP));

      // Get the last N messages to recreate affected chunks
      const messagesToLoad = chunksToUpdate * CHUNK_SIZE;
      const messages = await this.loadMessages(chatId, messagesToLoad);

      if (messages.length < 3) {
        return;
      }

      // Calculate starting chunk index
      const startChunkIndex = Math.max(
        0,
        Math.floor((totalMessages - messagesToLoad) / (CHUNK_SIZE - OVERLAP))
      );

      // Create chunks for these messages
      const chunks = this.createSlidingWindowChunks(
        chatId, 
        messages,
        startChunkIndex
      );

      // Update/create chunks
      for (const chunk of chunks) {
        try {
          // Generate embedding
          const embeddingResult = await EmbeddingService.generateEmbedding(
            chunk.fullText
          );

          chunk.embedding = embeddingResult.embedding;
          chunk.embeddingGenerated = true;

          // Update in Firestore
          await admin
            .firestore()
            .collection('chats')
            .doc(chatId)
            .collection('conversationChunks')
            .doc(`chunk_${chunk.chunkIndex}`)
            .set(chunk, { merge: true });

          logger.info('Chunk updated', { 
            chatId, 
            chunkIndex: chunk.chunkIndex 
          });
        } catch (error: any) {
          logger.error('Failed to update chunk', {
            chatId,
            chunkIndex: chunk.chunkIndex,
            error: error.message,
          });
        }
      }

      logger.info('Chunks updated successfully', { 
        chatId, 
        chunksUpdated: chunks.length 
      });
    } catch (error: any) {
      logger.error('Failed to update chunks', {
        chatId,
        error: error.message,
      });
      // Don't throw - this is a background operation
    }
  }

  /**
   * Create sliding window chunks from messages
   */
  private static createSlidingWindowChunks(
    chatId: string,
    messages: Message[],
    startIndex: number = 0
  ): ConversationChunk[] {
    const chunks: ConversationChunk[] = [];
    const stride = CHUNK_SIZE - OVERLAP; // Step size between chunks

    for (let i = 0; i < messages.length; i += stride) {
      const chunkMessages = messages.slice(i, i + CHUNK_SIZE);

      // Need at least 3 messages for a meaningful chunk
      if (chunkMessages.length < 3) {
        break;
      }

      const chunkIndex = startIndex + Math.floor(i / stride);

      // Format messages as conversation
      const fullText = this.formatChunkText(chunkMessages);

      const chunk: ConversationChunk = {
        chatId,
        chunkIndex,
        messageIds: chunkMessages.map(m => m.id),
        messages: chunkMessages.map(m => ({
          senderId: m.senderId,
          senderName: m.senderName,
          text: m.text,
          timestamp: m.timestamp,
        })),
        fullText,
        startTimestamp: chunkMessages[0].timestamp,
        endTimestamp: chunkMessages[chunkMessages.length - 1].timestamp,
        embeddingGenerated: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Format chunk messages as readable conversation text
   * This is what gets embedded
   */
  private static formatChunkText(messages: Message[]): string {
    return messages
      .map(m => `${m.senderName}: ${m.text}`)
      .join('\n');
  }

  /**
   * Load messages from Firestore
   */
  private static async loadMessages(
    chatId: string,
    limit?: number
  ): Promise<Message[]> {
    try {
      let query = admin
        .firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc'); // Oldest to newest for chunking

      if (limit) {
        // Get the last N messages
        const allMessages = await query.get();
        const startIndex = Math.max(0, allMessages.size - limit);
        query = query.offset(startIndex).limit(limit);
      }

      const snapshot = await query.get();

      const messages: Message[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'User',
            timestamp: data.timestamp || 0,
          };
        })
        .filter((m) => m.text.trim().length > 0); // Only text messages

      return messages;
    } catch (error: any) {
      logger.error('Failed to load messages', {
        chatId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get total message count for a chat
   */
  private static async getMessageCount(chatId: string): Promise<number> {
    try {
      const snapshot = await admin
        .firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .count()
        .get();

      return snapshot.data().count;
    } catch (error: any) {
      logger.error('Failed to get message count', {
        chatId,
        error: error.message,
      });
      return 0;
    }
  }

  /**
   * Delete all chunks for a chat (useful for regeneration)
   */
  static async deleteChunksForChat(chatId: string): Promise<void> {
    try {
      const snapshot = await admin
        .firestore()
        .collection('chats')
        .doc(chatId)
        .collection('conversationChunks')
        .get();

      const batch = admin.firestore().batch();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info('Deleted all chunks', { 
        chatId, 
        count: snapshot.size 
      });
    } catch (error: any) {
      logger.error('Failed to delete chunks', {
        chatId,
        error: error.message,
      });
    }
  }
}

