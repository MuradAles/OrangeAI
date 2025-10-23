# MessageAI - Project Brief

## Core Vision
**Simple text messaging app.** Send and receive text messages. Share images. Work offline. Foundation for future AI translation features.

**Philosophy:** "Just sending a text and reading a text. Keep it simple."

## Project Type
React Native + Expo mobile messaging application with Firebase backend

## Primary Goals
1. **Real-time Messaging:** One-on-one and group chat with instant message delivery
2. **Offline-First:** Full functionality when offline with automatic sync when back online
3. **Performance:** Smooth scrolling through thousands of messages with virtual scrolling
4. **Foundation for AI:** Build solid messaging infrastructure for future AI translation features

## Core Features (MVP)
- Email/Password authentication with email verification
- Contact system with friend requests and username search
- One-on-one text messaging (max 4,096 characters)
- Group chat with admin/member roles
- Image sharing (auto-compress to 85% quality, max 10MB)
- Message status tracking (Sending → Sent → Delivered → Read)
- Emoji reactions (native keyboard)
- Message deletion (for me / for everyone)
- Typing indicators and online/offline status
- Push notifications (FCM)
- Offline message queue with auto-retry
- Dark + Light mode

## Key Technical Requirements
- **Message Loading:** Virtual scrolling (render ~40 messages in RAM, load 50 at a time)
- **Open Chat:** Load from SQLite around last read position (<100ms), background sync from Firebase
- **Offline Queue:** Messages sent offline queue in SQLite and auto-upload when online (FIFO, 3 retries)
- **Image Handling:** Compress to 85% quality, generate 200x200px thumbnails
- **Performance Targets:**
  - Chat opens: <500ms (from SQLite)
  - Scroll: 60fps constant
  - Jump to bottom: <100ms
  - Memory: <50MB per active chat

## Success Criteria
- Two users can chat in real-time
- Messages persist after app restart
- Offline messages queue and send when online
- Images compress and display thumbnails first
- Smooth scrolling through 1,000+ messages
- Read receipts work correctly
- Push notifications work (foreground + background)

## Out of Scope (NOT in MVP)
- Voice/video calls
- Voice messages
- Document sharing
- Message replies/forwarding
- Message search
- End-to-end encryption
- Multi-device support
- Web/Desktop app

## Timeline
7-day development cycle across 5 phases:
- Phase 1 (Days 1-2): Foundation & Auth
- Phase 2 (Days 3-4): Core Messaging
- Phase 3 (Days 4-5): Features (images, reactions, contacts)
- Phase 4 (Days 5-6): Group Chat
- Phase 5 (Days 6-7): Polish & Deploy

## AI Translation (Implemented!)
**Phase 6:** AI-powered translation system using OpenAI GPT-3.5-turbo with conversation context.

**Features Implemented:**
- On-demand message translation via button
- Support for 13+ languages
- Context-aware translation (uses last 10 messages for context)
- Translation caching in Firestore
- Language auto-detection
- Inline translation display with toggle

**Future Enhancements:**
- Real-time auto-translation of entire message list
- Cultural context hints
- Formality level adjustment
- Slang/idiom explanations

