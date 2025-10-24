# 📋 **Auto-Translate Implementation Tasks**

## 🎯 **Overview**
Implementation tasks for Auto-Translate feature based on PRD requirements.

---

## 📊 **Phase 1: Backend & Data Layer**

### **Task 1.1: Update SQLite Schema**
**Priority:** High  
**Estimated Time:** 30 minutes  
**File:** `src/database/Schema.ts`

**Requirements:**
- Add `chat_settings` table to database schema
- Increment `CURRENT_SCHEMA_VERSION` to 3
- Add table creation SQL

**Implementation:**
```sql
CREATE TABLE chat_settings (
  chat_id TEXT PRIMARY KEY,
  auto_translate_enabled INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**Acceptance Criteria:**
- [ ] Schema version incremented to 3
- [ ] `chat_settings` table added
- [ ] Migration script created

---

### **Task 1.2: Create Chat Settings Service**
**Priority:** High  
**Estimated Time:** 45 minutes  
**File:** `src/database/SQLiteService.ts`

**Requirements:**
- Add methods for chat settings management
- Handle CRUD operations for chat settings
- Ensure proper error handling

**Implementation:**
```typescript
// Add to SQLiteService class
async getChatSettings(chatId: string): Promise<ChatSettings | null>
async updateChatSettings(chatId: string, settings: Partial<ChatSettings>): Promise<void>
async setAutoTranslateEnabled(chatId: string, enabled: boolean): Promise<void>
```

**Acceptance Criteria:**
- [ ] `getChatSettings` method implemented
- [ ] `updateChatSettings` method implemented
- [ ] `setAutoTranslateEnabled` method implemented
- [ ] Error handling added
- [ ] TypeScript types defined

---

### **Task 1.3: Update Migration System**
**Priority:** High  
**Estimated Time:** 20 minutes  
**File:** `src/database/Migrations.ts`

**Requirements:**
- Add migration for chat_settings table
- Ensure backward compatibility
- Test migration process

**Implementation:**
```typescript
// Add to migrations array
{
  version: 3,
  up: [
    'CREATE TABLE chat_settings (chat_id TEXT PRIMARY KEY, auto_translate_enabled INTEGER DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);'
  ]
}
```

**Acceptance Criteria:**
- [ ] Migration version 3 added
- [ ] Migration tested on fresh database
- [ ] Migration tested on existing database

---

## 🎨 **Phase 2: UI Components**

### **Task 2.1: Update AI Commands Menu**
**Priority:** High  
**Estimated Time:** 60 minutes  
**File:** `src/features/chat/components/AICommandsMenu.tsx`

**Requirements:**
- Add "Auto-Translate" button with toggle functionality
- Update menu layout to accommodate new button
- Add visual indicators for ON/OFF state
- Handle toggle state changes

**Implementation:**
```typescript
// Add to AI_COMMANDS array
{ id: 'auto-translate', label: 'Auto-Translate', icon: 'refresh' as const, color: '#FF6B35' }

// Add toggle state management
const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);

// Add toggle handler
const handleAutoTranslateToggle = () => {
  // Toggle logic
};
```

**Acceptance Criteria:**
- [ ] Auto-Translate button added to menu
- [ ] Toggle functionality working
- [ ] Visual state indicators (ON/OFF)
- [ ] Proper icon and styling
- [ ] Callback prop for parent component

---

### **Task 2.2: Update ChatModal Integration**
**Priority:** High  
**Estimated Time:** 45 minutes  
**File:** `src/features/chat/components/ChatModal.tsx`

**Requirements:**
- Add auto-translate toggle handler
- Load chat settings when chat opens
- Pass callback to AICommandsMenu
- Manage chat settings state

**Implementation:**
```typescript
// Add state
const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);

// Add handler
const handleAutoTranslateToggle = async (enabled: boolean) => {
  // Toggle logic
};

// Load settings on chat open
useEffect(() => {
  loadChatSettings();
}, [chatId]);
```

**Acceptance Criteria:**
- [ ] Chat settings loaded on chat open
- [ ] Auto-translate toggle handler implemented
- [ ] Settings persisted to SQLite
- [ ] State management working
- [ ] Callback passed to AICommandsMenu

---

### **Task 2.3: Add Chat Settings to Store**
**Priority:** Medium  
**Estimated Time:** 30 minutes  
**File:** `src/store/ChatStore.ts`

**Requirements:**
- Add chat settings state management
- Add actions for loading and updating settings
- Integrate with existing chat store

**Implementation:**
```typescript
// Add to ChatStore interface
interface ChatStore {
  chatSettings: Record<string, ChatSettings>;
  loadChatSettings: (chatId: string) => Promise<void>;
  updateChatSettings: (chatId: string, settings: Partial<ChatSettings>) => Promise<void>;
}
```

**Acceptance Criteria:**
- [ ] Chat settings state added
- [ ] Load settings action implemented
- [ ] Update settings action implemented
- [ ] Integration with SQLite service

---

## ⚙️ **Phase 3: Auto-Translation Logic**

### **Task 3.1: Smart Context Collection**
**Priority:** High  
**Estimated Time:** 60 minutes  
**File:** `src/store/ChatStore.ts`

**Requirements:**
- Implement smart context collection algorithm
- Handle edge cases (insufficient context, time windows)
- Optimize for performance

**Implementation:**
```typescript
const getSmartContext = (messages: Message[], targetMessage: Message): Message[] => {
  // 1. Get last 30 messages (regardless of type)
  const recentMessages = messages.slice(-30);
  
  // 2. Filter to text messages only (including image captions)
  const textMessages = recentMessages.filter(m => 
    (m.type === 'text' && m.text?.trim()) || 
    (m.type === 'image' && m.caption?.trim())
  );
  
  // 3. Apply time window (2 hours)
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  const recentTextMessages = textMessages.filter(m => m.timestamp > twoHoursAgo);
  
  // 4. Ensure minimum context
  if (recentTextMessages.length < 3) {
    return [targetMessage]; // Single message fallback
  }
  
  // 5. Take last 10-15 text messages
  return recentTextMessages.slice(-15);
};
```

**Acceptance Criteria:**
- [ ] Smart context algorithm implemented
- [ ] Time window filtering working
- [ ] Minimum context threshold enforced
- [ ] Performance optimized
- [ ] Edge cases handled

---

### **Task 3.2: Language Detection Service**
**Priority:** High  
**Estimated Time:** 45 minutes  
**File:** `src/services/firebase/LanguageDetectionService.ts` (new)

**Requirements:**
- Create language detection service
- Use OpenAI for language detection
- Handle errors gracefully
- Cache results for performance

**Implementation:**
```typescript
export class LanguageDetectionService {
  private openai: OpenAI | null = null;
  
  async detectLanguage(text: string): Promise<string> {
    // OpenAI language detection implementation
  }
  
  private getOpenAI(): OpenAI {
    // Lazy initialization
  }
}
```

**Acceptance Criteria:**
- [ ] Language detection service created
- [ ] OpenAI integration working
- [ ] Error handling implemented
- [ ] Caching mechanism added
- [ ] TypeScript types defined

---

### **Task 3.3: Auto-Translation Trigger**
**Priority:** High  
**Estimated Time:** 90 minutes  
**File:** `src/store/ChatStore.ts`

**Requirements:**
- Add auto-translation logic to message subscription
- Only translate messages from OTHER users
- Check chat settings before translating
- Handle translation errors gracefully

**Implementation:**
```typescript
// In subscribeToMessages function
const handleNewMessage = async (message: Message) => {
  // Check if auto-translate is enabled for this chat
  const settings = await SQLiteService.getChatSettings(chatId);
  if (!settings?.autoTranslateEnabled) return;
  
  // Only translate messages from other users
  if (message.senderId === currentUserId) return;
  
  // Detect language
  const detectedLang = await languageDetectionService.detectLanguage(message.text);
  
  // If different from preferred language
  if (detectedLang !== user.preferredLanguage) {
    // Collect context and translate
    const context = getSmartContext(messages, message);
    await translateWithContext(message, context);
  }
};
```

**Acceptance Criteria:**
- [ ] Auto-translation trigger implemented
- [ ] Only other users' messages translated
- [ ] Chat settings checked
- [ ] Language detection integrated
- [ ] Context collection working
- [ ] Error handling added

---

## 🔧 **Phase 4: Integration & Testing**

### **Task 4.1: Update Message Service**
**Priority:** Medium  
**Estimated Time:** 30 minutes  
**File:** `src/services/firebase/MessageService.ts`

**Requirements:**
- Ensure auto-translated messages preserve local translations
- Handle message updates correctly
- Maintain data consistency

**Acceptance Criteria:**
- [ ] Local translations preserved
- [ ] Message updates handled
- [ ] Data consistency maintained

---

### **Task 4.2: Error Handling & Logging**
**Priority:** Medium  
**Estimated Time:** 45 minutes  
**Files:** Multiple

**Requirements:**
- Add comprehensive error handling
- Add logging for debugging
- Handle network failures gracefully
- Show user-friendly error messages

**Acceptance Criteria:**
- [ ] Error handling implemented
- [ ] Logging added
- [ ] Network failures handled
- [ ] User-friendly error messages

---

### **Task 4.3: Performance Optimization**
**Priority:** Medium  
**Estimated Time:** 60 minutes  
**Files:** Multiple

**Requirements:**
- Debounce auto-translation calls
- Cache language detection results
- Optimize context collection
- Monitor performance metrics

**Acceptance Criteria:**
- [ ] Debouncing implemented
- [ ] Caching added
- [ ] Performance optimized
- [ ] Metrics monitoring

---

## 🧪 **Testing Tasks**

### **Task T.1: Manual Testing**
**Priority:** High  
**Estimated Time:** 120 minutes

**Test Cases:**
- [ ] Toggle auto-translate ON/OFF per chat
- [ ] Send message in different language → verify auto-translation
- [ ] Test with insufficient context (fallback to single message)
- [ ] Test with image captions in context
- [ ] Verify translations persist after app reload
- [ ] Test multiple languages (Spanish, French, German)
- [ ] Verify only OTHER users' messages are auto-translated
- [ ] Test error handling (API failures)

### **Task T.2: Edge Case Testing**
**Priority:** Medium  
**Estimated Time:** 90 minutes

**Edge Cases:**
- [ ] Messages with only emojis
- [ ] Very long messages (500+ words)
- [ ] Messages with special characters
- [ ] Network connectivity issues
- [ ] Rapid message sending (debouncing)

---

## 📊 **Success Criteria**

### **Functional Requirements**
- [ ] Auto-translate toggle works per chat
- [ ] Incoming messages auto-translate when language differs
- [ ] Translations display above original messages
- [ ] Translations persist after app reload
- [ ] Only other users' messages are translated

### **Performance Requirements**
- [ ] Translation latency < 3 seconds
- [ ] Context collection time < 500ms
- [ ] Error rate < 5%
- [ ] No memory leaks

### **User Experience Requirements**
- [ ] Intuitive toggle interface
- [ ] Smooth animations
- [ ] Clear visual indicators
- [ ] Helpful error messages

---

## 🚀 **Implementation Timeline**

### **Week 1: Foundation**
- Tasks 1.1-1.3: Database layer
- Tasks 2.1-2.3: UI components

### **Week 2: Core Logic**
- Tasks 3.1-3.3: Auto-translation logic

### **Week 3: Polish**
- Tasks 4.1-4.3: Integration and optimization
- Tasks T.1-T.2: Testing

---

*Created: January 2025*
*Status: Ready for Implementation*
