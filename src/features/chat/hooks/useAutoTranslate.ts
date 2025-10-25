/**
 * useAutoTranslate Hook
 * 
 * Handles all auto-translation functionality:
 * - Auto-translate incoming messages
 * - Manual message translation
 * - Translation settings management
 * - Previous messages translation
 */

import { SQLiteService } from '@/database/SQLiteService';
import { functions } from '@/services/firebase/FirebaseConfig';
import { Message } from '@/shared/types';
import { useAuthStore, useChatStore } from '@/store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

interface UseAutoTranslateOptions {
  visible: boolean;
  chatId: string | null;
  userId: string | undefined;
  messages: Message[];
}

export function useAutoTranslate({
  visible,
  chatId,
  userId,
  messages,
}: UseAutoTranslateOptions) {
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const translatingMessages = useRef<Set<string>>(new Set()); // Track messages being translated
  const previousMessageIds = useRef<Set<string>>(new Set()); // Track message IDs we've seen before

  // Load auto-translate setting when chat opens
  useEffect(() => {
    if (visible && chatId) {
      const loadAutoTranslateSetting = async () => {
        try {
          const saved = await AsyncStorage.getItem(`@auto_translate_${chatId}`);
          if (saved !== null) {
            setAutoTranslateEnabled(JSON.parse(saved));
          }
        } catch {
          // Silent fail - not critical, defaults to false
        }
      };
      
      loadAutoTranslateSetting();
    }
  }, [visible, chatId]);

  // Auto-translate incoming messages when enabled (ONLY NEW ARRIVALS)
  useEffect(() => {
    // Get user from AuthStore
    const user = useAuthStore.getState().user;
    
    if (!autoTranslateEnabled || !chatId || !user?.preferredLanguage || !visible) {
      return;
    }

    // Get current message IDs
    const currentMessageIds = new Set(messages.map(m => m.id));
    
    // Find messages that are TRULY NEW (not in previousMessageIds)
    const newlyArrivedMessages = messages.filter(msg => 
      !previousMessageIds.current.has(msg.id) && // TRULY NEW (just arrived)
      msg.senderId !== user.id &&  // Skip my own messages
      msg.type === 'text' &&       // Only text messages
      msg.text &&                  // Has text
      msg.text.trim().length > 0 && // Not empty
      (!msg.translations || !msg.translations[user.preferredLanguage!]) && // Not already translated
      !translatingMessages.current.has(msg.id) // Not currently being translated
    );

    // Update the previousMessageIds set for next time
    previousMessageIds.current = currentMessageIds;

    if (newlyArrivedMessages.length === 0) {
      return;
    }

    console.log(`[Auto-Translate] 🆕 ${newlyArrivedMessages.length} NEW message(s) arrived - translating...`);

    // Translate ONLY newly arrived messages in background (non-blocking)
    const autoTranslate = async () => {
      try {
        const translateFn = httpsCallable(functions, 'translateMessage');
        const quickDetectFn = httpsCallable(functions, 'quickDetectLanguage');
        
        for (const msg of newlyArrivedMessages) {
          // Mark as translating
          translatingMessages.current.add(msg.id);
          
          try {
            // Quick language check
            const langResult: any = await quickDetectFn({ text: msg.text || '' });
            const detectedLang = langResult?.data?.language;
            
            // Skip if same language
            if (detectedLang === user.preferredLanguage) {
              console.log(`[Auto-Translate] Skipping msg ${msg.id} - same language (${detectedLang})`);
              translatingMessages.current.delete(msg.id);
              continue;
            }
            
            // Translate the message
            console.log(`[Auto-Translate] Translating NEW arrival ${msg.id} from ${detectedLang} to ${user.preferredLanguage}`);
            const result: any = await translateFn({
              messageId: msg.id,
              chatId: chatId,
              targetLanguage: user.preferredLanguage,
              messageText: msg.text, // Required by Cloud Function
              userId: user.id,
            });
            
            if (result?.data?.translated) {
              // Prepare translation object (SAME format as manual translate)
              const translationData = {
                text: result.data.translated,
                formalityLevel: result.data.formalityLevel,
                formalityIndicators: result.data.formalityIndicators,
              };
              
              // Save to SQLite
              await SQLiteService.updateMessageTranslation(
                chatId,
                msg.id,
                user.preferredLanguage!,
                translationData,
                result.data.detectedLanguage
              );
              
              // Update Zustand store (store full translation object, not just string)
              const updatedMessages = messages.map(m => {
                if (m.id === msg.id) {
                  return {
                    ...m,
                    translations: {
                      ...m.translations,
                      [user.preferredLanguage!]: translationData, // Store FULL object with cultural analysis
                    },
                    detectedLanguage: result.data.detectedLanguage || m.detectedLanguage,
                  };
                }
                return m;
              });
              
              // Update store
              useChatStore.setState((state: any) => ({
                ...state,
                messages: updatedMessages,
              }));
              
              console.log(`[Auto-Translate] ✅ Translated new arrival ${msg.id}`);
            }
            
            // Remove from translating set
            translatingMessages.current.delete(msg.id);
          } catch (error) {
            console.error(`[Auto-Translate] Failed to translate msg ${msg.id}:`, error);
            // Remove from translating set even on error
            translatingMessages.current.delete(msg.id);
          }
        }
      } catch (error) {
        console.error('[Auto-Translate] Failed:', error);
      }
    };
    
    autoTranslate();
  }, [messages, autoTranslateEnabled, chatId, userId, visible]);

  // Handle toggle auto-translate
  const handleToggleAutoTranslate = useCallback(async () => {
    if (!chatId) return;
    
    const newValue = !autoTranslateEnabled;
    setAutoTranslateEnabled(newValue);
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(`@auto_translate_${chatId}`, JSON.stringify(newValue));
      // Silent toggle - no confirmation needed
    } catch (error) {
      console.error('Failed to save auto-translate setting:', error);
    }
  }, [chatId, autoTranslateEnabled]);

  // Handle translate message
  const handleTranslateMessage = useCallback(async (message: Message) => {
    // Check if message has text to translate
    const textToTranslate = message.type === 'text' ? message.text : message.caption;
    
    if (!textToTranslate) {
      Alert.alert('Error', 'No text to translate in this message');
      return;
    }

    // Get user object from store to access preferredLanguage
    const user = useAuthStore.getState().user;
    
    if (!user?.preferredLanguage || !chatId) {
      Alert.alert('Error', 'Please set your preferred language in profile settings');
      return;
    }

    try {
      // Import Firebase Functions and Config
      const { httpsCallable } = await import('firebase/functions');
      const { functions, auth } = await import('@/services/firebase/FirebaseConfig');
      
      // Verify user is authenticated
      if (!auth.currentUser) {
        throw new Error('You must be signed in to translate messages');
      }
      
      // Get user's preferred language (default to English)
      const targetLanguage = user.preferredLanguage || 'en';
      
      // Check if translation already exists
      if (message.translations && message.translations[targetLanguage]) {
        return;
      }
      
      // Get fresh ID token to ensure auth is valid
      await auth.currentUser.getIdToken(true);
      
      // Call the Cloud Function
      const translateFn = httpsCallable(functions, 'translateMessage');
      const result: any = await translateFn({
        messageId: message.id,
        chatId: chatId,
        targetLanguage,
        messageText: textToTranslate, // Pass the actual text to translate
      });

      if (result.data.success) {
        // Prepare translation object with cultural analysis and formality
        const translationData = {
          text: result.data.translated,
          formalityLevel: result.data.formalityLevel,
          formalityIndicators: result.data.formalityIndicators,
        };
        
        // Save translation locally to SQLite (with full cultural analysis object)
        await SQLiteService.updateMessageTranslation(
          chatId!,
          message.id,
          targetLanguage,
          translationData, // Save FULL object with cultural analysis
          result.data.detectedLanguage
        );

        // Update the message in state to trigger UI update
        const { messages } = useChatStore.getState();
        const updatedMessages = messages.map(msg => {
          if (msg.id === message.id) {
            return {
              ...msg,
              translations: {
                ...msg.translations,
                [targetLanguage]: translationData, // Store full object with cultural analysis
              },
              detectedLanguage: result.data.detectedLanguage || msg.detectedLanguage,
            };
          }
          return msg;
        });
        
        // Update state
        useChatStore.setState({ messages: updatedMessages });
        
      } else {
        throw new Error(result.data.error || 'Translation failed');
      }
    } catch (error: any) {
      console.error('❌ Translation error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Translation Failed',
        error.message || 'Could not translate message. Please try again.'
      );
    }
  }, [chatId]);

  // Translate multiple messages in parallel
  const translateMessagesInParallel = useCallback(async (messagesToTranslate: Message[]) => {
    // Get user object from store to access preferredLanguage
    const user = useAuthStore.getState().user;
    
    if (!user?.preferredLanguage || !chatId) return;
    
    // Show loading
    Alert.alert('Translating...', `Translating ${messagesToTranslate.length} messages`);
    
    // Translate all in parallel
    const results = await Promise.allSettled(
      messagesToTranslate.map(async (msg) => {
        try {
          const translateFn = httpsCallable(functions, 'translateMessage');
          
          const result: any = await translateFn({
            messageId: msg.id,
            chatId: chatId,
            targetLanguage: user.preferredLanguage,
            messageText: msg.text,
          });
          
          // Build translation object
          const translationObject = {
            text: result.data.translated,
            translatedAt: Date.now()
          };
          
          // Save to SQLite
          try {
            await SQLiteService.updateMessageTranslation(
              chatId,
              msg.id,
              user.preferredLanguage!,
              translationObject,
              result.data.detectedLanguage || 'unknown'
            );
          } catch (sqlError) {
            console.error('Failed to save translation to SQLite:', sqlError);
          }
          
          // Update UI
          const state = useChatStore.getState();
          const currentMessages = state.messages;
          const messageIndex = currentMessages.findIndex(m => m.id === msg.id);
          
          if (messageIndex !== -1) {
            const updatedMessage = {
              ...currentMessages[messageIndex],
              translations: {
                ...(currentMessages[messageIndex].translations || {}),
                [user.preferredLanguage!]: translationObject
              }
            };
            
            const newMessages = [
              ...currentMessages.slice(0, messageIndex),
              updatedMessage,
              ...currentMessages.slice(messageIndex + 1)
            ];
            
            useChatStore.setState({ messages: newMessages });
          }
          
          return { success: true };
        } catch (error) {
          console.error('Translation failed:', error);
          return { success: false, error };
        }
      })
    );
    
    // Count successes
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    // Show result
    Alert.alert(
      'Translation Complete', 
      `✅ Successfully translated ${successCount} out of ${messagesToTranslate.length} messages!`
    );
  }, [chatId]);

  // Handle translate previous messages
  const handleTranslatePrevious = useCallback(async (count: number = 20) => {
    // Get user object from store to access preferredLanguage
    const user = useAuthStore.getState().user;
    
    if (!user?.preferredLanguage || !chatId) {
      Alert.alert('Error', 'Please set your preferred language in profile settings');
      return;
    }
    
    // STEP 1: Get last N messages
    const lastMessages = messages.slice(-count);
    
    // STEP 2: Filter out messages we DON'T need to translate
    const messagesToCheck = lastMessages.filter(msg => 
      msg.senderId !== user.id &&  // Skip my own messages
      msg.type === 'text' &&       // Skip non-text (images, etc)
      msg.text &&                  // Skip empty messages
      (!user.preferredLanguage || !msg.translations?.[user.preferredLanguage])  // Skip already translated
    );
    
    if (messagesToCheck.length === 0) {
      Alert.alert('Nothing to translate', 'All recent messages are already translated or in your language');
      return;
    }
    
    // STEP 3: Quick language detection for each message
    Alert.alert('Checking messages...', `Analyzing ${messagesToCheck.length} messages`);
    
    const messagesToTranslate: Message[] = [];
    
    try {
      const quickDetectFn = httpsCallable(functions, 'quickDetectLanguage');
      
      for (const msg of messagesToCheck) {
        try {
          // Quick detect first 5 words
          const firstWords = msg.text!.split(/\s+/).slice(0, 5).join(' ');
          
          const result: any = await quickDetectFn({ text: firstWords });
          const detectedLang = result?.data?.language;
          
          // Skip if same language as user's preferred
          if (detectedLang === user.preferredLanguage) {
            continue;
          }
          
          // Add to translation list
          messagesToTranslate.push(msg);
        } catch (error) {
          console.warn('Language detection failed, will translate anyway:', error);
          messagesToTranslate.push(msg);
        }
      }
      
      if (messagesToTranslate.length === 0) {
        Alert.alert('Nothing to translate', 'All messages are already in your language!');
        return;
      }
      
      // STEP 4: Translate immediately without confirmation
      await translateMessagesInParallel(messagesToTranslate);
    } catch (error) {
      console.error('Failed to check messages:', error);
      Alert.alert('Error', 'Failed to analyze messages. Please try again.');
    }
  }, [chatId, messages, translateMessagesInParallel]);

  return {
    // State
    autoTranslateEnabled,
    
    // Actions
    handleToggleAutoTranslate,
    handleTranslateMessage,
    handleTranslatePrevious,
  };
}
