/**
 * Global Message Search Screen
 * RAG-powered semantic search across all chats
 */

import { SQLiteService } from '@/database/SQLiteService';
import { functions } from '@/services/firebase/FirebaseConfig';
import { useTheme } from '@/shared/hooks/useTheme';
import { useAuthStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

interface SearchResult {
  messageId: string;
  text: string;
  score: number;
  timestamp: number;
}

interface ChatResult {
  chatId: string;
  chatName: string;
  isGroup: boolean;
  results: SearchResult[];
  bestScore: number;
}

interface EnhancedResult extends SearchResult {
  displayText: string;
  isTranslated: boolean;
  originalText: string;
}

interface EnhancedChatResult extends ChatResult {
  results: EnhancedResult[];
}

export default function FindScreen() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<EnhancedChatResult[]>([]);
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  const [indexing, setIndexing] = useState(false);

  /**
   * Enhance results with cached translations from SQLite
   */
  const enhanceWithTranslations = useCallback(async (
    chatResults: ChatResult[]
  ): Promise<EnhancedChatResult[]> => {
    if (!user?.preferredLanguage) return chatResults as EnhancedChatResult[];

    const enhanced = await Promise.all(
      chatResults.map(async (chat) => ({
        ...chat,
        results: await Promise.all(
          chat.results.map(async (msg): Promise<EnhancedResult> => {
            try {
              // Check SQLite for cached translation
              const localMessage = await SQLiteService.getMessage(
                chat.chatId,
                msg.messageId
              );

              // If translation exists, use it
              if (localMessage?.translations?.[user.preferredLanguage]) {
                const translation = localMessage.translations[user.preferredLanguage];
                const translatedText = typeof translation === 'string' 
                  ? translation 
                  : translation.text;

                return {
                  ...msg,
                  originalText: msg.text,
                  displayText: translatedText,
                  isTranslated: true,
                };
              }

              // No translation, show original
              return {
                ...msg,
                originalText: msg.text,
                displayText: msg.text,
                isTranslated: false,
              };
            } catch (error) {
              console.error('Error checking translation:', error);
              return {
                ...msg,
                originalText: msg.text,
                displayText: msg.text,
                isTranslated: false,
              };
            }
          })
        ),
      }))
    );

    return enhanced;
  }, [user?.preferredLanguage]);

  /**
   * Perform global semantic search
   */
  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      Alert.alert('Invalid Query', 'Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      console.log('🔍 Searching for:', query);

      const searchFn = httpsCallable(functions, 'searchAllChats');
      const result: any = await searchFn({ query: query.trim(), limit: 20 });

      console.log('✅ Search results:', result.data);

       if (result.data.success && result.data.results.length > 0) {
         // Enhance with translations
         const enhanced = await enhanceWithTranslations(result.data.results);
         setResults(enhanced);
       } else {
         // No results found
         setResults([]);
       }
    } catch (error: any) {
      console.error('❌ Search error:', error);
      Alert.alert('Search Failed', error.message || 'Please try again');
    } finally {
      setSearching(false);
    }
  }, [query, enhanceWithTranslations]);

  /**
   * Translate a specific message
   */
  const handleTranslate = useCallback(async (
    chatId: string,
    messageId: string,
    messageText: string
  ) => {
    if (!user?.preferredLanguage) {
      Alert.alert('Error', 'Please set your preferred language in settings');
      return;
    }

    const key = `${chatId}-${messageId}`;
    setTranslating(prev => new Set(prev).add(key));

    try {
      console.log('🌍 Translating message:', messageId);

      const translateFn = httpsCallable(functions, 'translateMessage');
      const result: any = await translateFn({
        messageId,
        chatId,
        targetLanguage: user.preferredLanguage,
        messageText,
      });

      if (result.data.translated) {
        // Save to SQLite
        const translationObject = {
          text: result.data.translated,
          culturalAnalysis: result.data.culturalAnalysis,
          translatedAt: Date.now(),
        };

        await SQLiteService.updateMessageTranslation(
          chatId,
          messageId,
          user.preferredLanguage,
          translationObject,
          result.data.detectedLanguage || 'unknown'
        );

        // Update results with new translation
        const updatedResults = results.map(chat => {
          if (chat.chatId !== chatId) return chat;

          return {
            ...chat,
            results: chat.results.map(msg => {
              if (msg.messageId !== messageId) return msg;

              return {
                ...msg,
                displayText: result.data.translated,
                isTranslated: true,
              };
            }),
          };
        });

         setResults(updatedResults);
       }
     } catch (error: any) {
       console.error('❌ Translation error:', error);
       Alert.alert('Translation Failed', error.message || 'Please try again');
    } finally {
      setTranslating(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [user?.preferredLanguage, results]);

  /**
   * Generate embeddings for all user's chats
   */
  const handleIndexMessages = useCallback(async () => {
    if (!user) return;

    setIndexing(true);

    try {
      // Get user's chats from Firestore
      const { collection, query: firestoreQuery, where, getDocs } = await import('firebase/firestore');
      const { firestore } = await import('@/services/firebase/FirebaseConfig');

      const chatsSnapshot = await getDocs(
        firestoreQuery(
          collection(firestore, 'chats'),
          where('participants', 'array-contains', user.id)
        )
      );

      const chatIds = chatsSnapshot.docs.map(doc => doc.id);
      
      if (chatIds.length === 0) {
        Alert.alert('No Chats', 'You don\'t have any chats yet');
        return;
      }

      Alert.alert(
        'Indexing Messages',
        `Generating search index for ${chatIds.length} chats. This may take a minute...`
      );

      // Generate embeddings for each chat
      const generateFn = httpsCallable(functions, 'generateChatEmbeddings');
      
      let successCount = 0;
      for (const chatId of chatIds) {
        try {
          await generateFn({ chatId, limit: 50 });
          successCount++;
        } catch (error) {
          console.error(`Failed to index chat ${chatId}:`, error);
        }
      }

      Alert.alert(
        'Indexing Complete!',
        `Indexed ${successCount} out of ${chatIds.length} chats. You can now search your messages!`
      );
    } catch (error: any) {
      console.error('Indexing error:', error);
      Alert.alert('Indexing Failed', error.message || 'Please try again');
    } finally {
      setIndexing(false);
    }
  }, [user]);

  /**
   * Open chat and jump to message
   */
  const handleResultTap = useCallback((chatId: string, messageId: string) => {
    // Navigate to chat
    router.push({
      pathname: '/(tabs)/chat/[id]',
      params: { id: chatId, highlightMessage: messageId },
    });
  }, []);

  /**
   * Render a single search result
   */
  const renderResult = useCallback(({ item: msg }: { item: EnhancedResult }) => {
    const chatResult = results.find(c => 
      c.results.some(r => r.messageId === msg.messageId)
    );
    const chatId = chatResult?.chatId || '';
    const translatingKey = `${chatId}-${msg.messageId}`;
    const isTranslating = translating.has(translatingKey);

    return (
      <View
        style={[styles.resultItem, { backgroundColor: theme.colors.surface }]}
      >
        <Text style={[styles.messageText, { color: theme.colors.text }]}>
          {msg.displayText}
        </Text>

        <View style={styles.resultFooter}>
          <Text style={[styles.score, { color: theme.colors.textSecondary }]}>
            {Math.round(msg.score * 100)}% match
          </Text>

          {msg.isTranslated && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="language" size={12} color={theme.colors.primary} />
              <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                Translated
              </Text>
            </View>
          )}

          {!msg.isTranslated && msg.displayText !== msg.originalText && (
            <Pressable
              style={[styles.translateButton, { borderColor: theme.colors.primary }]}
              onPress={() => handleTranslate(chatId, msg.messageId, msg.originalText)}
              disabled={isTranslating}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="language-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.translateButtonText, { color: theme.colors.primary }]}>
                    Translate
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [results, translating, theme, handleTranslate]);

  /**
   * Render a chat section with results
   */
  const renderChat = useCallback(({ item: chat }: { item: EnhancedChatResult }) => (
    <View style={styles.chatSection}>
      <View style={styles.chatHeader}>
        <Ionicons
          name={chat.isGroup ? 'people' : 'person'}
          size={20}
          color={theme.colors.primary}
        />
        <Text style={[styles.chatName, { color: theme.colors.text }]}>
          {chat.chatName}
        </Text>
      </View>

      {chat.results.map(msg => (
        <View key={msg.messageId}>
          {renderResult({ item: msg })}
        </View>
      ))}
    </View>
  ), [theme, renderResult]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search across all chats..."
          placeholderTextColor={theme.colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Search Button */}
      <Pressable
        style={[
          styles.searchButton,
          { backgroundColor: theme.colors.primary },
          (!query.trim() || searching) && styles.searchButtonDisabled,
        ]}
        onPress={handleSearch}
        disabled={!query.trim() || searching}
      >
        {searching ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.searchButtonText}>Search</Text>
        )}
      </Pressable>

      {/* Results */}
      {searching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Searching across all chats...
          </Text>
        </View>
      )}

      {!searching && results.length === 0 && query.length > 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No results found
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
            Try different keywords
          </Text>
        </View>
      )}

      {!searching && results.length === 0 && query.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles" size={64} color={theme.colors.primary} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            Semantic Search
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
            Search by meaning across all your chats
          </Text>
        </View>
      )}

      {!searching && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderChat}
          keyExtractor={(item) => item.chatId}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    height: 28,
  },
  searchButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
  },
  resultsList: {
    gap: 16,
  },
  chatSection: {
    gap: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultItem: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  score: {
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  translateButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  indexButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  indexButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});

