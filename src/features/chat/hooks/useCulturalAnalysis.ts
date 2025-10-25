/**
 * Hook for analyzing messages for cultural context and slang
 */

import { CulturalService } from '@/services/firebase';
import { CulturalAnalysisResult } from '@/shared/types/CulturalTypes';
import { createCacheEntry, createCacheKey, useCulturalStore } from '@/store/CulturalStore';
import { useCallback, useEffect, useState } from 'react';

interface UseCulturalAnalysisOptions {
  messageId: string;
  messageText: string;
  languageCode: string;
  chatMood?: string;
  relationship?: string;
  enabled?: boolean;
}

export const useCulturalAnalysis = ({
  messageId,
  messageText,
  languageCode,
  chatMood,
  relationship,
  enabled = true,
}: UseCulturalAnalysisOptions) => {
  const { preferences, getFromCache, addToCache, setLoading, setError } = useCulturalStore();
  const [analysis, setAnalysis] = useState<CulturalAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMessage = useCallback(async () => {
    // Skip if disabled or message is empty
    if (!enabled || !messageText || !preferences.autoAnalyze) {
      return;
    }

    // Debug: Log the language code being used
    
    // Skip if language is invalid
    if (!languageCode || typeof languageCode !== 'string') {
      console.warn('⚠️ Skipping cultural analysis - invalid languageCode:', languageCode);
      return;
    }

    // Check cache first
    const cacheKey = createCacheKey(messageText, languageCode);
    const cached = getFromCache(cacheKey);
    
    if (cached) {
      setAnalysis(cached.analysis);
      return;
    }

    // Analyze message
    setIsAnalyzing(true);
    setLoading(true);
    setError(null);

    try {
      const result = await CulturalService.analyzeCulturalContext(
        messageText,
        languageCode,
        {
          useWebSearch: preferences.useWebSearch,
          chatMood,
          relationship,
        }
      );

      // Add message ID to result
      const analysisWithId: CulturalAnalysisResult = {
        ...result,
        messageId,
      };

      setAnalysis(analysisWithId);
      
      // Cache the result
      const cacheEntry = createCacheEntry(messageText, languageCode, analysisWithId);
      addToCache(cacheKey, cacheEntry);
    } catch (error) {
      console.error('Cultural analysis failed:', error);
      setError('Failed to analyze cultural context');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  }, [
    messageId,
    messageText,
    languageCode,
    chatMood,
    relationship,
    enabled,
    preferences.autoAnalyze,
    preferences.useWebSearch,
    getFromCache,
    addToCache,
    setLoading,
    setError,
  ]);

  // Auto-analyze on mount and when parameters change
  useEffect(() => {
    analyzeMessage();
  }, [analyzeMessage]);

  return {
    analysis,
    isAnalyzing,
    reanalyze: analyzeMessage,
  };
};

