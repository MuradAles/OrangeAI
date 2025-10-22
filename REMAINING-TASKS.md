# MessageAI - Remaining Tasks

**Status:** Core messaging complete, finishing touches needed  
**Estimated Time:** 15-19 hours (~2-3 days)

---

## 🎯 Task Overview

| # | Task | Priority | Time | Status |
|---|------|----------|------|--------|
| 1 | Physical Device Testing | **CRITICAL** | 30 min | ⏳ User doing |
| 2 | Group Settings Screen | High | 4-5 hrs | 📋 TODO |
| 3 | Profile Tab Updates | High | 3-4 hrs | 📋 TODO |
| 4 | Last Read Position | High | 2-3 hrs | 📋 TODO |
| 5 | Message Retry UI | Medium | 2 hrs | 📋 TODO |
| 6 | Theme System Integration | Medium | 2-3 hrs | 📋 TODO |
| 7 | Remove Block Feature Code | Low | 1 hr | 📋 TODO |
| 8 | Update Documentation | Low | 1 hr | 📋 TODO |

**Total:** 15-19 hours of development work

---

## Task 1: Physical Device Testing ⚠️ **CRITICAL**

**Priority:** CRITICAL  
**Time:** 30 minutes  
**Status:** User handling this independently

### Testing Scenarios

**Scenario 1: Offline Message Queue (5 min)**
```
1. Phone A: Enable airplane mode
2. Phone A: Send 5 messages
3. Phone A: Disable airplane mode
4. Result: All 5 messages should deliver within 3 seconds
```

**Scenario 2: Force Quit Persistence (2 min)**
```
1. Phone A: Send message
2. Phone A: Force quit app (swipe away)
3. Phone A: Reopen app
4. Result: Message should still be there
```

**Scenario 3: Push Notifications (5 min)**
```
1. Phone A: Send message to Phone B
2. Phone B: App is closed
3. Result: Phone B receives push notification
4. Result: Tap notification → Opens to that chat
```

**Scenario 4: Real-Time Performance (10 min)**
```
1. Phone A & B: Send 20 messages rapidly
2. Result: All messages appear instantly on both screens
3. Result: No lag, typing indicators smooth
```

**Scenario 5: Group Chat (5 min)**
```
1. 3 Phones: Join same group
2. All phones: Send messages simultaneously
3. Result: All messages attributed correctly
4. Result: Typing indicators show multiple users
```

### What to Verify
- ✅ Messages deliver instantly
- ✅ Offline queue processes correctly
- ✅ Push notifications work when app closed
- ✅ App persistence after force quit
- ✅ Group chat works smoothly
- ✅ Typing indicators responsive
- ✅ Online/offline status updates

---

## Task 2: Group Settings Screen 🔧

**Priority:** High  
**Time:** 4-5 hours  
**Files to Create:**
- `app/(tabs)/chat/[id]/settings.tsx` (group settings screen)
- `src/features/chat/components/GroupSettingsModal.tsx`
- `src/features/chat/components/MemberList.tsx`
- `src/features/chat/components/AddMemberSheet.tsx`

### Subtasks

#### 2.1: Group Info Display (1 hour)
- [ ] Display group name, description, icon
- [ ] Show member count
- [ ] Admin badge visible
- [ ] "Edit" button (admin only)

#### 2.2: Edit Group Info (1 hour)
- [ ] Admin can edit group name
- [ ] Admin can edit group description
- [ ] Admin can change group icon
- [ ] Save changes to Firestore via `GroupService.updateGroupInfo()`
- [ ] Update GroupStore state
- [ ] Sync to SQLite

#### 2.3: Member List with Roles (1 hour)
- [ ] Display all group members
- [ ] Show profile pictures
- [ ] Show display names
- [ ] Show "Admin" badge for admin
- [ ] Show online/offline status
- [ ] Fetch from `GroupService.getGroupParticipants()`

#### 2.4: Add Members (1-1.5 hours)
- [ ] "Add Member" button (admin only)
- [ ] Opens modal with friend list
- [ ] Show ALL friends from ContactStore
- [ ] Gray out friends already in group (disabled)
- [ ] Friends NOT in group are selectable (white/normal)
- [ ] Multi-select support
- [ ] "Add" button → Calls `GroupService.addMember()` for each
- [ ] Update UI optimistically
- [ ] Show success confirmation

#### 2.5: Remove Members (30 min)
- [ ] Swipe left on member (admin only, except self)
- [ ] "Remove" button appears
- [ ] Confirmation dialog: "Remove [Name] from group?"
- [ ] Call `GroupService.removeMember()`
- [ ] Update UI
- [ ] Can't remove admin (validation)

#### 2.6: Leave Group (30 min)
- [ ] "Leave Group" button (all members)
- [ ] Red text, bottom of screen
- [ ] Confirmation dialog: "Are you sure you want to leave?"
- [ ] Call `GroupService.leaveGroup()`
- [ ] If admin: Oldest member becomes admin automatically
- [ ] If last member: Group deleted automatically
- [ ] Navigate back to home screen
- [ ] Remove from ChatStore

### Backend Methods (Already Exist) ✅
- `GroupService.updateGroupInfo(groupId, updates)` ✅
- `GroupService.getGroupParticipants(groupId)` ✅
- `GroupService.addMember(groupId, userId)` ✅
- `GroupService.removeMember(groupId, userId)` ✅
- `GroupService.leaveGroup(groupId, userId)` ✅

### Access Point
- Gear icon in group chat header (top right)
- Tap → Opens Group Settings Modal

---

## Task 3: Profile Tab Updates 👤

**Priority:** High  
**Time:** 3-4 hours  
**Files to Update:**
- `app/(tabs)/profile.tsx` (add edit capabilities)
- `src/features/auth/components/EditProfilePictureModal.tsx` (new)
- `src/features/auth/components/EditBioModal.tsx` (new)

### Current Profile Tab
```
┌──────────────────────────────┐
│  [Profile Picture]           │
│  John Smith                  │ (display name - READ ONLY)
│  @johnsmith                  │ (username - READ ONLY)
│  "Love coding"               │ (bio)
│  [Logout Button]             │
└──────────────────────────────┘
```

### Updated Profile Tab
```
┌──────────────────────────────┐
│  [Profile Picture]           │
│  📷 Change Photo             │ <-- NEW: Tap to change
│                              │
│  John Smith                  │ (display name - read-only)
│  @johnsmith                  │ (username - read-only)
│                              │
│  "Love coding and coffee"    │ (bio)
│  ✏️ Edit Bio                 │ <-- NEW: Tap to edit
│                              │
│  Theme                       │
│  🌙 Dark  ☀️ Light          │ <-- NEW: Toggle switch
│                              │
│  [Logout Button]             │
└──────────────────────────────┘
```

### Subtasks

#### 3.1: Change Profile Picture (1.5 hours)
- [ ] Add "📷 Change Photo" button below profile picture
- [ ] Tap → Opens image picker (`expo-image-picker`)
- [ ] Select image from gallery or camera
- [ ] Compress to 85% quality (reuse StorageService logic)
- [ ] Generate thumbnail (200x200px)
- [ ] Upload to Firebase Storage: `/users/{userId}/profile.jpg`
- [ ] Call `UserService.updateUserProfile({ profilePictureUrl })`
- [ ] Update AuthStore state
- [ ] Update SQLite
- [ ] Show loading spinner during upload
- [ ] Show success confirmation

**Backend Method:**
```typescript
UserService.updateUserProfile(userId: string, updates: Partial<User>)
```
Already exists ✅

#### 3.2: Edit Bio (1 hour)
- [ ] Add "✏️ Edit Bio" button below bio text
- [ ] Tap → Opens modal with text input
- [ ] Max 200 characters (show counter)
- [ ] "Save" and "Cancel" buttons
- [ ] Call `UserService.updateUserProfile({ bio })`
- [ ] Update AuthStore state
- [ ] Update SQLite
- [ ] Close modal on save
- [ ] Show updated bio immediately

**Validation:**
- Bio: Max 200 characters
- Multiline support
- Optional (can be empty)

#### 3.3: Theme Toggle (1-1.5 hours)
- [ ] Add "Theme" section in profile
- [ ] Toggle switch: 🌙 Dark / ☀️ Light
- [ ] Save preference to AsyncStorage: `@theme_preference`
- [ ] Update app-wide theme via ThemeContext
- [ ] Persist choice across app restarts
- [ ] Apply immediately when toggled

**Implementation:**
- Create `src/shared/context/ThemeContext.tsx`
- Create `src/shared/hooks/useTheme.ts`
- Wrap app in `ThemeProvider` (in `app/_layout.tsx`)
- Load theme on app start
- Theme values already defined in `src/theme/` ✅

### What NOT to Include ❌
- ❌ Edit display name (permanent)
- ❌ Edit username (permanent)
- ❌ Phone number field
- ❌ Notification toggle (removed)
- ❌ Privacy settings
- ❌ About section
- ❌ Blocked users list (feature removed)

---

## Task 4: Last Read Position 📍

**Priority:** High  
**Time:** 2-3 hours  
**Files to Update:**
- `src/features/chat/components/ChatModal.tsx`
- `src/store/ChatStore.ts`
- `src/database/SQLiteService.ts` (methods already exist ✅)

### Current Behavior
- Chat always opens at bottom (newest messages)
- User manually scrolls to see where they left off

### New Behavior
- Chat opens at **exact scroll position** where user left off
- No visual separator line
- User sees last message they read at same position
- Can scroll down to see new messages OR tap "Jump to Bottom"

### Subtasks

#### 4.1: Save Scroll Position on Exit (1 hour)
- [ ] Listen to `onScroll` event in ChatModal
- [ ] Throttle saves (every 2 seconds max)
- [ ] On chat close / navigate away:
  - Get current scroll position (Y offset)
  - Get current visible message ID
  - Call `SQLiteService.saveScrollPosition(chatId, messageId, yPosition)`
  - Store in SQLite `scroll_positions` table

**Data to Save:**
```typescript
{
  chatId: string
  lastReadMessageId: string  // First visible message ID
  scrollYPosition: number     // Exact Y offset
  unreadCount: number        // Unread at time of exit
}
```

#### 4.2: Load and Scroll to Position on Open (1-2 hours)
- [ ] On chat open:
  - Query SQLite: `getScrollPosition(chatId)`
  - If exists:
    - Load messages around `lastReadMessageId`
    - Scroll to exact `scrollYPosition`
    - Use FlashList `scrollToOffset()` method
  - If doesn't exist:
    - Default to bottom (newest messages)
- [ ] Ensure smooth scroll (no jump/jank)
- [ ] Mark messages as read once scrolled past

#### 4.3: Update Unread Count (30 min)
- [ ] When user scrolls in chat:
  - Track which messages have been viewed
  - Update `lastReadMessageId` in Firestore participants
  - Update unread count in ChatStore
  - Clear unread badge in chat list

### Backend Methods (Already Exist) ✅
- `SQLiteService.saveScrollPosition(chatId, messageId, yPosition)` ✅
- `SQLiteService.getScrollPosition(chatId)` ✅

### Testing
- [ ] Chat opens at last position
- [ ] Scroll position persists after app restart
- [ ] Works with 1,000+ messages
- [ ] Jump to bottom still works
- [ ] Unread count updates correctly

---

## Task 5: Message Retry UI 🔄

**Priority:** Medium  
**Time:** 2 hours  
**Files to Update:**
- `src/features/chat/components/MessageBubble.tsx`
- `src/store/ChatStore.ts`
- `src/database/MessageQueue.ts` (already exists ✅)

### Current Behavior
- Failed messages just sit in queue
- No visual indication of failure
- No way to manually retry

### New Behavior
```
┌────────────────────────────┐
│ Hello!                     │ <-- Your message
│ ❌ Failed to send          │ <-- Error indicator
│ [↻ Retry] [✕ Delete]      │ <-- Action buttons
└────────────────────────────┘
```

### Subtasks

#### 5.1: Failed Message Indicator (45 min)
- [ ] In `MessageBubble.tsx`:
  - Check if `message.syncStatus === "failed"`
  - Show red error icon (❌) next to timestamp
  - Show "Failed to send" text in red
  - Gray out message bubble slightly
- [ ] Styling:
  - Red text color
  - Red icon
  - Reduced opacity on message

#### 5.2: Retry Button (45 min)
- [ ] Show "↻ Retry" button below failed message
- [ ] On tap:
  - Call `ChatStore.retryFailedMessage(messageId)`
  - Update `syncStatus: "pending"`
  - Attempt to send via `MessageService.sendMessage()`
  - Update UI to "sending" state
  - On success: Update to "sent"
  - On failure: Back to "failed" (show error)

**Backend Method:**
```typescript
ChatStore.retryFailedMessage(messageId: string)
```
Create this method using existing `MessageQueue.retryMessage()`

#### 5.3: Delete Failed Message (30 min)
- [ ] Show "✕ Delete" button next to Retry
- [ ] On tap:
  - Confirmation alert: "Delete this message?"
  - Call `ChatStore.deleteMessageForMe(messageId)`
  - Remove from SQLite
  - Remove from MessageQueue
  - Remove from UI

### Backend Methods (Already Exist) ✅
- `MessageQueue.retryMessage(messageId)` ✅
- `MessageQueue.clearFailedMessages()` ✅
- `MessageQueue.getFailedMessageCount()` ✅

### Testing
- [ ] Failed message shows error indicator
- [ ] Retry button attempts to send again
- [ ] Delete button removes message
- [ ] Multiple failed messages handled correctly
- [ ] Works after app restart

---

## Task 6: Theme System Integration 🌓

**Priority:** Medium  
**Time:** 2-3 hours  
**Files to Create:**
- `src/shared/context/ThemeContext.tsx` (new)
- `src/shared/hooks/useTheme.ts` (new)

**Files to Update:**
- `app/_layout.tsx` (wrap in ThemeProvider)
- `app/(tabs)/profile.tsx` (add toggle - part of Task 3)

### Current State
- Theme system defined in `src/theme/` ✅
- Light mode colors ✅
- Dark mode colors ✅
- All components use theme values ✅
- NO toggle to switch themes ❌

### New Behavior
- User can toggle between Light and Dark mode
- Preference saved to AsyncStorage
- App remembers choice on restart
- All components update instantly

### Subtasks

#### 6.1: Create Theme Context (1 hour)
- [ ] Create `ThemeContext.tsx`:
  ```typescript
  type ThemeContextType = {
    theme: 'light' | 'dark'
    colors: typeof lightTheme
    toggleTheme: () => void
  }
  ```
- [ ] Load saved preference from AsyncStorage on mount
- [ ] Provide `toggleTheme()` function
- [ ] Save to AsyncStorage on toggle
- [ ] Export `ThemeProvider` component

#### 6.2: Create useTheme Hook (30 min)
- [ ] Create `useTheme.ts`:
  ```typescript
  export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme must be used within ThemeProvider')
    return context
  }
  ```
- [ ] Export theme and toggleTheme

#### 6.3: Wrap App in ThemeProvider (30 min)
- [ ] Update `app/_layout.tsx`:
  - Import ThemeProvider
  - Wrap entire app
  - Place above all other providers
- [ ] Ensure StatusBar color updates with theme

#### 6.4: Update Components to Use Context (30-1 hour)
- [ ] Update components that currently import theme directly:
  - Replace `import { lightTheme } from '@/theme'`
  - With `const { colors } = useTheme()`
- [ ] Test all screens in both themes
- [ ] Fix any hard-coded colors missed

**Components to Update:**
- All screens (auth, chat, friends, profile, etc.)
- All feature components
- Message bubbles
- Chat list items
- Input fields

### Testing
- [ ] Toggle switches between light/dark
- [ ] Preference persists after app restart
- [ ] All colors update correctly
- [ ] No hard-coded colors remain
- [ ] StatusBar color matches theme

---

## Task 7: Remove Block Feature Code 🗑️

**Priority:** Low  
**Time:** 1 hour  
**Files to Update:**
- `src/services/firebase/FriendRequestService.ts`
- `src/services/firebase/ChatService.ts`
- `src/store/ContactStore.ts`
- `src/features/chat/components/ChatModal.tsx`
- `firestore.rules`
- `database.rules.json`

### Subtasks

#### 7.1: Remove Block Methods (20 min)
- [ ] Delete `FriendRequestService.blockUser()` method
- [ ] Delete `FriendRequestService.unblockUser()` method
- [ ] Delete `FriendRequestService.getBlockedUsers()` method
- [ ] Delete `ChatService.hardDeleteChatBothUsers()` method

#### 7.2: Remove Block UI (20 min)
- [ ] Remove "Block User" button from chat header menu
- [ ] Remove block logic from `ContactStore`
- [ ] Remove blocked users list from Friends screen

#### 7.3: Remove Block from Firestore Rules (10 min)
- [ ] Remove `/users/{userId}/blockedUsers/` rules
- [ ] Remove "blocked" status from friend requests
- [ ] Deploy updated rules

#### 7.4: Clean Up Types (10 min)
- [ ] Remove "blocked" from `FriendRequestStatus` type
- [ ] Remove `blockedUsers` references from types
- [ ] Update JSDoc comments

### Files to Check
```bash
# Search for "block" references:
grep -r "block" src/
grep -r "Block" src/
```

---

## Task 8: Sync Progress Console Logs 📊

**Priority:** Low  
**Time:** 30 minutes  
**Files to Update:**
- `src/store/ChatStore.ts`
- `src/services/firebase/MessageService.ts`

### Requirements
- NO UI indicator for sync progress
- Console logs only (for debugging)
- Log batch downloads
- Log sync timing

### Subtasks

#### 8.1: Add Console Logs to Message Loading (15 min)
- [ ] In `ChatStore.loadMessages()`:
  ```typescript
  console.log(`[Sync] Loading messages for chat ${chatId}`)
  console.log(`[Sync] Cache: ${cachedCount} messages from SQLite`)
  console.log(`[Sync] Fetching ${unreadCount} unread from Firestore`)
  console.log(`[Sync] Batch 1: Downloading ${batch1Size} messages...`)
  console.log(`[Sync] Batch 1: Complete (${elapsedMs}ms)`)
  console.log(`[Sync] Batch 2: Downloading ${batch2Size} messages...`)
  console.log(`[Sync] Sync complete: ${totalMessages} messages in ${totalMs}ms`)
  ```

#### 8.2: Add Console Logs to Background Sync (15 min)
- [ ] In adaptive sync logic:
  ```typescript
  if (unreadCount <= 50) {
    console.log(`[Sync] Small batch: ${unreadCount} messages, downloading all at once`)
  } else if (unreadCount <= 500) {
    console.log(`[Sync] Medium batch: ${unreadCount} messages, using 3-batch strategy`)
  } else {
    console.log(`[Sync] Large batch: ${unreadCount} messages, lazy loading on scroll`)
  }
  ```

### Testing
- [ ] Open DevTools console
- [ ] Open chat with many unread messages
- [ ] Verify logs show sync progress
- [ ] Verify timing is logged
- [ ] No UI indicators appear

---

## Task 9: Update Documentation 📝

**Priority:** Low  
**Time:** 1 hour  
**Files to Update:**
- `PRD.md` ✅ (Already updated)
- `task.md` (rename old file)
- `REMAINING-TASKS.md` ✅ (This file)
- `memory-bank/activeContext.md`
- `memory-bank/progress.md`

### Subtasks

#### 9.1: Archive Old Task File (5 min)
- [ ] Rename `task.md` → `task-OLD.md`
- [ ] Add note at top: "Archived - See REMAINING-TASKS.md for current work"

#### 9.2: Update Memory Bank (30 min)
- [ ] Update `activeContext.md`:
  - Current status: Finishing touches
  - What's left to build
  - Recent decisions
- [ ] Update `progress.md`:
  - Mark Phase 5 progress
  - Update task completion counts
  - Add new tasks completed

#### 9.3: Update README (25 min)
- [ ] Update feature list with clarifications
- [ ] Add "What's NOT included" section
- [ ] Update setup instructions if needed
- [ ] Add testing instructions

---

## 🎯 Success Criteria

### Completion Checklist
- [ ] **Task 1:** Physical device testing complete (user doing)
- [ ] **Task 2:** Group settings screen built and working
- [ ] **Task 3:** Profile editable (picture, bio, theme toggle)
- [ ] **Task 4:** Last read position working
- [ ] **Task 5:** Failed messages show retry UI
- [ ] **Task 6:** Theme toggle switches light/dark
- [ ] **Task 7:** Block feature code removed
- [ ] **Task 8:** Console logs for sync progress
- [ ] **Task 9:** Documentation updated

### Quality Standards
- [ ] All new features tested on emulator
- [ ] No TypeScript errors
- [ ] No linter errors
- [ ] Code commented appropriately
- [ ] Memory bank updated
- [ ] PRD reflects current state

---

## 📅 Timeline

**Day 1 (6-8 hours):**
- Morning: Task 2 (Group Settings Screen)
- Afternoon: Task 3 (Profile Tab Updates)

**Day 2 (6-7 hours):**
- Morning: Task 4 (Last Read Position)
- Afternoon: Task 5 (Message Retry UI)
- Evening: Task 6 (Theme System)

**Day 3 (3-4 hours):**
- Morning: Task 7 (Remove Block Code)
- Afternoon: Task 8 (Console Logs) + Task 9 (Documentation)

**Total: 15-19 hours across 3 days**

---

## 🚀 After Completion

Once all tasks complete:
1. ✅ Physical device testing verified
2. ✅ All features working on emulator
3. ✅ Documentation updated
4. ✅ Memory bank current
5. 🎉 **Project complete!**

---

**The path is clear. Execute the tasks in order, you must. 🌟**

