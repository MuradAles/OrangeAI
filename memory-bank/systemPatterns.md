# System Patterns & Architecture

## Architectural Overview

MessageAI follows a **layered architecture** with clear separation of concerns:

```
UI Layer (React Native Components)
    ↓
State Management (Zustand Stores)
    ↓
Service Layer (Firebase Services)
    ↓
Data Layer (Firebase + SQLite)
```

## Core Architectural Patterns

### 1. Offline-First Architecture

**Pattern:** Local data is the source of truth for UI, Firestore is the source of truth for persistence.

**Flow:**
1. User action → Update local state immediately
2. Save to SQLite (local cache)
3. Upload to Firestore in background
4. Update status on success/failure

**Why:** Instant UI feedback, works offline, syncs when online.

### 2. Virtual Scrolling with Lazy Loading

**Pattern:** Only render what's visible + small buffer.

**Implementation:**
- **RAM:** ~40 messages rendered at any time
- **Load per scroll:** 50 messages
- **Cache in SQLite:** Minimum 200 messages per chat
- **FlashList:** Handles rendering and memory management

**Why:** Constant memory usage regardless of message count, smooth 60fps scrolling.

### 3. Adaptive Background Sync

**Pattern:** Adjust sync strategy based on data volume.

**Strategy:**
- ≤50 unread: Download all at once (1-2 sec)
- 51-500 unread: Batch downloads (100, 200, rest)
- 500+ unread: Lazy load as user scrolls (50 at a time)

**Why:** Balance between fast initial load and efficient data usage.

### 4. Three-Tier Data Storage

**Firestore (Cloud):**
- Complete message history
- Source of truth
- Real-time listeners

**SQLite (Device):**
- Local cache
- Fast queries (<50ms)
- Offline access
- Minimum 200 messages per chat

**RAM (In-Memory):**
- Currently rendered messages (~40)
- Active state (Zustand stores)
- Temporary data

### 5. Optimistic Updates

**Pattern:** Show result immediately, sync in background.

**Implementation:**
```
Send Message:
1. Add to UI immediately with "sending" status
2. Save to SQLite with syncStatus: "pending"
3. Upload to Firestore in background
4. Update status on success/failure
```

**Why:** Perceived instant performance, better UX.

### 6. Message Queue System

**Pattern:** Queue operations when offline, process when online.

**Implementation:**
- Save to SQLite with `syncStatus: "pending"`
- Show in UI immediately
- Process queue in FIFO order when online
- Auto-retry up to 3 times
- Show error with manual retry after 3 failures

**Why:** Reliable message delivery even with poor connectivity.

## Component Architecture

### Theme System (Single Source of Truth)

**Structure:**
```
src/theme/
  ├── colors.ts       # All colors (light + dark)
  ├── spacing.ts      # All spacing values
  ├── typography.ts   # Font sizes, weights, families
  ├── borders.ts      # Border radius, widths
  ├── shadows.ts      # Shadow styles
  └── index.ts        # Export lightTheme and darkTheme
```

**Rule:** Components NEVER have hardcoded values. All styling comes from theme.

### Component Library Structure

**Common Components (Reusable UI):**
```
src/components/common/
  ├── Button.tsx          # Primary, secondary, outline variants
  ├── Input.tsx           # Text input with validation
  ├── Card.tsx            # Container component
  ├── Avatar.tsx          # Profile pictures with fallback
  ├── Modal.tsx           # Modal dialog
  ├── Badge.tsx           # Unread count badges
  ├── LoadingSpinner.tsx  # Loading indicator
  └── index.ts            # Barrel export
```

**Feature Components (Feature-specific):**
```
src/features/{feature}/components/
  ├── {Feature}ListItem.tsx
  ├── {Feature}Detail.tsx
  └── index.ts
```

### Service Layer Pattern

**Structure:**
```
src/services/firebase/
  ├── FirebaseConfig.ts      # Initialize Firebase
  ├── AuthService.ts         # Authentication operations
  ├── UserService.ts         # User profile operations
  ├── ChatService.ts         # Chat CRUD operations
  ├── MessageService.ts      # Message operations
  ├── StorageService.ts      # File upload/download
  ├── PresenceService.ts     # Online status, typing
  └── index.ts               # Export all services
```

**Pattern:** Each service is a singleton with static methods. No state stored in services.

### State Management Pattern (Zustand)

**Structure:**
```
src/store/
  ├── AuthStore.ts       # User auth state
  ├── ChatStore.ts       # Active chats, messages
  ├── ContactStore.ts    # Contact list
  └── GroupStore.ts      # Group data
```

**Pattern:**
- Each store handles one domain
- Stores sync with SQLite on every change
- Actions encapsulate business logic
- No direct Firebase calls from components

### Database Service Pattern

**Structure:**
```
src/database/
  ├── Schema.ts          # Table definitions
  ├── Migrations.ts      # Schema versioning
  └── SQLiteService.ts   # CRUD operations
```

**Pattern:**
- All SQLite operations go through SQLiteService
- Use prepared statements
- Transactions for multi-table operations
- Version tracking for migrations

## Data Flow Patterns

### Send Message Flow
```
User types → sendMessage() in ChatStore
    ↓
Add to local state immediately (optimistic)
    ↓
SQLiteService.saveMessage(status: "sending", syncStatus: "pending")
    ↓
MessageService.uploadToFirestore()
    ↓
On success: Update SQLite (status: "sent", syncStatus: "synced")
    ↓
Update UI via store listener
```

### Receive Message Flow
```
Firestore real-time listener detects new message
    ↓
MessageService.onSnapshot callback
    ↓
SQLiteService.saveMessage()
    ↓
Update ChatStore
    ↓
UI re-renders with new message
    ↓
If app backgrounded: Show push notification
```

### Open Chat Flow
```
User taps chat
    ↓
Query SQLite for messages around lastReadMessageId
    ↓
Display immediately (<100ms)
    ↓
Scroll to last read position
    ↓
Background: Query Firestore for new messages
    ↓
Download new messages in batches
    ↓
Save to SQLite as they arrive
    ↓
Start real-time listener
```

## Real-Time Features

### Real-Time Listeners Pattern
**Pattern:** Use Firestore `onSnapshot()` for push-based updates instead of polling.

**Implementation:**
```typescript
// In Service Layer
static subscribeFriendRequests(
  userId: string,
  onUpdate: (requests: FriendRequest[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(firestore, 'friendRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, 
    async (snapshot) => {
      const requests = await processSnapshot(snapshot);
      onUpdate(requests);
    },
    (error) => onError(error)
  );
}

// In Store
subscribeFriendRequests: (userId: string) => {
  const unsubscribe = FriendRequestService.subscribeFriendRequests(
    userId,
    (requests) => set({ friendRequests: requests }),
    (error) => console.error(error)
  );
  set({ friendRequestsUnsubscribe: unsubscribe });
}

// In Component
useEffect(() => {
  if (user) {
    subscribeFriendRequests(user.id);
  }
  return () => unsubscribeAll(); // Cleanup!
}, [user]);
```

**Why:**
- Instant updates pushed from server
- No polling overhead
- Automatic reconnection handling
- Battery efficient
- Proper cleanup prevents memory leaks

### Presence System
**Pattern:** Update Firestore presence document with `.onDisconnect()` handler.

```
App opens → Set isOnline: true
App closes → Set isOnline: false, lastSeen: timestamp
Unexpected disconnect → onDisconnect() triggers automatically
Heartbeat every 30 seconds while active
```

### Typing Indicators
**Pattern:** Temporary documents with TTL.

```
User types → Create /chats/{chatId}/typing/{userId}
Update timestamp every 2 seconds while typing
Stop typing → Delete document
Auto-delete after 3 seconds (Firestore TTL)
```

### Message Status Updates
**Pattern:** Real-time listeners for status changes.

```
Message sent → status: "sent"
Recipient receives → status: "delivered"
Recipient opens chat → status: "read"
Each update triggers Firestore listener
Listener updates SQLite and UI
```

## Performance Patterns

### Memory Management
- Keep only ~40 messages in RAM
- Evict old messages as new ones load
- Use React.memo for message components
- Proper keys for FlashList items

### Image Optimization
- Compress to 85% quality before upload
- Generate 200x200px thumbnails
- Upload both to Firebase Storage
- Display thumbnail first, lazy-load full image

### Database Optimization
- Indexed queries on chatId and timestamp
- Batch inserts for multiple messages
- Use transactions for consistency
- Keep minimum 200 messages cached per chat

## Security Patterns

### Authentication
- Email verification required before access
- Secure token storage (platform keychain)
- Environment variables for Firebase config

### Data Access
- Firestore security rules: Users can only read/write their own data
- Firebase Storage rules: Only authenticated users can upload
- Friend request system prevents unsolicited messages

### Privacy
- Block user deletes chat for both parties
- Read receipts always on (no privacy toggle)
- Online status visible to contacts only

## Error Handling Patterns

### Network Errors
- Queue operations locally
- Auto-retry with exponential backoff
- Show clear error states
- Provide manual retry option

### Data Errors
- Validate data before sending
- Handle missing fields gracefully
- Provide fallback values
- Log errors for debugging

### UI Errors
- Error boundaries around screens
- Toast notifications for user-facing errors
- Loading states for async operations
- Empty states for no data

