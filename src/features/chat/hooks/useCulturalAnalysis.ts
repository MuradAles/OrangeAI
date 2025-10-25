import { Message } from '@/shared/types';
import { useEffect, useState } from 'react';

interface UseCulturalAnalysisProps {
  message: Message;
  chatId: string;
  preferredLanguage: string;
  translatedText?: string;
}

interface CulturalAnalysis {
  messageExplanation?: string; // Overall explanation of what the message means
  culturalPhrases: {
    phrase: string;
    position: [number, number];
    explanation: string;
    culturalContext: string;
    examples: string[];
    confidence: number;
  }[];
  slangExpressions: {
    slang: string;
    position: [number, number];
    standardMeaning: string;
    usage: string;
    confidence: number;
  }[];
}

interface UseCulturalAnalysisReturn {
  // State
  culturalAnalysis: CulturalAnalysis | null;
  showCulturalPopup: boolean;
  selectedPhrase: {
    phrase: any;
    type: 'cultural' | 'slang';
  } | null;
  isAnalyzing: boolean;
  
  // Actions
  handleCulturalAnalysis: () => Promise<void>;
  setShowCulturalPopup: (show: boolean) => void;
  setSelectedPhrase: (phrase: any) => void;
}

export const useCulturalAnalysis = ({
  message,
  chatId,
  preferredLanguage,
  translatedText,
}: UseCulturalAnalysisProps): UseCulturalAnalysisReturn => {
  // Cultural analysis state
  const [culturalAnalysis, setCulturalAnalysis] = useState<CulturalAnalysis | null>(null);
  const [showCulturalPopup, setShowCulturalPopup] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<{
    phrase: any;
    type: 'cultural' | 'slang';
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  // Load existing cultural analysis from SQLite
  useEffect(() => {
    const loadCulturalAnalysis = async () => {
      if (!message.id || !chatId) return;
      
      try {
        const { SQLiteService } = await import('@/database/SQLiteService');
        const existingAnalysis = await SQLiteService.getCulturalAnalysis(message.id, chatId);
        
        if (existingAnalysis) {
          setCulturalAnalysis({
            messageExplanation: existingAnalysis.messageExplanation,
            culturalPhrases: existingAnalysis.culturalPhrases,
            slangExpressions: existingAnalysis.slangExpressions
          });
        }
      } catch {
        // Silently ignore database errors - table might not exist yet
        // console.log('Failed to load cultural analysis:', error);
      }
    };

    loadCulturalAnalysis();
  }, [message.id, chatId]);

  const handleCulturalAnalysis = async () => {
    if (!message.text || !preferredLanguage) return;
    
    
    try {
      // Check if we already have cultural analysis in SQLite WITH messageExplanation
      try {
        const { SQLiteService } = await import('@/database/SQLiteService');
        const existingAnalysis = await SQLiteService.getCulturalAnalysis(message.id, chatId || '');
        
        // Only use cached data if it has messageExplanation (new field)
        if (existingAnalysis && existingAnalysis.messageExplanation) {
          // Load from SQLite
          setCulturalAnalysis({
            messageExplanation: existingAnalysis.messageExplanation,
            culturalPhrases: existingAnalysis.culturalPhrases,
            slangExpressions: existingAnalysis.slangExpressions
          });
          return;
        }
        // If cached data is missing messageExplanation, re-fetch
      } catch (dbError) {
        // Ignore database errors
      }

      // Show loading state and start animation
      setIsAnalyzing(true);
      
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');
      
      const analyzeFn = httpsCallable(functions, 'analyzeCulturalContext');
      
      const result: any = await analyzeFn({
        messageId: message.id,
        chatId: chatId || 'temp',
        messageText: message.text, // Analyze the ORIGINAL text
        translatedText: translatedText || '', // Include translated text
        targetLanguage: preferredLanguage,
      });
      
      if (result.data.success && result.data.culturalAnalysis) {
        const analysis = result.data.culturalAnalysis;
        
        // Save to SQLite
        try {
          const { SQLiteService } = await import('@/database/SQLiteService');
          await SQLiteService.saveCulturalAnalysis(
            message.id,
            chatId || '',
            analysis.culturalPhrases || [],
            analysis.slangExpressions || [],
            analysis.messageExplanation
          );
        } catch (saveError) {
          // Ignore save errors
        }
        
        // Update state
        setCulturalAnalysis(analysis);
      }
    } catch (error: any) {
      console.error('🎭 Cultural analysis failed:', error);
      setCulturalAnalysis(null); // Reset on error
    } finally {
      // Stop animation when done (success or error)
      setIsAnalyzing(false);
    }
  };

  return {
    // State
    culturalAnalysis,
    showCulturalPopup,
    selectedPhrase,
    isAnalyzing,
    
    // Actions
    handleCulturalAnalysis,
    setShowCulturalPopup,
    setSelectedPhrase,
  };
};