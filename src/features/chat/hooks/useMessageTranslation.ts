import { Message, MessageTranslation } from '@/shared/types';
import { useEffect, useState } from 'react';

interface UseMessageTranslationProps {
  message: Message;
  preferredLanguage: string;
  onAITranslate?: (message: Message) => void;
}

interface UseMessageTranslationReturn {
  // Translation state
  showTranslation: boolean;
  showTranslatedText: boolean;
  isTranslating: boolean;
  
  // Translation data
  hasTranslation: boolean;
  translationData: MessageTranslation | string | null;
  translatedText: string | null;
  needsTranslation: boolean; // Does this message need translation?
  
  // Actions
  handleTranslationSwap: () => void;
  setShowTranslation: (show: boolean) => void;
  setIsTranslating: (translating: boolean) => void;
}

export const useMessageTranslation = ({
  message,
  preferredLanguage,
  onAITranslate,
}: UseMessageTranslationProps): UseMessageTranslationReturn => {
  // Translation state - automatically show translation when it becomes available
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Translation swap state - true = show translation, false = show original
  const [showTranslatedText, setShowTranslatedText] = useState(false);
  
  // Translation loading state
  const [isTranslating, setIsTranslating] = useState(false);

  // Check if message needs translation
  // If message's detected language matches user's preferred language, no translation needed
  const messageLanguage = message.detectedLanguage || message.originalLanguage;
  const needsTranslation = messageLanguage !== preferredLanguage;

  // Check if translation exists for user's preferred language
  const hasTranslation = !!(message.translations && message.translations[preferredLanguage]);
  const translationData: MessageTranslation | string | null = hasTranslation ? (message.translations![preferredLanguage] || null) : null;
  const translatedText = translationData 
    ? (typeof translationData === 'string' ? translationData : translationData.text)
    : null;
  
  // Auto-show translation when it first becomes available (ONLY if message needs translation)
  useEffect(() => {
    if (translatedText && needsTranslation) {
      setShowTranslation(true);
      // When translation becomes available, show it by default
      setShowTranslatedText(true);
      // Stop translation animation when translation completes
      setIsTranslating(false);
    }
  }, [translatedText, needsTranslation]);

  // Handle translation swap
  const handleTranslationSwap = () => {
    if (translatedText) {
      // If translation exists, toggle between original and translated
      setShowTranslatedText(!showTranslatedText);
    } else {
      // If no translation exists, trigger translation with magical animation
      setIsTranslating(true);
      // Trigger the actual translation - animation will stop when translation completes
      onAITranslate?.(message);
    }
  };

  return {
    // Translation state
    showTranslation: showTranslation && needsTranslation, // Only show if translation needed
    showTranslatedText,
    isTranslating,
    
    // Translation data
    hasTranslation: hasTranslation,
    translationData: translationData,
    translatedText: translatedText,
    needsTranslation: needsTranslation, // Export this so components know if translation is needed
    
    // Actions
    handleTranslationSwap,
    setShowTranslation,
    setIsTranslating,
  };
};
