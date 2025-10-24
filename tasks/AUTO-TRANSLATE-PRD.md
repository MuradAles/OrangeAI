# 📋 **PRD: Auto-Translate Feature**

## 🎯 **Product Overview**

**Feature:** Auto-Translate for Incoming Messages  
**Goal:** Automatically translate incoming messages when language differs from user's preferred language  
**User Value:** Seamless multilingual conversations without manual translation  

## 👥 **User Stories**

### Primary User Story
> As a user in a multilingual chat, I want incoming messages to be automatically translated to my preferred language so I can understand conversations without manual effort.

### Secondary User Stories
- As a user, I want to toggle auto-translate per chat so I can control which conversations need translation
- As a user, I want translations to match the conversation's tone and formality so they feel natural
- As a user, I want to see both original and translated text so I can learn the language

## 🎨 **User Experience Flow**

### 1. **Activation Flow**
```
User long-presses message → AI Commands Menu → Tap "Auto-Translate" → Toggle ON
```

### 2. **Auto-Translation Flow**
```
Friend sends message (Spanish) → System detects language ≠ English → 
Collects context (last 10-15 text messages) → Calls translation API → 
Shows translation above original → Saves to SQLite
```

### 3. **UI Display**
```
┌─────────────────────────────┐
│ 🌐 Translation               │ ← Translation header
│ Hello friend, how            │ ← Translated text (bold)
│ are you doing?               │
├─────────────────────────────┤
│ 😊 Casual, friendly tone     │ ← Formality indicator
└─────────────────────────────┘
Hola amigo, ¿cómo              ← Original text
estás?
```

## 🔧 **Technical Requirements**

### **Core Functionality**
- **Language Detection:** Use OpenAI to detect incoming message language
- **Context Collection:** Smart context window (3-15 text messages, 2-hour window)
- **Translation:** Call existing `translateMessage` Cloud Function with context
- **Formality Detection:** Detect tone of received messages (casual/formal/professional/friendly)
- **Storage:** Save translations and formality locally in SQLite (not Firestore)
- **UI:** Display translations above original messages with formality indicator

### **Smart Context Strategy**
```typescript
const getSmartContext = (messages: Message[], targetMessage: Message) => {
  // 1. Get last 30 messages (regardless of type)
  const recentMessages = messages.slice(-30);
  
  // 2. Filter to text messages only (including image captions)
  const textMessages = recentMessages.filter(m => 
    (m.type === 'text' && m.text?.trim()) || 
    (m.type === 'image' && m.caption?.trim())
  );
  
  // 3. Ensure minimum context
  if (textMessages.length < 3) {
    return [targetMessage]; // Single message fallback
  }
  
  // 4. Take last 10-15 text messages
  return textMessages.slice(-15);
};
```

### **Per-Chat Toggle System**
- **Storage:** `autoTranslateEnabled` boolean per chat in SQLite
- **UI:** Toggle in AI Commands Menu (long-press any message)
- **Scope:** Only affects incoming messages from OTHER users
- **Default:** OFF (user must explicitly enable)

## 📱 **UI/UX Specifications**

### **AI Commands Menu Update**
```
Current:
┌─────────────────┐
│ 🔤 📄 💡 ✏️ │
│ Translate Summarize │
│ Explain Rewrite    │
└─────────────────┘

Updated:
┌─────────────────┐
│ 🔤 🔄 📄 💡 ✏️ │
│ Translate Auto Summarize │
│ Explain Rewrite    │
└─────────────────┘
```

### **Auto-Translate Toggle**
- **Icon:** 🔄 (refresh/cycle icon)
- **Label:** "Auto-Translate"
- **State:** Shows ON/OFF with visual indicator
- **Action:** Toggle per-chat setting

### **Translation Display**
- **Position:** Above original message (same as manual translate)
- **Styling:** Identical to existing translation UI
- **Animation:** Smooth fade-in when translation appears
- **Controls:** Same show/hide functionality as manual translate

## 🗂️ **Data Models**

### **Chat Settings (SQLite)**
```typescript
interface ChatSettings {
  chatId: string;
  autoTranslateEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### **Message Updates**
```typescript
// Extends existing Message interface
interface Message {
  // ... existing fields
  translations?: { [languageCode: string]: string };
  detectedLanguage?: string;
  formalityLevel?: 'casual' | 'formal' | 'professional' | 'friendly'; // NEW
  formalityIndicators?: string[]; // NEW - What made us detect this level
}
```

### **Formality Detection**
```typescript
interface FormalityDetection {
  level: 'casual' | 'formal' | 'professional' | 'friendly';
  confidence: number; // 0-100
  indicators: string[]; // What made us detect this level
}

// Examples:
// "Hey dude!" → casual (confidence: 95%, indicators: ["informal greeting", "slang"])
// "Good morning, sir." → formal (confidence: 92%, indicators: ["formal greeting", "title"])
// "Let's schedule a meeting" → professional (confidence: 88%, indicators: ["business language"])
// "How are you doing, friend?" → friendly (confidence: 90%, indicators: ["warm tone", "friend"])
```

## 🧪 **Testing Strategy**

### **Manual Testing Checklist**

#### **Translation Tests**
- [ ] Toggle auto-translate ON/OFF per chat
- [ ] Send message in different language → verify auto-translation
- [ ] Test with insufficient context (fallback to single message)
- [ ] Test with image captions in context
- [ ] Verify translations persist after app reload
- [ ] Test multiple languages (Spanish, French, German)
- [ ] Verify only OTHER users' messages are auto-translated
- [ ] Test error handling (API failures)

#### **Formality Detection Tests**
- [ ] Receive casual message ("Hey dude!") → verify shows "Casual" indicator
- [ ] Receive formal message ("Good morning, sir") → verify shows "Formal"
- [ ] Receive professional message ("Let's schedule a meeting") → verify shows "Professional"
- [ ] Receive friendly message ("How are you, friend?") → verify shows "Friendly"
- [ ] Verify formality indicator displays correctly
- [ ] Verify formality persists after app reload

### **Edge Cases**
- [ ] Messages with only emojis
- [ ] Very long messages (500+ words)
- [ ] Messages with special characters
- [ ] Network connectivity issues
- [ ] Rapid message sending (debouncing)

## 📊 **Success Metrics**

### **User Engagement**
- Auto-translate toggle usage rate
- Messages auto-translated per day
- User satisfaction with translation quality

### **Technical Performance**
- Translation latency (< 3 seconds)
- Context collection time (< 500ms)
- Error rate (< 5%)

## 🚀 **Launch Plan**

### **Phase 1: Core Implementation** (Week 1)
- Database layer and UI components

### **Phase 2: Auto-Translation Logic** (Week 2)
- Smart context and language detection

### **Phase 3: Polish & Testing** (Week 3)
- Integration and optimization

---

*Created: January 2025*
*Status: Ready for Implementation*
