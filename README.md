# AVO-AI - Simple Messaging App

A modern React Native messaging application built with Expo, Firebase, and TypeScript. Features real-time messaging, offline support, and a foundation for future AI translation capabilities.

## ⚡ Quick Start

\`\`\`bash
# 1. Clone and install
git clone <repository-url> && cd MessageAI && npm install

# 2. Set up Firebase (see detailed instructions below)
# Create .env file with Firebase credentials

# 3. Run on physical device (recommended) or emulator
npm run android
\`\`\`

**For complete setup instructions, including push notifications, see the [Getting Started](#-getting-started) section below.**

---

## ✨ Features

- **Authentication**: Email/Password with email verification
- **Real-time Messaging**: One-on-one and group chat
- **Push Notifications**: Background notifications (physical devices only)
- **In-App Notifications**: Banners when app is open
- **Offline Support**: Local SQLite database with automatic sync
- **Offline Queue**: Messages sent offline auto-sync when online
- **Network Status**: Visual indicator when offline
- **Profile Management**: Custom usernames with availability checking
- **Message Status**: Sending → Sent → Delivered → Read tracking
- **Presence Indicators**: See who's online in real-time
- **Typed End-to-End**: Full TypeScript support
- **Theme System**: Light and dark mode support
- **Virtual Scrolling**: Efficient rendering of thousands of messages

## 🏗️ Tech Stack

### Frontend
- **React Native** 0.81.4
- **Expo SDK** 54
- **TypeScript** 5.9
- **Expo Router** (File-based routing)
- **Zustand** (State management)
- **React Native Paper** (UI components)
- **@shopify/flash-list** (Virtual scrolling)

### Backend
- **Firebase JS SDK** 12.x (All-in-one package)
  - Firebase Authentication (Email/Password)
  - Firestore Database (Real-time NoSQL)
  - Firebase Storage (Image storage)
  - Firebase Cloud Messaging (Push notifications)

### Local Storage
- **Expo SQLite** (Offline persistence)
- **AsyncStorage** (Preferences)

## 📦 Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **yarn**
- **Android Studio** (for Android development builds)
- **Expo Go** app (for quick testing on physical device)
- **Firebase Project** (see setup below)

## 🚀 Getting Started

### Setup Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Setup Process (30-45 minutes first time)                   │
└─────────────────────────────────────────────────────────────┘

1. Prerequisites ✓        → Install Node.js + Android Studio
2. Clone & Install ✓      → git clone + npm install  
3. Firebase Setup ✓       → Create project + get credentials
4. Environment Config ✓   → Create .env file
5. Push Notifications     → Upload FCM key (optional)
6. Android Dev Setup ✓    → Set JAVA_HOME + ANDROID_HOME
7. Build & Run ✓          → npm run android

💡 Steps 1-4 are REQUIRED. Step 5 is optional (for background push).
```

### Prerequisites

Before you begin, ensure you have:
- **Node.js 18+** installed
- **Android Studio** (for Android development)
- **A physical device** (recommended) OR Android Emulator
- **Firebase Project** (free tier works)
- **EAS CLI** (only needed for push notifications): `npm install -g eas-cli`

> 💡 **Recommended**: Use a real device for development. You'll see exactly what your users will see, and push notifications work properly. [Learn more about setting up your environment](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build).

---

### 1. Clone the Repository

\`\`\`bash
git clone <repository-url>
cd MessageAI
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Firebase Setup

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database** (Start in test mode for development)
   - **Firebase Storage** (Start in test mode for development)
   - **Firebase Cloud Messaging** (Enable in project settings)

#### Get Firebase Configuration

**For Android:**

1. In Firebase Console → **Project Settings**
2. Add an **Android app**:
   - **Package name**: Match your `app.json` → `android.package` (e.g., `com.murad.messageai`)
   - Register app
3. Download `google-services.json` and place in project root
4. Add to `.gitignore` (already configured)

**For iOS (future):**

1. Add an **iOS app** in Firebase Console
2. Download `GoogleService-Info.plist` and place in project root

**For Web (environment variables):**

1. In Firebase Console, go to **Project Settings**
2. Scroll to "Your apps" section  
3. Click **Add app** → **Web** (</> icon)
4. Register your app (name: "MessageAI Web")
5. Copy the Firebase configuration values

### 4. Environment Variables

Create a `.env` file in the project root:

\`\`\`bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

**Important:** Never commit the `.env` file to Git. It's already in `.gitignore`.

### 5. Push Notifications Setup (Optional - for background notifications)

Push notifications work on **physical devices only** (not emulators). If you skip this step, in-app notifications will still work when the app is open.

#### Step 1: Download Firebase Service Account Key

1. In Firebase Console → **Project Settings** → **Service Accounts**
2. Click **"Generate New Private Key"**
3. Download the JSON file (e.g., `messageai-xxxxx-firebase-adminsdk-xxxxx.json`)
4. Save it in your project root

⚠️ **SECURITY:** This file contains sensitive credentials! Make sure it's in `.gitignore` and never commit it to Git.

#### Step 2: Upload FCM Credentials to EAS

\`\`\`bash
# Install EAS CLI (if not already installed)
npm install -g eas-cli

# Login to Expo
eas login

# Upload FCM credentials
eas credentials
\`\`\`

Then:
1. Select **Android**
2. Select your build profile (e.g., **development**)
3. Choose **Google Service Account**
4. Choose **Manage your Google Service Account Key for Push Notifications (FCM V1)**
5. Upload the JSON file you downloaded

#### Step 3: Rebuild Your App

After uploading FCM credentials, rebuild the app:

\`\`\`bash
npm run android
\`\`\`

#### Testing Push Notifications

**Requirements:**
- ✅ Both users on **physical devices** (not emulators)
- ✅ Both users signed in with the **new build**
- ✅ Console shows: `"✅ FCM TOKEN REGISTERED"` for both users

**Test:**
1. User A sends message (app open)
2. User B **closes/backgrounds** the app
3. User B receives **push notification** 🔔

**Note:** Emulators cannot receive push notifications. In-app notifications (banners) work on all devices.

---

### 6. Android Development Setup (Required for development builds)

#### Option A: Set Environment Variables Permanently (Recommended - One-time setup)

1. Open **System Properties** → **Advanced** → **Environment Variables**
2. Add these **User Variables**:
   - `JAVA_HOME`: `C:\Program Files\Android\Android Studio\jbr`
   - `ANDROID_HOME`: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
3. Edit **Path** variable, add:
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`
4. Restart your terminal

#### Option B: Use Setup Script (Quick temporary setup)

Run this in PowerShell before building:

\`\`\`powershell
.\setup-env.ps1
\`\`\`

This sets environment variables for the current session only.

### 7. Run the App

> 🎯 **TL;DR**: Use development builds for full functionality. Expo Go is for quick testing only.

#### Option A: Development Build (Recommended - Full Features)

\`\`\`bash
# First time: Build and install on device/emulator
npm run android

# Daily development: Start dev server with fast refresh
npx expo start --dev-client
\`\`\`

**What Works:**
- ✅ Full push notifications (on physical devices)
- ✅ In-app notifications (banners)
- ✅ Proper AppState detection (screen lock/unlock)
- ✅ Reliable Firebase presence with onDisconnect()
- ✅ Offline queue and background sync
- ✅ All native modules

**When to Rebuild:**
```bash
# Rebuild when you:
# - Change native configuration (app.json)
# - Add/remove native dependencies
# - Update FCM credentials
npm run android
```

#### Option B: Expo Go (Quick Testing - Limited)

\`\`\`bash
# Start Expo development server
npm start

# Scan QR code with Expo Go app on your phone
\`\`\`

**What Works:**
- ✅ All messaging features
- ✅ In-app notifications (banners)
- ✅ Most UI features

**What DOESN'T Work:**
- ❌ Push notifications (when app is closed)
- ❌ Some background tasks
- ⚠️ Presence indicators may be unreliable

> 💡 **Recommended Flow**: Use Expo Go for initial UI testing, then switch to development builds for full testing.

#### Other Platforms

\`\`\`bash
npm run ios      # iOS Simulator
npm run web      # Web browser
\`\`\`

## 📁 Project Structure

\`\`\`
MessageAI/
├── app/                              # Expo Router screens (file-based routing)
│   ├── _layout.tsx                  # Root layout
│   ├── (auth)/                      # Auth screens
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   ├── forgot-password.tsx
│   │   └── create-profile.tsx
│   └── (tabs)/                      # Main app tabs
│       └── index.tsx
├── src/
│   ├── theme/                       # SINGLE SOURCE OF TRUTH for styling
│   │   ├── colors.ts               # All colors (light + dark mode)
│   │   ├── spacing.ts              # All spacing values
│   │   ├── typography.ts           # Font styles
│   │   ├── borders.ts              # Border radius & widths
│   │   ├── shadows.ts              # Shadow styles
│   │   └── index.ts                # Export lightTheme & darkTheme
│   ├── components/
│   │   └── common/                 # Reusable UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Card.tsx
│   │       ├── Avatar.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── Modal.tsx
│   │       └── index.ts
│   ├── features/                   # Feature modules
│   │   └── auth/
│   │       ├── screens/
│   │       ├── hooks/
│   │       └── services/
│   ├── services/
│   │   └── firebase/               # Firebase service layer
│   │       ├── FirebaseConfig.ts   # Firebase initialization
│   │       ├── AuthService.ts      # Authentication
│   │       ├── UserService.ts      # User profiles
│   │       └── index.ts
│   ├── store/                      # Zustand state management
│   │   ├── AuthStore.ts            # Auth state
│   │   └── index.ts
│   ├── database/                   # SQLite local database
│   │   ├── Schema.ts               # Database schema
│   │   ├── Migrations.ts           # Schema versioning
│   │   └── SQLiteService.ts        # CRUD operations
│   └── shared/                     # Shared utilities
│       ├── types/                  # TypeScript types
│       │   ├── User.ts
│       │   ├── Chat.ts
│       │   ├── Message.ts
│       │   ├── FriendRequest.ts
│       │   ├── Database.ts
│       │   └── index.ts
│       ├── utils/                  # Helper functions
│       │   ├── ProfilePictureGenerator.ts
│       │   ├── Validation.ts
│       │   └── index.ts
│       └── hooks/                  # Custom hooks
│           ├── useTheme.ts
│           └── index.ts
├── assets/                         # Static assets
│   └── images/
├── .env                           # Environment variables (not committed)
├── .env.example                   # Environment template
├── app.json                       # Expo configuration
├── package.json                   # Dependencies
└── tsconfig.json                  # TypeScript config
\`\`\`

## 🎨 Theme System

The theme system is the **single source of truth** for all styling. Components **never** use hardcoded colors, spacing, or typography values.

### Usage

\`\`\`typescript
import { useTheme } from '@/shared/hooks/useTheme';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={{
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
      borderRadius: theme.componentBorderRadius.card,
    }}>
      <Text style={theme.typography.h1}>
        Hello World
      </Text>
    </View>
  );
};
\`\`\`

### Theme Values

- **Colors**: `theme.colors.*` (primary, background, text, etc.)
- **Spacing**: `theme.spacing.*` (xs, sm, md, lg, xl, xxl)
- **Typography**: `theme.typography.*` (h1, h2, body, caption, etc.)
- **Borders**: `theme.borderRadius.*`, `theme.borderWidth.*`
- **Shadows**: `theme.shadows.*`

## 🗃️ Database Architecture

### Three-Tier Storage

1. **Firestore (Cloud)** - Source of truth, complete history
2. **SQLite (Device)** - Local cache, minimum 200 messages per chat
3. **RAM (Memory)** - Currently rendered messages (~40 at a time)

### Schema

- **users** - User profiles with online status
- **chats** - Chat metadata and participants
- **messages** - Message content with sync status
- **scroll_positions** - Resume chat at last read position
- **friend_requests** - Friend request management
- **metadata** - Schema version tracking

### Migrations

The database uses a migration system with version tracking. See `src/database/Migrations.ts` for details.

## 🔐 Authentication Flow

1. **Sign Up**: Email/Password → Send verification email
2. **Email Verification**: User clicks link in email
3. **Sign In**: After verification, user can sign in
4. **Create Profile**: Choose unique username and display name
5. **Main App**: Access to messaging features

## 📝 Common Tasks

### Adding a New Component

\`\`\`bash
# Create component file
src/components/common/MyComponent.tsx

# Export from barrel file
src/components/common/index.ts
\`\`\`

### Adding a New Screen

\`\`\`bash
# Create screen file (Expo Router)
app/(tabs)/my-screen.tsx

# Screen automatically available at /my-screen route
\`\`\`

### Adding a New Service

\`\`\`bash
# Create service file
src/services/firebase/MyService.ts

# Export from barrel file
src/services/firebase/index.ts
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run unit tests (when implemented)
npm test

# Run linter
npm run lint
\`\`\`

## 📱 Building for Production

\`\`\`bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
\`\`\`

## 🐛 Troubleshooting

### Push Notifications Not Working

#### No Notifications Received

**Check Console Logs:**
```
✅ FCM TOKEN REGISTERED           ← Token saved successfully
👤 User: [Your Name]
🔑 Token: ExponentPushToken[...]
```

If you don't see this:
1. Make sure you're on a **physical device** (not emulator)
2. Rebuild the app: `npm run android`
3. Sign in again to register token

**When Sending Message:**
```
📤 SENDING PUSH NOTIFICATION
✅ Found 1 FCM token(s)            ← Recipient has token
📡 Sending to Expo Push Service...
✅ Expo Push Service Response: SUCCESS
```

If you see `"No FCM tokens found"`:
- Recipient needs to sign in on their physical device
- Make sure FCM credentials are uploaded to EAS (see Step 5)

#### "InvalidCredentials" Error

```
"message": "Unable to retrieve the FCM server key..."
"error": "InvalidCredentials"
```

**Solution:** Upload FCM credentials to EAS
```bash
eas credentials
# Follow Step 5 in setup instructions
```

#### Notifications Work in Dev, Not in Production

Make sure FCM credentials are uploaded for the correct build profile:
- `development` profile for dev builds
- `production` profile for release builds

---

### Development Build Issues

#### `JAVA_HOME is not set`

- Set environment variables (see Android Development Setup above)
- Restart your terminal after setting
- Verify: `echo $env:JAVA_HOME` (PowerShell)

#### `SDK location not found`

- Ensure `ANDROID_HOME` is set correctly
- Check `android/local.properties` exists with correct SDK path
- Run `.\setup-env.ps1` if variables aren't permanent

#### Build Cache Issues (C++ compilation errors)

\`\`\`bash
# Clean all build artifacts
Remove-Item -Recurse -Force android\.cxx,android\build,android\app\build -ErrorAction SilentlyContinue

# Rebuild
npm run android
\`\`\`

### Firebase Not Initializing

- Check that all `EXPO_PUBLIC_FIREBASE_*` variables are set in `.env`
- Ensure Firebase services are enabled in Firebase Console
- Verify `app.json` includes the `extra` config section

### Presence Indicators Not Working

- **Use development build**, not Expo Go (Expo Go has limitations)
- Check Firebase Realtime Database rules are deployed: `firebase deploy --only database`
- Verify you're testing on real devices or emulators (not Expo Go)

### SQLite Errors

- Close and restart the app
- On iOS simulator: Reset simulator
- On Android emulator: Wipe data

### Theme Not Working

- Ensure all components import from `@/shared/hooks/useTheme`
- Verify no hardcoded colors/spacing in components
- Check theme files are properly exported

## 🔍 Enhanced Logging for Multi-User Testing

When testing with multiple users, the console can get messy. We've implemented a structured logging system that makes it easy to track what's happening:

### Features

**User Identification:**
- Each user gets a consistent emoji (👤, 👥, 🧑, etc.)
- Easy to visually track which user is doing what
- Shows both username and user ID

**Structured Log Groups:**
```
╔═══════════════════════════════════════════════════════════════╗
║  📤 MESSAGE SENT                                               ║
╠═══════════════════════════════════════════════════════════════╣
  FROM: 👤 bob
  MESSAGE: "Hey, how are you?"
  TO 1 RECIPIENT(S):
    → 👥 lola
╚═══════════════════════════════════════════════════════════════╝

🔔 PUSH NOTIFICATION
📤 Sender: 👤 bob
📱 Recipients (1):
   👥 lola - ✅ Has token
✅ Status: SENT
```

**Clear Token Status:**
- See which users have FCM tokens (physical devices)
- Which users don't (emulators or not signed in)
- No confusing errors for emulator users

### Usage

The Logger is automatically used in `MessageService` and `MessagingService`. You can also use it in your code:

```typescript
import { Logger } from '@/shared/utils/Logger';

// Log message sent
Logger.messageSent(senderId, senderName, recipientIds, recipientNames, messagePreview);

// Log user sign in
Logger.userSignIn(userId, username, displayName);

// Log info with user context
Logger.info(userId, username, 'Some action happened', data);

// Show current user emoji mapping
Logger.showUserMapping();
```

---

## 📱 Physical Device vs Emulator

### What Works Everywhere

| Feature | Physical Device | Emulator |
|---------|----------------|----------|
| Messaging | ✅ | ✅ |
| In-App Notifications | ✅ | ✅ |
| Offline Queue | ✅ | ✅ |
| Presence Indicators | ✅ | ✅ |
| Image Upload | ✅ | ✅ |
| Push Notifications | ✅ | ❌ |

### Push Notification Behavior

**Physical Device:**
- ✅ Receives notifications when app is closed
- ✅ Receives notifications when app is backgrounded
- ✅ Receives in-app banners when app is open

**Emulator:**
- ❌ Cannot receive push notifications (FCM limitation)
- ✅ Receives in-app banners when app is open
- ℹ️ No errors shown - gracefully skipped

> 💡 **Testing Tip**: Use 2 physical devices for full end-to-end testing. Use emulator + physical device for development (emulator as sender, physical as recipient).

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [Set Up Your Environment - Expo Docs](https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=simulated&mode=development-build)
- [Push Notifications with FCM - Expo Docs](https://docs.expo.dev/push-notifications/fcm-credentials/)
- [Firebase JS SDK](https://firebase.google.com/docs/web/setup)
- [React Navigation](https://reactnavigation.org)
- [Zustand](https://github.com/pmndrs/zustand)
- [FlashList](https://shopify.github.io/flash-list/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**MessageAI Team**

---

Built with ❤️ using React Native, Expo, and Firebase

**May the Force be with you, always it will.**
