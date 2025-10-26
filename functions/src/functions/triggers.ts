/**
 * Firestore Triggers
 * Handles automatic processing when documents are created/updated
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { ChatContextService } from "../services/ChatContextService";
import { ConversationChunkService } from "../services/ConversationChunkService";
import { EmbeddingService } from "../services/EmbeddingService";

/**
 * Auto-translate incoming messages when language differs from user preference
 * Triggers automatically when new messages are created
 */
export const autoTranslateMessage = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    
    // Only process text messages from other users
    if (!messageData?.text || 
        messageData.text.trim().length === 0 ||
        messageData.senderId === messageData.userId) { // Skip own messages
      logger.info('Skipping auto-translate - not a text message from other user', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        senderId: messageData?.senderId,
        userId: messageData?.userId
      });
      return;
    }

    try {
      logger.info('Starting auto-translate for incoming message', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        textLength: messageData.text.length,
        senderId: messageData.senderId
      });

      // DISABLE automatic Cloud Function translation
      // Frontend handles translation based on user settings
      logger.info('Skipping auto-translate - handled by frontend', {
        messageId: event.params.messageId,
        chatId: event.params.chatId
      });
      return;

      // NOTE: Code below is disabled - frontend handles translation
      // keeping for reference in case we want to re-enable server-side auto-translate

    } catch (error: any) {
      logger.error('Auto-translate error:', {
        messageId: event.params.messageId,
        chatId: event.params.chatId,
        error: error.message
      });
      // Don't throw - let message exist without translation
    }
  }
);

/**
 * Update chat context on every message
 * Triggers context updates based on message count and mood shifts
 */
export const updateChatContext = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const messageData = event.data?.data();
    const chatId = event.params.chatId;
    const messageId = event.params.messageId;

    // Only process text messages
    if (!messageData?.text || messageData.text.trim().length === 0) {
      logger.info('Skipping context update - no text content', {
        messageId,
        chatId
      });
      return;
    }

    try {
      logger.info('Checking chat context update triggers', {
        messageId,
        chatId
      });

      // Get total message count for this chat
      const messageCount = await admin.firestore()
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .count()
        .get()
        .then(snapshot => snapshot.data().count);

      logger.info('Message count retrieved', {
        chatId,
        messageCount
      });

      // Check update triggers
      let shouldUpdate = false;
      let trigger: 'interval' | 'mood_shift' | 'full' | null = null;

      // Trigger 1: Every 20 messages (incremental update)
      if (messageCount % 20 === 0) {
        shouldUpdate = true;
        trigger = 'interval';
        logger.info('20-message interval trigger activated', {
          chatId,
          messageCount
        });
      }

      // Trigger 2: Every 100 messages (full regeneration)
      if (messageCount % 100 === 0) {
        shouldUpdate = true;
        trigger = 'full';
        logger.info('100-message full regeneration trigger activated', {
          chatId,
          messageCount
        });
      }

      // Trigger 3: Check for mood shift (only if context exists)
      if (!shouldUpdate && messageCount > 5) {
        const currentContext = await ChatContextService.loadContext(chatId);
        
        if (currentContext) {
          // Load last 5 messages
          const recentMessages = await admin.firestore()
            .collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get()
            .then(snapshot => {
              return snapshot.docs.reverse().map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  text: data.text || '',
                  senderName: data.senderName || 'User',
                  senderId: data.senderId || '',
                  timestamp: data.timestamp || 0,
                };
              });
            });

          const moodShifted = await ChatContextService.detectMoodShift(
            recentMessages,
            currentContext.mood
          );

          if (moodShifted) {
            shouldUpdate = true;
            trigger = 'mood_shift';
            logger.info('Mood shift detected', {
              chatId,
              oldMood: currentContext.mood
            });
          }
        }
      }

      // Update context if triggered
      if (shouldUpdate && trigger) {
        logger.info('Updating chat context', {
          chatId,
          trigger,
          messageCount
        });

        await ChatContextService.updateContext(chatId, trigger);

        logger.info('Chat context updated successfully', {
          chatId,
          trigger
        });
      } else {
        logger.info('No context update needed', {
          chatId,
          messageCount
        });
      }

      // Update conversation chunks (background operation)
      // This happens on every 10th message to keep chunks fresh
      if (messageCount % 10 === 0) {
        logger.info('Updating conversation chunks', {
          chatId,
          messageCount
        });

        // Update chunks asynchronously (don't wait)
        ConversationChunkService.updateChunksForNewMessages(chatId, 10)
          .then(() => {
            logger.info('Conversation chunks updated successfully', {
              chatId,
              messageCount
            });
          })
          .catch((error: any) => {
            logger.error('Failed to update conversation chunks (non-blocking)', {
              chatId,
              error: error.message
            });
          });
      }

    } catch (error: any) {
      logger.error('Chat context update error:', {
        messageId,
        chatId,
        error: error.message
      });
      // Don't throw - let message exist without context update
    }
  }
);

/**
 * Firestore Trigger: Auto-generate embeddings for new messages
 * Fires when a message is created in any chat
 */
export const onMessageCreated = onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No snapshot data");
      return;
    }

    const messageData = snapshot.data();
    const messageId = event.params.messageId;
    const chatId = event.params.chatId;

    try {
      // Only generate embeddings for text messages
      if (messageData.type !== "text" || !messageData.text) {
        logger.debug("Skipping non-text message", { messageId, type: messageData.type });
        return;
      }

      // Skip if embedding already exists
      if (messageData.embeddingGenerated || messageData.embedding) {
        logger.debug("Embedding already exists", { messageId });
        return;
      }

      // Skip very short messages (< 3 chars)
      const text = messageData.text.trim();
      if (text.length < 3) {
        logger.debug("Message too short for embedding", { messageId, length: text.length });
        return;
      }

      logger.info("Generating embedding for new message", {
        chatId,
        messageId,
        textLength: text.length,
      });

      // Generate embedding
      const result = await EmbeddingService.generateEmbedding(text);

      // Update message document with embedding
      await admin
        .firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId)
        .update({
          embedding: result.embedding,
          embeddingGenerated: true,
          embeddingGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      logger.info("Embedding generated successfully", {
        chatId,
        messageId,
        dimensions: result.embedding.length,
        tokensUsed: result.usage.total_tokens,
      });
    } catch (error: any) {
      logger.error("Failed to generate embedding", {
        chatId,
        messageId,
        error: error.message,
      });
      // Don't throw - we don't want to fail message creation
    }
  }
);
