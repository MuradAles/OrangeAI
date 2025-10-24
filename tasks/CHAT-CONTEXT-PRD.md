# 📋 **Chat Context System PRD**

## 🎯 **Product Overview**

**Feature:** Per-Chat Context with Mood & Topic Tracking  
**Goal:** Maintain intelligent context for each chat to improve translation quality and AI features  
**User Value:** Natural, mood-appropriate translations and personalized AI responses  
**Technical Value:** Efficient context management (6KB per chat vs 6MB with per-message embeddings)

## 🚨 **Why This Approach?**

### **Problem with Previous Approaches:**
- ❌ **Last 10-15 messages only:** Loses context from 5,000+ message history
- ❌ **Per-message embeddings:** Wasteful (6MB per chat), expensive, unnecessary
- ❌ **No mood awareness:** Translations feel robotic and inappropriate

### **Solution: Per-Chat Context**
- ✅ **ONE summary per chat** (not per message)
- ✅ **Mood + topic tracking** (understands relationship and tone)
- ✅ **Smart updates** (only when needed: every 20 msgs, 100 msgs, or mood shifts)
- ✅ **1000x more efficient** (6KB vs 6MB)
- ✅ **Full conversation context** (not just recent messages)

---

## 👥 **User Stories**

### Primary User Story
> As a user, I want my AI translations to understand the full context and mood of my conversations so they feel natural and appropriate.

### Secondary User Stories
- As a user, I want translations to match my relationship with the person (casual friends vs formal colleagues)
- As a user, I want to request a summary of a chat I joined late
- As a user, I want AI to understand ongoing topics even if we haven't mentioned them recently

---

## 🎨 **User Experience Flow**

### **1. Background Context Building (Invisible to User)**
```
User chats normally → Every 20 messages, system updates context →
Tracks mood, topics, relationship → Uses for AI features
```

### **2. Mood-Based Translation**
```
Message arrives in Spanish: "No puedo ir"

Without mood context:
→ "I can't go"

With mood context (playful friends):
→ "Can't make it! 😅"

With mood context (formal colleague):
→ "I won't be able to attend"
```

### **3. User-Requested Summary**
```
User taps "Summarize Chat" → Shows summary with:
- Main topics discussed
- Key decisions made
- Conversation mood and style
```

---

## 🔧 **Technical Requirements**

### **Chat Context Data Model**

```typescript
interface ChatContext {
  chatId: string;
  
  // Core context
  topics: string[];              // ["books", "travel", "cooking"]
  mood: string;                  // "playful, casual, joking"
  relationship: string;          // "close friends" | "colleagues" | "family"
  formality: string;             // "very casual" | "neutral" | "formal"
  
  // Summary
  summary: string;               // Human-readable summary
  
  // Metadata
  messageCount: number;          // Total messages analyzed
  lastUpdated: number;           // Timestamp
  lastMoodShift: number;         // When mood last changed
  updateHistory: Array<{         // Track updates for debugging
    timestamp: number;
    trigger: 'interval' | 'mood_shift' | 'full';
    messagesAnalyzed: number;
  }>;
}
```

### **Storage Location**
```
Firestore:
chats/{chatId}/metadata/context → ChatContext document
```

**Why Firestore?**
- ✅ Accessible from Cloud Functions
- ✅ Syncs across devices
- ✅ Single source of truth
- ✅ Only 6KB per chat (affordable)

---

## 🔄 **Update Strategy**

### **Three Update Triggers:**

#### **1. Every 20 Messages (Incremental Update)**
```typescript
// Fast, cheap update
// Only analyzes last 20 messages
// Updates: topics, mood (if changed slightly)
// Cost: ~$0.01 per update

Example:
Old context: "discussing books"
New messages: talking about specific fantasy author
Updated: "discussing fantasy books, especially Brandon Sanderson"
```

#### **2. Every 100 Messages (Full Regeneration)**
```typescript
// Comprehensive update
// Analyzes ALL messages (or last 500)
// Regenerates entire summary
// Cost: ~$0.10-0.50 per update

Why needed: Prevents context drift from incremental updates
```

#### **3. Mood Shift Detection (Immediate Update)**
```typescript
// Detects significant mood changes
// Analyzes last 5 messages
// Compares with stored mood
// Updates immediately if shift detected

Examples of mood shifts:
- "Haha 😂" → "I need to talk about something serious"
- Casual chat → Argument/conflict
- Light topics → Heavy/emotional topics
```

---

## 🧠 **AI Implementation**

### **Context Generation Prompt (Incremental)**
```typescript
const INCREMENTAL_CONTEXT_PROMPT = `
Analyze these recent messages and update the chat context.

CURRENT CONTEXT:
- Mood: ${currentContext.mood}
- Topics: ${currentContext.topics.join(", ")}
- Relationship: ${currentContext.relationship}
- Summary: ${currentContext.summary}

RECENT MESSAGES (last 20):
${recentMessages.map(m => `- ${m.senderName}: ${m.text}`).join('\n')}

Update the context:
1. Are there new topics? Add them to topics array
2. Has the mood shifted? Update mood description
3. Update summary to reflect new information

Return JSON:
{
  "topics": ["topic1", "topic2"],
  "mood": "mood description",
  "relationship": "relationship type",
  "summary": "updated summary"
}
`;
```

### **Context Generation Prompt (Full Regeneration)**
```typescript
const FULL_CONTEXT_PROMPT = `
Analyze this entire conversation and generate comprehensive context.

ALL MESSAGES (or last 500):
${allMessages.map(m => `- ${m.senderName}: ${m.text}`).join('\n')}

Generate context:
1. Main topics discussed (top 5-7)
2. Overall mood and tone
3. Relationship between participants
4. Formality level
5. Comprehensive summary

Return JSON:
{
  "topics": ["topic1", "topic2", ...],
  "mood": "detailed mood description",
  "relationship": "relationship type",
  "formality": "formality level",
  "summary": "comprehensive summary (2-3 sentences)"
}
`;
```

### **Mood Shift Detection**
```typescript
const detectMoodShift = async (
  lastFiveMessages: Message[],
  currentMood: string
): Promise<boolean> => {
  const prompt = `
  Current mood: "${currentMood}"
  
  Recent messages:
  ${lastFiveMessages.map(m => `- ${m.text}`).join('\n')}
  
  Has the mood significantly changed?
  Return ONLY "true" or "false"
  `;
  
  const result = await generateText({ model: aiModel, prompt });
  return result.text.trim().toLowerCase() === 'true';
};
```

---

## 📱 **UI/UX Specifications**

### **Summarize Chat Feature**

**Location:** Long-press message → AI Commands Menu

```
┌─────────────────────┐
│ 🔤 💬 📄 💡 ✏️       │
│ Translate Summarize │
│ Chat     Explain    │
└─────────────────────┘
```

**Summary Display:**
```
┌─────────────────────────────┐
│ 💬 Chat Summary             │
├─────────────────────────────┤
│ 📚 Main Topics:             │
│ • Fantasy book discussions  │
│ • Greece trip planning      │
│ • Restaurant recommendations│
│                             │
│ 📝 Summary:                 │
│ You and John have been      │
│ discussing fantasy books    │
│ and planning a trip to      │
│ Greece in June. Mostly      │
│ casual and playful chat.    │
│                             │
│ 💬 Conversation Style:      │
│ Casual, friendly, lots of   │
│ jokes and emojis 😊         │
│                             │
│ 📊 245 messages analyzed    │
├─────────────────────────────┤
│ [Close] [Share Summary]     │
└─────────────────────────────┘
```

---

## 🗂️ **Implementation Requirements**

### **Backend Changes**

#### **1. ChatContextService** (NEW)
**File:** `functions/src/services/ChatContextService.ts`

```typescript
export class ChatContextService {
  /**
   * Update chat context based on trigger
   */
  static async updateContext(
    chatId: string,
    trigger: 'interval' | 'mood_shift' | 'full'
  ): Promise<ChatContext>;

  /**
   * Generate context from messages
   */
  static async generateContext(
    messages: Message[],
    mode: 'incremental' | 'full',
    currentContext?: ChatContext
  ): Promise<ChatContext>;

  /**
   * Detect if mood has shifted
   */
  static async detectMoodShift(
    recentMessages: Message[],
    currentMood: string
  ): Promise<boolean>;

  /**
   * Load chat context from Firestore
   */
  static async loadContext(chatId: string): Promise<ChatContext | null>;

  /**
   * Generate user-facing summary
   */
  static async generateUserSummary(chatId: string): Promise<string>;
}
```

#### **2. Update TranslationService**
**File:** `functions/src/services/TranslationService.ts`

```typescript
// Add chat context to translation
async translateMessage(params: TranslationParams): Promise<TranslationResult> {
  // 1. Load chat context
  const chatContext = await ChatContextService.loadContext(params.chatId);
  
  // 2. Load recent messages (last 10-15)
  const recentMessages = await this.loadRecentMessages(params.chatId, 15);
  
  // 3. Build mood-aware prompt
  const prompt = this.buildMoodAwarePrompt({
    message: params.messageText,
    chatMood: chatContext?.mood,
    relationship: chatContext?.relationship,
    topics: chatContext?.topics,
    recentContext: recentMessages,
    targetLanguage: params.targetLanguage
  });
  
  // 4. Translate
  const translation = await this.translateWithAISDK(prompt);
  
  return { ...translation, chatContext };
}
```

#### **3. Cloud Function Triggers** (NEW)
**File:** `functions/src/index.ts`

```typescript
/**
 * Update chat context on every message
 */
export const updateChatContext = onDocumentCreated(
  'chats/{chatId}/messages/{messageId}',
  async (event) => {
    const chatId = event.params.chatId;
    
    // Get message count
    const messageCount = await getMessageCount(chatId);
    
    // Check update triggers
    if (messageCount % 20 === 0) {
      // Every 20 messages: incremental
      await ChatContextService.updateContext(chatId, 'interval');
    }
    
    if (messageCount % 100 === 0) {
      // Every 100 messages: full regeneration
      await ChatContextService.updateContext(chatId, 'full');
    }
    
    // Check for mood shift
    const lastFive = await loadLastMessages(chatId, 5);
    const currentContext = await ChatContextService.loadContext(chatId);
    
    if (currentContext) {
      const moodShifted = await ChatContextService.detectMoodShift(
        lastFive,
        currentContext.mood
      );
      
      if (moodShifted) {
        logger.info('Mood shift detected', { chatId });
        await ChatContextService.updateContext(chatId, 'mood_shift');
      }
    }
  }
);

/**
 * Generate user-facing summary on request
 */
export const generateChatSummary = onCall(
  { invoker: 'public' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const { chatId } = request.data;
    const summary = await ChatContextService.generateUserSummary(chatId);

    return { success: true, summary };
  }
);
```

### **Frontend Changes**

#### **1. Add "Summarize Chat" to AI Commands**
**File:** `src/features/chat/components/AICommandsMenu.tsx`

```typescript
const AI_COMMANDS = [
  { id: 'translate', label: 'Translate', icon: 'language' },
  { id: 'summarize-chat', label: 'Summarize\nChat', icon: 'notes' }, // NEW
  { id: 'summarize', label: 'Summarize', icon: 'document' },
  { id: 'explain', label: 'Explain', icon: 'bulb' },
  { id: 'rewrite', label: 'Rewrite', icon: 'pencil' },
];
```

#### **2. Summary Modal Component** (NEW)
**File:** `src/components/common/ChatSummaryModal.tsx`

```typescript
interface ChatSummaryModalProps {
  visible: boolean;
  summary: string;
  messageCount: number;
  onClose: () => void;
}

export const ChatSummaryModal: React.FC<ChatSummaryModalProps> = ({
  visible,
  summary,
  messageCount,
  onClose
}) => {
  // Display formatted summary with topics, mood, etc.
};
```

#### **3. ChatStore Updates**
**File:** `src/store/ChatStore.ts`

```typescript
interface ChatStore {
  // ... existing fields
  
  // NEW: Chat summary
  requestChatSummary: (chatId: string) => Promise<string>;
  chatSummaries: Record<string, string>;
}
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**

#### **ChatContextService Tests**
```typescript
describe('ChatContextService', () => {
  test('generates initial context from messages', async () => {
    const messages = createMockMessages();
    const context = await ChatContextService.generateContext(messages, 'full');
    
    expect(context.topics).toContain('books');
    expect(context.mood).toBeDefined();
  });
  
  test('detects mood shift', async () => {
    const casualMessages = [{ text: 'Haha yeah! 😂' }];
    const seriousMessages = [{ text: 'We need to talk about something serious' }];
    
    const shift = await ChatContextService.detectMoodShift(
      seriousMessages,
      'playful, casual'
    );
    
    expect(shift).toBe(true);
  });
  
  test('incremental update preserves existing topics', async () => {
    const currentContext = { topics: ['books'], mood: 'casual' };
    const newMessages = [{ text: 'What about that trip?' }];
    
    const updated = await ChatContextService.generateContext(
      newMessages,
      'incremental',
      currentContext
    );
    
    expect(updated.topics).toContain('books');
    expect(updated.topics).toContain('travel');
  });
});
```

### **Integration Tests**

```typescript
describe('Mood-Based Translation', () => {
  test('casual mood produces casual translation', async () => {
    // Set up chat with casual mood
    await setupChatContext(chatId, { mood: 'playful, casual' });
    
    const result = await translateMessage({
      messageText: 'No puedo ir',
      chatId,
      targetLanguage: 'en'
    });
    
    expect(result.translated).toMatch(/can't make it|nah/i);
  });
  
  test('formal mood produces formal translation', async () => {
    await setupChatContext(chatId, { mood: 'formal, professional' });
    
    const result = await translateMessage({
      messageText: 'No puedo ir',
      chatId,
      targetLanguage: 'en'
    });
    
    expect(result.translated).toMatch(/unable to attend/i);
  });
});
```

### **Manual Testing Checklist**

- [ ] Context generates after 20 messages
- [ ] Context fully regenerates after 100 messages
- [ ] Mood shift triggers immediate update
- [ ] Translations match chat mood
- [ ] "Summarize Chat" button works
- [ ] Summary shows correct topics and mood
- [ ] Context persists across app restarts
- [ ] Multiple chats maintain separate contexts

---

## 📊 **Success Metrics**

### **Technical Performance**
- Context generation time: < 2 seconds (incremental), < 5 seconds (full)
- Storage per chat: ~6KB (vs 6MB with per-message embeddings)
- Update trigger accuracy: >90% (mood shifts detected correctly)

### **Translation Quality**
- User satisfaction with mood-appropriate translations: >80%
- Reduced "robotic" translation complaints: -50%
- Translation style match: >85% (matches conversation tone)

### **User Engagement**
- "Summarize Chat" usage rate per new group join: >40%
- Summary helpfulness rating: >4/5

---

## 💰 **Cost Analysis**

### **Per-Chat Costs**

| Operation | Frequency | Cost per Operation | Monthly Cost (100 chats) |
|-----------|-----------|-------------------|--------------------------|
| Incremental update (20 msgs) | Every 20 messages | ~$0.01 | ~$50 |
| Full regeneration (100 msgs) | Every 100 messages | ~$0.10 | ~$10 |
| Mood shift detection | Variable | ~$0.001 | ~$5 |
| User summary | On-demand | ~$0.05 | ~$10 |
| **TOTAL** | | | **~$75/month** |

**Affordable for 100 active chats with 50+ messages each!** ✅

---

## 🚀 **Implementation Timeline**

### **Week 1: Core Context Service**
- Day 1-2: Create ChatContextService
- Day 3-4: Implement context generation (incremental + full)
- Day 5: Implement mood shift detection
- Day 6-7: Create Cloud Function triggers, test

### **Week 2: Mood-Based Translation**
- Day 1-2: Update TranslationService to use context
- Day 3-4: Modify prompts for mood-aware translation
- Day 5-7: Test translation quality, adjust prompts

### **Week 3: User Summary Feature**
- Day 1-2: Add "Summarize Chat" to AI Commands
- Day 3-4: Create summary modal UI
- Day 5-7: Test and polish

### **Week 4: Integration & Optimization**
- Day 1-3: Update Cultural Context to use mood
- Day 4-5: Performance optimization
- Day 6-7: Comprehensive testing

---

## 🎯 **Dependencies**

### **Required Before This:**
- ✅ AI SDK installed (for generateText)
- ✅ TranslationService working
- ✅ Basic Cloud Functions setup

### **Enables These Features:**
- ✅ Mood-based translation (AUTO-TRANSLATE-PRD)
- ✅ Better cultural context (CULTURAL-CONTEXT-PRD)
- ✅ Smarter smart replies (SMART-REPLIES-PRD)

---

*Created: January 2025*
*Status: Ready for Implementation*
*Priority: HIGH - Foundation for all AI features*

