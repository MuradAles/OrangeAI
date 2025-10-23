import { MessageService } from '@/services/firebase/MessageService';
import { MessageStatus, MessageType } from '@/shared/types';
import type { QueuedMessage as ImportedQueuedMessage } from '@/shared/types/Message';
import { SQLiteService } from './SQLiteService';

/**
 * MessageQueue
 * 
 * Handles offline message queue with automatic retry logic
 * Features:
 * - FIFO processing (first sent, first uploaded)
 * - Auto-retry up to 3 times per message
 * - Persistent queue in SQLite
 * - Background processing when online
 */

type QueuedMessage = ImportedQueuedMessage;

export interface QueueProcessResult {
  success: number;
  failed: number;
  total: number;
}

class MessageQueueClass {
  private isProcessing: boolean = false;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 seconds between retries

  /**
   * Get all pending messages from queue
   * Returns messages ordered by timestamp (FIFO)
   */
  async getPendingMessages(): Promise<QueuedMessage[]> {
    try {
      const messages = await SQLiteService.getPendingMessages();
      
      // Map to QueuedMessage format with retry metadata
      return messages.map(msg => ({
        ...msg,
        status: msg.status as MessageStatus,
        type: msg.type as MessageType,
        reactions: undefined,
        deletedForEveryone: undefined,
        retryCount: 0, // Will be tracked during processing
        lastAttempt: null,
      } as QueuedMessage));
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  /**
   * Process message queue
   * Upload all pending messages to Firestore
   * Returns summary of successes and failures
   */
  async processQueue(): Promise<QueueProcessResult> {
    if (this.isProcessing) {
      console.log('Queue already processing');
      return { success: 0, failed: 0, total: 0 };
    }

    this.isProcessing = true;
    console.log('🔄 Starting message queue processing...');

    try {
      const pendingMessages = await this.getPendingMessages();
      
      if (pendingMessages.length === 0) {
        console.log('✅ No messages in queue');
        return { success: 0, failed: 0, total: 0 };
      }

      console.log(`📤 Processing ${pendingMessages.length} queued messages`);

      let successCount = 0;
      let failedCount = 0;

      // Process messages in FIFO order
      for (const message of pendingMessages) {
        const success = await this.uploadMessage(message);
        
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      console.log(`✅ Queue processing complete: ${successCount} sent, ${failedCount} failed`);

      return {
        success: successCount,
        failed: failedCount,
        total: pendingMessages.length,
      };
    } catch (error) {
      console.error('Error processing message queue:', error);
      return { success: 0, failed: 0, total: 0 };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Upload single message with retry logic
   * Returns true if successful, false if all retries failed
   */
  private async uploadMessage(message: QueuedMessage): Promise<boolean> {
    let attempts = 0;

    while (attempts < this.maxRetries) {
      attempts++;
      
      try {
        console.log(`⬆️ Uploading message ${message.id} (attempt ${attempts}/${this.maxRetries})`);

        // Upload to Firestore
        if (message.type === 'text') {
          await MessageService.sendMessage(message.chatId, message.senderId, message.text || '');
        } else if (message.type === 'image') {
          // Image messages already uploaded (images are uploaded before queuing)
          // Just update message document in Firestore
          await MessageService.sendImageMessage(
            message.chatId,
            message.senderId,
            message.imageUrl!,
            message.thumbnailUrl!,
            message.caption || undefined
          );
        }

        // Update SQLite: mark as synced
        await SQLiteService.updateMessageStatus(message.id, 'sent');
        
        console.log(`✅ Message ${message.id} uploaded successfully`);
        return true;

      } catch (error) {
        console.error(`❌ Upload attempt ${attempts} failed:`, error);

        // Wait before retry (except on last attempt)
        if (attempts < this.maxRetries) {
          await this.delay(this.retryDelay);
        }
      }
    }

    // All retries failed - mark as failed
    console.error(`❌ Message ${message.id} failed after ${this.maxRetries} attempts`);
    
    try {
      // Update SQLite: mark as failed
      await SQLiteService.updateMessageStatus(message.id, 'failed');
    } catch (error) {
      console.error('Error updating message status to failed:', error);
    }

    return false;
  }

  /**
   * Retry single failed message
   * Called when user taps "Retry" button
   */
  async retryMessage(messageId: string): Promise<boolean> {
    try {
      console.log(`🔄 Retrying message ${messageId}`);

      const message = await SQLiteService.getMessageById(messageId);
      
      if (!message) {
        console.error('Message not found');
        return false;
      }

      // Reset status to pending
      await SQLiteService.updateMessageStatus(messageId, 'sending');

      // Upload message
      const queuedMessage: QueuedMessage = {
        ...message,
        status: message.status as MessageStatus,
        type: message.type as MessageType,
        reactions: undefined,
        deletedForEveryone: undefined,
        retryCount: 0,
        lastAttempt: null,
      } as QueuedMessage;

      const success = await this.uploadMessage(queuedMessage);

      if (success) {
        console.log(`✅ Message ${messageId} retry successful`);
      } else {
        console.log(`❌ Message ${messageId} retry failed`);
      }

      return success;
    } catch (error) {
      console.error('Error retrying message:', error);
      return false;
    }
  }

  /**
   * Get count of pending messages
   */
  async getPendingCount(): Promise<number> {
    try {
      const messages = await SQLiteService.getPendingMessages();
      return messages.length;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Get count of failed messages
   */
  async getFailedCount(): Promise<number> {
    try {
      // Get all pending messages and filter for failed ones
      const pendingMessages = await SQLiteService.getPendingMessages();
      const count = pendingMessages.filter((msg: any) => msg.status === 'failed').length;
      
      return count;
    } catch (error) {
      console.error('Error getting failed count:', error);
      return 0;
    }
  }

  /**
   * Clear all failed messages
   * Used after user acknowledges failures
   */
  async clearFailedMessages(): Promise<void> {
    try {
      // Get all pending messages and filter for failed ones
      const pendingMessages = await SQLiteService.getPendingMessages();
      const failedIds = pendingMessages.filter((msg: any) => msg.status === 'failed').map((msg: any) => msg.id);
      
      // Delete failed messages (note: we don't have userId here, so we'll skip deletion for now)
      // TODO: Implement proper bulk delete in SQLiteService
      
      console.log(`⚠️ Found ${failedIds.length} failed messages (deletion not implemented)`);
    } catch (error) {
      console.error('Error clearing failed messages:', error);
    }
  }

  /**
   * Check if processing is active
   */
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const MessageQueue = new MessageQueueClass();

