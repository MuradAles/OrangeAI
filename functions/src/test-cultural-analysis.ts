/**
 * Test Cultural Analysis Service
 * Run this to test cultural analysis directly
 */

import { CulturalAnalysisService } from './services/CulturalAnalysisService';

async function testCulturalAnalysis() {
  console.log('🧪 Testing Cultural Analysis Service...\n');

  const testCases = [
    {
      text: "Break a leg in your presentation!",
      language: "en",
      messageId: "test-1"
    },
    {
      text: "That's lit! 🔥",
      language: "en", 
      messageId: "test-2"
    },
    {
      text: "¡Buena suerte!",
      language: "es",
      messageId: "test-3"
    },
    {
      text: "It's raining cats and dogs outside",
      language: "en",
      messageId: "test-4"
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: "${testCase.text}"`);
    console.log(`🌍 Language: ${testCase.language}`);
    
    try {
      const result = await CulturalAnalysisService.analyzeCulturalContext(
        testCase.text,
        testCase.language,
        testCase.messageId
      );

      console.log(`✅ Cultural Phrases: ${result.culturalPhrases.length}`);
      console.log(`✅ Slang Expressions: ${result.slangExpressions.length}`);
      console.log(`✅ Web Search Used: ${result.webSearchUsed}`);
      
      if (result.culturalPhrases.length > 0) {
        console.log('🎭 Cultural Phrases:');
        result.culturalPhrases.forEach(phrase => {
          console.log(`  - "${phrase.phrase}": ${phrase.explanation}`);
        });
      }
      
      if (result.slangExpressions.length > 0) {
        console.log('🔤 Slang Expressions:');
        result.slangExpressions.forEach(slang => {
          console.log(`  - "${slang.slang}": ${slang.standardMeaning}`);
        });
      }
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

// Run the test
testCulturalAnalysis().catch(console.error);
