// import { ChatContextService } from './services/ChatContextService';
import { CulturalAnalysisService } from './services/CulturalAnalysisService';
import { TranslationService } from './services/TranslationService';

/**
 * Test our complete AI pipeline (Updated for ChatContext)
 * Run with: npm run test:pipeline
 */

async function testCompletePipeline() {
  console.log('🧪 Testing Complete AI Pipeline (ChatContext Version)...\n');

  try {
    const testChatId = 'test-chat-123';

    // Test 1: Chat Context (requires Firestore data)
    console.log('1️⃣ Testing Chat Context...');
    console.log('⚠️  Skipped - Requires actual Firestore messages');
    console.log('   Run after deployment with real chat data\n');

    // Test 2: Mood-Aware Translation
    console.log('2️⃣ Testing Mood-Aware Translation...');
    const translationService = new TranslationService();
    const translationResult = await translationService.translateMessage({
      messageId: 'test-msg-1',
      chatId: testChatId,
      targetLanguage: 'es',
      messageText: 'Hello, how are you?',
      userId: 'test-user-1'
    });
    
    console.log(`✅ Translation completed:`);
    console.log(`   Translated: ${translationResult.translated}`);
    console.log(`   Detected Language: ${translationResult.detectedLanguage}`);
    console.log(`   Formality: ${translationResult.formalityLevel}\n`);

    // Test 3: Mood-Aware Cultural Analysis
    console.log('3️⃣ Testing Mood-Aware Cultural Analysis...');
    const culturalResult = await CulturalAnalysisService.analyzeCulturalContext(
      "That's sick! Break a leg!",
      'en',
      'test-msg-2',
      'playful, casual', // chatMood
      'close friends' // relationship
    );
    
    console.log(`✅ Cultural analysis completed:`);
    console.log(`   Cultural phrases: ${culturalResult.culturalPhrases.length}`);
    console.log(`   Slang expressions: ${culturalResult.slangExpressions.length}`);
    console.log(`   Web search used: ${culturalResult.webSearchUsed}\n`);

    console.log('🎉 All pipeline tests passed!');
    console.log('\n📊 Pipeline Summary:');
    console.log('✅ Mood-aware translation working');
    console.log('✅ Mood-aware cultural analysis working');
    console.log('⚠️  Chat context requires Firestore data');
    console.log('\n🚀 Ready for deployment!');

  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    throw error;
  }
}

// Export for testing
export { testCompletePipeline };

// Run if called directly
if (require.main === module) {
  testCompletePipeline().catch(console.error);
}
