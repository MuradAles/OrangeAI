# 📋 **Smart Replies PRD**

## 🎯 **Product Overview**

**Feature:** Context-Aware Smart Reply Suggestions  
**Goal:** Generate AI-powered reply suggestions that match user's writing style and conversation context  
**User Value:** Respond quickly with personalized, context-appropriate messages  
**Advanced AI Capability:** Learns user's communication style from message history

## 👥 **User Stories**

### Primary User Story
> As a user receiving messages, I want AI to suggest 3 reply options in my style and language so I can respond quickly without typing.

### Secondary User Stories
- As a user, I want replies that sound like me (not generic)
- As a user, I want replies in my preferred language
- As a user, I want multiple tone options (casual, neutral, polite)
- As a user, I want to regenerate suggestions if I don't like them
- As a user, I want one-tap sending of suggested replies

## 🎨 **User Experience Flow**

### 1. **Smart Reply Generation Flow**
```
Message arrives → Analyze conversation context → 
Analyze user's writing style → Generate 3 reply suggestions → 
Show chips below message → User taps to send
```

### 2. **User Flow**
```
1. User receives: "Hey, want to grab lunch today?"
2. Smart replies appear:
   [Sure, sounds great!] [What time?] [Sorry, I'm busy today]
3. User taps "Sure, sounds great!"
4. Message sent immediately
```

### 3. **UI Display**
```
┌─────────────────────────────┐
│ John: Hey, want to grab      │
│ lunch today?                 │
└─────────────────────────────┘

💬 Quick Replies:
┌─────────────────────┐ ┌─────────────┐
│ 😊 Sure, sounds      │ │ 🤔 What     │
│    great!            │ │    time?    │
└─────────────────────┘ └─────────────┘
┌─────────────────────┐ ┌─────┐
│ 😅 Sorry, I'm busy   │ │ 🔄  │ ← Regenerate
│    today             │ └─────┘
└─────────────────────┘
```

## 🔧 **Technical Requirements**

### **Core Functionality**

#### **1. Style Learning**
- Analyze user's last 20-30 **sent** messages
- Extract style patterns:
  - Average message length
  - Emoji usage frequency
  - Punctuation style
  - Common phrases/words
  - Formality level
  - Language preference

#### **2. Context Analysis**
- Analyze last 10 messages in current conversation
- Understand conversation topic and tone
- Detect urgency or importance
- Consider previous exchanges

#### **3. Reply Generation**
- Generate 3 distinct reply options
- Match user's learned style
- Vary tone: casual, neutral, polite
- Keep replies concise (1-2 sentences)
- Include appropriate emojis if user uses them

#### **4. Smart Filtering**
- Don't suggest replies for:
  - Very old messages (>24 hours)
  - Messages user already replied to
  - System messages or notifications
- Auto-hide after user starts typing

### **Style Analysis Algorithm**
```typescript
interface UserStyle {
  averageLength: number;
  emojiFrequency: number; // 0-1
  commonEmojis: string[];
  punctuationStyle: 'minimal' | 'normal' | 'expressive';
  commonPhrases: string[];
  formalityLevel: 'casual' | 'neutral' | 'formal';
  languagePreference: string;
  greetingStyle: string;
  closingStyle: string;
}

const analyzeUserStyle = (userMessages: Message[]): UserStyle => {
  // Analyze last 20-30 sent messages
  // Extract patterns and preferences
  // Return style profile
};
```

### **Reply Generation Prompt**
```typescript
const generateSmartReplies = async (
  conversationContext: Message[],
  userStyle: UserStyle,
  targetMessage: Message
) => {
  const prompt = `
  You are generating reply suggestions for a user based on their writing style.
  
  USER'S WRITING STYLE:
  - Average length: ${userStyle.averageLength} characters
  - Emoji usage: ${userStyle.emojiFrequency > 0.5 ? 'Frequent' : 'Rare'}
  - Common emojis: ${userStyle.commonEmojis.join(', ')}
  - Formality: ${userStyle.formalityLevel}
  - Language: ${userStyle.languagePreference}
  - Common phrases: ${userStyle.commonPhrases.join(', ')}
  
  RECENT CONVERSATION:
  ${conversationContext.map(m => `- ${m.senderName}: ${m.text}`).join('\n')}
  
  MESSAGE TO REPLY TO:
  "${targetMessage.text}"
  
  Generate 3 reply options:
  1. Casual/friendly tone
  2. Neutral tone
  3. Polite/considerate tone
  
  Requirements:
  - Match the user's writing style closely
  - Keep replies concise (1-2 sentences)
  - Use emojis if user typically does
  - Write in ${userStyle.languagePreference}
  - Sound natural and conversational
  
  Format: Return ONLY a JSON array of 3 reply strings.
  `;
  
  return await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You generate personalized reply suggestions." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7, // Slightly creative but consistent
    max_tokens: 200
  });
};
```

## 📱 **UI/UX Specifications**

### **Smart Reply Chips**
- **Position:** Below received message
- **Layout:** Horizontal scrollable if more than 2 chips
- **Style:** Rounded chips with emoji prefix
- **Max visible:** 2-3 chips, scroll for more
- **Animation:** Smooth slide-up when appearing

### **Chip Design**
```
┌─────────────────────┐
│ 😊 Sure, sounds      │ ← Emoji + Text
│    great!            │    Padding: 12px
└─────────────────────┘    Border radius: 20px
     ^-- Tap to send
```

### **Regenerate Button**
```
┌─────┐
│ 🔄  │ ← Icon only, square chip
└─────┘
```

### **States**
- **Normal:** Light background, dark text
- **Loading:** "Generating..." with spinner
- **Error:** Hidden (fail silently)
- **Sent:** Chip fades out after sending

### **Behavior**
- **Auto-generate:** When message arrives (if enabled in settings)
- **Auto-hide:** When user starts typing reply
- **Dismiss:** Swipe down to dismiss all suggestions
- **Persist:** Show again if user clears input without sending

## 🗂️ **Data Models**

### **Smart Reply Cache**
```typescript
interface SmartReplyCache {
  messageId: string;
  replies: string[];
  tone: string[]; // ['casual', 'neutral', 'polite']
  generatedAt: number;
  userStyleSnapshot: UserStyle;
}
```

### **User Preferences**
```typescript
interface SmartReplyPreferences {
  enabled: boolean;
  autoGenerate: boolean; // Generate on message arrival
  maxSuggestions: number; // 2-3
  includeEmojis: boolean;
  regenerateLimit: number; // Max regenerations per message
}
```

## 🔄 **Implementation Requirements**

### **Backend Changes**
- **New Cloud Function:** `generateSmartReplies`
  - Input: messageId, chatId, userId
  - Loads: User's sent messages (last 20-30)
  - Loads: Conversation context (last 10 messages)
  - Analyzes: User's writing style
  - Generates: 3 reply suggestions
  - Cost: ~$0.0015 per generation

### **Frontend Changes**
- **New Component:** `SmartReplyBar.tsx`
  - Shows reply chips below message
  - Handles tap-to-send
  - Manages regenerate functionality
  
- **ChatModal Updates:**
  - Trigger smart reply generation on message arrival
  - Show/hide smart replies based on user interaction
  - Send selected reply via ChatStore

- **SQLite Updates:**
  - Cache user style analysis (refresh daily)
  - Cache generated replies (expire after 1 hour)

### **State Management**
- **ChatStore additions:**
  - `smartReplies: Map<messageId, string[]>`
  - `generateSmartReplies(messageId)`
  - `sendSmartReply(messageId, replyText)`
  - `regenerateSmartReplies(messageId)`

## 🧪 **Testing Strategy**

### **Manual Testing Checklist**
- [ ] Receive message → verify 3 smart replies appear
- [ ] Tap reply chip → verify message sends
- [ ] Verify replies match your writing style
- [ ] Test with different conversation contexts
- [ ] Test regenerate button → verify new suggestions
- [ ] Test in your preferred language
- [ ] Test with emoji usage patterns
- [ ] Test auto-hide when typing
- [ ] Verify replies persist after app reload
- [ ] Test error handling (API failures)

### **Style Learning Tests**
- [ ] User who uses lots of emojis → suggestions include emojis
- [ ] User with formal style → suggestions are formal
- [ ] User with casual style → suggestions are casual
- [ ] User with short messages → suggestions are short
- [ ] User with long messages → suggestions are longer
- [ ] Bilingual user → suggestions in correct language

### **Edge Cases**
- [ ] First conversation (no style history)
- [ ] Very short messages to reply to
- [ ] Questions vs statements
- [ ] Multiple unanswered messages
- [ ] Network issues during generation
- [ ] Rapid message arrivals

## 📊 **Success Metrics**

### **User Engagement**
- Smart reply usage rate (target: >30% of replies)
- Average tap-to-send time (target: <3 seconds)
- Regenerate usage rate (lower is better - means first suggestions good)
- User satisfaction with suggestions

### **Technical Performance**
- Generation time (target: <2 seconds)
- Style analysis accuracy (user feedback)
- Reply relevance (A/B testing)
- API cost per reply (~$0.0015)

### **Quality Metrics**
- Reply acceptance rate (target: >30%)
- Style match accuracy (user surveys)
- Language correctness (100%)
- Tone appropriateness

## 🚀 **Implementation Phases**

### **Phase 1: Backend & Style Analysis**
- Create `generateSmartReplies` Cloud Function
- Implement user style analysis
- Test with different user styles

### **Phase 2: Reply Generation**
- Implement context-aware generation
- Test with various conversation types
- Optimize prompts for quality

### **Phase 3: Frontend UI**
- Create SmartReplyBar component
- Implement tap-to-send
- Add regenerate functionality

### **Phase 4: Polish & Optimization**
- Cache style analysis
- Optimize generation speed
- Add user preferences
- Comprehensive testing

---

## 💡 **Future Enhancements**

- **Learning from feedback:** Track which suggestions are used
- **Contextual emojis:** Suggest emojis based on message content
- **Multi-language support:** Reply in same language as sender
- **Voice replies:** Convert suggestions to voice messages
- **Smart follow-ups:** Suggest follow-up questions

---

*Created: January 2025*
*Status: Ready for Implementation*
*Priority: HIGH - Required for Advanced AI rubric score*

