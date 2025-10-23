# AI Translation Feature - Task List

## ✅ FIXED: Authentication Issue

### ✅ Status: RESOLVED
**Issue:** `FirebaseError: unauthenticated` when calling Cloud Function  
**Solution:** 
- Added `invoker: "public"` to Cloud Function options
- Fixed client-side authentication flow
- Set Cloud Run IAM permissions

**Result:** Translation now works! 🎉

---

## ✅ Phase 1: Core Translation (COMPLETED)

### Backend - Firebase Cloud Functions
- [x] Set up Firebase Functions with Node.js 22
- [x] Install OpenAI SDK dependency
- [x] Create `TranslationService.ts` with:
  - [x] OpenAI client initialization (lazy loading)
  - [x] Language detection via GPT-3.5-turbo
  - [x] Context-aware translation (last 10 messages from Firestore)
  - [x] Prompt engineering for natural translations
- [x] Create `translateMessage` callable function in `index.ts`
  - [x] Authentication check
  - [x] Parameter validation (messageId, chatId, targetLanguage)
  - [x] Call TranslationService
  - [x] Error handling with HttpsError
  - [x] Set `invoker: "public"` for authenticated users

### Client - React Native
- [x] Update `FirebaseConfig.ts` to initialize Functions (us-central1 region)
- [x] Add `translations` and `detectedLanguage` to Message type
- [x] Add `preferredLanguage` to User type
- [x] Update SQLite schema (version 2):
  - [x] Add `translations` column (TEXT, JSON string)
  - [x] Add `detectedLanguage` column (TEXT)
  - [x] Create migration script
- [x] Update `SQLiteService.ts`:
  - [x] Include translations in `saveMessage`
  - [x] Add `updateMessageTranslation` method
- [x] Update `ChatStore.ts`:
  - [x] Parse translations from SQLite on load
  - [x] Preserve local translations when merging Firestore updates
  - [x] Save translations to SQLite when syncing
- [x] Update `MessageService.ts`:
  - [x] Set translations to empty object (local-only, not in Firestore)
- [x] Update `ChatModal.tsx`:
  - [x] Add `handleTranslateMessage` function
  - [x] Call Cloud Function with authentication token
  - [x] Save translation to SQLite
  - [x] Update ChatStore state to trigger UI refresh
  - [x] Add "🌐 Translate to English" to long-press menu
- [x] Update `MessageBubble.tsx`:
  - [x] Display translation ABOVE original message
  - [x] Bold styling for translated text
  - [x] "Translation" header with language icon
  - [x] Toggle visibility (show/hide translation)
  - [x] "See translation" button when hidden
- [x] Add language selector to Profile screen:
  - [x] Grid of language buttons (English, Spanish, French, German, etc.)
  - [x] Update user's `preferredLanguage` in profile

### Architecture Decisions
- [x] **Local-only translations:** Saved to SQLite only, NOT synced to Firestore
  - **Reason:** Privacy - translations are personal preference
  - **Benefit:** No Firestore writes, saves costs
- [x] **RAG Implementation:** Last 10 messages from Firestore as context
  - **Reason:** Simple, fast, sufficient for most translations
  - **Future:** Can upgrade to semantic search if needed
- [x] **Translation Position:** ABOVE original message in same bubble
  - **Reason:** Clear visual hierarchy, easy to compare
- [x] **Cost Optimization:** GPT-3.5-turbo instead of GPT-4
  - **Reason:** 10x cheaper, sufficiently accurate for translations

---

## 🟡 Phase 2: Quick Actions UI (IN PROGRESS)

### Goal
Replace long-press menu with:
- **Single tap:** Quick actions (Translate + Quick Reactions)
- **Long press:** Advanced AI menu (for future features)

### Task Breakdown

#### 1. Create `QuickActionsPopover.tsx` Component
**Status:** TODO  
**Location:** `src/features/chat/components/QuickActionsPopover.tsx`

**Features:**
- Floating overlay positioned above tapped message
- Top bubble: "Translate" button
- Bottom row: 4 emoji quick reactions (❤️ 😂 👍 🔥) + [+] button
- Auto-dismiss when tapping outside
- Smooth fade-in/fade-out animation

**Implementation:**
```typescript
interface QuickActionsPopoverProps {
  visible: boolean;
  onClose: () => void;
  onTranslate: () => void;
  onReact: (emoji: string) => void;
  onMoreReactions: () => void;
  messageLayout: { x: number; y: number; width: number; height: number };
}
```

#### 2. Update `MessageBubble.tsx`
**Status:** TODO

**Changes:**
- Add `onPress` handler (currently uses `onLongPress` only)
- Measure message position using `onLayout`
- Pass position to `QuickActionsPopover`
- Keep `onLongPress` for advanced menu

#### 3. Update `ChatModal.tsx`
**Status:** TODO

**Changes:**
- Add state for `QuickActionsPopover`:
  - `showQuickActions: boolean`
  - `selectedMessage: Message | null`
  - `messageLayout: { x, y, width, height }`
- Add `handleMessagePress` (single tap)
- Keep `handleLongPress` for advanced options
- Render `QuickActionsPopover` component

#### 4. Update `MessageOptionsSheet.tsx`
**Status:** TODO

**Changes:**
- Remove "Translate" option (moved to quick actions)
- Keep for advanced AI features (coming later):
  - Summarize
  - Extract Data
  - Explain Slang
  - Delete
  - Copy

---

## 🟢 Phase 3: Translation UX Improvements (NEXT)

### Auto-Translation
**Status:** TODO  
**Priority:** Medium

**Goal:** Automatically translate incoming messages from other languages
- Detect if message is in different language than user's `preferredLanguage`
- Auto-translate and show translation by default
- User can hide translation if desired

**Implementation:**
- Add `autoTranslate: boolean` to User preferences
- In `ChatStore.subscribeToMessages`:
  - Detect language of new messages
  - If different from `preferredLanguage` AND `autoTranslate === true`
  - Automatically call translation function
  - Cache result in SQLite

### Translation Cache (Cost Optimization)
**Status:** TODO  
**Priority:** High

**Goal:** Avoid re-translating same message multiple times
- Before calling Cloud Function, check if translation exists in SQLite
- If exists, use cached version
- Only call API for new translations

**Implementation:**
- Modify `handleTranslateMessage` to check SQLite first
- Add "Refresh translation" option for re-translation

### Batch Translation
**Status:** TODO  
**Priority:** Low

**Goal:** Allow translating multiple messages at once
- Select multiple messages
- Translate all in one batch
- Show progress indicator

---

## 🔵 Phase 4: Advanced AI Features (FUTURE)

### Conversation Summarization
**Status:** TODO  
**Access:** Long-press menu

**Features:**
- Summarize last N messages (10, 20, 50, 100)
- Generate bullet points
- Identify key topics and action items

### Data Extraction
**Status:** TODO  
**Access:** Long-press menu

**Features:**
- Extract phone numbers, emails, addresses
- Extract dates, times, events
- Create calendar reminders
- Save contacts

### Slang/Idiom Explanation
**Status:** TODO  
**Access:** Long-press menu

**Features:**
- Detect slang, idioms, cultural references
- Explain meaning in user's context
- Provide examples

### Formality Adjustment
**Status:** TODO  
**Access:** Compose area

**Features:**
- Adjust message tone (formal ↔ casual)
- Suggest more professional phrasing
- Context-aware suggestions

---

## 📊 Testing & Quality

### Manual Testing Checklist
- [ ] Fix IAM permissions (URGENT - DO FIRST)
- [ ] Translate message (single message)
- [ ] Check translation appears above message
- [ ] Reload app - verify translation persists
- [ ] Change preferred language in profile
- [ ] Translate to new language
- [ ] Test with multiple languages (Spanish, French, German, Japanese)
- [ ] Test offline (should use cached translations)
- [ ] Test with long messages (200+ words)
- [ ] Test with emoji, special characters
- [ ] Test in group chat
- [ ] Test with images + captions

### Performance Testing
- [ ] Measure translation latency (target: <3 seconds)
- [ ] Check SQLite read/write performance
- [ ] Monitor Cloud Function cold start time
- [ ] Check memory usage with many translations

### Cost Monitoring
- [ ] Set up billing alerts in Google Cloud
- [ ] Monitor OpenAI API usage
- [ ] Calculate cost per translation
- [ ] Set daily/monthly budget limits

---

## 🎯 Current Priority Order

1. **FIX IAM PERMISSIONS** ← DO THIS NOW! 🚨
2. Test existing translation feature thoroughly
3. Implement Quick Actions UI (Phase 2)
4. Add translation cache to reduce costs
5. Implement auto-translation option
6. Plan advanced AI features

---

## 📝 Notes

### Known Issues
- [ ] IAM permissions not set (blocking all translations)
- [ ] Translation shows "Translating..." Alert (ugly, should be inline loading)
- [ ] No loading indicator in message bubble while translating

### Future Improvements
- [ ] Add translation confidence score
- [ ] Support voice message transcription + translation
- [ ] Add "Report bad translation" feedback
- [ ] Multi-language conversations (A speaks Spanish, B speaks English, auto-translate both)
- [ ] Translation history/analytics

### Cost Estimates (GPT-3.5-turbo)
- Average message: ~50 words = ~70 tokens
- Context: 10 messages = ~500 tokens
- **Total per translation:** ~570 input tokens + ~70 output tokens = ~640 tokens
- **Cost:** $0.0005 per 1K input tokens + $0.0015 per 1K output tokens
- **Per translation:** ~$0.0004 (less than 1 cent)
- **1000 translations:** ~$0.40
- **With cache:** 50% reduction = $0.20 per 1000

---

*Last Updated: October 23, 2025*
*Next Action: Fix IAM permissions in Firebase Console*

