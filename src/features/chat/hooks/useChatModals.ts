/**
 * useChatModals Hook
 * 
 * Handles all modal state management for chat:
 * - Group settings modal
 * - Chat menu modal
 * - Message options sheet
 * - Chat summary modal
 * - Cultural analysis modal
 */

import { CulturalService } from '@/services/firebase';
import { Message } from '@/shared/types';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface UseChatModalsOptions {
  chatId: string | null;
  userId: string | undefined;
  messages: Message[];
}

export function useChatModals({
  chatId,
  userId,
  messages,
}: UseChatModalsOptions) {
  // Modal states
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showChatSummary, setShowChatSummary] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false);

  // Handle generate chat summary
  const handleGenerateSummary = useCallback(async () => {
    if (!chatId) return;

    // Check if there are any messages
    if (messages.length === 0) {
      Alert.alert(
        'No Messages',
        'Start chatting to generate a summary!'
      );
      return;
    }

    setIsGeneratingSummary(true);
    try {
      // Generate summary in user's preferred language
      const summary = await CulturalService.generateChatSummary(chatId, userId?.preferredLanguage || 'en');
      
      if (!summary || summary.trim().length === 0) {
        Alert.alert('Error', 'Summary generation returned empty result. Please try again.');
        return;
      }
      
      setChatSummary(summary);
      setShowChatSummary(true);
    } catch (error) {
      console.error('❌ Failed to generate chat summary:', error);
      Alert.alert('Error', 'Failed to generate chat summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [chatId, userId?.preferredLanguage, messages.length]);

  // Handle cultural analysis
  const handleCulturalAnalysis = useCallback(async (message: Message) => {
    if (!userId?.preferredLanguage || !chatId) return;
    
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');
      
      const analyzeFn = httpsCallable(functions, 'analyzeCulturalContext');
      const result: any = await analyzeFn({
        messageId: message.id,
        chatId: chatId,
        messageText: message.text,
        targetLanguage: userId.preferredLanguage,
      });
      
      if (result.data.success && result.data.culturalAnalysis) {
        // Show cultural analysis results in a popup or alert
        const analysis = result.data.culturalAnalysis;
        const culturalPhrases = analysis.culturalPhrases || [];
        const slangExpressions = analysis.slangExpressions || [];
        
        let message = '';
        if (culturalPhrases.length > 0) {
          message += 'Cultural Phrases:\n';
          culturalPhrases.forEach((phrase: any) => {
            message += `• "${phrase.phrase}": ${phrase.explanation}\n`;
          });
          message += '\n';
        }
        
        if (slangExpressions.length > 0) {
          message += 'Slang/Idioms:\n';
          slangExpressions.forEach((slang: any) => {
            message += `• "${slang.slang}": ${slang.standardMeaning}\n`;
          });
        }
        
        if (message) {
          Alert.alert('Cultural Analysis', message);
        } else {
          Alert.alert('Cultural Analysis', 'No cultural phrases or slang detected in this message.');
        }
      }
    } catch (error: any) {
      console.error('Cultural analysis failed:', error);
      Alert.alert('Analysis Failed', 'Could not analyze cultural context. Please try again.');
    }
  }, [userId?.preferredLanguage, chatId]);

  // Handle copy message to clipboard
  const handleCopyMessage = useCallback(async (message: Message) => {
    try {
      const { default: Clipboard } = await import('expo-clipboard');
      const textToCopy = message.type === 'image' && message.caption 
        ? message.caption 
        : message.text;
      
      if (textToCopy) {
        await Clipboard.setStringAsync(textToCopy);
        
        // Show brief visual feedback
        setShowCopiedFeedback(true);
        setTimeout(() => {
          setShowCopiedFeedback(false);
        }, 1500); // Hide after 1.5 seconds
      }
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, []);

  // Handle long press (for delete, react, copy)
  const handleLongPress = useCallback((message: Message) => {
    const isDeleted = message.deletedForEveryone || (message.deletedFor || []).includes(userId?.id || '');
    
    // If failed message, show delete option only
    if (message.status === 'failed' && message.senderId === userId?.id) {
      Alert.alert(
        'Delete Failed Message',
        'This message failed to send. Do you want to delete it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              // TODO: Implement delete for me functionality
              console.log('Delete failed message:', message.id);
            },
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
  }, [userId?.id]);

  // Handle AI Commands
  const handleAITranslate = useCallback(async (message: Message, onTranslateMessage: (message: Message) => Promise<void>) => {
    await onTranslateMessage(message);
  }, []);

  const handleAISummarize = useCallback(async (message: Message) => {
    // Generate chat summary when long-pressing message
    await handleGenerateSummary();
  }, [handleGenerateSummary]);

  const handleAIExplain = useCallback(async (message: Message) => {
    Alert.alert('AI Explain', 'Explain feature coming soon!');
  }, []);

  const handleAIRewrite = useCallback(async (message: Message) => {
    Alert.alert('AI Rewrite', 'Rewrite feature coming soon!');
  }, []);

  // Build message options for the sheet
  const messageOptions = useCallback(() => {
    if (!selectedMessage) return [];
    
    const options = [];
    
    // Copy option
    options.push({
      id: 'copy',
      label: 'Copy',
      icon: 'copy-outline' as const,
      onPress: () => handleCopyMessage(selectedMessage),
    });
    
    // Cultural Analysis option
    options.push({
      id: 'cultural-analysis',
      label: 'Explain Slang',
      icon: 'bulb-outline' as const,
      onPress: () => handleCulturalAnalysis(selectedMessage),
    });
    
    return options;
  }, [selectedMessage, handleCopyMessage, handleCulturalAnalysis]);

  // Close all modals
  const closeAllModals = useCallback(() => {
    setShowGroupSettings(false);
    setShowChatMenu(false);
    setShowMessageOptions(false);
    setSelectedMessage(null);
    setShowChatSummary(false);
    setChatSummary(null);
    setIsGeneratingSummary(false);
  }, []);

  return {
    // Modal states
    showGroupSettings,
    setShowGroupSettings,
    showChatMenu,
    setShowChatMenu,
    showMessageOptions,
    setShowMessageOptions,
    selectedMessage,
    setSelectedMessage,
    showChatSummary,
    setShowChatSummary,
    chatSummary,
    setChatSummary,
    isGeneratingSummary,
    showCopiedFeedback,
    
    // Actions
    handleGenerateSummary,
    handleCulturalAnalysis,
    handleCopyMessage,
    handleLongPress,
    handleAITranslate,
    handleAISummarize,
    handleAIExplain,
    handleAIRewrite,
    messageOptions,
    closeAllModals,
  };
}
