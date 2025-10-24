/**
 * Cultural Context Types
 * TypeScript interfaces for cultural analysis and UI components
 */

export interface CulturalPhrase {
  phrase: string;
  position: [number, number];
  explanation: string;
  culturalContext: string;
  examples: string[];
  confidence: number;
}

export interface SlangExpression {
  slang: string;
  position: [number, number];
  standardMeaning: string;
  translatedWord?: string;
  fullExplanation?: string;
  usage: string;
  confidence: number;
}

export interface CulturalAnalysisResult {
  messageId: string;
  culturalPhrases: CulturalPhrase[];
  slangExpressions: SlangExpression[];
  analysisTimestamp: number;
  webSearchUsed: boolean;
}

export interface CulturalPreferences {
  showCulturalHints: boolean;
  showSlangExplanations: boolean;
  useWebSearch: boolean;
  culturalHighlightColor: string;
  slangHighlightColor: string;
  autoAnalyze: boolean;
}

export interface CulturalHighlightProps {
  phrase: CulturalPhrase | SlangExpression;
  type: 'cultural' | 'slang';
  onTap: (phrase: CulturalPhrase | SlangExpression) => void;
  children: React.ReactNode;
}

export interface CulturalPopupProps {
  phrase: CulturalPhrase | SlangExpression;
  type: 'cultural' | 'slang';
  visible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export interface CulturalCacheEntry {
  phrase: string;
  language: string;
  analysis: CulturalAnalysisResult;
  cachedAt: number;
  expiresAt: number;
}

export interface CulturalStoreState {
  preferences: CulturalPreferences;
  cache: Map<string, CulturalCacheEntry>;
  isLoading: boolean;
  error: string | null;
}

export interface CulturalStoreActions {
  updatePreferences: (preferences: Partial<CulturalPreferences>) => void;
  addToCache: (key: string, entry: CulturalCacheEntry) => void;
  getFromCache: (key: string) => CulturalCacheEntry | null;
  clearCache: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
