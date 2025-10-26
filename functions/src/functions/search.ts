/**
 * Search Functions
 * Handles semantic search, embeddings, and RAG functionality
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ConversationChunkService } from "../services/ConversationChunkService";
import { EmbeddingService } from "../services/EmbeddingService";

/**
 * Search messages across all user's chats
 * Global semantic search powered by RAG
 */
export const searchAllChats = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { query, limit = 20 } = request.data;

      // Validate query
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        throw new HttpsError(
          "invalid-argument",
          "Query must be at least 2 characters"
        );
      }

      logger.info("Global search across all chats", {
        userId: request.auth.uid,
        query,
        limit,
      });

      // Get all user's chats
      const userChatsSnapshot = await admin
        .firestore()
        .collection("chats")
        .where("participants", "array-contains", request.auth.uid)
        .get();

      if (userChatsSnapshot.empty) {
        logger.info("No chats found for user", { userId: request.auth.uid });
        return {
          success: true,
          results: [],
          message: "No chats found",
        };
      }

      const chatIds = userChatsSnapshot.docs.map(doc => doc.id);
      logger.info("Searching across chats", {
        userId: request.auth.uid,
        chatCount: chatIds.length,
      });

      // Search each chat in parallel
      const searchPromises = chatIds.map(async (chatId) => {
        try {
          // Get chat info
          const chatDoc = userChatsSnapshot.docs.find(d => d.id === chatId);
          const chatData = chatDoc?.data();

          // Get proper chat name
          let chatName = "Unknown Chat";
          const currentUserId = request.auth!.uid;
          
          if (chatData?.isGroup) {
            // For groups, use group name
            chatName = chatData.name || "Unnamed Group";
          } else if (chatData?.participants && Array.isArray(chatData.participants)) {
            // For 1-on-1, get other participant's name
            const otherUserId = chatData.participants.find((id: string) => id !== currentUserId);
            if (otherUserId) {
              try {
                const userDoc = await admin.firestore().collection("users").doc(otherUserId).get();
                const userData = userDoc.data();
                chatName = userData?.displayName || userData?.username || "Unknown User";
              } catch {
                logger.warn("Could not fetch user data", { userId: otherUserId });
                chatName = "Unknown User";
              }
            }
          }

          // Load messages with embeddings from this chat
          const messagesSnapshot = await admin
            .firestore()
            .collection("chats")
            .doc(chatId)
            .collection("messages")
            .where("embeddingGenerated", "==", true)
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();

          logger.info("Messages loaded for search", {
            chatId,
            messagesWithEmbeddings: messagesSnapshot.size,
          });

          if (messagesSnapshot.empty) {
            logger.warn("No messages with embeddings in chat", { chatId });
            return null;
          }

          const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              chatId,
              text: data.text || '',
              embedding: data.embedding as number[] | undefined,
              timestamp: data.timestamp || 0,
            };
          });

          // Perform semantic search on this chat
          const results = await EmbeddingService.findSimilar(
            query,
            messages.map(m => ({
              text: m.text,
              embedding: m.embedding,
              messageId: m.id,
              timestamp: m.timestamp,
            })),
            5  // Top 5 per chat
          );

          logger.info("Search results for chat", {
            chatId,
            resultsFound: results.length,
            topScore: results[0]?.score,
            topText: results[0]?.text?.substring(0, 50),
          });

          if (results.length === 0) {
            return null;
          }

          // Return chat info with results
          return {
            chatId,
            chatName,
            isGroup: chatData?.isGroup || false,
            results: results.map(r => ({
              messageId: r.messageId,
              text: r.text,
              score: r.score,
              timestamp: r.timestamp,
            })),
          };
        } catch (chatError: any) {
          logger.error("Error searching chat", {
            chatId,
            error: chatError.message,
          });
          return null;
        }
      });

      // Wait for all searches to complete
      const allResults = await Promise.all(searchPromises);

      // Filter out nulls and sort by best match
      const validResults = allResults
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map(chat => ({
          ...chat,
          bestScore: Math.max(...chat.results.map(r => r.score)),
        }))
        .sort((a, b) => b.bestScore - a.bestScore);

      logger.info("Global search completed", {
        userId: request.auth.uid,
        chatsSearched: chatIds.length,
        chatsWithResults: validResults.length,
        totalMatches: validResults.reduce((sum, r) => sum + r.results.length, 0),
      });

      return {
        success: true,
        results: validResults,
        chatsSearched: chatIds.length,
        message: `Found matches in ${validResults.length} chats`,
      };
    } catch (error: any) {
      logger.error("Global search error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to search messages",
        error.message
      );
    }
  }
);

/**
 * Generate embeddings for recent messages in a chat
 * Used for RAG (semantic search) in chat summarization
 * 
 * Generates embeddings for the last 50 messages (if not already generated)
 */
export const generateChatEmbeddings = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { chatId, limit = 50 } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      logger.info("Generating embeddings for chat", {
        chatId,
        limit,
        userId: request.auth.uid,
      });

      // Get recent messages without embeddings
      const messagesRef = admin
        .firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .where("type", "==", "text") // Only text messages
        .orderBy("timestamp", "desc")
        .limit(limit);

      const snapshot = await messagesRef.get();

      if (snapshot.empty) {
        logger.info("No messages found in chat", { chatId });
        return {
          success: true,
          generated: 0,
          skipped: 0,
          message: "No messages found",
        };
      }

      let generated = 0;
      let skipped = 0;

      // Process messages in batches
      const batch = admin.firestore().batch();

      for (const doc of snapshot.docs) {
        const message = doc.data();

        // Skip if embedding already exists
        if (message.embeddingGenerated) {
          skipped++;
          continue;
        }

        // Skip if message text is too short
        if (!message.text || message.text.trim().length < 3) {
          skipped++;
          continue;
        }

        try {
          // Generate embedding
          const result = await EmbeddingService.generateEmbedding(message.text);

          // Update message with embedding
          batch.update(doc.ref, {
            embedding: result.embedding,
            embeddingGenerated: true,
            embeddingGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          generated++;

          logger.info("Generated embedding for message", {
            messageId: doc.id,
            textLength: message.text.length,
            dimensions: result.embedding.length,
          });
        } catch (error: any) {
          logger.error("Failed to generate embedding for message", {
            messageId: doc.id,
            error: error.message,
          });
          // Continue with other messages
          skipped++;
        }
      }

      // Commit batch updates
      if (generated > 0) {
        await batch.commit();
        logger.info("Batch committed embeddings", {
          chatId,
          generated,
        });
      }

      return {
        success: true,
        generated,
        skipped,
        message: `Generated ${generated} embeddings, skipped ${skipped}`,
      };
    } catch (error: any) {
      logger.error("Generate embeddings error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to generate embeddings",
        error.message
      );
    }
  }
);

/**
 * Generate conversation chunks for a chat
 * Creates overlapping chunks of conversations for better semantic search
 */
export const generateConversationChunks = onCall(
  {
    invoker: "public",
  },
  async (request) => {
    try {
      // Check authentication
      if (!request.auth) {
        throw new HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { chatId } = request.data;

      // Validate required parameters
      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      logger.info("Generating conversation chunks", {
        chatId,
        userId: request.auth.uid,
      });

      // Verify user has access to this chat
      const chatDoc = await admin
        .firestore()
        .collection("chats")
        .doc(chatId)
        .get();

      if (!chatDoc.exists) {
        throw new HttpsError("not-found", "Chat not found");
      }

      const chatData = chatDoc.data();
      if (
        !chatData?.participants ||
        !chatData.participants.includes(request.auth.uid)
      ) {
        throw new HttpsError(
          "permission-denied",
          "User does not have access to this chat"
        );
      }

      // Generate chunks
      const chunksCreated = await ConversationChunkService.generateChunksForChat(
        chatId
      );

      logger.info("Conversation chunks generated successfully", {
        chatId,
        chunksCreated,
      });

      return {
        success: true,
        chunksCreated,
        message: `Generated ${chunksCreated} conversation chunks`,
      };
    } catch (error: any) {
      logger.error("Generate conversation chunks error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Failed to generate conversation chunks",
        error.message
      );
    }
  }
);
