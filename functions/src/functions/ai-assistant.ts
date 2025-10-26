/**
 * AI Assistant Functions
 * Handles AI Assistant and Smart Reply functionality
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { EmbeddingService } from "../services/EmbeddingService";

/**
 * AI Assistant - Natural language chat interface
 * Searches messages semantically and generates helpful answers
 * Callable from React Native app
 */
export const aiAssistant = onCall(
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

      const { query, conversationHistory = [] } = request.data;
      const userId = request.auth.uid;
      const userEmail = request.auth.token.email || "Unknown User";
      const userName = request.auth.token.name || userEmail.split('@')[0] || "User";

      // Validate query
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        throw new HttpsError(
          "invalid-argument",
          "Query must be at least 2 characters"
        );
      }

      logger.info("AI Assistant query", {
        userId,
        query: query.slice(0, 100),
        historyLength: conversationHistory.length,
      });

      // Step 1: Use semantic search to find relevant CONVERSATION CHUNKS
      const searchResults: any = await admin
        .firestore()
        .collection("chats")
        .where("participants", "array-contains", userId)
        .get()
        .then(async (chatsSnapshot) => {
          if (chatsSnapshot.empty) {
            return [];
          }

          const chatIds = chatsSnapshot.docs.map(doc => doc.id);
          
          // Search across all chats for conversation chunks
          const allResults: any[] = [];
          
          for (const chatId of chatIds) {
            try {
              // Get chat info
              const chatDoc = chatsSnapshot.docs.find(d => d.id === chatId);
              const chatData = chatDoc?.data();
              
              // Get chat name
              let chatName = "Unknown Chat";
              if (chatData?.isGroup) {
                chatName = chatData.name || "Unnamed Group";
              } else if (chatData?.participants && Array.isArray(chatData.participants)) {
                const otherUserId = chatData.participants.find((id: string) => id !== userId);
                if (otherUserId) {
                  try {
                    const userDoc = await admin.firestore().collection("users").doc(otherUserId).get();
                    const userData = userDoc.data();
                    chatName = userData?.displayName || userData?.username || "Unknown User";
                  } catch {
                    chatName = "Unknown User";
                  }
                }
              }
              
              // Get conversation chunks with embeddings
              const chunksSnapshot = await admin
                .firestore()
                .collection("chats")
                .doc(chatId)
                .collection("conversationChunks")
                .where("embeddingGenerated", "==", true)
                .get();

              // If no chunks exist, fall back to individual messages (legacy support)
              if (chunksSnapshot.empty) {
                logger.info("No chunks found for chat, falling back to messages", { chatId });
                
                const messagesSnapshot = await admin
                  .firestore()
                  .collection("chats")
                  .doc(chatId)
                  .collection("messages")
                  .where("embeddingGenerated", "==", true)
                  .orderBy("timestamp", "desc")
                  .limit(30)
                  .get();

                if (messagesSnapshot.empty) continue;

                // Generate query embedding
                const queryEmbedding = await EmbeddingService.generateEmbedding(query);

                // Compare with message embeddings (legacy)
                const messages = messagesSnapshot.docs.map(doc => {
                  const data: any = doc.data();
                  return {
                    id: doc.id,
                    text: data.text,
                    timestamp: data.timestamp,
                    senderId: data.senderId,
                    embedding: data.embedding,
                  };
                });

                for (const message of messages) {
                  if (!message.embedding) continue;
                  
                  const similarity = EmbeddingService.cosineSimilarity(
                    queryEmbedding.embedding,
                    message.embedding
                  );

                  // Lowered threshold from 0.5 to 0.3 for better recall (industry standard for chat)
                  if (similarity > 0.3) {
                    allResults.push({
                      chatId,
                      chatName,
                      text: message.text,
                      timestamp: message.timestamp,
                      similarity,
                      isChunk: false,
                    });
                    
                    logger.info("Message matched", {
                      chatId,
                      similarity: similarity.toFixed(3),
                      textPreview: message.text.substring(0, 50),
                    });
                  }
                }
                continue;
              }

              // Generate query embedding once per chat
              const queryEmbedding = await EmbeddingService.generateEmbedding(query);

              // Compare with conversation chunk embeddings
              const chunks = chunksSnapshot.docs.map(doc => {
                const data: any = doc.data();
                return {
                  id: doc.id,
                  chunkIndex: data.chunkIndex,
                  messages: data.messages || [],
                  fullText: data.fullText || "",
                  startTimestamp: data.startTimestamp,
                  endTimestamp: data.endTimestamp,
                  embedding: data.embedding,
                };
              });

              for (const chunk of chunks) {
                if (!chunk.embedding) continue;
                
                const similarity = EmbeddingService.cosineSimilarity(
                  queryEmbedding.embedding,
                  chunk.embedding
                );

                // Lowered threshold from 0.5 to 0.3 for better recall (industry standard for chat)
                if (similarity > 0.3) {
                  allResults.push({
                    chatId,
                    chatName,
                    chunkId: chunk.id,
                    chunkIndex: chunk.chunkIndex,
                    messages: chunk.messages,
                    fullText: chunk.fullText,
                    timestamp: chunk.endTimestamp, // Use end timestamp for sorting
                    similarity,
                    isChunk: true,
                  });
                  
                  logger.info("Chunk matched", {
                    chatId,
                    chunkIndex: chunk.chunkIndex,
                    similarity: similarity.toFixed(3),
                    textPreview: chunk.fullText.substring(0, 50),
                  });
                }
              }
            } catch (error) {
              logger.warn("Error searching chat", { chatId, error });
            }
          }

          // Sort by similarity and take top 15 results (increased from 5 for better context)
          return allResults
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 15);
        });

      logger.info("Search completed", {
        userId,
        resultsFound: searchResults.length,
        topResults: searchResults.slice(0, 3).map((r: any) => ({
          similarity: r.similarity.toFixed(3),
          chatName: r.chatName,
          isChunk: r.isChunk,
          preview: (r.isChunk ? r.fullText : r.text).substring(0, 60),
        })),
      });

      // Step 2: Build context from search results (chunks or messages)
      let context = "";
      if (searchResults.length === 0) {
        context = "No relevant messages found in the user's chat history.";
      } else {
        context = searchResults
          .map((result: any, index: number) => {
            const date = result.timestamp ? 
              new Date(result.timestamp).toLocaleDateString() : 
              "Unknown date";
            
            // If it's a conversation chunk, format as dialogue
            if (result.isChunk && result.messages && result.messages.length > 0) {
              const conversation = result.messages
                .map((msg: any) => `  ${msg.senderName}: ${msg.text}`)
                .join("\n");
              
              return `[${index + 1}] Conversation with ${result.chatName} (${date}):\n${conversation}\n`;
            } else {
              // Legacy: single message format
              return `[${index + 1}] From chat with ${result.chatName} (${date}):\n"${result.text}"\n`;
            }
          })
          .join("\n");
      }

      // Step 3: Build conversation context
      let conversationContext = "";
      if (conversationHistory.length > 0) {
        conversationContext = "\n\nPrevious conversation:\n" + 
          conversationHistory
            .slice(-5) // Last 5 messages
            .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join("\n");
      }

      // Step 4: Generate AI response
      const { generateText } = await import("ai");
      const aiConfig = await import("../config/ai-sdk.config.js");
      const aiModel = aiConfig.aiModel;

      const systemPrompt = `You are a helpful AI assistant that can help users with anything - from finding information in their chat history to answering general questions, providing advice, helping with tasks, and having conversations.

IMPORTANT: You are currently responding to ${userName} (${userEmail}). When referencing conversations, always consider ${userName}'s perspective and context.

Your capabilities:
- Answer questions about ${userName}'s conversations and chat history
- Help with general knowledge questions and tasks
- Provide advice, suggestions, and recommendations
- Help with writing, planning, problem-solving, and creative tasks
- Have friendly, engaging conversations
- Be a helpful companion for any topic

When you have access to ${userName}'s chat history:
- Use conversation segments to understand context and relationships
- Reference specific conversations using [1], [2], etc. format
- When mentioning people in conversations, clarify who ${userName} is talking to/about
- Don't make up information not in ${userName}'s conversations
- If you don't find relevant information in ${userName}'s chats, say so clearly

When helping with general topics:
- Use your knowledge to provide helpful, accurate information
- Be conversational and engaging
- Ask clarifying questions when needed
- Provide practical, actionable advice

Always:
- Be friendly, helpful, and conversational
- Be concise but informative
- Adapt your tone to ${userName}'s needs
- Offer to help with follow-up questions
- Remember you're talking to ${userName}, not about ${userName}`;

      const userPrompt = `User question from ${userName}: "${query}"

${context ? `Relevant conversations from ${userName}'s chat history:
${context}` : `No relevant conversations found in ${userName}'s chat history.`}${conversationContext}

Provide a helpful, natural answer to ${userName}'s question. If you found relevant information in ${userName}'s chat history, reference it using [1], [2] format. If this is a general question not related to ${userName}'s chats, use your knowledge to provide a helpful response.`;

      const result = await generateText({
        model: aiModel,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
      });

      const answer = result.text.trim();

      logger.info("AI Assistant response generated", {
        userId,
        answerLength: answer.length,
        sourcesUsed: searchResults.length,
      });

      // Step 5: Return answer with sources
      return {
        success: true,
        answer,
        sources: searchResults.map((result: any) => ({
          chatId: result.chatId,
          chatName: result.chatName,
          messageId: result.messageId,
          snippet: (result.text || result.fullText || '').slice(0, 150),
          timestamp: result.timestamp,
          similarity: result.similarity,
        })),
        timestamp: Date.now(),
      };

    } catch (error: any) {
      logger.error("AI Assistant failed", {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
      });

      // Provide a helpful fallback response
      return {
        success: false,
        answer: "I'm sorry, I encountered an error while searching your messages. Please try rephrasing your question or try again in a moment.",
        sources: [],
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
);

/**
 * Generate smart reply suggestions based on conversation context
 * Uses last 10 messages for context and style analysis
 * Callable from React Native app
 */
export const generateSmartReplies = onCall(
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

      const { messageId, chatId, preferredLanguage } = request.data;
      const userId = request.auth.uid;
      const userLang = preferredLanguage || "en";

      // Validate parameters
      if (!messageId || typeof messageId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "messageId is required and must be a string"
        );
      }

      if (!chatId || typeof chatId !== "string") {
        throw new HttpsError(
          "invalid-argument",
          "chatId is required and must be a string"
        );
      }

      logger.info("Smart replies requested", {
        messageId,
        chatId,
        userId,
      });

      // Get the target message (message to reply to)
      const targetMessageDoc = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .doc(messageId)
        .get();

      if (!targetMessageDoc.exists) {
        throw new HttpsError("not-found", "Message not found");
      }

      const targetMessage = targetMessageDoc.data();

      if (!targetMessage || !targetMessage.text) {
        throw new HttpsError("invalid-argument", "Message has no text content");
      }

      // Get last 10 messages for context
      const last10Snapshot = await admin.firestore()
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .where("type", "==", "text")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      const last10Messages = last10Snapshot.docs
        .map((doc) => doc.data())
        .reverse(); // Chronological order

      // Filter user's messages
      const userMessages = last10Messages.filter((m) => m.senderId === userId);

      logger.info("Context loaded", {
        totalMessages: last10Messages.length,
        userMessages: userMessages.length,
      });

      let repliesByTone: {
        casual: string[];
        professional: string[];
        formal: string[];
      };

      if (userMessages.length < 1) {
        // MODE 1: Generic templates (only if user has NO messages)
        logger.info("Using generic mode", { userMessageCount: userMessages.length });
        repliesByTone = generateGenericRepliesByTone(targetMessage.text || "", userLang);
      } else {
        // MODE 2: AI-powered learned replies (even with just 1 message)
        logger.info("Using learned mode", { userMessageCount: userMessages.length });
        repliesByTone = await generateLearnedRepliesByTone(
          targetMessage,
          last10Messages,
          userMessages,
          userLang
        );
      }

      logger.info("Smart replies generated", {
        messageId,
        mode: userMessages.length < 1 ? "generic" : "learned",
      });

      return {
        success: true,
        replies: repliesByTone,
        mode: userMessages.length < 1 ? "generic" : "learned",
      };

    } catch (error: any) {
      logger.error("Smart replies generation failed", {
        error: error.message,
        stack: error.stack,
        userId: request.auth?.uid,
      });

      throw new HttpsError(
        "internal",
        error.message || "Failed to generate smart replies"
      );
    }
  }
);

/**
 * Generate generic template replies in 3 tones based on message pattern
 * Note: Generic replies are in English. For localized replies, use learned mode.
 */
function generateGenericRepliesByTone(text: string, preferredLanguage: string): {
  casual: string[];
  professional: string[];
  formal: string[];
} {
  // Note: Generic templates are in English for simplicity
  // AI-powered learned mode will handle user's preferred language
  const lower = text.toLowerCase();

  // Invitation patterns
  if (lower.match(/\b(want|wanna|grab|get|lunch|dinner|coffee|meet)\b/)) {
    return {
      casual: ["Yeah! When?", "Sounds good!", "Can't today, sorry"],
      professional: ["Sure, what time?", "That works", "I'm unavailable today"],
      formal: ["Yes, certainly", "I would be pleased to", "Regrettably, I cannot today"],
    };
  }

  // Time/when questions
  if (lower.match(/\b(when|what time)\b/)) {
    return {
      casual: ["Around 3pm?", "Whatever works!", "Lemme check"],
      professional: ["3pm would work", "Your preference?", "Let me check my schedule"],
      formal: ["3pm if suitable", "At your convenience", "Allow me to verify my availability"],
    };
  }

  // Location/where questions
  if (lower.match(/\b(where|which place)\b/)) {
    return {
      casual: ["Your place?", "Downtown?", "Where's good for you?"],
      professional: ["Your office?", "Downtown location?", "What's convenient?"],
      formal: ["Your location?", "The downtown venue?", "Where would be suitable?"],
    };
  }

  // Yes/no questions
  if (lower.endsWith("?") && lower.split(" ").length < 10) {
    return {
      casual: ["Yeah", "Nah", "Maybe"],
      professional: ["Yes", "No", "Possibly"],
      formal: ["Certainly", "I'm afraid not", "Perhaps"],
    };
  }

  // Thanks
  if (lower.match(/\b(thanks|thank you|thx)\b/)) {
    return {
      casual: ["You're welcome!", "No prob!", "Anytime!"],
      professional: ["You're welcome", "My pleasure", "Happy to help"],
      formal: ["You are most welcome", "It is my pleasure", "Delighted to assist"],
    };
  }

  // Greetings
  if (lower.match(/\b(hi|hey|hello|sup|what's up)\b/)) {
    return {
      casual: ["Hey!", "Hi!", "What's up?"],
      professional: ["Hello", "Hi there", "Good to hear from you"],
      formal: ["Greetings", "Good day", "Pleased to hear from you"],
    };
  }

  // Default generic
  return {
    casual: ["Okay", "Sounds good", "Got it"],
    professional: ["Understood", "That works", "Noted"],
    formal: ["Very well", "Certainly", "Acknowledged"],
  };
}

/**
 * Generate AI-powered learned replies based on user's style
 */
async function generateLearnedRepliesByTone(
  targetMessage: any,
  last10Messages: any[],
  userMessages: any[],
  preferredLanguage: string
): Promise<{
  casual: string[];
  professional: string[];
  formal: string[];
}> {
  const { generateText } = await import("ai");
  const aiConfig = await import("../config/ai-sdk.config.js");
  const aiModel = aiConfig.aiModel;

  // Quick local style analysis
  const style = analyzeUserStyle(userMessages);

  // Build conversation context
  const contextSummary = last10Messages
    .map((m) => `${m.senderName || "User"}: ${m.text}`)
    .slice(-5)
    .join("\n");

  // Language name map
  const languageNames: Record<string, string> = {
    en: "English", es: "Spanish", fr: "French", de: "German",
    it: "Italian", pt: "Portuguese", ru: "Russian", ja: "Japanese",
    ko: "Korean", zh: "Chinese", ar: "Arabic", hi: "Hindi",
    tr: "Turkish", nl: "Dutch", pl: "Polish", sv: "Swedish",
  };
  const languageName = languageNames[preferredLanguage] || "English";

  // Build AI prompt
  const prompt = `
You are generating smart reply suggestions in 3 TONES for a user.

**IMPORTANT: Generate ALL replies in ${languageName} language (${preferredLanguage}).**

USER'S RECENT MESSAGES (learn their style):
${userMessages.map((m) => `- "${m.text}"`).join("\n")}

STYLE ANALYSIS:
- Average length: ${style.avgLength} characters
- Uses emojis: ${style.usesEmojis ? "Yes (" + style.commonEmojis.join(" ") + ")" : "Rarely"}
- Punctuation: ${style.punctuation}
- Tone: ${style.tone}

RECENT CONVERSATION:
${contextSummary}

MESSAGE TO REPLY TO:
"${targetMessage.text}"

Generate 3 REPLIES IN EACH OF 3 TONES (9 total) **in ${languageName} (${preferredLanguage})**:

CASUAL (relaxed, friendly, emojis OK):
- 3 short replies in ${languageName} that feel natural and conversational

PROFESSIONAL (polite, clear, business-appropriate):
- 3 short replies in ${languageName} that are respectful and professional

FORMAL (proper, courteous, traditional):
- 3 short replies in ${languageName} that are very polite and formal

Each reply should be < 50 characters and contextually appropriate IN ${languageName}.

Return ONLY a JSON object:
{
  "casual": ["Reply 1 in ${languageName}", "Reply 2 in ${languageName}", "Reply 3 in ${languageName}"],
  "professional": ["Reply 1 in ${languageName}", "Reply 2 in ${languageName}", "Reply 3 in ${languageName}"],
  "formal": ["Reply 1 in ${languageName}", "Reply 2 in ${languageName}", "Reply 3 in ${languageName}"]
}
`;

  try {
    const result = await generateText({
      model: aiModel,
      prompt: prompt,
      temperature: 0.7,
    });

    // Parse JSON response
    const text = result.text.trim();
    logger.info("AI raw response", { text });

    // Try to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (
        parsed.casual && Array.isArray(parsed.casual) &&
        parsed.professional && Array.isArray(parsed.professional) &&
        parsed.formal && Array.isArray(parsed.formal)
      ) {
        return {
          casual: parsed.casual.slice(0, 3),
          professional: parsed.professional.slice(0, 3),
          formal: parsed.formal.slice(0, 3),
        };
      }
    }

    throw new Error("Could not parse AI response");
  } catch (error: any) {
    logger.error("AI reply generation failed", { error: error.message });
    // Fallback to generic
    const fallback = generateGenericRepliesByTone(targetMessage.text, preferredLanguage);
    return fallback;
  }
}

/**
 * Analyze user's writing style from their messages
 */
function analyzeUserStyle(userMessages: any[]) {
  if (userMessages.length === 0) {
    return {
      avgLength: 20,
      usesEmojis: false,
      commonEmojis: [],
      punctuation: "normal",
      tone: "neutral",
    };
  }

  // Calculate average message length
  const avgLength = Math.round(
    userMessages.reduce((sum, m) => sum + m.text.length, 0) / userMessages.length
  );

  // Check emoji usage
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const messagesWithEmojis = userMessages.filter((m) =>
    emojiRegex.test(m.text)
  ).length;
  const usesEmojis = messagesWithEmojis / userMessages.length > 0.3;

  // Find common emojis
  const allEmojis = userMessages
    .map((m) => m.text.match(emojiRegex) || [])
    .flat();
  const emojiCounts: Record<string, number> = {};
  allEmojis.forEach((e) => {
    emojiCounts[e] = (emojiCounts[e] || 0) + 1;
  });
  const commonEmojis = Object.entries(emojiCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emoji]) => emoji);

  // Detect punctuation style
  const hasExclamation = userMessages.some((m) => m.text.includes("!"));
  const hasMultiple = userMessages.some((m) =>
    /!!!|\.\.\.|\?\?/.test(m.text)
  );

  let punctuation = "minimal";
  if (hasMultiple) punctuation = "expressive";
  else if (hasExclamation) punctuation = "normal";

  // Detect tone
  const casualWords = ["lol", "yeah", "yep", "nah", "gonna", "wanna", "ok", "k"];
  const formalWords = ["yes", "certainly", "however", "please", "would", "could"];

  const casualCount = userMessages.reduce(
    (sum, m) =>
      sum +
      casualWords.filter((w) => m.text.toLowerCase().includes(w)).length,
    0
  );
  const formalCount = userMessages.reduce(
    (sum, m) =>
      sum +
      formalWords.filter((w) => m.text.toLowerCase().includes(w)).length,
    0
  );

  let tone = "neutral";
  if (casualCount > formalCount * 2) tone = "casual";
  else if (formalCount > casualCount) tone = "formal";

  return {
    avgLength,
    usesEmojis,
    commonEmojis,
    punctuation,
    tone,
  };
}
