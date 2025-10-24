/**
 * ChatModal - Full-screen modal for chat conversation
 * Opens over the chat list, similar to WhatsApp
 */

import { Avatar } from '@/components/common';
import { SQLiteService } from '@/database/SQLiteService';
import { CulturalService, PresenceService, TypingUser } from '@/services/firebase';
import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { useAuthStore, useChatStore, usePresenceStore } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Keyboard, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { DateSeparator } from './DateSeparator';
import { GroupSettingsModal } from './GroupSettingsModal';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageOptionsSheet } from './MessageOptionsSheet';
import { TypingIndicator } from './TypingIndicator';

interface ChatModalProps {
  visible: boolean;
  chatId: string | null;
  onClose: () => void;
}

type ListItem = 
  | { type: 'message'; data: Message }
  | { type: 'date'; data: Date }
  | { type: 'unread'; data: number };

export const ChatModal = ({ visible, chatId, onClose }: ChatModalProps) => {
  const theme = useTheme();
  const { user } = useAuthStore();
  
  // Handle close with keyboard dismissal
  const handleClose = useCallback(() => {
    // Dismiss keyboard first
    Keyboard.dismiss();
    // Small delay to allow keyboard to dismiss before modal closes
    setTimeout(() => {
      onClose();
    }, 100);
  }, [onClose]);
  const {
    messages,
    isLoadingMessages,
    loadMessagesFromSQLite,
    subscribeToMessages,
    sendMessage,
    sendImageMessage,
    getUserProfile,
    markChatAsRead,
    retryFailedMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    addReaction,
    setActiveChatId,
  } = useChatStore();

  const [isSending, setIsSending] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showChatSummary, setShowChatSummary] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const flashListRef = useRef<any>(null);
  const hasScrolledInitially = useRef(false);
  const isCleaningUp = useRef(false); // Prevent duplicate cleanup alerts
  const currentScrollPosition = useRef<{ offset: number; firstVisibleIndex: number }>({ offset: 0, firstVisibleIndex: 0 });
  const scrollPositionSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  const { subscribeToUser } = usePresenceStore();
  const presenceMap = usePresenceStore(state => state.presenceMap);
  const presenceVersion = usePresenceStore(state => state.version); // Subscribe to version for reactivity

  // Handle keyboard events for proper modal keyboard behavior
  useEffect(() => {
    if (!visible) {
      // Dismiss keyboard and reset height when modal closes
      Keyboard.dismiss();
      keyboardHeight.setValue(0);
      return;
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Add 12px spacing between input and keyboard
        const targetHeight = e.endCoordinates.height + 12;
        Animated.timing(keyboardHeight, {
          toValue: targetHeight,
          duration: Platform.OS === 'ios' ? (e.duration || 250) : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      // Ensure keyboard is dismissed on unmount
      Keyboard.dismiss();
      keyboardHeight.setValue(0);
    };
  }, [visible, keyboardHeight]);

  // Get current chat and other user info
  const { chats } = useChatStore();
  
  // Get current chat - using direct find without memo to ensure immediate updates
  const currentChat = chats.find(chat => chat.id === chatId);

  // Check if this is a group chat
  const isGroupChat = currentChat?.type === 'group';

  // For one-on-one chats, get the other user
  const otherUser = useMemo(() => {
    if (!user || !currentChat || isGroupChat) return null;
    
    // Find the other user ID from participants
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return null;
    
    return getUserProfile(otherUserId);
  }, [currentChat, user, getUserProfile, isGroupChat]);

  // Load messages when modal opens
  useEffect(() => {
    if (visible && chatId && user?.id) {
      // Reset scroll flag when opening chat
      hasScrolledInitially.current = false;
      
      // Set active chat ID for notification routing (in Zustand store)
      setActiveChatId(chatId);
      
      // Save active chat ID to Firestore (for push notification filtering)
      const updateActiveChatInFirestore = async () => {
        try {
          const { UserService } = await import('@/services/firebase');
          await UserService.updateActiveChatId(user.id, chatId);
        } catch (error) {
          console.error('Failed to update active chat ID in Firestore:', error);
        }
      };
      updateActiveChatInFirestore();
      
      // PRD Flow: Load from SQLite FIRST (instant <100ms), then sync from Firebase in background
      const loadMessages = async () => {
        // 1. Load from SQLite instantly (cached messages)
        await loadMessagesFromSQLite(chatId);
        
        // 2. Subscribe to Firebase for real-time updates (background sync)
        subscribeToMessages(chatId, user.id);
        
        // 3. Mark messages as read (PRD: If chat open → Mark as read)
        // Wait a bit to ensure messages are loaded first
        setTimeout(() => {
          markChatAsRead(chatId, user.id);
        }, 500);
      };
      
      loadMessages();
    } else if (!visible) {
      // Clear active chat ID when modal closes
      setActiveChatId(null);
      
      // Clear active chat ID in Firestore
      if (user?.id) {
        const clearActiveChatInFirestore = async () => {
          try {
            const { UserService } = await import('@/services/firebase');
            await UserService.updateActiveChatId(user.id, null);
          } catch (error) {
            console.error('Failed to clear active chat ID in Firestore:', error);
          }
        };
        clearActiveChatInFirestore();
      }
    }
    
    return () => {
      // Clear active chat ID on unmount
      if (visible && user?.id) {
        setActiveChatId(null);
        
        // Clear active chat ID in Firestore
        const clearActiveChatInFirestore = async () => {
          try {
            const { UserService } = await import('@/services/firebase');
            await UserService.updateActiveChatId(user.id, null);
          } catch (error) {
            console.error('Failed to clear active chat ID in Firestore:', error);
          }
        };
        clearActiveChatInFirestore();
      }
    };
    // Note: Don't clear messages on cleanup - keep them for quick reopening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, chatId, user?.id]);

  // Monitor if user is removed from group (real-time)
  useEffect(() => {
    if (!visible || !chatId || !user?.id || !isGroupChat) {
      return;
    }

    // Listen to chat document for participant changes
    const monitorGroupMembership = async () => {
      const { doc, onSnapshot } = await import('firebase/firestore');
      const { firestore } = await import('@/services/firebase/FirebaseConfig');
      
      const chatRef = doc(firestore, 'chats', chatId);
      const unsubscribe = onSnapshot(chatRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const participants = data.participants || [];
          
          // Check if current user is still a participant
          if (!participants.includes(user.id)) {
            // User has been removed! Clean up and close
            if (isCleaningUp.current) return; // Prevent duplicate cleanup
            isCleaningUp.current = true;
            
            console.log('🚪 User removed from group, cleaning up...');
            
            // Clean up local storage using store function
            const cleanup = async () => {
              try {
                // Use the store's remove function to ensure complete cleanup
                await useChatStore.getState().removeChatLocally(chatId, user.id);
                console.log('✅ Chat removed from local state after group removal');
                
                // Close modal
                onClose();
                
                // Show alert after modal closes (only once)
                setTimeout(() => {
                  Alert.alert(
                    'Removed from Group',
                    'You have been removed from this group by the admin.'
                  );
                }, 300);
              } catch (error) {
                console.error('Error cleaning up after removal:', error);
                // Still close modal even if cleanup fails
                onClose();
              }
            };
            
            cleanup();
          }
        }
      }, (error) => {
        // Permission denied = user was removed from group
        if (error.code === 'permission-denied') {
          if (isCleaningUp.current) return; // Prevent duplicate cleanup
          isCleaningUp.current = true;
          
          console.log('🚪 Permission denied - user was removed from group');
          
          // Clean up local storage using store function
          const cleanup = async () => {
            try {
              // Use the store's remove function to ensure complete cleanup
              await useChatStore.getState().removeChatLocally(chatId, user.id);
              console.log('✅ Chat removed from local state after permission error');
              
              // Close modal
              onClose();
              
              // Show alert after modal closes (only once)
              setTimeout(() => {
                Alert.alert(
                  'Removed from Group',
                  'You have been removed from this group.'
                );
              }, 300);
            } catch (error) {
              console.error('Error cleaning up after removal:', error);
              // Still close modal even if cleanup fails
              onClose();
            }
          };
          
          cleanup();
        } else {
          console.error('Error monitoring group membership:', error);
        }
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | null = null;
    monitorGroupMembership().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [visible, chatId, user?.id, isGroupChat, onClose]);

  // Save scroll position on close
  useEffect(() => {
    if (!visible && chatId) {
      // Chat modal is closing - save scroll position
      const savePosition = async () => {
        try {
          const msgs = useChatStore.getState().messages; // Get fresh messages from store
          const visibleIndex = currentScrollPosition.current.firstVisibleIndex;
          
          console.log('💾 Attempting to save position:', {
            chatId,
            visibleIndex,
            totalMessages: msgs.length,
            offset: currentScrollPosition.current.offset
          });
          
          if (msgs.length === 0) {
            console.log('⚠️ No messages to save position for');
            return;
          }
          
          // Validate index is within bounds
          const indexToSave = Math.max(0, Math.min(visibleIndex, msgs.length - 1));
          const messageToSave = msgs[indexToSave];
          
          if (messageToSave && messageToSave.id) {
            await SQLiteService.saveScrollPosition({
              chatId,
              lastReadMessageId: messageToSave.id,
              scrollYPosition: currentScrollPosition.current.offset,
              unreadCount: 0, // Will be updated by unread count logic
            });
            console.log('✅ Saved scroll position:', {
              chatId,
              messageId: messageToSave.id,
              index: indexToSave,
              messageText: messageToSave.text?.substring(0, 30)
            });
          } else {
            console.log('⚠️ Could not find valid message at index:', indexToSave);
          }
        } catch (error) {
          console.error('❌ Error saving scroll position:', error);
        }
      };
      
      savePosition();
      
      // Clear scroll position save timer
      if (scrollPositionSaveTimer.current) {
        clearTimeout(scrollPositionSaveTimer.current);
        scrollPositionSaveTimer.current = null;
      }
    }
    
    return () => {
      if (scrollPositionSaveTimer.current) {
        clearTimeout(scrollPositionSaveTimer.current);
      }
    };
  }, [visible, chatId]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!visible || !chatId || !user?.id) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = PresenceService.subscribeToTyping(
      chatId,
      user.id,
      (users) => setTypingUsers(users),
      (error) => console.error('Error subscribing to typing:', error)
    );

    return () => {
      unsubscribe();
      setTypingUsers([]);
    };
  }, [visible, chatId, user?.id]);

  // Subscribe to other user's presence (online/offline status)
  // Using centralized PresenceStore - only for one-on-one chats
  useEffect(() => {
    if (!visible || !currentChat || !user?.id || isGroupChat) return;

    // Get the other user's ID (one-on-one only)
    const otherUserId = currentChat.participants.find(id => id !== user.id);
    if (!otherUserId) return;

    // Subscribe via PresenceStore (handles deduplication)
    subscribeToUser(otherUserId);

    // No cleanup needed - PresenceStore manages subscriptions globally
  }, [visible, currentChat, user?.id, isGroupChat, subscribeToUser]);

  // Process messages into list items (with date separators)
  const listItems = useMemo(() => {
    const items: ListItem[] = [];
    let lastDate: string | null = null;
    
    // Sort messages by timestamp (oldest first for display)
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    sortedMessages.forEach((message) => {
      // Ensure timestamp is valid
      const messageDate = typeof message.timestamp === 'number' 
        ? new Date(message.timestamp)
        : new Date(message.timestamp);
      
      if (isNaN(messageDate.getTime())) {
        return; // Skip invalid timestamps
      }
      
      const currentDate = messageDate.toDateString();

      // Add date separator if date changed
      if (currentDate !== lastDate) {
        items.push({ type: 'date', data: messageDate });
        lastDate = currentDate;
      }

      // Add message
      items.push({ type: 'message', data: message });
    });

    // Return items in chronological order: oldest at top (index 0), newest at bottom (last index)
    return items;
  }, [messages]);

  // Check if we should show avatar (last message in group from bottom up)
  const shouldShowAvatar = (index: number): boolean => {
    // Normal order: index 0 is oldest, length-1 is newest
    // Show avatar for last message in group (next message is from different sender or too far apart)
    
    const currentItem = listItems[index];
    const nextItem = listItems[index + 1]; // Next item is newer
    
    if (!nextItem) return true; // Last item (newest message) always shows avatar
    
    if (currentItem.type !== 'message' || nextItem.type !== 'message') {
      return true;
    }
    
    const currentMsg = currentItem.data;
    const nextMsg = nextItem.data;
    
    // Different sender - show avatar for current message (last in this sender's group)
    if (currentMsg.senderId !== nextMsg.senderId) {
      return true;
    }
    
    // More than 1 minute apart - show avatar
    const currentTime = typeof currentMsg.timestamp === 'number' 
      ? currentMsg.timestamp 
      : new Date(currentMsg.timestamp).getTime();
    const nextTime = typeof nextMsg.timestamp === 'number' 
      ? nextMsg.timestamp 
      : new Date(nextMsg.timestamp).getTime();
    const timeDiff = nextTime - currentTime;
    return timeDiff > 60000;
  };

  // Scroll to last read position or bottom after messages load (only once)
  useEffect(() => {
    if (visible && chatId && listItems.length > 0 && flashListRef.current && !hasScrolledInitially.current) {
      // Load saved scroll position from SQLite
      const loadAndScrollToPosition = async () => {
        // Double-check flag at the start (race condition guard)
        if (hasScrolledInitially.current) {
          return;
        }
        
        try {
          const savedPosition = await SQLiteService.getScrollPosition(chatId);
          
          // Wait for layout to be ready - increased delay for safety
          setTimeout(() => {
            // Triple-check before scrolling (in case multiple effects fired)
            if (hasScrolledInitially.current || !flashListRef.current) {
              return;
            }
            
            try {
              if (savedPosition && savedPosition.lastReadMessageId && messages.length > 0) {
                // Find the index of the saved message
                const savedMessageIndex = messages.findIndex(
                  msg => msg.id === savedPosition.lastReadMessageId
                );
                
                if (savedMessageIndex !== -1 && savedMessageIndex < listItems.length) {
                  // Scroll to saved position
                  console.log('📍 Scrolling to saved position:', {
                    messageIndex: savedMessageIndex,
                    messageId: savedPosition.lastReadMessageId,
                  });
                  
                  flashListRef.current?.scrollToIndex({
                    index: savedMessageIndex,
                    animated: false,
                    viewPosition: 0.5, // Center the message in view
                  });
                } else {
                  // Saved message not found or out of bounds, scroll to bottom
                  console.log('📍 Saved message not found, scrolling to bottom');
                  if (listItems.length > 0) {
                    // Add safety check for layout readiness
                    try {
                      flashListRef.current?.scrollToEnd({ animated: false });
                    } catch (scrollError) {
                      console.log('⚠️ Layout not ready for scrollToEnd, retrying...');
                      // Retry after a short delay
                      setTimeout(() => {
                        try {
                          flashListRef.current?.scrollToEnd({ animated: false });
                        } catch (retryError) {
                          console.error('❌ Failed to scroll to end after retry:', retryError);
                        }
                      }, 100);
                    }
                  }
                }
              } else {
                // No saved position, scroll to bottom (new chat or first time)
                console.log('📍 No saved position, scrolling to bottom');
                if (listItems.length > 0) {
                  // Add safety check for layout readiness
                  try {
                    flashListRef.current?.scrollToEnd({ animated: false });
                  } catch (scrollError) {
                    console.log('⚠️ Layout not ready for scrollToEnd, retrying...');
                    // Retry after a short delay
                    setTimeout(() => {
                      try {
                        flashListRef.current?.scrollToEnd({ animated: false });
                      } catch (retryError) {
                        console.error('❌ Failed to scroll to end after retry:', retryError);
                      }
                    }, 100);
                  }
                }
              }
              
              hasScrolledInitially.current = true;
            } catch (scrollError) {
              console.error('Error scrolling:', scrollError);
              hasScrolledInitially.current = true;
            }
          }, 300); // Increased delay to ensure FlashList layout is ready
        } catch (error) {
          console.error('Error loading scroll position:', error);
          hasScrolledInitially.current = true;
        }
      };
      
      loadAndScrollToPosition();
    }
  }, [visible, chatId, listItems.length]);

  // Handle jump to bottom
  const handleJumpToBottom = () => {
    if (flashListRef.current) {
      try {
        flashListRef.current.scrollToEnd({ animated: true });
        setShowJumpToBottom(false);
      } catch (scrollError) {
        console.log('⚠️ Layout not ready for jump to bottom, retrying...');
        // Retry after a short delay
        setTimeout(() => {
          try {
            flashListRef.current?.scrollToEnd({ animated: true });
            setShowJumpToBottom(false);
          } catch (retryError) {
            console.error('❌ Failed to jump to bottom after retry:', retryError);
          }
        }, 100);
      }
    }
  };

  // Handle generate chat summary
  const handleGenerateSummary = async () => {
    if (!chatId) return;

    // Check if there are any messages
    if (messages.length === 0) {
      Alert.alert(
        'No Messages',
        'Start chatting to generate a summary!'
      );
      return;
    }

    console.log('📊 Generating chat summary...', { chatId, messageCount: messages.length });
    setIsGeneratingSummary(true);
    try {
      const summary = await CulturalService.generateChatSummary(chatId);
      console.log('✅ Summary generated:', {
        length: summary?.length,
        preview: summary ? summary.substring(0, 100) + '...' : 'EMPTY',
        type: typeof summary
      });
      
      if (!summary || summary.trim().length === 0) {
        console.log('❌ Summary is empty or null');
        Alert.alert('Error', 'Summary generation returned empty result. Please try again.');
        return;
      }
      
      console.log('📊 Setting summary to state and opening modal');
      setChatSummary(summary);
      setShowChatSummary(true);
      console.log('📊 Modal should be visible now');
    } catch (error) {
      console.error('❌ Failed to generate chat summary:', error);
      Alert.alert('Error', 'Failed to generate chat summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Handle send message
  const handleSend = async (text: string) => {
    if (!user?.id || !chatId) return;
    
    setIsSending(true);
    try {
      await sendMessage(chatId, user.id, text);
      
      // Immediately scroll to bottom after sending (newest message)
      requestAnimationFrame(() => {
        if (flashListRef.current) {
          try {
            flashListRef.current.scrollToEnd({ animated: true });
            setShowJumpToBottom(false);
          } catch (scrollError) {
            console.log('⚠️ Layout not ready for scroll after send, retrying...');
            // Retry after a short delay
            setTimeout(() => {
              try {
                flashListRef.current?.scrollToEnd({ animated: true });
                setShowJumpToBottom(false);
              } catch (retryError) {
                console.error('❌ Failed to scroll after send retry:', retryError);
              }
            }, 100);
          }
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle send image message
  const handleSendImage = async (imageUri: string, caption?: string) => {
    if (!user?.id || !chatId) return;
    
    setIsSending(true);
    try {
      await sendImageMessage(chatId, user.id, imageUri, caption);
      
      // Immediately scroll to bottom after sending (newest message)
      requestAnimationFrame(() => {
        if (flashListRef.current) {
          try {
            flashListRef.current.scrollToEnd({ animated: true });
            setShowJumpToBottom(false);
          } catch (scrollError) {
            console.log('⚠️ Layout not ready for scroll after image send, retrying...');
            // Retry after a short delay
            setTimeout(() => {
              try {
                flashListRef.current?.scrollToEnd({ animated: true });
                setShowJumpToBottom(false);
              } catch (retryError) {
                console.error('❌ Failed to scroll after image send retry:', retryError);
              }
            }, 100);
          }
        }
      });
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle copy message to clipboard
  const handleCopyMessage = async (message: Message) => {
    try {
      const textToCopy = message.type === 'image' && message.caption 
        ? message.caption 
        : message.text;
      
      if (textToCopy) {
        await Clipboard.setStringAsync(textToCopy);
        Alert.alert('Copied', 'Message copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy message:', error);
      Alert.alert('Error', 'Failed to copy message');
    }
  };

  // Handle delete message for current user
  const handleDeleteForMe = async (message: Message) => {
    if (!user?.id || !chatId) return;
    
    Alert.alert(
      'Delete Message',
      'Delete this message for yourself? Others will still see it.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessageForMe(chatId, message.id, user.id);
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  // Handle delete message for everyone
  const handleDeleteForEveryone = async (message: Message) => {
    if (!chatId) return;
    
    Alert.alert(
      'Delete for Everyone',
      'This message will be deleted for everyone in this chat.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessageForEveryone(chatId, message.id);
            } catch (error) {
              console.error('Failed to delete message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
  };

  // Handle add emoji reaction
  const handleAddReaction = (message: Message) => {
    if (!user?.id || !chatId) return;
    
    // Show alert with input for emoji
    if (Platform.OS === 'ios') {
      // On iOS, use prompt
      Alert.prompt(
        'Add Reaction',
        'Type an emoji to react with:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add',
            onPress: async (emoji?: string) => {
              if (emoji && emoji.trim()) {
                try {
                  await addReaction(chatId, message.id, emoji.trim(), user.id);
                } catch (error) {
                  console.error('Failed to add reaction:', error);
                  Alert.alert('Error', 'Failed to add reaction');
                }
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // On Android, show common emoji options
      Alert.alert(
        'Add Reaction',
        'Choose an emoji:',
        [
          { text: '❤️', onPress: () => addReaction(chatId, message.id, '❤️', user.id) },
          { text: '👍', onPress: () => addReaction(chatId, message.id, '👍', user.id) },
          { text: '😂', onPress: () => addReaction(chatId, message.id, '😂', user.id) },
          { text: '😮', onPress: () => addReaction(chatId, message.id, '😮', user.id) },
          { text: '😢', onPress: () => addReaction(chatId, message.id, '😢', user.id) },
          { text: '🙏', onPress: () => addReaction(chatId, message.id, '🙏', user.id) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  // Handle quick emoji reaction (from quick actions popover)
  const handleQuickReaction = async (message: Message, emoji: string) => {
    if (!user?.id || !chatId) return;
    
    try {
      await addReaction(chatId, message.id, emoji, user.id);
    } catch (error) {
      console.error('Failed to add quick reaction:', error);
      Alert.alert('Error', 'Failed to add reaction');
    }
  };

  // Handle AI Commands
  const handleAITranslate = async (message: Message) => {
    await handleTranslateMessage(message);
  };

  const handleAISummarize = async (message: Message) => {
    Alert.alert('AI Summarize', 'Summarize feature coming soon!');
  };

  const handleAIExplain = async (message: Message) => {
    Alert.alert('AI Explain', 'Explain feature coming soon!');
  };

  const handleAIRewrite = async (message: Message) => {
    Alert.alert('AI Rewrite', 'Rewrite feature coming soon!');
  };

  // Handle message press (for retry on failed messages, or translate from quick actions)
  const handleMessagePress = async (message: Message) => {
    // If message is failed and user taps retry button, retry it
    if (message.status === 'failed' && message.senderId === user?.id && chatId) {
      try {
        await retryFailedMessage(chatId, message.id);
      } catch (error) {
        console.error('Failed to retry message:', error);
        Alert.alert('Error', 'Failed to retry message. Please try again.');
      }
    } else if ((message.type === 'text' && message.text) || (message.type === 'image' && message.caption)) {
      // For text messages or images with captions, trigger translation (called from quick actions)
      await handleTranslateMessage(message);
    }
  };

  // Handle translate message
  const handleTranslateMessage = async (message: Message) => {
    // Check if message has text to translate
    const textToTranslate = message.type === 'text' ? message.text : message.caption;
    
    if (!textToTranslate) {
      Alert.alert('Error', 'No text to translate in this message');
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
      const targetLanguage = user?.preferredLanguage || 'en';
      
      // Check if translation already exists
      if (message.translations && message.translations[targetLanguage]) {
        console.log('✅ Translation already exists, showing it');
        return;
      }
      
      // Get fresh ID token to ensure auth is valid
      const idToken = await auth.currentUser.getIdToken(true);
      console.log('🔑 Got auth token:', idToken.substring(0, 20) + '...');
      
      // Show loading
      console.log('🌐 Translating message...', {
        messageId: message.id,
        chatId: chatId,
        userId: auth.currentUser.uid,
        targetLanguage,
      });
      
      // Call the Cloud Function
      const translateFn = httpsCallable(functions, 'translateMessage');
      const result: any = await translateFn({
        messageId: message.id,
        chatId: chatId,
        targetLanguage,
        messageText: textToTranslate, // Pass the actual text to translate
      });

      console.log('✅ Translation result:', JSON.stringify(result.data, null, 2));
      console.log('🔍 Cultural analysis in result:', {
        hasCulturalAnalysis: !!result.data.culturalAnalysis,
        culturalPhrasesCount: result.data.culturalAnalysis?.culturalPhrases?.length || 0,
        slangExpressionsCount: result.data.culturalAnalysis?.slangExpressions?.length || 0,
        fullCulturalAnalysis: result.data.culturalAnalysis,
      });

      if (result.data.success) {
        // Prepare translation object with cultural analysis
        const translationData = {
          text: result.data.translated,
          culturalAnalysis: result.data.culturalAnalysis ? {
            culturalPhrases: result.data.culturalAnalysis.culturalPhrases || [],
            slangExpressions: result.data.culturalAnalysis.slangExpressions || [],
          } : undefined,
        };
        
        console.log('📦 Translation data to save:', {
          text: translationData.text.substring(0, 50),
          hasCulturalAnalysis: !!translationData.culturalAnalysis,
          culturalPhrasesCount: translationData.culturalAnalysis?.culturalPhrases?.length || 0,
          slangExpressionsCount: translationData.culturalAnalysis?.slangExpressions?.length || 0,
        });

        // Save translation locally to SQLite (with full cultural analysis object)
        const { SQLiteService } = await import('@/database/SQLiteService');
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
        
        console.log('✅ Translation saved locally with cultural analysis and UI updated', {
          culturalPhrasesFound: translationData.culturalAnalysis?.culturalPhrases.length || 0,
          slangExpressionsFound: translationData.culturalAnalysis?.slangExpressions.length || 0,
        });
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
  };

  // Handle long press (for delete, react, copy)
  const handleLongPress = (message: Message) => {
    const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(user?.id || '');
    
    // If failed message, show delete option only
    if (message.status === 'failed' && message.senderId === user?.id) {
      Alert.alert(
        'Delete Failed Message',
        'This message failed to send. Do you want to delete it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteForMe(message),
          },
        ]
      );
      return;
    }
    
    // Don't show menu for deleted messages
    if (isDeleted) return;
    
    // Open the message options sheet
    setSelectedMessage(message);
    setShowMessageOptions(true);
  };

  // Build message options for the sheet
  const messageOptions = useMemo(() => {
    if (!selectedMessage) return [];
    
    const options = [];
    
    // Copy option
    options.push({
      id: 'copy',
      label: 'Copy',
      icon: 'copy-outline' as const,
      onPress: () => handleCopyMessage(selectedMessage),
    });
    
    // Delete for me
    options.push({
      id: 'delete-me',
      label: 'Delete for Me',
      icon: 'trash-outline' as const,
      onPress: () => handleDeleteForMe(selectedMessage),
      destructive: true,
    });
    
    // Delete for everyone (only for own messages)
    if (selectedMessage.senderId === user?.id) {
      options.push({
        id: 'delete-everyone',
        label: 'Delete for Everyone',
        icon: 'trash' as const,
        onPress: () => handleDeleteForEveryone(selectedMessage),
        destructive: true,
      });
    }
    
    return options;
  }, [selectedMessage, user, handleCopyMessage, handleDeleteForMe, handleDeleteForEveryone]);

  // Render list item - memoized for performance
  const renderItem: ListRenderItem<ListItem> = useCallback(({ item, index }) => {
    if (item.type === 'date') {
      return <DateSeparator date={item.data} />;
    }
    
    if (item.type === 'unread') {
      return null; // UnreadSeparator not needed for now
    }
    
    // Message
    const message = item.data;
    const showAvatar = shouldShowAvatar(index);
    const senderProfile = message.senderId !== user?.id ? getUserProfile(message.senderId) : null;
    
    return (
      <MessageBubble
        message={message}
        currentUserId={user!.id}
        senderName={senderProfile?.displayName}
        senderAvatar={senderProfile?.profilePictureUrl}
        showAvatar={showAvatar}
        showTimestamp={true}
        isGroupChat={isGroupChat}
        preferredLanguage={user?.preferredLanguage || 'en'}
        onPress={handleMessagePress}
        onLongPress={handleLongPress}
        onQuickReaction={handleQuickReaction}
        onAITranslate={handleAITranslate}
        onAISummarize={handleAISummarize}
        onAIExplain={handleAIExplain}
        onAIRewrite={handleAIRewrite}
      />
    );
  }, [user, isGroupChat, getUserProfile, handleMessagePress, handleLongPress, handleQuickReaction, handleAITranslate, handleAISummarize, handleAIExplain, handleAIRewrite]);

  // Get item type for FlashList optimization
  const getItemType = (item: ListItem) => {
    return item.type;
  };

  if (!user) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar 
        barStyle={theme.colors.background === '#000000' ? 'light-content' : 'dark-content'} 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <Animated.View style={[styles.container, { 
        backgroundColor: theme.colors.background,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
        paddingBottom: keyboardHeight,
      }]}>
            
            {/* Header */}
            <View style={[styles.header, { 
              backgroundColor: theme.colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }]}>
              <Pressable onPress={handleClose} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </Pressable>

              <View style={styles.headerInfo}>
                {isGroupChat ? (
                  // Group Chat Header
                  <>
                    <View style={styles.avatarWithIndicator}>
                      <Avatar
                        name={currentChat?.groupName || 'Group'}
                        imageUrl={currentChat?.groupIcon}
                        size={36}
                      />
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]} numberOfLines={1}>
                        {currentChat?.groupName || 'Group Chat'}
                      </Text>
                      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {currentChat?.participants.length || 0} members
                      </Text>
                    </View>
                  </>
                ) : (
                  // One-on-One Chat Header
                  <>
                    <View style={styles.avatarWithIndicator}>
                      <Avatar
                        name={otherUser?.displayName || 'User'}
                        imageUrl={otherUser?.profilePictureUrl}
                        size={36}
                      />
                      {/* Green dot for online status - from centralized PresenceStore */}
                      {(() => {
                        const otherUserId = currentChat?.participants.find(id => id !== user?.id);
                        const presence = otherUserId ? presenceMap.get(otherUserId) : null;
                        return presence?.isOnline && (
                          <View style={[styles.onlineDot, { backgroundColor: theme.colors.success }]} />
                        );
                      })()}
                    </View>
                    <View style={styles.headerText}>
                      <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]} numberOfLines={1}>
                        {otherUser?.displayName || 'Chat'}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.headerActions}>
                {/* Summarize Chat button */}
                <Pressable 
                  style={styles.actionButton}
                  onPress={handleGenerateSummary}
                  disabled={isGeneratingSummary || messages.length === 0}
                >
                  {isGeneratingSummary ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Ionicons 
                      name="sparkles-outline" 
                      size={22} 
                      color={messages.length === 0 ? theme.colors.textSecondary : theme.colors.primary} 
                    />
                  )}
                </Pressable>
                
                {/* Three-dot menu for both group and one-on-one chats */}
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => isGroupChat ? setShowGroupSettings(true) : setShowChatMenu(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text} />
                </Pressable>
              </View>

            </View>

            {/* Messages List */}
            <FlashList
                ref={flashListRef}
                data={listItems}
                renderItem={renderItem}
                keyExtractor={(item, index) => 
                  item.type === 'message' 
                    ? item.data.id 
                    : `${item.type}-${index}`
                }
                getItemType={getItemType}
                estimatedItemSize={80}
                drawDistance={800}
                estimatedListSize={{ height: 600, width: 400 }}
                contentContainerStyle={styles.messagesListContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                removeClippedSubviews={Platform.OS === 'android' ? false : true}
                onScroll={(event) => {
                  // Show jump to bottom button if user scrolls up
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
                  setShowJumpToBottom(!isNearBottom && listItems.length > 10);
                  
                  // Track scroll position for saving later
                  currentScrollPosition.current.offset = contentOffset.y;
                }}
                onViewableItemsChanged={({ viewableItems }) => {
                  // Track first visible item for scroll position restoration
                  if (viewableItems.length > 0 && viewableItems[0].item.type === 'message') {
                    const firstVisibleIndex = messages.findIndex(
                      msg => msg.id === viewableItems[0].item.data.id
                    );
                    if (firstVisibleIndex >= 0) {
                      currentScrollPosition.current.firstVisibleIndex = firstVisibleIndex;
                    }
                  }
                }}
                viewabilityConfig={{
                  itemVisiblePercentThreshold: 50,
                }}
                scrollEventThrottle={400}
              />

            {/* Jump to Bottom Button */}
            {showJumpToBottom && (
              <Pressable
                style={[styles.jumpToBottomButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleJumpToBottom}
              >
                <Ionicons name="arrow-down" size={24} color="#fff" />
              </Pressable>
            )}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator typingUserNames={typingUsers.map(u => u.userName)} />
            )}

            {/* Message Input */}
            <MessageInput
              onSend={handleSend}
              onSendImage={handleSendImage}
              isSending={isSending}
              chatId={chatId || undefined}
              userId={user?.id}
              userName={user?.displayName}
            />
      </Animated.View>

      {/* Group Settings Modal */}
      {isGroupChat && (
        <GroupSettingsModal
          visible={showGroupSettings}
          chatId={chatId}
          onClose={() => setShowGroupSettings(false)}
          onChatDeleted={onClose} // Close parent ChatModal when user leaves group
        />
      )}

      {/* Message Options Sheet */}
      <MessageOptionsSheet
        visible={showMessageOptions}
        message={selectedMessage}
        options={messageOptions}
        onClose={() => {
          setShowMessageOptions(false);
          setSelectedMessage(null);
        }}
      />

      {/* One-on-One Chat Menu Modal */}
      {!isGroupChat && (
        <Modal
          visible={showChatMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowChatMenu(false)}
        >
          <Pressable 
            style={styles.menuOverlay}
            onPress={() => setShowChatMenu(false)}
          >
            <View style={[styles.menuContainer, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Chat Options</Text>
              
              <Pressable
                style={[styles.menuOption, { borderBottomColor: theme.colors.border }]}
                onPress={() => {
                  setShowChatMenu(false);
                  Alert.alert(
                    'Delete Chat',
                    'Are you sure you want to delete this chat? This will only delete it from your device.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            if (chatId && user?.id) {
                              // Delete all messages for this user
                              const msgs = useChatStore.getState().messages;
                              for (const msg of msgs) {
                                await deleteMessageForMe(chatId, msg.id, user.id);
                              }
                              onClose();
                              Alert.alert('Success', 'Chat deleted from your device');
                            }
                          } catch (error) {
                            console.error('Error deleting chat:', error);
                            Alert.alert('Error', 'Failed to delete chat');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
                <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Delete Chat</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Chat Summary Modal - REBUILT FROM SCRATCH */}
      {showChatSummary && (
        <Modal
          visible={showChatSummary}
          transparent
          animationType="fade"
          onRequestClose={() => setShowChatSummary(false)}
        >
          <View style={styles.summaryOverlay}>
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.background }]}>
              {/* Header */}
              <View style={[styles.summaryCardHeader, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.summaryCardTitle}>✨ Chat Summary</Text>
                <Pressable 
                  onPress={() => setShowChatSummary(false)}
                  hitSlop={8}
                >
                  <Text style={styles.summaryCardClose}>✕</Text>
                </Pressable>
              </View>

              {/* Content */}
              <View style={styles.summaryCardBody}>
                {isGeneratingSummary ? (
                  <View style={styles.summaryCardLoading}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.summaryCardLoadingText, { color: theme.colors.textSecondary }]}>
                      Generating summary...
                    </Text>
                  </View>
                ) : chatSummary ? (
                  <ScrollView 
                    style={styles.summaryCardScroll}
                    contentContainerStyle={styles.summaryCardScrollContent}
                    showsVerticalScrollIndicator={true}
                  >
                    <Text style={[styles.summaryCardText, { color: theme.colors.text }]}>
                      {chatSummary}
                    </Text>
                  </ScrollView>
                ) : (
                  <Text style={[styles.summaryCardText, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
                    No summary available.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 0,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8, // Minimal padding since SafeAreaView handles notch
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWithIndicator: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesListContent: {
    paddingVertical: 8,
  },
  jumpToBottomButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Chat Summary Modal - SIMPLE AND CLEAN
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryCard: {
    width: '98%',
    height: 600, // 80% of screen height
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden', // Ensure content doesn't overflow
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCardClose: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCardBody: {
    flex: 1, // Takes all remaining space after header
  },
  summaryCardScroll: {
    flex: 1,
  },
  summaryCardScrollContent: {
    padding: 20,
  },
  summaryCardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  summaryCardLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  summaryCardLoadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  closeButton: {
    padding: 4,
  },
});

