/**
 * Unit tests for CulturalAnalysisService
 */

import { CulturalAnalysisService, CulturalPhrase } from './CulturalAnalysisService';

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Mock Firebase logger
jest.mock('firebase-functions/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

import { generateText } from 'ai';
import * as logger from 'firebase-functions/logger';

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

describe('CulturalAnalysisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCulturalContext', () => {
    it('should analyze cultural context successfully', async () => {
      // Mock cultural phrases response
      const culturalPhrasesResponse = JSON.stringify([
        {
          phrase: "break a leg",
          position: [0, 12],
          explanation: "Theater idiom meaning 'good luck'",
          culturalContext: "Used before performances to wish success",
          examples: ["Break a leg in your presentation!", "Break a leg tonight!"],
          confidence: 95
        }
      ]);

      // Mock slang expressions response
      const slangExpressionsResponse = JSON.stringify([
        {
          slang: "lol",
          position: [15, 18],
          standardMeaning: "laugh out loud",
          usage: "Used to indicate something is funny",
          confidence: 98
        }
      ]);

      // Mock web search enhancement response
      const webSearchResponse = JSON.stringify({
        explanation: "Detailed explanation of the phrase",
        culturalContext: "Cultural background and significance",
        examples: ["Example 1", "Example 2", "Example 3"]
      });

      // Setup mock responses
      mockGenerateText
        .mockResolvedValueOnce({ text: culturalPhrasesResponse, content: culturalPhrasesResponse } as any)
        .mockResolvedValueOnce({ text: slangExpressionsResponse, content: slangExpressionsResponse } as any)
        .mockResolvedValueOnce({ text: webSearchResponse, content: webSearchResponse } as any);

      const result = await CulturalAnalysisService.analyzeCulturalContext(
        "break a leg lol",
        "break a leg lol", // translated text (same for test)
        "en",
        "test-message-id"
      );

      expect(result.messageId).toBe("test-message-id");
      expect(result.culturalPhrases).toHaveLength(1);
      expect(result.slangExpressions).toHaveLength(1);
      expect(result.webSearchUsed).toBe(true);
      expect(result.analysisTimestamp).toBeGreaterThan(0);

      expect(logger.info).toHaveBeenCalledWith('Starting cultural analysis', {
        messageId: "test-message-id",
        textLength: 15,
        language: "en"
      });
    });

    it('should handle errors gracefully', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('AI API error'));

      const result = await CulturalAnalysisService.analyzeCulturalContext(
        "test text",
        "test text", // translated text (same for test)
        "en",
        "test-message-id"
      );

      expect(result.messageId).toBe("test-message-id");
      expect(result.culturalPhrases).toHaveLength(0);
      expect(result.slangExpressions).toHaveLength(0);
      expect(result.webSearchUsed).toBe(false);

      expect(logger.error).toHaveBeenCalledWith('Cultural analysis error:', {
        messageId: "test-message-id",
        error: "AI API error"
      });
    });

    it('should handle empty text', async () => {
      const result = await CulturalAnalysisService.analyzeCulturalContext(
        "",
        "", // translated text (same for test)
        "en",
        "test-message-id"
      );

      expect(result.messageId).toBe("test-message-id");
      expect(result.culturalPhrases).toHaveLength(0);
      expect(result.slangExpressions).toHaveLength(0);
    });
  });

  describe('detectCulturalPhrases', () => {
    it('should detect cultural phrases correctly', async () => {
      const mockResponse = JSON.stringify([
        {
          phrase: "break a leg",
          position: [0, 12],
          explanation: "Theater idiom meaning 'good luck'",
          culturalContext: "Used before performances to wish success",
          examples: ["Break a leg in your presentation!"],
          confidence: 95
        }
      ]);

      mockGenerateText.mockResolvedValueOnce({ text: mockResponse, content: mockResponse } as any);

      // Access private method through any type
      const service = CulturalAnalysisService as any;
      const result = await service.detectCulturalPhrases("break a leg", "en");

      expect(result).toHaveLength(1);
      expect(result[0].phrase).toBe("break a leg");
      expect(result[0].confidence).toBe(95);
    });

    it('should handle invalid JSON response', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: "invalid json", content: "invalid json" } as any);

      const service = CulturalAnalysisService as any;
      const result = await service.detectCulturalPhrases("test", "en");

      expect(result).toHaveLength(0);
    });

    it('should handle non-array response', async () => {
      mockGenerateText.mockResolvedValueOnce({ text: '{"not": "array"}', content: '{"not": "array"}' } as any);

      const service = CulturalAnalysisService as any;
      const result = await service.detectCulturalPhrases("test", "en");

      expect(result).toHaveLength(0);
    });
  });

  describe('detectSlangExpressions', () => {
    it('should detect slang expressions correctly', async () => {
      const mockResponse = JSON.stringify([
        {
          slang: "lol",
          position: [0, 3],
          standardMeaning: "laugh out loud",
          usage: "Used to indicate something is funny",
          confidence: 98
        }
      ]);

      mockGenerateText.mockResolvedValueOnce({ text: mockResponse, content: mockResponse } as any);

      const service = CulturalAnalysisService as any;
      const result = await service.detectSlangExpressions("lol", "en");

      expect(result).toHaveLength(1);
      expect(result[0].slang).toBe("lol");
      expect(result[0].confidence).toBe(98);
    });

    it('should handle errors in slang detection', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Slang detection error'));

      const service = CulturalAnalysisService as any;
      const result = await service.detectSlangExpressions("test", "en");

      expect(result).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledWith('Slang detection error:', expect.any(Error));
    });
  });

  describe('enhanceWithWebSearch', () => {
    it('should enhance high-confidence phrases', async () => {
      const phrases: CulturalPhrase[] = [
        {
          phrase: "break a leg",
          position: [0, 12],
          explanation: "Basic explanation",
          culturalContext: "Basic context",
          examples: ["Example"],
          confidence: 95
        }
      ];

      const mockResponse = JSON.stringify({
        explanation: "Enhanced explanation",
        culturalContext: "Enhanced context",
        examples: ["Enhanced example 1", "Enhanced example 2"]
      });

      mockGenerateText.mockResolvedValueOnce({ text: mockResponse, content: mockResponse } as any);

      const service = CulturalAnalysisService as any;
      const result = await service.enhanceWithWebSearch(phrases, "en");

      expect(result).toHaveLength(1);
      expect(result[0].explanation).toBe("Enhanced explanation");
      expect(result[0].culturalContext).toBe("Enhanced context");
      expect(result[0].examples).toHaveLength(2);
    });

    it('should skip low-confidence phrases', async () => {
      const phrases: CulturalPhrase[] = [
        {
          phrase: "low confidence",
          position: [0, 13],
          explanation: "Basic explanation",
          culturalContext: "Basic context",
          examples: ["Example"],
          confidence: 50
        }
      ];

      const service = CulturalAnalysisService as any;
      const result = await service.enhanceWithWebSearch(phrases, "en");

      expect(result).toHaveLength(1);
      expect(result[0].explanation).toBe("Basic explanation");
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should handle web search errors gracefully', async () => {
      const phrases: CulturalPhrase[] = [
        {
          phrase: "break a leg",
          position: [0, 12],
          explanation: "Basic explanation",
          culturalContext: "Basic context",
          examples: ["Example"],
          confidence: 95
        }
      ];

      mockGenerateText.mockRejectedValueOnce(new Error('Web search error'));

      const service = CulturalAnalysisService as any;
      const result = await service.enhanceWithWebSearch(phrases, "en");

      expect(result).toHaveLength(1);
      expect(result[0].explanation).toBe("Basic explanation");
    });
  });

  describe('searchCulturalContext', () => {
    it('should search cultural context successfully', async () => {
      const mockResponse = JSON.stringify({
        explanation: "Detailed explanation",
        culturalContext: "Cultural background",
        examples: ["Example 1", "Example 2"]
      });

      mockGenerateText.mockResolvedValueOnce({ text: mockResponse, content: mockResponse } as any);

      const service = CulturalAnalysisService as any;
      const result = await service.searchCulturalContext("break a leg", "en");

      expect(result).toEqual({
        explanation: "Detailed explanation",
        culturalContext: "Cultural background",
        examples: ["Example 1", "Example 2"]
      });
    });

    it('should handle search errors', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Search error'));

      const service = CulturalAnalysisService as any;
      const result = await service.searchCulturalContext("test", "en");

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Cultural context search error:', expect.any(Error));
    });
  });
});
