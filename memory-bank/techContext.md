# Technical Context

## Technology Stack

### Frontend Framework
- **React Native:** 0.81.4
- **Expo SDK:** 54
- **TypeScript:** 5.9
- **Node.js:** 18+ recommended

### Navigation
- **Expo Router:** 6.0.11 (file-based routing)
- **React Navigation:** 7.1.8 (under the hood)

### UI & Styling
- **React Native Paper:** Material Design components
- **@expo/vector-icons:** Icon library (already installed)
- **Custom Component Library:** Reusable UI components with theme system

### State Management
- **Zustand:** 4.x (simple, no boilerplate)
- Pattern: Domain-specific stores (AuthStore, ChatStore, ContactStore, GroupStore)

### Backend & Cloud Services
- **Firebase JS SDK (v11+):** All-in-one package
  - `firebase/auth` - Email/Password authentication
  - `firebase/firestore` - NoSQL database with real-time listeners
  - `firebase/storage` - Image and file storage
- **Firebase Cloud Messaging:** Push notifications (via FCM tokens)

### Local Storage
- **Expo SQLite:** 11.x (built-in SQL database)
- **AsyncStorage:** Theme preferences (via Expo)

### Push Notifications
- **expo-notifications:** Native notification handling
- **expo-device:** Device info for FCM token registration

### Image Handling
- **expo-image:** Optimized image component (already installed)
- **expo-image-picker:** Select images from gallery/camera
- **expo-image-manipulator:** Compress and resize images
- **expo-file-system:** File operations

### Performance & Optimization
- **@shopify/flash-list:** High-performance virtual scrolling
- **react-native-reanimated:** 4.1.1 (already installed, required for FlashList)
- **react-native-gesture-handler:** 2.28.0 (already installed)

### Utilities
- **date-fns:** Date formatting and manipulation
- **@react-native-community/netinfo:** Network status detection

## Development Setup

### Prerequisites
```bash
Node.js: 18+ (LTS recommended)
npm or yarn
Expo Go app (for testing on physical device)
Git
```

### Environment Variables
Located in `.env` file (not committed to git):
```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

Accessed via: `expo-constants` (already installed)

### Firebase Configuration

**Firebase Project Created:**
- ✅ Authentication enabled (Email/Password)
- ✅ Firestore Database enabled
- ✅ Firebase Storage enabled
- ✅ Firebase Cloud Messaging enabled

**Required Firestore Indexes:**
```
Collection: chats
- participants (Array) + lastMessageTime (Descending)

Collection: messages (subcollection)
- chatId (Ascending) + timestamp (Descending)
```
(Create in Firebase Console or auto-created on first query)

## Project Structure

```
MessageAI/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx              # Root layout
│   ├── (auth)/                  # Auth screens (sign in, sign up)
│   ├── (tabs)/                  # Main app tabs
│   └── +not-found.tsx           # 404 screen
├── src/
│   ├── theme/                   # SINGLE SOURCE OF TRUTH for styling
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   ├── borders.ts
│   │   ├── shadows.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── ...
│   │   └── feature/             # Feature-specific components
│   ├── features/                # Feature modules
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── contacts/
│   │   └── groups/
│   ├── services/
│   │   └── firebase/            # Firebase service layer
│   │       ├── FirebaseConfig.ts
│   │       ├── AuthService.ts
│   │       ├── ChatService.ts
│   │       └── ...
│   ├── store/                   # Zustand stores
│   │   ├── AuthStore.ts
│   │   ├── ChatStore.ts
│   │   └── ...
│   ├── database/                # SQLite
│   │   ├── Schema.ts
│   │   ├── Migrations.ts
│   │   └── SQLiteService.ts
│   └── shared/                  # Shared utilities
│       ├── types/               # TypeScript types
│       ├── utils/               # Helper functions
│       ├── hooks/               # Custom hooks
│       └── components/          # Shared smart components
├── assets/                      # Images, fonts, etc.
├── .env                        # Environment variables (not committed)
├── .env.example                # Template for environment variables
├── app.json                    # Expo configuration
├── package.json                # Dependencies
└── tsconfig.json               # TypeScript configuration
```

## TypeScript Configuration

**Key Settings:**
- `strict: true` - Full type checking
- Path aliases configured:
  - `@/` → `src/`
  - `@components/` → `src/components/`
  - `@theme/` → `src/theme/`

## Technical Constraints

### Expo Go Limitations
- **Must use Expo-compatible packages** (no native modules requiring custom builds)
- Cannot use `@react-native-firebase/*` packages (native modules)
- Google Sign-In via native SDK not available (use expo-auth-session if needed)

**Solution:** Using Firebase JS SDK which is fully Expo Go compatible.

### Platform Support
- **iOS:** 13.0+
- **Android:** 5.0+ (API 21+)
- **Web:** Not prioritized for MVP

### Performance Requirements
- Chat open: <500ms (from SQLite)
- Scroll: 60fps constant
- Jump to bottom: <100ms
- Memory: <50MB per active chat
- Only ~40 messages rendered in RAM at once

### Data Limits
- Message text: Max 4,096 characters
- Image caption: Max 1,024 characters
- Image file size: Max 10MB (compressed to 85% quality)
- Username: 3-20 characters, lowercase, alphanumeric + underscore

## Development Workflow

### Running the App
```bash
# Start Expo dev server
npm start

# Run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser

# Scan QR with Expo Go app for physical device testing
```

### Testing Strategy
- **Unit Tests:** ✅ Jest + React Native Testing Library configured
  - 88 tests passing for core services and stores
  - Comprehensive mocks for Firebase and Expo modules
  - Test coverage includes optimistic updates and state management
- **Integration Tests:** Test complete user flows (Phase 5)
- **Performance Tests:** Verify performance targets (Phase 5)
- **Manual Testing:** Two physical devices for real-time features

### Testing Infrastructure
**Framework:** Jest 29.x with `jest-expo` preset
**Libraries:**
- `@testing-library/react-native` - Component testing
- `react-test-renderer` - Snapshot testing
- `ts-jest` - TypeScript support

**Test Scripts:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Coverage:**
- Services: AuthService, MessageService, ChatService, StorageService, PresenceService
- Stores: AuthStore, ChatStore, ContactStore
- Total: 88 passing tests, 2 skipped (mock config complexity)

### Code Quality
- **ESLint:** Already configured (expo linting)
- **TypeScript:** Strict mode enabled
- **Code Comments:** Document complex logic
- **API Documentation:** Document all services

## Deployment

### Development
- Use Expo Go for rapid testing
- `.env` file for Firebase config

### Production
- **EAS Build:** Expo Application Services for app builds
- **Environment Variables:** Use EAS Secrets for production values
- **Platforms:** iOS (TestFlight), Android (Play Store internal testing)

## Known Technical Decisions

### Firebase JS SDK vs @react-native-firebase
**Decision:** Use Firebase JS SDK
**Reason:** Expo Go compatibility, faster development, all features available

### No Google Sign-In in MVP
**Decision:** Skip Google Sign-In for MVP
**Reason:** Native Google Sign-In requires dev client, Email/Password is sufficient for MVP

### Virtual Scrolling Implementation
**Decision:** Use @shopify/flash-list
**Reason:** Better performance than FlatList, handles large lists efficiently

### State Management
**Decision:** Use Zustand over Redux/MobX
**Reason:** Simpler API, less boilerplate, perfect for small-to-medium apps

### Offline Strategy
**Decision:** SQLite as cache with Firestore as source of truth
**Reason:** Fast local queries, reliable persistence, works offline

## Dependencies Version Lock

Critical packages with version constraints:
- **Expo SDK 54:** All expo-* packages must be compatible
- **React 19.1.0:** Locked to Expo SDK 54
- **React Native 0.81.4:** Locked to Expo SDK 54
- **TypeScript 5.9:** Modern features, good Expo compatibility

## Firebase SDK Version
- **firebase:** 11+ (latest stable)
- Includes: auth, firestore, storage in one package
- Real-time listeners via `onSnapshot()`
- Offline persistence via `enableIndexedDbPersistence()` (web) or native (mobile)

