# 📋 **Formality Adjustment PRD**

## 🎯 **Product Overview**

**Feature:** Formality Level Adjustment for Messages  
**Goal:** Allow users to adjust message tone from casual to formal with custom instructions  
**User Value:** Communicate appropriately in different contexts and relationships  

## 👥 **User Stories**

### Primary User Story
> As a user composing a message, I want to adjust the formality level so I can communicate appropriately for the context and relationship.

### Secondary User Stories
- As a user, I want pre-built formality options (casual, formal, professional, friendly)
- As a user, I want to create custom formality instructions
- As a user, I want to see preview of adjusted message before sending
- As a user, I want to set default formality preferences

## 🎨 **User Experience Flow**

### 1. **Formality Adjustment Flow**
```
User types message → Long-press send button → 
Formality menu appears → Selects option → 
Message preview updates → Send adjusted version
```

### 2. **Custom Formality Flow**
```
User selects "Custom" → Modal opens → 
Types instruction → Preview updates → 
Apply and send
```

### 3. **UI Display**
```
┌─────────────────────┐
│ [Message Input]      │
│ "Hey, can you send  │
│ that file?"         │
└─────────────────────┘
┌─────────────────────┐
│ 📝 Adjust Tone       │
├─────────────────────┤
│ 😊 Casual           │
│ 👔 Formal            │
│ 💼 Professional      │
│ 🤝 Friendly          │
│ ✏️ Custom...         │
└─────────────────────┘
```

### 4. **Custom Instruction Modal**
```
┌─────────────────────┐
│ ✏️ Custom Tone       │
├─────────────────────┤
│ [Text Input]         │
│ "Make it sound like  │
│ a lawyer"            │
├─────────────────────┤
│ Preview:             │
│ "Dear Sir/Madam,     │
│ Could you please     │
│ forward the          │
│ requested document?" │
├─────────────────────┤
│ [Cancel] [Apply]     │
└─────────────────────┘
```

## 🔧 **Technical Requirements**

### **Core Functionality**
- **Formality Detection:** Analyze current message formality level
- **Tone Adjustment:** Apply formality changes using AI
- **Preview System:** Show adjusted message before sending
- **Custom Instructions:** Handle user-defined tone requirements
- **Default Preferences:** Remember user's preferred formality

### **Formality Options**
```typescript
interface FormalityOption {
  id: string;
  label: string;
  icon: string;
  instruction: string;
  description: string;
}

const FORMALITY_OPTIONS: FormalityOption[] = [
  {
    id: 'casual',
    label: 'Casual',
    icon: '😊',
    instruction: 'Make it more casual and friendly, use informal language',
    description: 'Relaxed, friendly tone'
  },
  {
    id: 'formal',
    label: 'Formal',
    icon: '👔',
    instruction: 'Make it more formal and professional, use proper etiquette',
    description: 'Professional, respectful tone'
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: '💼',
    instruction: 'Use business-appropriate language, maintain professionalism',
    description: 'Business-appropriate tone'
  },
  {
    id: 'friendly',
    label: 'Friendly',
    icon: '🤝',
    instruction: 'Use warm, friendly tone while maintaining respect',
    description: 'Warm, approachable tone'
  }
];
```

### **AI Integration**
```typescript
const adjustFormality = async (message: string, instruction: string) => {
  const prompt = `
  Rewrite this message with the following tone adjustment:
  "${instruction}"
  
  Original message: "${message}"
  
  Requirements:
  - Maintain the core meaning
  - Apply the requested tone
  - Keep it natural and appropriate
  - Preserve any important details
  
  Rewritten message:`;
  
  return await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
  });
};
```

## 📱 **UI/UX Specifications**

### **Formality Menu**
- **Trigger:** Long-press on send button
- **Layout:** Vertical list with icons and labels
- **Animation:** Smooth slide-up from bottom
- **Dismissal:** Tap outside or swipe down

### **Custom Instruction Modal**
- **Input:** Multi-line text input for instructions
- **Preview:** Real-time preview of adjusted message
- **Actions:** Cancel, Apply, Send
- **Validation:** Minimum instruction length

### **Send Button States**
```
Normal: [Send]
Long-press: Shows formality menu
After selection: [Send Original] [Send Adjusted]
```

## 🗂️ **Data Models**

### **User Formality Preferences**
```typescript
interface FormalityPreferences {
  defaultFormality: 'casual' | 'formal' | 'professional' | 'friendly' | 'custom';
  customInstruction?: string;
  autoDetectFormality: boolean;
  showPreview: boolean;
  rememberChoices: boolean;
}
```

### **Formality Adjustment**
```typescript
interface FormalityAdjustment {
  originalMessage: string;
  adjustedMessage: string;
  formalityLevel: string;
  instruction: string;
  timestamp: number;
  confidence: number;
}
```

## 🔄 **Implementation Requirements**

### **Backend Changes**
- **New Cloud Function:** `adjustFormality` for tone adjustment
- **Formality Analysis:** Analyze current message formality
- **Custom Instruction Handling:** Process user-defined instructions
- **Caching:** Cache common formality adjustments

### **Frontend Changes**
- **MessageInput Enhancement:** Add formality menu trigger
- **Formality Menu Component:** Long-press menu with options
- **Custom Modal Component:** Input for custom instructions
- **Preview System:** Show adjusted message before sending
- **Settings Integration:** Formality preferences in profile

## 🧪 **Testing Strategy**

### **Manual Testing Checklist**
- [ ] Long-press send button shows formality menu
- [ ] All formality options work correctly
- [ ] Custom instruction input works
- [ ] Preview updates correctly
- [ ] Send original vs adjusted works
- [ ] Settings preferences saved
- [ ] Error handling (API failures)
- [ ] Performance with long messages

### **Edge Cases**
- [ ] Very long messages (500+ words)
- [ ] Messages with emojis and special characters
- [ ] Empty custom instructions
- [ ] Network connectivity issues
- [ ] Rapid formality changes

## 📊 **Success Metrics**

### **User Engagement**
- Formality adjustment usage rate
- Custom instruction usage
- Send adjusted vs original ratio

### **Technical Performance**
- Formality adjustment time (< 2 seconds)
- Preview update time (< 500ms)
- Error rate (< 3%)

## 🚀 **Implementation Phases**

### **Phase 1: Basic Formality Menu** (Week 1)
- Long-press send button menu
- Pre-built formality options
- Basic tone adjustment

### **Phase 2: Custom Instructions** (Week 2)
- Custom instruction modal
- Enhanced AI integration
- Preview system

### **Phase 3: Polish & Testing** (Week 3)
- Settings integration
- Performance optimization
- Comprehensive testing

---

*Created: January 2025*
*Status: Ready for Implementation*
