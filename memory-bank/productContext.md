# Product Context

## Why This Exists
MessageAI is being built as a **foundation for AI-powered international communication**. The MVP focuses on building a solid, performant messaging infrastructure that will later incorporate real-time translation and cultural context features.

## Problems We're Solving

### Primary Problem
Current messaging apps don't seamlessly handle international communication with:
- Real-time translation inline in conversations
- Cultural context explanations
- Formality level adjustments

### MVP Focus
Before adding AI features, we need a **rock-solid messaging foundation** that:
- Works reliably offline
- Performs smoothly with thousands of messages
- Handles real-time updates efficiently
- Provides excellent user experience

## Target User
**International Communicator** - Someone who regularly messages people across language barriers and needs:
- Fast, reliable messaging
- Offline capability (international travel)
- Image sharing with efficient data usage
- Group communication

## How It Should Work

### Core User Journey
1. **Sign Up:** Email/password with verification
2. **Create Profile:** Unique username, display name, optional profile picture
3. **Add Contacts:** Search by username, send friend requests
4. **Start Chatting:** One-on-one or group chats
5. **Stay in Sync:** Works offline, syncs when back online
6. **Share Media:** Send images with auto-compression

### Key User Experience Goals

#### Speed & Performance
- Chat opens instantly (loading from local SQLite cache)
- Messages appear immediately when sent (optimistic updates)
- Smooth scrolling even with thousands of messages
- Jump to newest messages instantly

#### Reliability
- Messages never lost, even if sent offline
- Automatic retry on failure
- Clear status indicators (sending/sent/delivered/read)
- Persistent scroll positions (resume where you left off)

#### Simplicity
- Clean, uncluttered interface
- Focus on text and images only (no feature bloat)
- Straightforward contact management
- Clear online/offline states

#### Offline Support
- View all cached conversations
- Send messages that queue locally
- React to messages
- Delete messages (for me)
- Automatic sync when connection restored

## What Makes This Different

### Virtual Scrolling Architecture
- Only render ~40 messages in memory at a time
- Load more as user scrolls
- Start at last read position
- Jump to bottom without loading everything in between

### Offline-First Design
- SQLite as local cache (minimum 200 messages per chat)
- Optimistic updates (show immediately, upload in background)
- Message queue with auto-retry
- Work with cached data when offline

### Adaptive Background Sync
- ≤50 unread: Download all at once
- 51-500 unread: Download in batches (100, 200, rest)
- 500+ unread: Load 50 at a time as user scrolls

### Image Optimization
- Auto-compress to 85% quality
- Generate 200x200px thumbnails
- Show thumbnail first, load full image on tap
- Efficient storage and data usage

## User Experience Principles

1. **Instant Feedback:** Always show optimistic updates, sync in background
2. **Clear Status:** User always knows what's happening (sending/sent/delivered/read)
3. **No Waiting:** Load from cache first, sync in background
4. **Graceful Degradation:** Core features work offline, advanced features require connection
5. **Memory Efficient:** Keep constant memory usage regardless of message count
6. **Smooth Performance:** Maintain 60fps scrolling at all times

## Future Features (Post-MVP)
Once messaging foundation is solid, add:
- Real-time message translation (inline)
- Auto language detection
- Cultural context hints (idioms, slang explanations)
- Formality level adjustment
- Translation caching with RAG (last 20 messages for context)

