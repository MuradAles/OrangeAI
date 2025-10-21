# Active Context

## Current Status: **Beginning of Phase 1 - Foundation Setup**

### Where We Are
- ✅ Expo SDK 54 project initialized with expo-router
- ✅ Firebase project created in Firebase Console
- ✅ `.env` file created with Firebase credentials (not committed)
- ✅ Basic project structure exists (app/, components/, hooks/)
- ⏳ **About to install dependencies and begin development**

### Current Task
**Task 1.1: Project Dependencies & Configuration**

We're deciding on the correct Firebase SDK to use with Expo Go compatibility.

### Recent Decisions

#### Firebase SDK Choice: Firebase JS SDK (v11+)
**Decision:** Use `firebase` npm package (Firebase JS SDK) instead of `@react-native-firebase/*`

**Reasoning:**
- ✅ Works with Expo Go (no custom dev client needed)
- ✅ Faster development workflow
- ✅ All features needed in PRD are supported
- ✅ Better Expo compatibility
- ✅ Push notifications via `expo-notifications` + FCM integration

**Trade-off Accepted:**
- Google Sign-In will be skipped for MVP (Email/Password only)
- Can add Google Sign-In later with `expo-auth-session` if needed

#### Libraries to Install (Phase 1)
```bash
firebase                              # All Firebase features (Auth, Firestore, Storage)
zustand                               # State management
expo-sqlite                           # Local database
expo-notifications                    # Push notifications
expo-device                          # Device info
expo-image-picker                    # Image picking
expo-image-manipulator               # Image compression
expo-file-system                     # File operations
@react-native-community/netinfo      # Network detection
date-fns                             # Date formatting
@shopify/flash-list                  # Virtual scrolling
react-native-paper                   # UI components
```

**Rejected Libraries:**
- ❌ `@react-native-firebase/*` - Requires dev client, not Expo Go compatible
- ❌ `react-native-vector-icons` - Use `@expo/vector-icons` instead (already installed)
- ❌ `@react-native-google-signin/google-signin` - Native module, needs dev client

### Next Immediate Steps

1. **Install Dependencies** (5 minutes)
   - Run npm install command with all safe packages
   - Verify no conflicts

2. **Configure app.json** (10 minutes)
   - Add necessary plugins for expo-notifications
   - Configure app identifiers
   - Set up permissions (camera, photos, notifications)

3. **Create Folder Structure** (15 minutes)
   - `src/theme/` - Theme system (colors, spacing, typography)
   - `src/components/common/` - Reusable UI components
   - `src/services/firebase/` - Firebase service layer
   - `src/store/` - Zustand stores
   - `src/database/` - SQLite setup
   - `src/shared/` - Shared utilities and types

4. **Set Up Firebase Config** (20 minutes)
   - Create `src/services/firebase/FirebaseConfig.ts`
   - Initialize Firebase with environment variables
   - Test connection

5. **Define TypeScript Types** (30 minutes)
   - User, Chat, Message, FriendRequest interfaces
   - Database table types
   - API response types

### Active Considerations

#### Theme System Strategy
- Create SINGLE SOURCE OF TRUTH in `src/theme/`
- All colors, spacing, typography defined once
- All components import from theme (no hardcoded values)
- Light + Dark mode support from the start

#### Database Strategy
- Firebase Firestore = Source of truth (complete history)
- SQLite = Local cache (minimum 200 messages per chat)
- RAM = Only ~40 rendered messages at a time
- Load from SQLite first (instant), sync from Firebase in background

#### Authentication Approach
- Email/Password only for MVP
- Email verification required before access
- Username must be unique (real-time availability check)
- Profile created after email verification

### Open Questions
None currently - ready to proceed with installation.

### Blockers
None - Firebase credentials are ready, project initialized, ready to install dependencies.

### Focus for This Session
1. Install all dependencies
2. Set up folder structure
3. Create theme system
4. Initialize Firebase configuration
5. Define shared TypeScript types

This will complete Task 1.1 through Task 1.5 of Phase 1.

