# 📋 **Cultural Context Detection - Task List**

## Relevant Files

- `functions/src/services/CulturalAnalysisService.ts` - Core service for detecting cultural phrases and slang using AI SDK
- `functions/src/services/CulturalAnalysisService.test.ts` - Unit tests for CulturalAnalysisService
- `functions/src/services/TranslationService.ts` - Enhanced to include cultural analysis in translation results
- `functions/src/services/TranslationService.test.ts` - Updated tests for cultural analysis integration
- `functions/src/index.ts` - Add cultural analysis Cloud Function trigger
- `src/components/common/CulturalHighlight.tsx` - Component for highlighting cultural phrases with dotted underlines
- `src/components/common/CulturalHighlight.test.tsx` - Unit tests for CulturalHighlight component
- `src/components/common/CulturalPopup.tsx` - Interactive popup component for cultural explanations
- `src/components/common/CulturalPopup.test.tsx` - Unit tests for CulturalPopup component
- `src/features/chat/components/MessageBubble.tsx` - Enhanced to support cultural highlighting and popups
- `src/features/chat/components/MessageBubble.test.tsx` - Updated tests for cultural features
- `src/shared/types/CulturalTypes.ts` - TypeScript interfaces for cultural analysis data
- `src/store/CulturalStore.ts` - State management for cultural preferences and settings
- `src/store/CulturalStore.test.ts` - Unit tests for CulturalStore
- `src/database/CulturalCache.ts` - SQLite caching for cultural analysis results
- `src/database/CulturalCache.test.ts` - Unit tests for CulturalCache

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `CulturalAnalysisService.ts` and `CulturalAnalysisService.test.ts` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Create Cultural Analysis Service
  - [x] 1.1 Create CulturalAnalysisService.ts with AI-powered cultural phrase detection
  - [x] 1.2 Implement detectCulturalPhrases method using AI SDK
  - [x] 1.3 Implement detectSlangExpressions method using AI SDK
  - [x] 1.4 Add web search integration for enhanced cultural context
  - [x] 1.5 Create CulturalTypes.ts with TypeScript interfaces
  - [x] 1.6 Write comprehensive unit tests for CulturalAnalysisService
- [x] 2.0 Enhance Translation Service with Cultural Detection
  - [x] 2.1 Integrate CulturalAnalysisService into TranslationService
  - [x] 2.2 Add cultural analysis to translateMessage method
  - [x] 2.3 Update TranslationResult interface to include cultural data
  - [x] 2.4 Add cultural analysis to autoTranslateMessage Cloud Function
  - [x] 2.5 Update TranslationService tests for cultural integration
- [x] 3.0 Implement Cultural Highlighting UI Components
  - [x] 3.1 Create CulturalHighlight.tsx component with dotted underline styling
  - [x] 3.2 Implement phrase highlighting with position-based rendering
  - [x] 3.3 Add hover states and visual feedback
  - [x] 3.4 Create CulturalPopup.tsx for explanation display
  - [x] 3.5 Implement tap-to-explain functionality
  - [x] 3.6 Write unit tests for highlighting components
- [x] 4.0 Add Interactive Explanation Popups
  - [x] 4.1 Design popup UI with cultural context display
  - [x] 4.2 Implement popup positioning and animation
  - [x] 4.3 Add close/dismiss functionality
  - [x] 4.4 Handle multiple cultural phrases in single message
  - [x] 4.5 Add loading states for web search results
  - [x] 4.6 Write unit tests for popup functionality
- [x] 5.0 Integrate Cultural Settings and Preferences
  - [x] 5.1 Create CulturalStore.ts for state management
  - [x] 5.2 Implement user preferences (show hints, slang explanations, web search)
  - [x] 5.3 Add CulturalCache.ts for SQLite caching
  - [x] 5.4 Create settings UI for cultural preferences
  - [x] 5.5 Integrate preferences with MessageBubble component
  - [x] 5.6 Write unit tests for store and cache functionality
