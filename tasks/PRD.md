# MessageAI - Product Requirements Document

**Version:** 3.0 Final  
**Platform:** React Native + Expo + TypeScript  
**Backend:** Firebase

---

## Project Vision

**Simple text messaging app.** Send and receive text messages. Share images. Work offline. Foundation for future AI translation features.

**Core Philosophy:** "Just sending a text and reading a text. Keep it simple."

---

## Tech Stack

### Frontend
- React Native + Expo + TypeScript
- Expo Router (navigation)
- Zustand (state management)
- React Native Paper (UI components)
- @shopify/flash-list (virtual scrolling)
- Expo Image, expo-image-picker, expo-image-manipulator
- date-fns (date formatting)

### Backend
- Firebase Firestore (database)
- Firebase Auth (Email/Password + Google)
- Firebase Storage (images)
- Firebase Cloud Messaging (push notifications)
- Expo SQLite (local storage)

### Design
- Dark + Light mode support
- Custom reusable component library
- Material Design (via React Native Paper)

---

## Core Features

### Authentication
- **Email/Password:** Requires email verification before access
- **Username:** User creates their own unique username with real-time availability check (lowercase, 3-20 chars)
- **Profile:** Display name (permanent), username (permanent), profile picture, bio
- **Note:** Display name and username are set once during sign-up and cannot be changed

### Profile Pictures
- **Default:** Generate colored circle with first letter of display name
  - Random background color (from preset palette)
  - White text (first letter)
- **Custom upload:** User can upload/change their profile picture anytime
- **Editable:** Profile picture and bio can be edited after account creation

### Contacts

**Friend Request System:**
1. Search by username (no email search)
2. Send friend request
3. Recipient accepts request
4. Both become contacts, can chat

**Additional Features:**
- Contact list with online/offline status
- Real-time username availability check
- Add friends to groups from friend list

### One-on-One Chat
- Send/receive text messages (max 4,096 characters)
- Send/receive images (max 10MB, auto-compress to 85% quality)
- Image captions (max 1,024 characters)
- Message status: Sending ⏱️ → Sent ✓ → Delivered ✓✓ → Read ✓✓ (blue)
- Emoji reactions (native keyboard emojis, unlimited choices)
- Delete message:
  - **Delete for me:** Removes from your view only
  - **Delete for everyone:** Removes for all participants (only your own messages)
- Long-press for options: Delete, React, Copy text
- Typing indicators ("[Name] is typing...")
- Online/offline status with "Last seen" timestamp
- Read receipts (always on, cannot disable)

### Group Chat
- Create group: Name (required), icon (optional), description (optional)
- **2 roles only:**
  - **Admin (1 person):** Add/remove members, edit group settings
  - **Members:** Send messages, leave group
- Admin transitions: If admin leaves → Oldest member becomes admin
- If admin leaves and no members → Group auto-deleted
- **Member Management:**
  - Admin can add friends from friend list
  - Friends already in group shown grayed out (cannot select)
  - Admin can remove members
  - All members can leave group
- Group features: Same as one-on-one (messages, images, reactions, status)
- **Read receipts in groups:** Message turns blue when FIRST person reads it

### Message Loading & Scrolling

**Core Concept:**
- **Virtual scrolling:** Only render ~40 messages in RAM at any time
- **Start position:** Always open at last read position (where you left off)
- **No visual separator:** Chat opens at last position, user scrolls naturally to see new messages
- **Lazy loading:** Load 50 messages at a time as you scroll
- **Adaptive sync:** Download new messages in batches based on count (console logs only, no UI indicator)

**Render in RAM:** 40 messages (visible + buffer)
**Load per scroll:** 50 messages
**Cache in SQLite:** Minimum 200 messages per chat, grows as you use

**Opening Existing Chat:**
1. Load from SQLite: 20-40 messages around last read position (instant <100ms)
2. Display immediately, scroll to last read position
3. Background: Download new messages from Firebase in batches
4. Save batches to SQLite as they arrive
5. User can scroll through cached messages instantly

**Opening New Chat (First Time):**
1. SQLite empty (no messages yet)
2. Fetch from Firebase: Last 50 messages
3. Takes 1-2 seconds
4. Save to SQLite
5. Display, scroll to bottom

**Scrolling Behavior:**
- **Scroll down (newer messages):**
  - If in SQLite → Load instantly
  - If not in SQLite → Fetch from Firebase (1-2 sec) → Save → Display
- **Scroll up (older messages):**
  - Always from SQLite (already cached from before)
  - Load instantly

**Jump to Bottom:**
- Floating button: "↓ Jump to Latest (X new)"
- Instant teleport to newest message
- Only load messages at bottom (not everything in between)

**Adaptive Background Sync:**
- ≤50 unread: Download all at once (1-2 sec)
- 51-500 unread: Batch 1 (100 msgs), Batch 2 (200 msgs), Batch 3 (rest)
- 500+ unread: Load 50 at a time as user scrolls down

### Offline Support

**What Works Offline:**
- View all cached messages and chats
- Send messages (queued locally in SQLite)
- Delete messages for me
- React to messages (syncs later)
- Navigate between chats
- View cached images

**What Doesn't Work:**
- Send friend requests
- Accept friend requests
- Create groups
- Upload new images
- See typing indicators
- See online/offline status updates

**Message Queue:**
1. Send message offline → Save to SQLite with `syncStatus: "pending"`
2. Show in UI immediately (optimistic update)
3. Show banner: "⚠️ No internet connection"
4. When online → Auto-retry 3 times
5. If fails after 3 attempts → Show "Message not sent" with retry button
6. Process queue in FIFO order (first sent, first uploaded)

### Push Notifications
- New messages (show message content if <50 chars, else "New message")
- Image messages: "[Name] sent an image"
- Friend requests: "New friend request from [Name]"
- Request accepted: "[Name] accepted your request"
- Added to group: "[Name] added you to [Group]"
- Tap notification → Opens relevant chat/screen
- Request permission on first app launch
- If denied → App works without notifications

---

## Data Architecture

### Firebase Firestore Collections

**`/users/{userId}`**
```
username (unique, lowercase, permanent)
displayName (permanent after creation)
email
bio (editable)
profilePictureUrl (editable, null if none)
isOnline (boolean)
lastSeen (timestamp)
createdAt (timestamp)
```

**`/chats/{chatId}`**
```
type ("one-on-one" | "group")
participants (array of userIds)
lastMessageText
lastMessageTime (timestamp)
lastMessageSenderId
createdAt (timestamp)
createdBy (userId)

// Group-specific (null for one-on-one)
groupName
groupIcon (Firebase Storage URL)
groupDescription
groupAdminId (userId of current admin)
inviteCode (backend only, no UI for sharing)
```

**`/chats/{chatId}/messages/{messageId}`**
```
senderId (userId)
text (message content)
timestamp (server timestamp)
status ("sending" | "sent" | "delivered" | "read")
type ("text" | "image")

// Image-specific
imageUrl (Firebase Storage URL, full resolution)
thumbnailUrl (Firebase Storage URL, 200x200px)
caption (optional text with image)

// Interactions
reactions (object: { "😂": [userId1, userId2], "❤️": [userId3] })

// Deletion
deletedFor (array of userIds for "delete for me")
deletedForEveryone (boolean)
deletedAt (timestamp, null if not deleted)
```

**`/chats/{chatId}/participants/{userId}`**
```
userId
role ("admin" | "member")
joinedAt (timestamp)
lastReadMessageId (for scroll position)
lastReadTimestamp (timestamp)
unreadCount (number)
```

**`/friendRequests/{requestId}`**
```
fromUserId
toUserId
status ("pending" | "accepted" | "ignored")
createdAt (timestamp)
respondedAt (timestamp, null if pending)
```

**`/chats/{chatId}/typing/{userId}`**
```
timestamp (auto-delete after 3 seconds via TTL)
```

### Firebase Storage Structure

```
/users/{userId}/profile.jpg
/groups/{chatId}/icon.jpg
/chats/{chatId}/{messageId}/image.jpg (full resolution)
/chats/{chatId}/{messageId}/thumbnail.jpg (200x200px)
```

### Local SQLite Tables

**`users`**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  displayName TEXT,
  bio TEXT,
  profilePictureUrl TEXT,
  isOnline INTEGER,
  lastSeen INTEGER
);
```

**`chats`**
```sql
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  type TEXT,
  participants TEXT, -- JSON array
  lastMessageText TEXT,
  lastMessageTime INTEGER,
  unreadCount INTEGER,
  groupName TEXT,
  groupIcon TEXT,
  groupAdminId TEXT
);
```

**`messages`**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chatId TEXT,
  senderId TEXT,
  text TEXT,
  timestamp INTEGER,
  status TEXT,
  type TEXT,
  imageUrl TEXT,
  thumbnailUrl TEXT,
  caption TEXT,
  reactions TEXT, -- JSON object
  deletedForMe INTEGER, -- Boolean
  deletedForEveryone INTEGER, -- Boolean
  syncStatus TEXT -- "synced" | "pending" | "failed"
);
```

**`scroll_positions`**
```sql
CREATE TABLE scroll_positions (
  chatId TEXT PRIMARY KEY,
  lastReadMessageId TEXT,
  scrollYPosition INTEGER,
  unreadCount INTEGER
);
```

**`friend_requests`**
```sql
CREATE TABLE friend_requests (
  id TEXT PRIMARY KEY,
  fromUserId TEXT,
  toUserId TEXT,
  status TEXT,
  createdAt INTEGER
);
```

---

## Key User Flows

### Send Message Flow
1. User types message and taps send
2. Save to SQLite immediately (`status: "sending"`, `syncStatus: "pending"`)
3. Show in UI instantly with clock icon ⏱️ (optimistic update)
4. Upload to Firestore in background
5. On success: Update SQLite (`status: "sent"`, `syncStatus: "synced"`)
6. Show single checkmark ✓
7. When recipient receives: Update to ✓✓ (delivered)
8. When recipient reads: Update to ✓✓ blue (read)
9. If offline: Queue locally, auto-send when online

### Receive Message Flow
1. Firestore listener detects new message
2. Save to SQLite immediately
3. Update UI (add message to chat)
4. If app backgrounded: Show push notification
5. Update chat list (last message preview, timestamp)
6. Update unread count
7. If chat open: Mark as read, send read receipt to Firestore

### Open Existing Chat Flow
1. Query SQLite for `lastReadMessageId` and `scrollYPosition`
2. Load from SQLite: Messages around last read position (what exists)
3. Display instantly (<100ms)
4. Scroll to exact last read position (no visual separator)
5. Background: Query Firestore for new messages after last cached
6. Download in batches with console logs (no UI indicator)
7. Save to SQLite as batches arrive
8. Start real-time listener for new messages

### Open New Chat Flow (First Time)
1. Check SQLite: Empty (no messages)
2. Query Firestore: "Get last 50 messages"
3. Download (1-2 seconds), show loading
4. Save to SQLite
5. Display messages
6. Scroll to bottom (newest)
7. Start real-time listener

### Scroll Down Flow
1. User scrolls down toward newer messages
2. App detects: "5 messages from bottom of rendered"
3. Query SQLite: "Next 50 messages"
4. If in SQLite: Load instantly, render
5. If not in SQLite: Fetch from Firestore (1-2 sec), save, render
6. Remove old messages from top (no longer visible)
7. Total rendered: Still ~40 messages

### Scroll Up Flow
1. User scrolls up toward older messages
2. App detects: "5 messages from top of rendered"
3. Query SQLite: "Previous 50 messages"
4. Load instantly (always in SQLite - already seen before)
5. Render at top
6. Remove messages from bottom (no longer visible)
7. Total rendered: Still ~40 messages

### Go Offline → Online Flow
1. User goes offline (airplane mode)
2. Messages sent: Queue in SQLite (`syncStatus: "pending"`)
3. Show banner: "⚠️ No internet connection"
4. User comes back online
5. Detect connection
6. Process send queue (FIFO)
7. Upload each pending message to Firestore
8. Auto-retry up to 3 times per message
9. Update status as they upload
10. Download any new messages received while offline
11. Update UI

---

## Real-Time Features

### Firestore Listeners

**Chat List Listener:**
```typescript
firestore()
  .collection('chats')
  .where('participants', 'array-contains', currentUserId)
  .orderBy('lastMessageTime', 'desc')
  .onSnapshot(snapshot => {
    // Update SQLite
    // Refresh chat list UI
  });
```

**Active Chat Messages Listener:**
```typescript
firestore()
  .collection('chats/{chatId}/messages')
  .orderBy('timestamp', 'desc')
  .limit(50)
  .onSnapshot(snapshot => {
    // Save new messages to SQLite
    // Update UI immediately
    // Update message status
  });
```

**User Presence Listener:**
```typescript
contactIds.forEach(contactId => {
  firestore()
    .collection('users')
    .doc(contactId)
    .onSnapshot(doc => {
      // Update isOnline, lastSeen
      // Update contact list UI
    });
});
```

**Typing Indicator Listener:**
```typescript
firestore()
  .collection('chats/{chatId}/typing')
  .onSnapshot(snapshot => {
    // Show/hide "[Name] is typing..."
    // Multiple users: "John and Sarah are typing..."
    // 3+ users: "Multiple people are typing..."
  });
```

### Presence Management
- User opens app → Set `isOnline: true`
- User closes app → Set `isOnline: false`, update `lastSeen`
- Use `.onDisconnect()` for unexpected disconnections
- Update every 30 seconds while app active

### Typing Indicators
- User starts typing → Create document in `/chats/{chatId}/typing/{userId}`
- Update timestamp every 2 seconds while typing
- User stops typing → Delete document
- Auto-delete after 3 seconds (Firestore TTL)

---

## UI/UX Guidelines

### Message Display
- **Sent messages:** Right-aligned, blue bubble
- **Received messages:** Left-aligned, gray bubble
- **Profile pictures:** Next to received messages
- **Grouped messages:** Same sender within 1 minute
- **Date separators:** "Today", "Yesterday", "March 15, 2025"
- **Last read position:** Chat opens at exact scroll position where user left off

### Status Indicators
- ⏱️ **Sending:** Clock icon, gray
- ✓ **Sent:** Single gray checkmark
- ✓✓ **Delivered:** Double gray checkmarks
- ✓✓ **Read:** Double blue checkmarks (one-on-one)
- ✓✓ **Read (groups):** Blue when first person reads

### Character Counter
- Hidden until 3,900 characters
- Shows "196 remaining" when visible
- At 4,096: Prevent typing, show "Message too long"

### Typing Indicators
- One-on-one: "[Name] is typing..."
- Groups: Up to 2 names: "John and Sarah are typing..."
- Groups: 3+ typing: "Multiple people are typing..."

### Theming
**Light Mode:**
- Background: #FFFFFF
- Primary: #0084FF
- Message sent: #0084FF
- Message received: #F0F0F0

**Dark Mode:**
- Background: #000000
- Primary: #0A84FF
- Message sent: #0A84FF
- Message received: #1C1C1E

---

## Out of Scope (NOT in MVP)

**Do NOT Build:**
- ❌ Voice/video calls
- ❌ Voice messages
- ❌ Video messages
- ❌ Document sharing (PDFs, etc.)
- ❌ Location sharing
- ❌ Contact card sharing
- ❌ GIFs / Stickers (only native emojis)
- ❌ Message replies (quoting messages)
- ❌ Message editing (use delete/resend instead)
- ❌ Message forwarding
- ❌ Message search
- ❌ Message scheduling
- ❌ Disappearing messages
- ❌ End-to-end encryption
- ❌ Moderator role (only Admin + Members)
- ❌ Group invite link sharing UI (backend exists, no UI)
- ❌ Personal invite links (user profile sharing)
- ❌ Block users (removed from MVP)
- ❌ Phone number in profiles
- ❌ Edit display name or username after creation
- ❌ Unread message separator line (opens at last position instead)
- ❌ Read receipt privacy controls
- ❌ Hide online status option
- ❌ Disable typing indicators
- ❌ Stories / Status updates
- ❌ Chat wallpapers
- ❌ Custom themes (light/dark only)
- ❌ Multi-device support
- ❌ Web/Desktop app
- ❌ Chat backup to cloud
- ❌ Email search (only username search)

---

## Success Criteria

### Must Pass
- ✅ Two users chat in real-time
- ✅ Messages appear instantly (optimistic updates)
- ✅ Messages persist after app restart
- ✅ Offline: Send messages → Queue → Auto-send when online
- ✅ Group chat with 3+ users works
- ✅ Images send/receive correctly (compress, thumbnail)
- ✅ Read receipts update properly
- ✅ Push notifications work (foreground + background)
- ✅ Smooth scrolling through 1,000+ messages (60fps)
- ✅ Open chat at last read position
- ✅ Jump to bottom works instantly

### Performance Targets
- Chat opens: <500ms (from SQLite)
- Background sync: 1-8 seconds (depending on unread count)
- Scroll: 60fps constant, no lag
- Jump to bottom: <100ms
- Memory: <50MB per active chat (only 40 messages rendered)
- Message upload: 200-500ms (good connection)
- Image upload: <5 seconds per image

### Testing Scenarios
1. **Two devices:** Real-time chat, typing indicators, read receipts work
2. **Offline:** Go offline → Send 5 messages → Come online → All send
3. **App lifecycle:** Send message → Force quit → Reopen → Message sent
4. **Images:** Send image → Compresses → Recipient receives thumbnail + full
5. **Groups:** 5 members → All send messages → All receive correctly
6. **Admin:** Admin leaves → Oldest member becomes admin
7. **High volume:** 5,000 unread messages → Opens at last read → Smooth scroll
8. **Jump:** 1,000 messages between → Jump to bottom → Instant

---

## Development Phases (7 Days)

**Phase 1 (Days 1-2): Foundation**
- Firebase project setup (Firestore, Auth, Storage, FCM)
- React Native + Expo + TypeScript initialization
- Expo Router setup
- SQLite database setup
- Authentication (Email/Password + Google)
- User profile creation with username availability check
- Profile picture generation (colored circles)

**Phase 2 (Days 3-4): Core Messaging**
- One-on-one chat UI with FlashList
- Send/receive text messages
- Real-time Firestore listeners
- Local SQLite persistence
- Optimistic updates
- Message status indicators (4 states)
- Virtual scrolling (render 40, load 50)
- Open at last read position

**Phase 3 (Days 4-5): Features**
- Image upload with compression (10MB max, 85% quality)
- Thumbnail generation (200x200px)
- Emoji reactions (native keyboard)
- Message deletion (for me / for everyone)
- Typing indicators
- Online/offline status with last seen
- Contact system (search by username)
- Friend requests (send, accept, ignore, block)
- Personal invite links

**Phase 4 (Days 5-6): Groups**
- Group creation (name, icon, description)
- Admin + Member roles
- Group settings (edit name, icon, description)
- Add/remove members
- Admin transitions
- Group invite links (permanent, public)
- Leave group functionality

**Phase 5 (Days 6-7): Polish & Deploy**
- Push notifications (FCM setup, foreground/background)
- Offline message queue with auto-retry
- Dark + Light mode implementation
- UI/UX refinements
- Performance optimization
- Testing on real devices (2+ phones)
- Bug fixes
- Deploy to Expo Go

---

## Configuration

### Environment Variables (`.env`)
```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### Key Dependencies (`package.json`)
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.0",
    "expo": "~49.0.0",
    "expo-router": "^2.0.0",
    "typescript": "^5.1.0",
    "zustand": "^4.4.0",
    "react-native-paper": "^5.10.0",
    "@react-native-firebase/app": "^18.5.0",
    "@react-native-firebase/auth": "^18.5.0",
    "@react-native-firebase/firestore": "^18.5.0",
    "@react-native-firebase/storage": "^18.5.0",
    "@react-native-firebase/messaging": "^18.5.0",
    "expo-sqlite": "~11.3.0",
    "expo-image": "~1.5.0",
    "expo-image-picker": "~14.5.0",
    "expo-image-manipulator": "~11.5.0",
    "expo-notifications": "~0.20.0",
    "@shopify/flash-list": "^1.6.0",
    "date-fns": "^2.30.0",
    "@react-native-community/netinfo": "^9.4.0"
  }
}
```

### Required Firestore Indexes
```
Collection: chats
- participants (Array) + lastMessageTime (Descending)

Collection: messages
- chatId (Ascending) + timestamp (Descending)
```

Create in Firebase Console or wait for automatic creation on first query.

---

## Future: AI Features (Post-MVP)

**Persona:** International Communicator

**Features to Add Later:**
1. Real-time message translation (inline in chat)
2. Auto language detection
3. Cultural context hints (explain idioms, slang)
4. Formality level adjustment (formal vs casual tone)
5. Slang/idiom explanations

**Architecture:**
- Firebase Cloud Functions for AI processing
- OpenAI GPT-4 or Anthropic Claude API
- Translation caching in Firestore (avoid redundant API calls)
- RAG with last 20 messages for context-aware translation

---

## Quick Reference

### Message Loading Summary
```
Open Chat:
  → Load from SQLite (messages around last position) - Instant
  → Background sync from Firebase (new messages) - 1-8 seconds
  → User can scroll immediately

Scroll Down:
  → Check SQLite first - Instant if cached
  → If not cached, fetch from Firebase - 1-2 seconds

Scroll Up:
  → Always from SQLite - Instant

Jump to Bottom:
  → Instant teleport, load last 40 messages
```

### Storage Locations
```
Firebase Firestore:
  → ALL messages (complete history)
  → Source of truth
  → Query when needed

Local SQLite:
  → Minimum 200 messages per chat
  → Grows as you use (messages you've seen)
  → Fast access (<50ms)

RAM (Phone Memory):
  → Only 40 messages rendered at any time
  → Constant memory usage
```

### Virtual Scrolling Numbers
```
Render in RAM: 40 messages
Load per scroll: 50 messages
Cache in SQLite: 200+ messages per chat
First time load: 50 messages from Firebase
Background batches: 100, then 200, then 200...
```

---

**END OF PRD**

*Everything you need to build MessageAI. Simple, focused, clear.* 🚀