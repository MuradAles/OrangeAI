# MessageAI - Simple Messaging App

A modern React Native messaging application built with Expo, Firebase, and TypeScript. Features real-time messaging, offline support, and a foundation for future AI translation capabilities.

## ✨ Features

- **Authentication**: Email/Password with email verification
- **Real-time Messaging**: One-on-one and group chat
- **Offline Support**: Local SQLite database with automatic sync
- **Profile Management**: Custom usernames with availability checking
- **Message Status**: Sending → Sent → Delivered → Read tracking
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
- **Expo Go** app (for testing on physical device)
- **Firebase Project** (see setup below)

## 🚀 Getting Started

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

### 5. Run the App

\`\`\`bash
# Start Expo development server
npm start

# Run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser

# Or scan QR code with Expo Go app for physical device testing
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

### Firebase Not Initializing

- Check that all `EXPO_PUBLIC_FIREBASE_*` variables are set in `.env`
- Ensure Firebase services are enabled in Firebase Console
- Verify `app.json` includes the `extra` config section

### SQLite Errors

- Close and restart the app
- On iOS simulator: Reset simulator
- On Android emulator: Wipe data

### Theme Not Working

- Ensure all components import from `@/shared/hooks/useTheme`
- Verify no hardcoded colors/spacing in components
- Check theme files are properly exported

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
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
