# MessageAI - Development Task List

## Project Structure

```
MessageAI/
├── src/
│   ├── components/
│   │   ├── common/                 # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── index.ts
│   │   └── feature/                # Feature-specific components
│   │       ├── chat/
│   │       ├── auth/
│   │       └── contacts/
│   ├── theme/                      # SINGLE SOURCE OF TRUTH - Change here, updates everywhere
│   │   ├── colors.ts              # All colors (light + dark mode)
│   │   ├── spacing.ts             # All spacing, margins, paddings
│   │   ├── typography.ts          # Font sizes, weights, families
│   │   ├── borders.ts             # Border radius, widths
│   │   ├── shadows.ts             # Shadow styles
│   │   └── index.ts               # Export all theme
│   ├── features/
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── chat/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   ├── contacts/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   └── services/
│   │   └── groups/
│   │       ├── screens/
│   │       ├── hooks/
│   │       └── services/
│   ├── shared/
│   │   ├── components/            # Shared smart components (OfflineBanner, etc.)
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   ├── store/
│   │   ├── AuthStore.ts
│   │   ├── ChatStore.ts
│   │   ├── ContactStore.ts
│   │   └── GroupStore.ts
│   ├── database/
│   │   ├── Schema.ts
│   │   ├── Migrations.ts
│   │   └── SQLiteService.ts
│   └── services/
│       ├── firebase/
│       │   ├── FirebaseConfig.ts
│       │   ├── AuthService.ts
│       │   ├── FirestoreService.ts
│       │   ├── StorageService.ts
│       │   └── MessagingService.ts
│       └── index.ts
├── app/                            # Expo Router screens
├── .env
├── .env.example
├── app.json
└── package.json
```

---

## PR #1: Foundation Setup (Phase 1 - Days 1-2)

**Goal:** Set up Firebase, authentication, user profiles, and local database infrastructure.

### Task 1.1: Project Dependencies & Configuration

**Files to Update/Create:**
- `package.json` - Add all Phase 1 dependencies
- `.env.example` - Template for environment variables
- `.gitignore` - Add `.env` to gitignore
- `app.json` - Configure Expo plugins and extra config
- `README.md` - Project setup instructions

**Dependencies to Install:**
```bash
# Firebase
@react-native-firebase/app
@react-native-firebase/auth
@react-native-firebase/firestore
@react-native-firebase/storage
@react-native-google-signin/google-signin

# Navigation
expo-router
react-native-safe-area-context
react-native-screens

# UI
react-native-paper
react-native-vector-icons

# State Management
zustand

# Database
expo-sqlite

# Utilities
date-fns
expo-constants
@react-native-community/netinfo
```

**Subtasks:**
- [x] Install all Phase 1 dependencies
- [x] Create `.env.example` with Firebase placeholder keys
- [x] Update `app.json` with Firebase plugins and config
- [x] Add `.env` to `.gitignore`
- [x] Create README with setup instructions
- [x] Configure TypeScript paths in `tsconfig.json`

---

### Task 1.2: Firebase Project Setup

**Files to Create:**
- `src/services/firebase/FirebaseConfig.ts` - Firebase initialization
- `.env` - Actual Firebase credentials (not committed)

**Subtasks:**
- [x] Create Firebase project in Firebase Console
- [x] Enable Authentication (Email/Password, Google)
- [x] Enable Firestore Database
- [x] Enable Firebase Storage
- [x] Enable Firebase Cloud Messaging
- [x] Add Firebase config to `.env` (need Web config)
- [x] Create `FirebaseConfig.ts` with initialization logic
- [x] Test Firebase connection

**Unit Tests:**
- `__tests__/services/firebase/FirebaseConfig.test.ts` - Test Firebase initialization

---

### Task 1.3: Folder Structure & Base Files

**Files to Create:**
- `src/components/common/index.ts` - Export all common UI components
- `src/components/feature/` - Create feature component folders
- `src/shared/types/index.ts` - Shared TypeScript types
- `src/shared/utils/index.ts` - Utility functions
- `src/shared/components/` - Shared smart components folder
- `src/store/index.ts` - Export all stores
- `src/services/index.ts` - Export all services
- `app/_layout.tsx` - Root layout for Expo Router
- `app/(tabs)/_layout.tsx` - Tab navigation layout
- `app/index.tsx` - Entry screen

**Subtasks:**
- [x] Create all folder structures
- [x] Create barrel export files (index.ts)
- [x] Set up Expo Router file-based routing
- [x] Create root layout with providers

---

### Task 1.4: Shared TypeScript Types

**Files to Create:**
- `src/shared/types/User.ts`
- `src/shared/types/Chat.ts`
- `src/shared/types/Message.ts`
- `src/shared/types/FriendRequest.ts`
- `src/shared/types/Database.ts`

**Subtasks:**
- [x] Define `User` interface
- [x] Define `Chat` interface (one-on-one & group)
- [x] Define `Message` interface
- [x] Define `FriendRequest` interface
- [x] Define SQLite table types
- [x] Export all types from `index.ts`

---

### Task 1.5: Theme System Setup (SINGLE SOURCE OF TRUTH)

**Files to Create:**
- `src/theme/colors.ts` - All colors (light + dark mode)
- `src/theme/spacing.ts` - All spacing, margins, paddings
- `src/theme/typography.ts` - Font sizes, weights, line heights
- `src/theme/borders.ts` - Border radius, widths
- `src/theme/shadows.ts` - Shadow styles
- `src/theme/index.ts` - Export lightTheme and darkTheme

**Subtasks:**
- [x] Define all color values (primary, background, text, status, etc.)
- [x] Define dark mode color variants
- [x] Define spacing scale (xs, sm, md, lg, xl, xxl)
- [x] Define component-specific spacing (screenPadding, cardPadding, etc.)
- [x] Define typography (font families, sizes, weights, line heights)
- [x] Define border styles (radius scale, widths)
- [x] Define component-specific borders (button, input, card, messageBubble)
- [x] Define shadow styles for elevation
- [x] Create lightTheme and darkTheme objects
- [x] Export everything from index.ts

**Verification:**
- [x] All theme values accessible from single import
- [x] Light and dark themes defined
- [x] No hardcoded values in components (will verify as we build)

---

### Task 1.6: Common UI Component Library

**Files to Create:**
- `src/components/common/Button.tsx`
- `src/components/common/Input.tsx`
- `src/components/common/Card.tsx`
- `src/components/common/Avatar.tsx`
- `src/components/common/LoadingSpinner.tsx`
- `src/components/common/Modal.tsx`
- `src/components/common/index.ts`

**Subtasks:**
- [x] Create `Button` component with variants (primary, secondary, outline) - uses theme
- [x] Create `Input` component with error states - uses theme
- [x] Create `Card` component - uses theme
- [x] Create `Avatar` component (image + fallback with colored circle) - uses theme
- [x] Create `LoadingSpinner` component - uses theme
- [x] Create `Modal` component - uses theme
- [x] Export all from `index.ts`
- [x] ALL components must use theme values (no hardcoded colors/spacing)

**Unit Tests:**
- `__tests__/components/common/Button.test.tsx` - Verify all variants render correctly, handle press events
- `__tests__/components/common/Input.test.tsx` - Test error states, validation, character limits
- `__tests__/components/common/Avatar.test.tsx` - Test image loading, fallback to colored circle, color generation

**Verification:**
- [x] All UI components render without errors
- [x] Button press handlers fire correctly
- [x] Avatar generates consistent colors for same names
- [x] All components use theme values (no hardcoded styles)
- [x] Change theme.colors.primary updates all primary colored elements

---

### Task 1.7: SQLite Database Setup

**Files to Create:**
- `src/database/Schema.ts` - Database schema definitions
- `src/database/Migrations.ts` - Migration management
- `src/database/SQLiteService.ts` - Database operations

**Subtasks:**
- [x] Create database schema (users, chats, messages, scroll_positions, friend_requests)
- [x] Implement migration system with version tracking
- [x] Create SQLiteService with CRUD operations
- [x] Test database initialization on app launch (need to run app)

**Unit Tests:**
- `__tests__/database/SQLiteService.test.ts` - Test CRUD operations, migrations, version tracking
- `__tests__/database/Schema.test.ts` - Verify schema creation, indexes, constraints

**Verification:**
- [x] Database initializes successfully on first launch
- [x] All tables created with correct schema
- [x] Migrations run in correct order
- [x] Data persists after app restart
- [x] Concurrent operations don't cause corruption

---

### Task 1.8: Authentication Service

**Files to Create:**
- `src/services/firebase/AuthService.ts`
- `src/store/AuthStore.ts`

**Subtasks:**
- [x] Create AuthService with methods:
  - `signUpWithEmail(email, password)`
  - `signInWithEmail(email, password)`
  - `signInWithGoogle()` (placeholder for future)
  - `signOut()`
  - `sendEmailVerification()`
  - `resetPassword(email)`
  - `onAuthStateChanged(callback)`
- [x] Create AuthStore with Zustand
- [x] Handle authentication state persistence

**Unit Tests:**
- `__tests__/services/firebase/AuthService.test.ts` - Mock Firebase, test all auth methods
- `__tests__/store/AuthStore.test.ts` - Test state updates, persistence, logout clears state

**Integration Tests:**
- `__tests__/integration/Auth/SignUpFlow.test.tsx` - Complete sign-up flow with email verification
- `__tests__/integration/Auth/SignInFlow.test.tsx` - Test email and Google sign-in

**Verification:**
- [x] Email sign-up creates user in Firebase Auth
- [x] Email verification required before access
- [ ] Google sign-in populates profile correctly (skipped for MVP)
- [x] Auth state persists across app restarts
- [x] Sign-out clears all user data

---

### Task 1.9: Authentication Screens

**Files to Create:**
- `app/(auth)/SignIn.tsx`
- `app/(auth)/SignUp.tsx`
- `app/(auth)/ForgotPassword.tsx`
- `app/(auth)/_layout.tsx`
- `app/_layout.tsx` (root layout)
- `app/index.tsx` (entry point)

**Subtasks:**
- [x] Create Sign In screen (email/password + Google button placeholder)
- [x] Create Sign Up screen with email verification flow
- [x] Create Forgot Password screen
- [x] Create auth layout (no tabs for auth screens)
- [x] Create root layout with database + auth initialization
- [x] Handle navigation after successful auth
- [x] Show loading states and error messages

---

### Task 1.10: User Profile Creation & Username System

**Files to Create:**
- `app/(auth)/CreateProfile.tsx`
- `src/services/firebase/UserService.ts`

**Subtasks:**
- [x] Create profile creation screen (after sign up)
- [x] Username input with real-time availability check
- [x] Display name input
- [x] Bio input (optional)
- [x] Profile picture preview with colored circle fallback
- [ ] Profile picture upload (coming in future task)
- [x] Create UserService with Firestore operations
- [x] Save profile to Firestore `/users/{userId}`
- [x] Save profile to local SQLite (handled by AuthStore)

**Unit Tests:**
- `__tests__/services/firebase/UserService.test.ts` - Test Firestore operations, profile updates
- `__tests__/features/auth/hooks/useUsernameCheck.test.ts` - Test real-time availability, debouncing

**Integration Tests:**
- `__tests__/integration/Auth/ProfileCreation.test.tsx` - End-to-end profile creation with username check

**Verification:**
- [x] Username availability check happens in real-time
- [x] Duplicate usernames rejected
- [x] Username must be lowercase
- [x] Profile saves to both Firestore and SQLite
- [ ] Google profile picture auto-populates if available (skipped for MVP)

---

### Task 1.11: Profile Picture Generation

**Files to Create:**
- `src/shared/utils/ProfilePictureGenerator.ts`

**Subtasks:**
- [x] Create function to generate colored circle with first letter
- [x] Define color palette (8-10 preset colors)
- [x] Generate deterministic colors based on username/displayName
- [x] Add validation utilities (username, email, password, displayName)
- [ ] Handle profile picture upload to Firebase Storage (will do in future phase)
- [ ] Create thumbnail generation (will do in future phase)

**Unit Tests:**
- `__tests__/shared/utils/ProfilePictureGenerator.test.ts` - Test color generation, first letter extraction, deterministic colors

**Verification:**
- [x] Same name always generates same color
- [x] All 8-10 preset colors used evenly
- [x] First letter correctly extracted (handles emojis, spaces)
- [ ] Upload to Firebase Storage succeeds (will do in future phase)
- [ ] Thumbnail generated at correct size (will do in future phase)

---

### Task 1.12: Documentation & README

**Files to Update:**
- `README.md`

**Subtasks:**
- [x] Document project setup steps
- [x] Document Firebase configuration
- [x] Document environment variables
- [x] Document folder structure
- [x] Add code comments to all services (as they're created)
- [x] Create API documentation for AuthService and UserService (as they're created)

---

## PR #2: Core Messaging (Phase 2 - Days 3-4)

**Goal:** Build one-on-one chat functionality with real-time messaging, local persistence, and virtual scrolling.

### Task 2.1: Chat Dependencies

**Files to Update:**
- `package.json`

**Dependencies to Install:**
```bash
@shopify/flash-list
react-native-reanimated
react-native-gesture-handler
```

**Subtasks:**
- [ ] Install FlashList for virtual scrolling
- [ ] Install Reanimated for smooth animations
- [ ] Configure plugins in `app.json`

---

### Task 2.2: Firestore Service for Chats

**Files to Create:**
- `src/services/firebase/ChatService.ts`
- `src/services/firebase/MessageService.ts`

**Subtasks:**
- [ ] Create ChatService with methods:
  - `createChat(participantIds)`
  - `getChatById(chatId)`
  - `getUserChats(userId)`
  - `updateChatLastMessage(chatId, messageData)`
  - `listenToChats(userId, callback)`
- [ ] Create MessageService with methods:
  - `sendMessage(chatId, message)`
  - `getMessages(chatId, limit, lastMessageId)`
  - `listenToMessages(chatId, callback)`
  - `updateMessageStatus(messageId, status)`
  - `deleteMessage(messageId, deleteForEveryone)`
  - `addReaction(messageId, emoji, userId)`
  - `removeReaction(messageId, emoji, userId)`

**Unit Tests:**
- `__tests__/services/firebase/ChatService.test.ts` - Test chat CRUD, last message updates, listeners
- `__tests__/services/firebase/MessageService.test.ts` - Test send, receive, status updates, reactions, deletion

**Integration Tests:**
- `__tests__/integration/Messaging/CreateChat.test.tsx` - Create chat between two users

**Verification:**
- [ ] Chat creation saves to Firestore with correct structure
- [ ] Last message updates when new message sent
- [ ] Real-time listener fires on new messages
- [ ] Message status updates propagate correctly

---

### Task 2.3: Chat State Management

**Files to Create:**
- `src/store/ChatStore.ts`

**Subtasks:**
- [ ] Create ChatStore with Zustand
- [ ] State: active chats list, current chat, messages, loading states
- [ ] Actions: load chats, select chat, load messages, send message, update status
- [ ] Sync with SQLite on state changes

**Unit Tests:**
- `__tests__/store/ChatStore.test.ts` - Test all actions, state updates, SQLite sync

**Verification:**
- [ ] Store syncs with SQLite on every state change
- [ ] Active chat selection updates correctly
- [ ] Message list updates trigger re-renders
- [ ] Loading states handled properly

---

### Task 2.4: SQLite Chat & Message Operations

**Files to Update:**
- `src/database/SQLiteService.ts`

**Subtasks:**
- [ ] Add methods for chat operations:
  - `saveChat(chat)`
  - `getChats(userId)`
  - `getChatById(chatId)`
  - `deleteChat(chatId)`
- [ ] Add methods for message operations:
  - `saveMessage(message)`
  - `getMessages(chatId, limit, offset)`
  - `getMessageById(messageId)`
  - `updateMessageStatus(messageId, status)`
  - `deleteMessage(messageId, userId)`
  - `updateReactions(messageId, reactions)`
- [ ] Add scroll position operations:
  - `saveScrollPosition(chatId, messageId, yPosition)`
  - `getScrollPosition(chatId)`

**Unit Tests:**
- Update `__tests__/database/SQLiteService.test.ts` - Test all new chat/message methods, scroll position persistence

**Integration Tests:**
- `__tests__/integration/Messaging/MessagePersistence.test.tsx` - Verify messages persist across app restarts

**Verification:**
- [ ] Messages save to SQLite immediately on send
- [ ] Scroll position persists across app restarts
- [ ] Pagination works correctly (50 messages per load)
- [ ] Deleted messages properly handled in queries
- [ ] Reactions update without reloading all messages

---

### Task 2.5: Chat List Screen

**Files to Create:**
- `app/(tabs)/chats/index.tsx`
- `src/features/chat/components/ChatListItem.tsx`
- `src/features/chat/hooks/useChatList.ts`

**Subtasks:**
- [ ] Create chat list screen with FlashList
- [ ] Display chat preview (last message, timestamp, unread count)
- [ ] Show profile pictures (user avatar or group icon)
- [ ] Show online/offline status indicator
- [ ] Handle empty state (no chats yet)
- [ ] Implement pull-to-refresh
- [ ] Real-time updates via Firestore listener
- [ ] Navigate to chat on tap

---

### Task 2.6: Chat Screen with Virtual Scrolling

**Files to Create:**
- `app/(tabs)/chats/[id].tsx`
- `src/features/chat/components/MessageBubble.tsx`
- `src/features/chat/components/MessageInput.tsx`
- `src/features/chat/components/DateSeparator.tsx`
- `src/features/chat/components/UnreadSeparator.tsx`
- `src/features/chat/hooks/useMessages.ts`
- `src/features/chat/hooks/useMessageSend.ts`

**Subtasks:**
- [ ] Create chat screen with FlashList (virtual scrolling)
- [ ] Load messages around last read position from SQLite
- [ ] Display messages with MessageBubble component
- [ ] Implement lazy loading (50 messages per scroll)
- [ ] Show date separators
- [ ] Show unread separator
- [ ] Scroll to last read position on open
- [ ] Real-time message listener
- [ ] Maintain ~40 messages in RAM

---

### Task 2.7: Message Bubble Component

**Files to Create:**
- `src/features/chat/components/MessageBubble.tsx`
- `src/features/chat/components/MessageStatus.tsx`

**Subtasks:**
- [ ] Create sent message bubble (right-aligned, blue)
- [ ] Create received message bubble (left-aligned, gray)
- [ ] Display profile picture for received messages
- [ ] Group messages from same sender within 1 minute
- [ ] Show message status icons (⏱️, ✓, ✓✓, ✓✓ blue)
- [ ] Long-press menu (Delete, React, Copy)
- [ ] Display reactions below message
- [ ] Handle deleted messages ("This message was deleted")

---

### Task 2.8: Message Input Component

**Files to Update:**
- `src/features/chat/components/MessageInput.tsx`
- `src/ui/Input.tsx` (enhance for chat)

**Subtasks:**
- [ ] Create message input with multiline support
- [ ] Character counter (show at 3,900 chars)
- [ ] Limit to 4,096 characters
- [ ] Send button with loading state
- [ ] Emoji keyboard support
- [ ] Typing indicator trigger

---

### Task 2.9: Optimistic Updates & Send Flow

**Files to Update:**
- `src/features/chat/hooks/useMessageSend.ts`
- `src/store/ChatStore.ts`

**Subtasks:**
- [ ] Implement optimistic update (show message immediately)
- [ ] Save to SQLite with `status: "sending"`, `syncStatus: "pending"`
- [ ] Upload to Firestore in background
- [ ] Update status on success/failure
- [ ] Handle retry logic
- [ ] Queue messages when offline

**Integration Tests:**
- `__tests__/integration/Messaging/OptimisticUpdate.test.tsx` - Verify immediate UI update, background sync

**Verification:**
- [ ] Message appears in UI instantly (<50ms)
- [ ] Shows "sending" status (clock icon)
- [ ] Background upload completes within 500ms (good connection)
- [ ] Status updates to "sent" after Firestore confirmation
- [ ] Failed sends show error state with retry button

---

### Task 2.10: Message Status Updates

**Files to Create:**
- `src/features/chat/hooks/useMessageStatus.ts`

**Subtasks:**
- [ ] Listen for message status changes
- [ ] Update UI when status changes (sent → delivered → read)
- [ ] Send read receipt when message viewed
- [ ] Update Firestore with read status
- [ ] Sync status to SQLite

---

### Task 2.11: Scroll Behavior & Jump to Bottom

**Files to Create:**
- `src/features/chat/components/JumpToBottomButton.tsx`
- `src/features/chat/hooks/useScrollBehavior.ts`

**Subtasks:**
- [ ] Implement scroll down (load newer messages)
- [ ] Implement scroll up (load older messages)
- [ ] Load from SQLite first, then Firestore if not cached
- [ ] Show "Jump to Bottom" floating button
- [ ] Display unread count on button
- [ ] Instant teleport to newest message

**Integration Tests:**
- `__tests__/integration/Messaging/VirtualScrolling.test.tsx` - Test lazy loading, memory usage, scroll performance
- `__tests__/integration/Messaging/JumpToBottom.test.tsx` - Verify instant jump, no loading delay

**Verification:**
- [ ] Only ~40 messages rendered in RAM at any time
- [ ] Scroll down loads 50 new messages
- [ ] Scroll up loads from SQLite instantly
- [ ] Jump to bottom happens in <100ms
- [ ] Memory usage stays <50MB with 1000+ messages
- [ ] Smooth 60fps scrolling maintained

---

### Task 2.12: Additional Common Components for Chat

**Files to Create:**
- `src/components/common/Badge.tsx` (for unread count)
- `src/components/common/IconButton.tsx` (for message actions)

**Subtasks:**
- [ ] Create Badge component for unread counts - uses theme
- [ ] Create IconButton for send, menu, etc. - uses theme
- [ ] Export from `components/common/index.ts`
- [ ] All components use theme values

---

### Task 2.13: Documentation & Code Comments

**Files to Update:**
- `README.md`

**Subtasks:**
- [ ] Document chat architecture
- [ ] Document message flow (send/receive)
- [ ] Document virtual scrolling implementation
- [ ] Add code comments to all chat services
- [ ] Create API documentation for ChatService and MessageService

---

## PR #3: Features (Phase 3 - Days 4-5)

**Goal:** Add images, reactions, deletion, typing indicators, online status, contacts, and friend requests.

### Task 3.1: Dependencies for Images

**Files to Update:**
- `package.json`

**Dependencies to Install:**
```bash
expo-image
expo-image-picker
expo-image-manipulator
expo-file-system
```

**Subtasks:**
- [ ] Install image dependencies
- [ ] Configure permissions in `app.json`

---

### Task 3.2: Firebase Storage Service

**Files to Create:**
- `src/services/firebase/StorageService.ts`

**Subtasks:**
- [ ] Create StorageService with methods:
  - `uploadProfilePicture(userId, imageUri)`
  - `uploadGroupIcon(chatId, imageUri)`
  - `uploadMessageImage(chatId, messageId, imageUri)`
  - `generateThumbnail(imageUri, size)`
  - `deleteImage(path)`
- [ ] Implement image compression (85% quality, max 10MB)
- [ ] Generate thumbnails (200x200px)

**Unit Tests:**
- `__tests__/services/firebase/StorageService.test.ts` - Mock Firebase Storage, test uploads, compression, thumbnails

**Integration Tests:**
- `__tests__/integration/Storage/ImageUpload.test.tsx` - End-to-end image upload with compression

**Verification:**
- [ ] Images compressed to 85% quality
- [ ] File size under 10MB enforced
- [ ] Thumbnail generated at 200x200px
- [ ] Both full and thumbnail uploaded to Storage
- [ ] URLs saved correctly to Firestore
- [ ] Upload completes in <5 seconds

---

### Task 3.3: Image Upload in Messages

**Files to Update:**
- `src/features/chat/components/MessageInput.tsx`
- `src/features/chat/components/MessageBubble.tsx`
- `src/features/chat/components/ImageMessage.tsx` (create)

**Subtasks:**
- [ ] Add image picker button to MessageInput
- [ ] Allow caption with image (max 1,024 chars)
- [ ] Compress image before upload
- [ ] Generate thumbnail
- [ ] Upload both to Firebase Storage
- [ ] Save image URLs to Firestore
- [ ] Display image in MessageBubble
- [ ] Show thumbnail first, load full image on tap
- [ ] Full-screen image viewer

**Unit Tests:**
- `__tests__/features/chat/components/ImageMessage.test.tsx` - Test thumbnail loading, full-screen viewer, caption display

**Integration Tests:**
- `__tests__/integration/Messaging/ImageMessage.test.tsx` - Send image from one device, receive on another

**Verification:**
- [ ] Image picker opens correctly
- [ ] Caption limited to 1,024 characters
- [ ] Compression maintains acceptable quality
- [ ] Thumbnail loads first, full image lazy-loads
- [ ] Full-screen viewer with pinch-to-zoom works
- [ ] Recipient receives both thumbnail and full image

---

### Task 3.4: Emoji Reactions

**Files to Create:**
- `src/features/chat/components/ReactionPicker.tsx`
- `src/features/chat/components/MessageReactions.tsx`
- `src/features/chat/hooks/useReactions.ts`

**Subtasks:**
- [ ] Create reaction picker (native emoji keyboard)
- [ ] Show reaction picker on long-press
- [ ] Add reaction to message
- [ ] Remove reaction on double-tap
- [ ] Display reactions below message bubble
- [ ] Show who reacted (on tap)
- [ ] Sync reactions to Firestore and SQLite

**Unit Tests:**
- `__tests__/features/chat/hooks/useReactions.test.ts` - Test add/remove logic, multiple users reacting

**Verification:**
- [ ] Same user can't react with same emoji twice
- [ ] Reaction count updates in real-time
- [ ] Reactions persist after app restart
- [ ] Multiple users can use same emoji
- [ ] Tapping reaction shows list of users who reacted

---

### Task 3.5: Message Deletion

**Files to Update:**
- `src/features/chat/components/MessageBubble.tsx`
- `src/features/chat/hooks/useMessageActions.ts` (create)

**Subtasks:**
- [ ] Add "Delete for me" option (remove from local view only)
- [ ] Add "Delete for everyone" option (remove for all participants)
- [ ] Update SQLite `deletedFor` array
- [ ] Update Firestore `deletedForEveryone` flag
- [ ] Show "This message was deleted" for deleted messages
- [ ] Only allow "Delete for everyone" on own messages

**Unit Tests:**
- `__tests__/features/chat/hooks/useMessageActions.test.ts` - Test deletion logic, permissions

**Integration Tests:**
- `__tests__/integration/Messaging/MessageDeletion.test.tsx` - Test "delete for me" vs "delete for everyone"

**Verification:**
- [ ] "Delete for me" removes only from local view
- [ ] "Delete for everyone" removes for all participants
- [ ] Only own messages can be deleted for everyone
- [ ] Deleted messages show "This message was deleted"
- [ ] Deletion syncs to Firestore and SQLite correctly

---

### Task 3.6: Copy Message Text

**Files to Update:**
- `src/features/chat/hooks/useMessageActions.ts`

**Subtasks:**
- [ ] Add "Copy" option to long-press menu
- [ ] Copy text message to clipboard
- [ ] Copy caption for image messages
- [ ] Show toast confirmation

---

### Task 3.7: Typing Indicators

**Files to Create:**
- `src/features/chat/components/TypingIndicator.tsx`
- `src/features/chat/hooks/useTypingIndicator.ts`
- `src/services/firebase/PresenceService.ts` (create)

**Subtasks:**
- [ ] Create PresenceService for typing indicators
- [ ] Send typing event on input change
- [ ] Update `/chats/{chatId}/typing/{userId}` document
- [ ] Auto-delete after 3 seconds (Firestore TTL)
- [ ] Listen for typing events
- [ ] Show "[Name] is typing..." for one-on-one
- [ ] Show "John and Sarah are typing..." for groups (up to 2 names)
- [ ] Show "Multiple people are typing..." for 3+ users

**Unit Tests:**
- `__tests__/features/chat/hooks/useTypingIndicator.test.ts` - Test debouncing, auto-clear logic

**Integration Tests:**
- `__tests__/integration/Messaging/TypingIndicator.test.tsx` - Test between two devices

**Verification:**
- [ ] Typing indicator appears when user types
- [ ] Indicator disappears 3 seconds after typing stops
- [ ] Multiple users typing shows correct names
- [ ] Works in both one-on-one and group chats
- [ ] Doesn't trigger on every keystroke (debounced)

---

### Task 3.8: Online/Offline Status & Last Seen

**Files to Update:**
- `src/services/firebase/PresenceService.ts`
- `src/features/chat/components/ChatHeader.tsx` (create)

**Subtasks:**
- [ ] Update user presence on app open (`isOnline: true`)
- [ ] Update presence on app close (`isOnline: false`, `lastSeen: timestamp`)
- [ ] Use `.onDisconnect()` for unexpected disconnections
- [ ] Update every 30 seconds while app active
- [ ] Listen to contact presence changes
- [ ] Show online indicator (green dot)
- [ ] Show "Last seen" timestamp when offline
- [ ] Display in chat header

**Unit Tests:**
- `__tests__/services/firebase/PresenceService.test.ts` - Test presence updates, onDisconnect handler

**Integration Tests:**
- `__tests__/integration/Presence/OnlineStatus.test.tsx` - Test between two devices going online/offline

**Verification:**
- [ ] User goes online when app opens
- [ ] User goes offline when app closes
- [ ] Unexpected disconnect triggers offline status
- [ ] "Last seen" timestamp accurate to within 1 minute
- [ ] Online status updates in real-time for contacts
- [ ] Heartbeat updates every 30 seconds

---

### Task 3.9: Contact System - Search & Add

**Files to Create:**
- `app/(tabs)/contacts/index.tsx`
- `app/(tabs)/contacts/search.tsx`
- `src/features/contacts/components/ContactListItem.tsx`
- `src/features/contacts/components/UserSearchResult.tsx`
- `src/features/contacts/hooks/useContacts.ts`
- `src/features/contacts/hooks/useUserSearch.ts`
- `src/store/ContactStore.ts`

**Subtasks:**
- [ ] Create contacts list screen
- [ ] Display all contacts with online/offline status
- [ ] Create search screen (search by username only)
- [ ] Real-time username search
- [ ] Show search results
- [ ] "Add Friend" button to send friend request
- [ ] Create ContactStore with Zustand

---

### Task 3.10: Friend Request System

**Files to Create:**
- `src/services/firebase/FriendRequestService.ts`
- `app/(tabs)/contacts/requests.tsx`
- `src/features/contacts/components/FriendRequestItem.tsx`
- `src/features/contacts/hooks/useFriendRequests.ts`

**Subtasks:**
- [ ] Create FriendRequestService with methods:
  - `sendFriendRequest(fromUserId, toUserId)`
  - `acceptFriendRequest(requestId)`
  - `ignoreFriendRequest(requestId)`
  - `blockUser(userId, blockedUserId)`
  - `getFriendRequests(userId)`
- [ ] Create friend requests screen (pending, sent)
- [ ] Send friend request button
- [ ] Accept/Ignore buttons
- [ ] Create chat on accept
- [ ] Add to contacts list
- [ ] Sync to SQLite

**Unit Tests:**
- `__tests__/services/firebase/FriendRequestService.test.ts` - Test all request operations, blocking logic

**Integration Tests:**
- `__tests__/integration/Contacts/FriendRequestFlow.test.tsx` - Complete flow: send → receive → accept → chat created

**Verification:**
- [ ] Friend request sent successfully
- [ ] Recipient receives notification
- [ ] Accept creates chat for both users
- [ ] Ignore removes request
- [ ] Block prevents future requests
- [ ] Can't send duplicate requests
- [ ] Both users added to each other's contact list

---

### Task 3.11: Personal Invite Links

**Files to Create:**
- `app/(tabs)/profile/index.tsx`
- `src/features/auth/components/InviteLink.tsx`
- `src/features/auth/hooks/useInviteLink.ts`

**Subtasks:**
- [ ] Generate personal invite link: `messageai.app/user/[username]`
- [ ] "Share Profile" button on profile screen
- [ ] Share link via native share sheet
- [ ] Deep link handling to open profile from link
- [ ] Show profile view screen for invite recipient
- [ ] "Send Friend Request" button on profile view

**Integration Tests:**
- `__tests__/integration/Contacts/InviteLink.test.tsx` - Test link generation, deep link navigation, friend request from link

**Verification:**
- [ ] Link format correct: `messageai.app/user/[username]`
- [ ] Link opens app when tapped
- [ ] Shows profile view for the user
- [ ] Non-users redirected to app store
- [ ] Friend request button works from profile view
- [ ] Share sheet shows app options (SMS, WhatsApp, etc.)

---

### Task 3.12: Block User

**Files to Update:**
- `src/services/firebase/FriendRequestService.ts`
- `src/features/contacts/components/ContactListItem.tsx`

**Subtasks:**
- [ ] Add "Block" option in contact menu
- [ ] Confirmation dialog
- [ ] Add to `/users/{userId}/blockedUsers/{blockedUserId}` collection
- [ ] Delete chat from Firestore (for both users)
- [ ] Delete chat from both users' SQLite
- [ ] Prevent blocked user from sending friend requests
- [ ] Prevent blocked user from sending messages

---

### Task 3.13: Additional Common Components for Features

**Files to Create:**
- `src/components/common/ActionSheet.tsx`
- `src/components/common/Toast.tsx`
- `src/components/common/SearchBar.tsx`

**Subtasks:**
- [ ] Create ActionSheet for long-press menus - uses theme
- [ ] Create Toast for notifications - uses theme
- [ ] Create SearchBar for contact search - uses theme
- [ ] Export from `components/common/index.ts`
- [ ] All components use theme values

---

### Task 3.14: Documentation

**Files to Update:**
- `README.md`

**Subtasks:**
- [ ] Document image upload flow
- [ ] Document reaction system
- [ ] Document typing indicators
- [ ] Document presence system
- [ ] Document contact/friend request flow
- [ ] Add code comments to all services
- [ ] Create API documentation for new services

---

## PR #4: Group Chat (Phase 4 - Days 5-6)

**Goal:** Implement group chat functionality with admin/member roles, group settings, and invite links.

### Task 4.1: Group Service

**Files to Create:**
- `src/services/firebase/GroupService.ts`
- `src/store/GroupStore.ts`

**Subtasks:**
- [ ] Create GroupService with methods:
  - `createGroup(name, description, icon, creatorId, memberIds)`
  - `getGroup(groupId)`
  - `updateGroupInfo(groupId, updates)`
  - `addMember(groupId, userId)`
  - `removeMember(groupId, userId)`
  - `leaveGroup(groupId, userId)`
  - `transferAdmin(groupId, newAdminId)`
  - `deleteGroup(groupId)`
  - `generateInviteCode(groupId)`
  - `joinGroupByInviteCode(code, userId)`
- [ ] Create GroupStore with Zustand

**Unit Tests:**
- `__tests__/services/firebase/GroupService.test.ts` - Test all group operations, admin logic
- `__tests__/store/GroupStore.test.ts` - Test state management for groups

**Integration Tests:**
- `__tests__/integration/Groups/CreateGroup.test.tsx` - Create group, add members, verify Firestore structure

**Verification:**
- [ ] Group created with correct type ("group")
- [ ] Creator set as admin
- [ ] All members added to participants array
- [ ] Invite code generated automatically
- [ ] Group appears in all members' chat lists

---

### Task 4.2: Create Group Screen

**Files to Create:**
- `app/(tabs)/groups/create.tsx`
- `src/features/groups/components/CreateGroupForm.tsx`
- `src/features/groups/components/MemberSelector.tsx`
- `src/features/groups/hooks/useCreateGroup.ts`

**Subtasks:**
- [ ] Create group form (name, description, icon)
- [ ] Group name input (required)
- [ ] Group description input (optional)
- [ ] Group icon picker (optional, can upload image)
- [ ] Select members from contacts
- [ ] Create group in Firestore
- [ ] Set creator as admin
- [ ] Create chat document with `type: "group"`
- [ ] Navigate to group chat

---

### Task 4.3: Group Chat Screen

**Files to Update:**
- `app/(tabs)/chats/[id].tsx` (enhance to support groups)
- `src/features/chat/components/ChatHeader.tsx`

**Subtasks:**
- [ ] Detect if chat is group or one-on-one
- [ ] Display group name and icon in header
- [ ] Show member count in header
- [ ] Display messages from all members
- [ ] Show sender name above each message bubble
- [ ] Profile picture for each sender
- [ ] Read receipts (blue when first person reads)
- [ ] All message features work in groups (images, reactions, deletion)

---

### Task 4.4: Group Settings Screen

**Files to Create:**
- `app/(tabs)/groups/[id]/settings.tsx`
- `src/features/groups/components/GroupInfo.tsx`
- `src/features/groups/components/MemberList.tsx`
- `src/features/groups/hooks/useGroupSettings.ts`

**Subtasks:**
- [ ] Display group info (name, description, icon)
- [ ] Edit group info (admin only)
- [ ] Upload/change group icon
- [ ] Display member list with roles
- [ ] Show admin badge
- [ ] Remove member button (admin only)
- [ ] Leave group button (all members)
- [ ] Admin transfer on admin leave

---

### Task 4.5: Group Member Management

**Files to Create:**
- `src/features/groups/components/AddMemberSheet.tsx`
- `src/features/groups/hooks/useGroupMembers.ts`

**Subtasks:**
- [ ] Add member functionality (admin only)
- [ ] Select from contacts list
- [ ] Add to group in Firestore
- [ ] Add to chat participants array
- [ ] Remove member functionality (admin only)
- [ ] Confirmation dialog for removal
- [ ] Remove from Firestore
- [ ] Send notification to removed member

---

### Task 4.6: Group Admin Transitions

**Files to Update:**
- `src/services/firebase/GroupService.ts`
- `src/features/groups/hooks/useGroupSettings.ts`

**Subtasks:**
- [ ] Detect when admin leaves group
- [ ] Find oldest member (by `joinedAt` timestamp)
- [ ] Transfer admin role to oldest member
- [ ] Update Firestore `groupAdminId`
- [ ] If no members left, delete group
- [ ] Show notification to new admin

**Integration Tests:**
- `__tests__/integration/Groups/AdminTransition.test.tsx` - Critical: Test admin leaving, oldest becomes admin, last member deletes group

**Verification:**
- [ ] Admin leaving triggers transition
- [ ] Oldest member (by joinedAt) becomes new admin
- [ ] New admin gets notification
- [ ] Group deleted if last member leaves
- [ ] Only one admin at any time
- [ ] Admin badge updates immediately

---

### Task 4.7: Group Invite Links

**Files to Create:**
- `src/features/groups/components/InviteLink.tsx`
- `src/features/groups/hooks/useGroupInvite.ts`
- `app/invite/[code].tsx` (deep link handler)

**Subtasks:**
- [ ] Generate permanent invite code on group creation
- [ ] Display invite link: `messageai.app/invite/{code}`
- [ ] "Share Invite" button (admin only)
- [ ] Native share sheet
- [ ] Deep link handling to join group
- [ ] Show group preview (name, description, member count)
- [ ] "Join Group" button
- [ ] Auto-join without approval (public links)

**Integration Tests:**
- `__tests__/integration/Groups/InviteLink.test.tsx` - Test link generation, sharing, joining via link

**Verification:**
- [ ] Invite code generated on group creation
- [ ] Link format: `messageai.app/invite/{code}`
- [ ] Link opens app and shows group preview
- [ ] Join button adds user instantly (no approval)
- [ ] Invalid/expired codes show error
- [ ] User added to group and chat appears

---

### Task 4.8: Leave Group Flow

**Files to Update:**
- `src/features/groups/hooks/useGroupSettings.ts`

**Subtasks:**
- [ ] "Leave Group" button for all members
- [ ] Confirmation dialog
- [ ] Remove user from Firestore participants
- [ ] If admin leaving, trigger admin transition
- [ ] Remove group from user's chat list
- [ ] Navigate back to chat list

---

### Task 4.9: Group Notifications

**Files to Update:**
- `src/services/firebase/MessagingService.ts` (create in next PR if not exists)

**Subtasks:**
- [ ] Notify when added to group
- [ ] Notify when removed from group
- [ ] Notify when made admin
- [ ] Notify on new group messages (with sender name)

---

### Task 4.10: Documentation

**Files to Update:**
- `README.md`

**Subtasks:**
- [ ] Document group creation flow
- [ ] Document admin/member roles
- [ ] Document group invite system
- [ ] Document admin transitions
- [ ] Add code comments to GroupService
- [ ] Create API documentation for GroupService

---

## PR #5: Polish & Deploy (Phase 5 - Days 6-7)

**Goal:** Add push notifications, offline support, theming, performance optimization, testing, and deployment.

### Task 5.1: Dependencies for Push Notifications

**Files to Update:**
- `package.json`

**Dependencies to Install:**
```bash
@react-native-firebase/messaging
expo-notifications
expo-device
```

**Subtasks:**
- [ ] Install FCM and notification dependencies
- [ ] Configure FCM in Firebase Console
- [ ] Add notification permissions to `app.json`

---

### Task 5.2: Firebase Cloud Messaging Service

**Files to Create:**
- `src/services/firebase/MessagingService.ts`
- `src/shared/hooks/useNotifications.ts`

**Subtasks:**
- [ ] Create MessagingService with methods:
  - `requestPermission()`
  - `getFCMToken()`
  - `saveFCMToken(userId, token)`
  - `sendNotification(userId, title, body, data)`
  - `onMessageReceived(callback)`
  - `onNotificationTap(callback)`
- [ ] Request notification permission on first launch
- [ ] Get FCM token and save to Firestore
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Handle notification taps (navigate to chat)

**Unit Tests:**
- `__tests__/services/firebase/MessagingService.test.ts` - Mock FCM, test token handling, notification routing

**Integration Tests:**
- `__tests__/integration/Notifications/PushNotifications.test.tsx` - Test foreground, background, and notification tap navigation

**Verification:**
- [ ] Permission requested on first launch
- [ ] FCM token saved to Firestore
- [ ] Foreground notifications display correctly
- [ ] Background notifications work when app closed
- [ ] Tapping notification navigates to correct screen
- [ ] Notification badge updates unread count

---

### Task 5.3: Push Notification Types

**Files to Update:**
- `src/services/firebase/MessagingService.ts`
- `src/shared/utils/NotificationBuilder.ts` (create)

**Subtasks:**
- [ ] New message notification (show preview if <50 chars)
- [ ] Image message notification ("[Name] sent an image")
- [ ] Friend request notification
- [ ] Friend request accepted notification
- [ ] Added to group notification
- [ ] Navigate to correct screen on tap

---

### Task 5.4: Offline Support - Network Detection

**Files to Create:**
- `src/shared/hooks/useNetworkStatus.ts`
- `src/shared/components/OfflineBanner.tsx`

**Subtasks:**
- [ ] Use `@react-native-community/netinfo` to detect connection
- [ ] Show banner when offline: "⚠️ No internet connection"
- [ ] Hide banner when back online
- [ ] Store network state in Zustand

---

### Task 5.5: Offline Message Queue

**Files to Create:**
- `src/database/MessageQueue.ts`
- `src/shared/hooks/useMessageQueue.ts`

**Subtasks:**
- [ ] Queue messages in SQLite when offline (`syncStatus: "pending"`)
- [ ] Show message in UI with "Sending" status
- [ ] Process queue when connection restored (FIFO order)
- [ ] Auto-retry up to 3 times per message
- [ ] Show "Message not sent" with retry button if all retries fail
- [ ] Sync queued reactions, deletions, status updates

**Unit Tests:**
- `__tests__/database/MessageQueue.test.ts` - Test FIFO processing, retry logic, failure handling

**Integration Tests:**
- `__tests__/integration/Offline/MessageQueue.test.tsx` - Critical: Go offline → Send messages → Go online → Verify all sent

**Verification:**
- [ ] Messages queued when offline
- [ ] Queue processed in FIFO order when online
- [ ] Auto-retry up to 3 times on failure
- [ ] "Message not sent" shown after 3 failures
- [ ] Retry button re-attempts send
- [ ] Queue persists across app restarts

---

### Task 5.6: Offline Capabilities

**Files to Update:**
- `src/features/chat/hooks/useMessageSend.ts`
- `src/features/chat/hooks/useReactions.ts`

**Subtasks:**
- [ ] Allow sending messages offline (queue locally)
- [ ] Allow deleting messages for me (local only)
- [ ] Allow reacting to messages (queue sync)
- [ ] View all cached messages and chats
- [ ] Navigate between chats
- [ ] View cached images
- [ ] Disable features that require connection:
  - Send/accept friend requests
  - Create groups
  - Upload new images
  - Typing indicators
  - Online/offline status updates

---

### Task 5.7: Theme Context & Dynamic Switching

**Files to Create:**
- `src/shared/hooks/useTheme.ts`
- `src/shared/context/ThemeContext.tsx`

**Subtasks:**
- [ ] Create theme context with React Context API
- [ ] Create `useTheme` hook to access current theme (light/dark)
- [ ] Theme values already defined in `src/theme/` from Task 1.5
- [ ] Wrap app in ThemeProvider
- [ ] Add theme toggle in settings
- [ ] Persist theme preference in AsyncStorage
- [ ] All components already use theme values from Task 1.5

**Unit Tests:**
- `__tests__/shared/hooks/useTheme.test.ts` - Test theme switching, persistence

**Verification:**
- [ ] Theme colors match PRD specifications (already done in Task 1.5)
- [ ] Theme toggle works in settings
- [ ] Theme persists across app restarts
- [ ] All components use theme colors (already enforced from Task 1.5)
- [ ] System theme can be respected (optional)

---

### Task 5.8: Verify Theme Usage Across All Components

**Files to Review:**
- All components in `src/components/common/`
- All feature components in `src/components/feature/`
- All screens

**Subtasks:**
- [ ] Verify all components use theme values (already done from Task 1.6 onwards)
- [ ] Test theme switching between light and dark mode
- [ ] Verify no hardcoded colors/spacing remain
- [ ] Test all screens in both themes
- [ ] Update any components that missed theme integration

---

### Task 5.9: Performance Optimization

**Files to Update:**
- `src/features/chat/hooks/useMessages.ts`
- `src/features/chat/components/MessageBubble.tsx`

**Subtasks:**
- [ ] Optimize FlashList rendering
- [ ] Use `React.memo` for MessageBubble
- [ ] Implement proper `getItemType` for FlashList
- [ ] Optimize image loading (progressive, caching)
- [ ] Lazy load images with thumbnails
- [ ] Reduce re-renders with proper memoization
- [ ] Profile memory usage (target <50MB per chat)
- [ ] Test with 1,000+ messages

---

### Task 5.10: Background Sync & Adaptive Loading

**Files to Create:**
- `src/features/chat/hooks/useBackgroundSync.ts`

**Subtasks:**
- [ ] Implement adaptive background sync:
  - ≤50 unread: Download all at once
  - 51-500 unread: Batch 1 (100 msgs), Batch 2 (200 msgs), Batch 3 (rest)
  - 500+ unread: Load 50 at a time on scroll
- [ ] Save batches to SQLite as they arrive
- [ ] Show loading progress indicator
- [ ] Allow user to scroll through cached messages while syncing

---

### Task 5.11: Settings Screen

**Files to Create:**
- `app/(tabs)/settings/index.tsx`
- `src/features/settings/components/SettingsList.tsx`

**Subtasks:**
- [ ] Create settings screen
- [ ] Edit profile (name, username, profile picture, phone)
- [ ] Theme toggle (Light/Dark)
- [ ] Notification settings (show system settings)
- [ ] Privacy settings (blocked users list)
- [ ] About section (version, licenses)
- [ ] Logout button

---

### Task 5.12: Error Handling & Logging

**Files to Create:**
- `src/shared/utils/ErrorHandler.ts`
- `src/shared/utils/Logger.ts`

**Subtasks:**
- [ ] Create centralized error handler
- [ ] Log errors to console (dev mode)
- [ ] Show user-friendly error messages
- [ ] Create logger utility (with log levels)
- [ ] Add error boundaries to screens

---

### Task 5.13: Integration Testing

**Files to Create:**
- `__tests__/integration/AuthFlow.test.tsx`
- `__tests__/integration/ChatFlow.test.tsx`
- `__tests__/integration/GroupFlow.test.tsx`
- `__tests__/integration/OfflineFlow.test.tsx`

**Subtasks:**
- [ ] Test authentication flow (sign up, sign in, profile creation)
- [ ] Test chat flow (send message, receive message, real-time updates)
- [ ] Test offline flow (go offline, send messages, come online)
- [ ] Test group flow (create group, add members, send messages)
- [ ] Test image flow (send image, compress, receive thumbnail)
- [ ] Test friend request flow
- [ ] Test admin transition in groups

---

### Task 5.14: Performance Testing

**Files to Create:**
- `__tests__/performance/MessageLoading.test.ts`
- `__tests__/performance/ScrollPerformance.test.ts`

**Subtasks:**
- [ ] Test chat open time (<500ms from SQLite)
- [ ] Test scroll performance (60fps with 1,000+ messages)
- [ ] Test jump to bottom (<100ms)
- [ ] Test memory usage (<50MB per active chat)
- [ ] Test message upload time (200-500ms on good connection)
- [ ] Test image upload time (<5 seconds)
- [ ] Test background sync speed

---

### Task 5.15: Final UI/UX Polish

**Subtasks:**
- [ ] Add loading states to all async operations
- [ ] Add empty states to all lists
- [ ] Add error states with retry buttons
- [ ] Smooth animations and transitions
- [ ] Haptic feedback on important actions
- [ ] Polish spacing, padding, and alignment
- [ ] Ensure consistent styling across all screens

---

### Task 5.16: Build Configuration & Deployment

**Files to Update:**
- `app.json`
- `eas.json` (create)

**Subtasks:**
- [ ] Configure app.json for production
- [ ] Set up EAS Build (Expo Application Services)
- [ ] Create build profiles (dev, staging, prod)
- [ ] Configure app signing
- [ ] Build for iOS (TestFlight)
- [ ] Build for Android (Play Store internal testing)
- [ ] Test on real devices (2+ phones)

---

### Task 5.17: Final Documentation

**Files to Update/Create:**
- `README.md`
- `CONTRIBUTING.md` (create)
- `CHANGELOG.md` (create)
- `docs/ARCHITECTURE.md` (create)
- `docs/API.md` (create)

**Subtasks:**
- [ ] Complete README with all features
- [ ] Document architecture and design decisions
- [ ] Create API documentation for all services
- [ ] Document deployment process
- [ ] Create contributing guide
- [ ] Add changelog
- [ ] Add code comments to all complex logic

---

### Task 5.18: Pre-Deployment Test Suite

**Files to Create:**
- `__tests__/e2e/FullUserFlow.test.tsx` - End-to-end test of complete user journey

**Subtasks:**
- [ ] Run all unit tests (must pass 100%)
- [ ] Run all integration tests (must pass 100%)
- [ ] Run performance tests (must meet targets)
- [ ] Manual testing on 2+ real devices
- [ ] Test on both iOS and Android
- [ ] Test on slow network (3G simulation)
- [ ] Test with 1000+ messages in chat
- [ ] Test offline → online transitions

**End-to-End Test Flow:**
1. User A signs up → creates profile → username available
2. User B signs up → creates profile → username available
3. User A searches for User B by username
4. User A sends friend request
5. User B accepts request
6. Chat created for both users
7. User A sends text message → User B receives instantly
8. User B sends image → User A receives thumbnail + full image
9. User A reacts with emoji → User B sees reaction
10. User A goes offline → sends message → comes online → message sent
11. User A creates group, adds User B
12. Both users send messages in group
13. User A leaves group → User B becomes admin
14. All data persists after app restart

---

## Testing Checklist (Final Validation)

Before merging PR #5, validate these scenarios on real devices:

### Core Functionality
- [ ] Two devices: Real-time chat, typing indicators, read receipts work
- [ ] Offline: Go offline → Send 5 messages → Come online → All send
- [ ] App lifecycle: Send message → Force quit → Reopen → Message sent
- [ ] Images: Send image → Compresses → Recipient receives thumbnail + full
- [ ] Groups: 5 members → All send messages → All receive correctly
- [ ] Admin: Admin leaves → Oldest member becomes admin

### Performance
- [ ] High volume: 5,000 unread messages → Opens at last read → Smooth scroll
- [ ] Jump: 1,000 messages between → Jump to bottom → Instant
- [ ] Chat opens: <500ms (from SQLite)
- [ ] Background sync: 1-8 seconds (depending on unread count)
- [ ] Scroll: 60fps constant, no lag
- [ ] Memory: <50MB per active chat

### Edge Cases
- [ ] No internet: All offline features work
- [ ] Poor connection: Messages queue and retry
- [ ] Large images: Compress properly, don't crash
- [ ] Long messages: Character limit enforced
- [ ] Rapid messages: All send and display correctly
- [ ] Simultaneous typing: Typing indicators show correctly
- [ ] Profile picture: Colored circles generate correctly
- [ ] Username: Real-time availability check works

---

## Migration Strategy (Database)

For this MVP, we'll use a **simple migration system with version tracking**:

1. **Schema.ts**: Define current schema (v1)
2. **Migrations.ts**: Track schema version in SQLite
3. **On app start**: Check schema version
4. **If outdated**: Run migration scripts to update schema
5. **Future updates**: Add new migration functions (v1 → v2, v2 → v3, etc.)

This provides flexibility for post-MVP updates while keeping the initial setup simple.

---

## Environment Variables (Secure Configuration)

**Development:**
- Use `.env` file with `expo-constants`
- Never commit `.env` to Git

**Production:**
- Use `app.json` `extra` field for build-time config
- Or use EAS Secrets for sensitive values

Example `.env`:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

---

## Summary

**Total PRs:** 5 (one per development phase)  
**Total Tasks:** 67 main tasks with 200+ subtasks  
**Estimated Timeline:** 7 days (following PRD phases)  
**File Structure:** Feature-based with separate UI library  
**Testing:** Unit tests for important features + Integration tests  
**Documentation:** Comprehensive README, code comments, API docs  

Each PR is self-contained and tracks specific files to be created/updated, making progress tracking straightforward on GitHub.

