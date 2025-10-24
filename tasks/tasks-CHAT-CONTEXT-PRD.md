# 📋 **Chat Context Implementation Tasks**

## 🎯 **Overview**
Implementation tasks for Per-Chat Context System with mood and topic tracking.

---

## 📊 **Relevant Files**

### **Backend (Cloud Functions)**
- `functions/src/services/ChatContextService.ts` - NEW: Core context management
- `functions/src/services/TranslationService.ts` - UPDATE: Use chat context
- `functions/src/services/CulturalAnalysisService.ts` - UPDATE: Use mood context
- `functions/src/index.ts` - UPDATE: Add context update triggers
- `functions/src/shared/types/ChatContext.ts` - NEW: TypeScript interfaces

### **Frontend (React Native)**
- `src/components/common/ChatSummaryModal.tsx` - NEW: Display chat summary
- `src/features/chat/components/AICommandsMenu.tsx` - UPDATE: Add "Summarize Chat"
- `src/store/ChatStore.ts` - UPDATE: Add summary actions

### **Tests**
- `functions/src/services/ChatContextService.test.ts` - NEW: Unit tests
- `functions/src/integration/mood-translation.test.ts` - NEW: Integration tests

---

## 📝 **Tasks**

### **Phase 1: Core Context Service** (Week 1)

- [x] 1.0 Create ChatContextService Foundation
  - [x] 1.1 Create `functions/src/shared/types/ChatContext.ts` with interfaces
  - [x] 1.2 Create `functions/src/services/ChatContextService.ts` class structure
  - [x] 1.3 Implement `loadContext(chatId)` method
  - [x] 1.4 Implement `saveContext(chatId, context)` method
  - [x] 1.5 Add error handling and logging

- [x] 2.0 Implement Context Generation
  - [x] 2.1 Create `generateContext()` method for incremental mode
  - [x] 2.2 Create `generateContext()` method for full regeneration mode
  - [x] 2.3 Build AI prompts for context extraction
  - [x] 2.4 Parse and validate AI responses
  - [x] 2.5 Handle edge cases (empty chats, system messages)

- [x] 3.0 Implement Mood Shift Detection
  - [x] 3.1 Create `detectMoodShift()` method
  - [x] 3.2 Build mood comparison AI prompt
  - [x] 3.3 Add threshold logic for mood changes
  - [x] 3.4 Test with various conversation scenarios
  - [x] 3.5 Add logging for mood shift events

- [x] 4.0 Create Cloud Function Triggers
  - [x] 4.1 Add `updateChatContext` trigger in `index.ts`
  - [x] 4.2 Implement message count tracking
  - [x] 4.3 Add 20-message interval check
  - [x] 4.4 Add 100-message full regeneration check
  - [x] 4.5 Add mood shift detection check
  - [x] 4.6 Add comprehensive logging

- [ ] 5.0 Write Unit Tests
  - [ ] 5.1 Test context generation (incremental)
  - [ ] 5.2 Test context generation (full)
  - [ ] 5.3 Test mood shift detection
  - [ ] 5.4 Test context loading/saving
  - [ ] 5.5 Test edge cases

---

### **Phase 2: Mood-Based Translation** (Week 2)

- [x] 6.0 Update TranslationService
  - [x] 6.1 Add `loadChatContext()` to translateMessage
  - [x] 6.2 Create `buildMoodAwarePrompt()` method
  - [x] 6.3 Pass chat mood, relationship, topics to AI
  - [x] 6.4 Update prompt templates
  - [x] 6.5 Test with different mood contexts

- [x] 7.0 Remove Old Embedding Code
  - [x] 7.1 Remove `EmbeddingService.ts` file
  - [x] 7.2 Remove `generateMessageEmbedding` Cloud Function from index.ts
  - [x] 7.3 Remove embedding fields from Firestore (don't delete data, just stop using)
  - [x] 7.4 Update TranslationService to remove `loadRelevantContext()`
  - [x] 7.5 Clean up imports and unused code

- [ ] 8.0 Integration Testing
  - [ ] 8.1 Test casual mood → casual translation
  - [ ] 8.2 Test formal mood → formal translation
  - [ ] 8.3 Test playful mood → playful translation
  - [ ] 8.4 Test professional mood → professional translation
  - [ ] 8.5 Compare before/after translation quality

- [ ] 9.0 Deploy and Monitor
  - [ ] 9.1 Deploy updated Cloud Functions
  - [ ] 9.2 Monitor context generation logs
  - [ ] 9.3 Verify 20/100 message triggers working
  - [ ] 9.4 Check mood shift detections
  - [ ] 9.5 Monitor API costs

---

### **Phase 3: User Summary Feature** (Week 3)

- [ ] 10.0 Backend Summary Generation
  - [ ] 10.1 Create `generateUserSummary()` method in ChatContextService
  - [ ] 10.2 Build user-friendly summary prompt
  - [ ] 10.3 Format summary with topics, decisions, mood
  - [ ] 10.4 Add `generateChatSummary` callable Cloud Function
  - [ ] 10.5 Test summary generation

- [ ] 11.0 Frontend UI Components
  - [ ] 11.1 Create `ChatSummaryModal.tsx` component
  - [ ] 11.2 Design summary display layout
  - [ ] 11.3 Add "Summarize Chat" to AICommandsMenu
  - [ ] 11.4 Wire up button to Cloud Function
  - [ ] 11.5 Add loading and error states

- [ ] 12.0 ChatStore Integration
  - [ ] 12.1 Add `requestChatSummary()` action to ChatStore
  - [ ] 12.2 Add `chatSummaries` state map
  - [ ] 12.3 Cache summaries locally
  - [ ] 12.4 Add summary refresh logic
  - [ ] 12.5 Test state management

- [ ] 13.0 Polish and Test
  - [ ] 13.1 Test summary with short chats (<20 messages)
  - [ ] 13.2 Test summary with long chats (500+ messages)
  - [ ] 13.3 Test summary UI on different screen sizes
  - [ ] 13.4 Add share summary functionality
  - [ ] 13.5 User acceptance testing

---

### **Phase 4: Cultural Context + Mood Integration** (Week 4)

- [x] 14.0 Update CulturalAnalysisService
  - [x] 14.1 Add chatMood parameter to `analyzeCulturalContext()`
  - [x] 14.2 Use mood to filter slang detection sensitivity
  - [x] 14.3 Adjust cultural hints based on relationship type
  - [x] 14.4 Update prompts to include mood context
  - [x] 14.5 Test cultural detection with mood

- [x] 15.0 Update autoTranslateMessage Function
  - [x] 15.1 Load chat context before translation
  - [x] 15.2 Pass mood to CulturalAnalysisService
  - [x] 15.3 Include relationship in formality detection
  - [x] 15.4 Test end-to-end flow
  - [x] 15.5 Monitor logs for accuracy

- [ ] 16.0 Performance Optimization
  - [ ] 16.1 Add caching for context lookups
  - [ ] 16.2 Optimize Firestore queries
  - [ ] 16.3 Reduce AI API calls where possible
  - [ ] 16.4 Add request debouncing
  - [ ] 16.5 Monitor latency and costs

- [ ] 17.0 Comprehensive Testing
  - [ ] 17.1 End-to-end test: new chat → 100 messages → context updates
  - [ ] 17.2 Test mood shift scenarios
  - [ ] 17.3 Test translation quality across moods
  - [ ] 17.4 Test cultural detection with mood
  - [ ] 17.5 Load testing with multiple chats
  - [ ] 17.6 User acceptance testing

---

## 🧪 **Testing Checklist**

### **Unit Tests**
- [ ] ChatContextService.generateContext (incremental)
- [ ] ChatContextService.generateContext (full)
- [ ] ChatContextService.detectMoodShift
- [ ] ChatContextService.loadContext
- [ ] ChatContextService.generateUserSummary

### **Integration Tests**
- [ ] Context updates after 20 messages
- [ ] Full regeneration after 100 messages
- [ ] Mood shift triggers update
- [ ] Translation uses chat context
- [ ] Cultural analysis uses mood

### **Manual Tests**
- [ ] Create new chat, send 25 messages, verify context created
- [ ] Send 105 messages, verify full regeneration
- [ ] Shift from casual to serious, verify mood update
- [ ] Translate message in casual chat → verify casual translation
- [ ] Translate message in formal chat → verify formal translation
- [ ] Request chat summary → verify accurate summary
- [ ] Test with multiple languages
- [ ] Test with emojis and slang

---

## 📊 **Success Criteria**

### **Functional Requirements**
- [ ] Context generates automatically every 20 messages
- [ ] Full regeneration every 100 messages
- [ ] Mood shifts detected and trigger updates
- [ ] Translations match chat mood
- [ ] User summary feature works
- [ ] Context persists across sessions

### **Performance Requirements**
- [ ] Incremental context generation: < 2 seconds
- [ ] Full regeneration: < 5 seconds
- [ ] Mood shift detection: < 1 second
- [ ] Storage per chat: ~6KB
- [ ] API cost per chat per month: < $1

### **Quality Requirements**
- [ ] Translation mood match: >85%
- [ ] Context accuracy: >90%
- [ ] Mood shift detection accuracy: >85%
- [ ] User summary satisfaction: >80%

---

## 🚀 **Implementation Order**

**Start with:** Task 1.0 (ChatContextService Foundation)
**Then:** Follow tasks 1.0 → 17.0 in order
**Testing:** After each phase (not all at the end)
**Deployment:** Incremental (don't wait for all phases)

---

## 💡 **Notes**

- Remove old embedding code in Phase 2 (no longer needed)
- Test translation quality before/after to validate improvement
- Monitor costs closely during initial rollout
- Collect user feedback on summary feature
- Consider adding context to Smart Replies later

---

*Created: January 2025*
*Status: Ready for Implementation*
*Estimated Time: 4 weeks*

