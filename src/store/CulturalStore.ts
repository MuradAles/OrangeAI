/**
 * Cultural Store
 * State management for cultural preferences and caching
 */

import { create } from 'zustand';
import { CulturalAnalysisResult, CulturalCacheEntry, CulturalPreferences } from '../shared/types/CulturalTypes';

interface CulturalStoreState {
  preferences: CulturalPreferences;
  cache: Map<string, CulturalCacheEntry>;
  isLoading: boolean;
  error: string | null;
}

interface CulturalStoreActions {
  updatePreferences: (preferences: Partial<CulturalPreferences>) => void;
  addToCache: (key: string, entry: CulturalCacheEntry) => void;
  getFromCache: (key: string) => CulturalCacheEntry | null;
  clearCache: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

type CulturalStore = CulturalStoreState & CulturalStoreActions;

const defaultPreferences: CulturalPreferences = {
  showCulturalHints: true,
  showSlangExplanations: true,
  useWebSearch: true,
  culturalHighlightColor: '#FFC107',
  slangHighlightColor: '#28A745',
  autoAnalyze: true, // Re-enabled - language issue fixed!
};

export const useCulturalStore = create<CulturalStore>((set, get) => ({
  // State
  preferences: defaultPreferences,
  cache: new Map(),
  isLoading: false,
  error: null,

  // Actions
  updatePreferences: (newPreferences) => {
    set((state) => ({
      preferences: { ...state.preferences, ...newPreferences },
    }));
  },

  addToCache: (key: string, entry: CulturalCacheEntry) => {
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(key, entry);
      return { cache: newCache };
    });
  },

  getFromCache: (key: string) => {
    const { cache } = get();
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry is expired
    if (Date.now() > entry.expiresAt) {
      // Remove expired entry
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.delete(key);
        return { cache: newCache };
      });
      return null;
    }
    
    return entry;
  },

  clearCache: () => {
    set({ cache: new Map() });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

// Cache utility functions
export const createCacheKey = (phrase: string, language: string): string => {
  return `${phrase.toLowerCase()}_${language}`;
};

export const createCacheEntry = (
  phrase: string,
  language: string,
  analysis: CulturalAnalysisResult,
  ttlHours: number = 24
): CulturalCacheEntry => {
  const now = Date.now();
  return {
    phrase: phrase.toLowerCase(),
    language,
    analysis,
    cachedAt: now,
    expiresAt: now + (ttlHours * 60 * 60 * 1000), // TTL in milliseconds
  };
};

export default useCulturalStore;
