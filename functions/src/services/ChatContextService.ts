/**
 * Chat Context Service
 * Manages per-chat context with mood and topic tracking
 * Replaces per-message embeddings with smart, efficient summaries
 */

import { generateText } from 'ai';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { aiModel } from '../config/ai-sdk.config';
import {
  ChatContext,
  ContextGenerationMode,
  ContextGenerationResult,
  ContextUpdateTrigger,
  Message,
  UpdateHistoryEntry,
} from '../shared/types/ChatContext';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

export class ChatContextService {
  /**
   * Load chat context from Firestore
   */
  static async loadContext(chatId: string): Promise<ChatContext | null> {
    try {
      logger.info('Loading chat context', { chatId });

      const contextDoc = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('metadata')
        .doc('context')
        .get();

      if (!contextDoc.exists) {
        logger.info('No context found for chat', { chatId });
        return null;
      }

      const context = contextDoc.data() as ChatContext;
      
      logger.info('Chat context loaded successfully', {
        chatId,
        messageCount: context.messageCount,
        topics: context.topics,
        mood: context.mood,
      });

      return context;
    } catch (error: any) {
      logger.error('Failed to load chat context', {
        chatId,
        error: error.message,
      });
      throw new Error(`Failed to load context: ${error.message}`);
    }
  }

  /**
   * Save chat context to Firestore
   */
  static async saveContext(chatId: string, context: ChatContext): Promise<void> {
    try {
      logger.info('Saving chat context', {
        chatId,
        messageCount: context.messageCount,
        topics: context.topics,
        mood: context.mood,
      });

      await firestore
        .collection('chats')
        .doc(chatId)
        .collection('metadata')
        .doc('context')
        .set(context, { merge: true });

      logger.info('Chat context saved successfully', { chatId });
    } catch (error: any) {
      logger.error('Failed to save chat context', {
        chatId,
        error: error.message,
      });
      throw new Error(`Failed to save context: ${error.message}`);
    }
  }

  /**
   * Update chat context based on trigger
   */
  static async updateContext(
    chatId: string,
    trigger: ContextUpdateTrigger
  ): Promise<ChatContext> {
    try {
      logger.info('Updating chat context', { chatId, trigger });

      // Load current context
      const currentContext = await this.loadContext(chatId);

      // Determine mode and message count
      let mode: ContextGenerationMode;
      let messagesToAnalyze: number;

      if (trigger === 'full') {
        mode = 'full';
        messagesToAnalyze = 500; // Analyze last 500 messages
      } else if (trigger === 'mood_shift') {
        mode = 'incremental';
        messagesToAnalyze = 20; // Analyze last 20 for mood shift
      } else {
        // interval (every 20 messages)
        mode = 'incremental';
        messagesToAnalyze = 20;
      }

      // Load messages
      const messages = await this.loadMessages(chatId, messagesToAnalyze);

      if (messages.length === 0) {
        logger.warn('No messages to analyze', { chatId });
        throw new Error('No messages found for context generation');
      }

      // Generate context
      const newContext = await this.generateContext(
        messages,
        mode,
        currentContext || undefined
      );

      // Build update history entry
      const updateEntry: UpdateHistoryEntry = {
        timestamp: Date.now(),
        trigger,
        messagesAnalyzed: messages.length,
      };

      // Get message count from Firestore
      const messageCount = await this.getMessageCount(chatId);

      // Build full context object
      const fullContext: ChatContext = {
        chatId,
        topics: newContext.topics,
        mood: newContext.mood,
        relationship: newContext.relationship,
        formality: newContext.formality,
        summary: newContext.summary,
        messageCount,
        lastUpdated: Date.now(),
        lastMoodShift: trigger === 'mood_shift' ? Date.now() : (currentContext?.lastMoodShift || Date.now()),
        updateHistory: [
          ...(currentContext?.updateHistory || []).slice(-9), // Keep last 9
          updateEntry,
        ],
      };

      // Save to Firestore
      await this.saveContext(chatId, fullContext);

      logger.info('Chat context updated successfully', {
        chatId,
        trigger,
        messageCount,
        topics: fullContext.topics,
        mood: fullContext.mood,
      });

      return fullContext;
    } catch (error: any) {
      logger.error('Failed to update chat context', {
        chatId,
        trigger,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate context from messages using AI
   */
  static async generateContext(
    messages: Message[],
    mode: ContextGenerationMode,
    currentContext?: ChatContext
  ): Promise<ContextGenerationResult> {
    try {
      logger.info('Generating context', {
        mode,
        messageCount: messages.length,
        hasCurrentContext: !!currentContext,
      });

      let prompt: string;

      if (mode === 'incremental' && currentContext) {
        prompt = this.buildIncrementalPrompt(messages, currentContext);
      } else {
        prompt = this.buildFullPrompt(messages);
      }

      const { text: response } = await generateText({
        model: aiModel,
        prompt,
        temperature: 0.3, // Balanced for consistency and creativity
      });

      // Parse JSON response
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      const result: ContextGenerationResult = JSON.parse(cleanResponse);

      logger.info('Context generated successfully', {
        mode,
        topics: result.topics,
        mood: result.mood,
        relationship: result.relationship,
      });

      return result;
    } catch (error: any) {
      logger.error('Context generation failed', {
        mode,
        error: error.message,
      });
      throw new Error(`Context generation failed: ${error.message}`);
    }
  }

  /**
   * Detect if mood has shifted significantly
   */
  static async detectMoodShift(
    recentMessages: Message[],
    currentMood: string
  ): Promise<boolean> {
    try {
      logger.info('Detecting mood shift', {
        currentMood,
        messageCount: recentMessages.length,
      });

      const messagesText = recentMessages
        .map((m) => `- ${m.senderName}: ${m.text}`)
        .join('\n');

      const prompt = `Current mood: "${currentMood}"

Recent messages:
${messagesText}

Has the mood significantly changed from "${currentMood}"?

Examples of mood shifts:
- Casual/playful → Serious/emotional
- Friendly → Angry/frustrated
- Formal → Casual
- Light topics → Heavy topics

Respond with ONLY "true" or "false" (lowercase, no quotes).`;

      const { text: response } = await generateText({
        model: aiModel,
        prompt,
        temperature: 0.1, // Low temperature for consistent detection
      });

      const moodShifted = response.trim().toLowerCase() === 'true';

      logger.info('Mood shift detection completed', {
        currentMood,
        moodShifted,
      });

      return moodShifted;
    } catch (error: any) {
      logger.error('Mood shift detection failed', {
        currentMood,
        error: error.message,
      });
      return false; // Default to no shift on error
    }
  }

  /**
   * Generate user-facing summary
   */
  static async generateUserSummary(chatId: string): Promise<string> {
    try {
      logger.info('Generating user summary', { chatId });

      const context = await this.loadContext(chatId);

      // If no context exists yet (< 20 messages), generate summary from messages directly
      if (!context) {
        logger.info('No context available, generating summary from messages', { chatId });
        
        // Load all messages from the chat
        const messagesRef = firestore
          .collection('chats')
          .doc(chatId)
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(50); // Last 50 messages max
        
        const snapshot = await messagesRef.get();
        
        if (snapshot.empty) {
          return "No messages yet! Start chatting to generate a summary.";
        }

        const messages = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Message))
          .reverse(); // Chronological order

        const messagesText = messages
          .map(m => `- ${m.senderName}: ${m.text}`)
          .join('\n');

        const prompt = `Generate a user-friendly chat summary from these messages.

MESSAGES (${messages.length} total):
${messagesText}

Create a friendly summary in this format:

📚 Main Topics:
• [topic 1]
• [topic 2]
• [topic 3]

📝 Summary:
[2-3 sentence summary of the conversation]

💬 Conversation Style:
[Description of the mood and tone]

Keep it concise and user-friendly.`;

        const { text: summary } = await generateText({
          model: aiModel,
          prompt,
          temperature: 0.5,
        });

        return summary.trim();
      }

      // Context exists - generate summary from context
      const prompt = `Generate a user-friendly chat summary based on this context.

Topics: ${context.topics.join(', ')}
Mood: ${context.mood}
Relationship: ${context.relationship}
Summary: ${context.summary}

Create a friendly summary in this format:

📚 Main Topics:
• [topic 1]
• [topic 2]
• [topic 3]

📝 Summary:
[2-3 sentence summary of the conversation]

💬 Conversation Style:
[Description of the mood and tone]

Keep it concise and user-friendly.`;

      const { text: summary } = await generateText({
        model: aiModel,
        prompt,
        temperature: 0.5, // Higher for more natural summaries
      });

      logger.info('User summary generated', { chatId });

      return summary.trim();
    } catch (error: any) {
      logger.error('Failed to generate user summary', {
        chatId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build prompt for incremental context update
   */
  private static buildIncrementalPrompt(
    recentMessages: Message[],
    currentContext: ChatContext
  ): string {
    const messagesText = recentMessages
      .map((m) => `- ${m.senderName}: ${m.text}`)
      .join('\n');

    return `Analyze these recent messages and update the chat context.

CURRENT CONTEXT:
- Mood: ${currentContext.mood}
- Topics: ${currentContext.topics.join(', ')}
- Relationship: ${currentContext.relationship}
- Formality: ${currentContext.formality}
- Summary: ${currentContext.summary}

RECENT MESSAGES (last ${recentMessages.length}):
${messagesText}

Update the context:
1. Are there new topics? Add them to topics array
2. Has the mood shifted? Update mood description
3. Update summary to reflect new information
4. Keep existing topics if still relevant

Respond with ONLY a JSON object in this exact format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "mood": "mood description",
  "relationship": "relationship type",
  "formality": "formality level",
  "summary": "updated summary (2-3 sentences)"
}`;
  }

  /**
   * Build prompt for full context regeneration
   */
  private static buildFullPrompt(messages: Message[]): string {
    const messagesText = messages
      .map((m) => `- ${m.senderName}: ${m.text}`)
      .join('\n');

    return `Analyze this entire conversation and generate comprehensive context.

ALL MESSAGES (${messages.length} messages):
${messagesText}

Generate context:
1. Main topics discussed (top 5-7 topics)
2. Overall mood and tone
3. Relationship between participants
4. Formality level
5. Comprehensive summary

Respond with ONLY a JSON object in this exact format:
{
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "mood": "detailed mood description (e.g., 'playful, casual, friendly with some serious moments')",
  "relationship": "relationship type (e.g., 'close friends', 'colleagues', 'family')",
  "formality": "formality level (e.g., 'very casual', 'neutral', 'formal')",
  "summary": "comprehensive summary in 2-3 sentences"
}`;
  }

  /**
   * Load messages from Firestore
   */
  private static async loadMessages(
    chatId: string,
    limit: number
  ): Promise<Message[]> {
    try {
      const snapshot = await firestore
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      const messages: Message[] = snapshot.docs
        .reverse() // Oldest to newest
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || '',
            senderName: data.senderName || 'User',
            senderId: data.senderId || '',
            timestamp: data.timestamp || 0,
          };
        })
        .filter((m) => m.text.trim().length > 0); // Only text messages

      return messages;
    } catch (error: any) {
      logger.error('Failed to load messages', {
        chatId,
        limit,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get total message count for chat
   */
  private static async getMessageCount(chatId: string): Promise<number> {
    try {
      const snapshot = await firestore
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
}

