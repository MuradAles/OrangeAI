/**
 * AI Assistant Screen
 * Conversational AI that helps users find information in their chat history
 */

import { functions } from '@/services/firebase/FirebaseConfig';
import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: {
    chatId: string;
    chatName: string;
    messageId: string;
    snippet: string;
    timestamp: number;
  }[];
}

const SUGGESTED_PROMPTS = [
  "What did I talk about yesterday?",
  "Help me plan my day",
  "Explain something I don't understand",
  "Give me advice on a problem",
];

export default function AIAssistantScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // User-specific storage key
  const STORAGE_KEY = user?.id ? `@ai_assistant_conversation_${user.id}` : '@ai_assistant_conversation';

  /**
   * Load conversation history from AsyncStorage
   */
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Clear any old global conversation history (migration)
        if (user?.id) {
          const oldGlobalKey = '@ai_assistant_conversation';
          const oldGlobalHistory = await AsyncStorage.getItem(oldGlobalKey);
          if (oldGlobalHistory) {
            // Remove old global history
            await AsyncStorage.removeItem(oldGlobalKey);
            console.log('🧹 Cleared old global AI Assistant history');
          }
        }

        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const history = JSON.parse(stored);
          setMessages(history);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [STORAGE_KEY, user?.id]);

  /**
   * Save conversation history to AsyncStorage
   */
  const saveHistory = useCallback(async (newMessages: Message[]) => {
    try {
      // Keep last 50 messages to avoid storage bloat
      const messagesToSave = newMessages.slice(-50);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }, [STORAGE_KEY]);

  /**
   * Send message to AI Assistant
   */
  const handleSend = useCallback(async (queryText?: string) => {
    const query = queryText || input.trim();
    
    if (!query) return;

    // Clear input
    setInput('');

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('🤖 Querying AI Assistant:', query);

      // Call AI Assistant function
      const aiAssistantFn = httpsCallable(functions, 'aiAssistant');
      const result: any = await aiAssistantFn({
        query,
        conversationHistory: updatedMessages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      console.log('✅ AI Response received');

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.data.answer,
        timestamp: result.data.timestamp || Date.now(),
        sources: result.data.sources || [],
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      await saveHistory(finalMessages);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ AI Assistant error:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error while searching your messages. Please try again in a moment.",
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await saveHistory(finalMessages);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, saveHistory]);

  /**
   * Clear conversation history
   */
  const handleClearHistory = useCallback(async () => {
    setMessages([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, [STORAGE_KEY]);

  /**
   * Render a message bubble
   */
  const renderMessage = useCallback((message: Message) => {
    const isUser = message.role === 'user';

    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          { backgroundColor: isUser ? theme.colors.primary : theme.colors.surface },
        ]}
      >
        {/* Message content */}
        <Text
          style={[
            styles.messageText,
            { color: isUser ? '#FFFFFF' : theme.colors.text },
          ]}
        >
          {message.content}
        </Text>

        {/* Source links (AI messages only) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <View style={styles.sourcesDivider} />
            <Text style={[styles.sourcesLabel, { color: theme.colors.textSecondary }]}>
              Sources:
            </Text>
            {message.sources.map((source, index) => (
              <View
                key={`${source.chatId}-${source.messageId || index}`}
                style={[
                  styles.sourceItem,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                ]}
              >
                <Ionicons name="link-outline" size={14} color={theme.colors.primary} />
                <View style={styles.sourceContent}>
                  <Text style={[styles.sourceChatName, { color: theme.colors.text }]} numberOfLines={1}>
                    {source.chatName}
                  </Text>
                  <Text style={[styles.sourceSnippet, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {source.snippet}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            { color: isUser ? 'rgba(255, 255, 255, 0.7)' : theme.colors.textSecondary },
          ]}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [theme]);

  if (isLoadingHistory) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color={theme.colors.primary} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            AI Assistant
          </Text>
        </View>
        {messages.length > 0 && (
          <Pressable onPress={handleClearHistory} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome message */}
        {messages.length === 0 && (
          <View style={styles.welcomeContainer}>
            <Ionicons name="sparkles" size={64} color={theme.colors.primary} />
            <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
              Hi! I&apos;m your AI Assistant
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
              Ask me anything - I can help with your conversations, general questions, advice, and more!
            </Text>

            {/* Suggested prompts */}
            <View style={styles.suggestedPrompts}>
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <Pressable
                  key={index}
                  style={[styles.promptButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => handleSend(prompt)}
                >
                  <Text style={[styles.promptText, { color: theme.colors.text }]}>
                    {prompt}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Message history */}
        {messages.map(renderMessage)}

        {/* Loading indicator */}
        {isLoading && (
          <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Searching your messages...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder="Ask me anything..."
          placeholderTextColor={theme.colors.textSecondary}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: input.trim() ? theme.colors.primary : theme.colors.border },
          ]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  suggestedPrompts: {
    gap: 10,
    width: '100%',
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptText: {
    fontSize: 14,
    flex: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  loadingText: {
    fontSize: 13,
    marginLeft: 8,
  },
  sourcesContainer: {
    marginTop: 8,
    gap: 8,
  },
  sourcesDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 4,
  },
  sourcesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  sourceContent: {
    flex: 1,
    gap: 2,
  },
  sourceChatName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourceSnippet: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
