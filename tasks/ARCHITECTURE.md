# MessageAI - Architecture Documentation

This document provides visual diagrams of the MessageAI system architecture, showing how all components interact.

---

## Complete System Architecture

```mermaid
graph TB
    subgraph "Client - React Native App"
        subgraph "UI Layer"
            UI[UI Components<br/>React Native Paper]
            Screens[Screens<br/>Expo Router]
            CustomUI[Custom UI Library<br/>Button, Input, Avatar, etc.]
        end
        
        subgraph "State Management"
            AuthStore[AuthStore<br/>Zustand]
            ChatStore[ChatStore<br/>Zustand]
            ContactStore[ContactStore<br/>Zustand]
            GroupStore[GroupStore<br/>Zustand]
        end
        
        subgraph "Business Logic"
            Hooks[Custom Hooks<br/>useAuth, useMessages, etc.]
            Services[Service Layer]
        end
        
        subgraph "Local Storage"
            SQLite[(SQLite Database<br/>Users, Chats, Messages<br/>Scroll Positions, Queue)]
            AsyncStorage[(AsyncStorage<br/>Theme, Preferences)]
        end
        
        subgraph "Firebase Services Layer"
            AuthService[AuthService<br/>Sign In/Up, Google Auth]
            ChatService[ChatService<br/>CRUD Operations]
            MessageService[MessageService<br/>Send, Receive, Status]
            UserService[UserService<br/>Profile Management]
            StorageService[StorageService<br/>Image Upload]
            PresenceService[PresenceService<br/>Online Status, Typing]
            GroupService[GroupService<br/>Group Operations]
            MessagingService[MessagingService<br/>Push Notifications]
        end
    end
    
    subgraph "Backend - Firebase"
        subgraph "Firebase Auth"
            EmailAuth[Email/Password Auth]
            GoogleAuth[Google Sign-In]
        end
        
        subgraph "Firestore Collections"
            Users[/users/{userId}/<br/>Profile, Status, FCM Token]
            Chats[/chats/{chatId}/<br/>Participants, Last Message]
            Messages[/chats/{chatId}/messages/<br/>Text, Images, Status]
            Participants[/chats/{chatId}/participants/<br/>Roles, Read Status]
            FriendRequests[/friendRequests/<br/>Pending, Accepted]
            BlockedUsers[/users/{userId}/blockedUsers/<br/>Blocked List]
            Typing[/chats/{chatId}/typing/<br/>Real-time Typing]
        end
        
        subgraph "Firebase Storage"
            ProfilePics[/users/{userId}/profile.jpg]
            GroupIcons[/groups/{chatId}/icon.jpg]
            MessageImages[/chats/{chatId}/{messageId}/<br/>image.jpg, thumbnail.jpg]
        end
        
        subgraph "Firebase Cloud Messaging"
            FCM[FCM Service<br/>Push Notifications]
        end
        
        subgraph "Firebase Functions"
            CloudFunctions[Cloud Functions<br/>Future: AI Translation]
        end
    end
    
    subgraph "External Services"
        GoogleSignIn[Google Sign-In API]
        AppStore[App Store / Play Store<br/>Distribution]
    end
    
    %% UI Connections
    UI --> Screens
    Screens --> CustomUI
    Screens --> Hooks
    
    %% State Management Connections
    Hooks --> AuthStore
    Hooks --> ChatStore
    Hooks --> ContactStore
    Hooks --> GroupStore
    
    %% Local Storage Connections
    AuthStore --> SQLite
    ChatStore --> SQLite
    ContactStore --> SQLite
    GroupStore --> SQLite
    AuthStore --> AsyncStorage
    
    %% Service Layer Connections
    Hooks --> Services
    Services --> AuthService
    Services --> ChatService
    Services --> MessageService
    Services --> UserService
    Services --> StorageService
    Services --> PresenceService
    Services --> GroupService
    Services --> MessagingService
    
    %% Firebase Auth Connections
    AuthService --> EmailAuth
    AuthService --> GoogleAuth
    GoogleAuth --> GoogleSignIn
    
    %% Firestore Connections
    AuthService --> Users
    UserService --> Users
    ChatService --> Chats
    MessageService --> Messages
    MessageService --> Participants
    UserService --> FriendRequests
    UserService --> BlockedUsers
    PresenceService --> Users
    PresenceService --> Typing
    GroupService --> Chats
    GroupService --> Participants
    
    %% Storage Connections
    StorageService --> ProfilePics
    StorageService --> GroupIcons
    StorageService --> MessageImages
    
    %% Push Notification Connections
    MessagingService --> FCM
    FCM --> UI
    
    %% Real-time Listeners
    Chats -.Real-time Listener.-> ChatService
    Messages -.Real-time Listener.-> MessageService
    Users -.Real-time Listener.-> PresenceService
    Typing -.Real-time Listener.-> PresenceService
    
    %% Distribution
    UI --> AppStore
    
    style SQLite fill:#e1f5ff
    style AsyncStorage fill:#e1f5ff
    style Users fill:#fff4e1
    style Chats fill:#fff4e1
    style Messages fill:#fff4e1
    style FCM fill:#ffe1e1
    style CloudFunctions fill:#e1ffe1
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant AuthService
    participant FirebaseAuth
    participant Firestore
    participant SQLite
    
    %% Sign Up Flow
    User->>App: Enter email & password
    App->>AuthService: signUpWithEmail()
    AuthService->>FirebaseAuth: createUserWithEmailAndPassword()
    FirebaseAuth-->>AuthService: User created
    AuthService->>FirebaseAuth: sendEmailVerification()
    AuthService-->>App: Verification email sent
    App-->>User: Check your email
    
    User->>App: Click verification link
    FirebaseAuth-->>App: Email verified
    
    %% Profile Creation
    App->>User: Create profile screen
    User->>App: Enter username, display name
    App->>AuthService: checkUsernameAvailability()
    AuthService->>Firestore: Query users by username
    Firestore-->>AuthService: Available/Taken
    AuthService-->>App: Result
    
    User->>App: Upload profile picture
    App->>StorageService: uploadProfilePicture()
    StorageService->>FirebaseStorage: Upload image
    FirebaseStorage-->>StorageService: Download URL
    
    App->>UserService: createProfile()
    UserService->>Firestore: Save to /users/{userId}
    UserService->>SQLite: Save locally
    SQLite-->>UserService: Saved
    Firestore-->>UserService: Saved
    UserService-->>App: Profile created
    App-->>User: Navigate to home
    
    %% Google Sign In
    alt Google Sign-In
        User->>App: Tap Google Sign-In
        App->>AuthService: signInWithGoogle()
        AuthService->>GoogleSignIn: Authenticate
        GoogleSignIn-->>AuthService: Google tokens
        AuthService->>FirebaseAuth: signInWithCredential()
        FirebaseAuth-->>AuthService: User signed in
        AuthService->>Firestore: Get/Create profile
        Firestore-->>AuthService: Profile data
        AuthService->>SQLite: Save locally
        AuthService-->>App: Authenticated
        App-->>User: Navigate to home
    end
```

---

## Message Send/Receive Flow

```mermaid
sequenceDiagram
    participant UserA as User A (Sender)
    participant AppA as App A
    participant SQLiteA as SQLite A
    participant ChatStore as ChatStore (Zustand)
    participant MessageService
    participant Firestore
    participant Listener as Real-time Listener
    participant SQLiteB as SQLite B
    participant AppB as App B
    participant UserB as User B (Receiver)
    participant FCM
    
    %% Send Message
    UserA->>AppA: Types message, taps send
    AppA->>ChatStore: sendMessage()
    
    %% Optimistic Update
    ChatStore->>SQLiteA: Save (status: sending, syncStatus: pending)
    SQLiteA-->>ChatStore: Saved
    ChatStore->>AppA: Update UI immediately
    AppA-->>UserA: Message appears with ⏱️
    
    %% Background Upload
    ChatStore->>MessageService: uploadToFirestore()
    MessageService->>Firestore: Create message document
    Firestore-->>MessageService: Success + messageId
    MessageService->>ChatStore: Update status
    ChatStore->>SQLiteA: Update (status: sent, syncStatus: synced)
    ChatStore->>AppA: Update UI
    AppA-->>UserA: Show ✓ (sent)
    
    %% Real-time Receive
    Firestore->>Listener: New message event
    Listener->>MessageService: onSnapshot callback
    MessageService->>SQLiteB: Save message
    SQLiteB-->>MessageService: Saved
    MessageService->>AppB: Update UI
    AppB-->>UserB: New message appears
    
    %% Push Notification (if app backgrounded)
    alt App in Background
        Firestore->>FCM: Trigger notification
        FCM->>AppB: Push notification
        AppB-->>UserB: Notification banner
    end
    
    %% Delivered Status
    AppB->>MessageService: Mark as delivered
    MessageService->>Firestore: Update status: delivered
    Firestore->>Listener: Status update
    Listener->>AppA: Update UI
    AppA-->>UserA: Show ✓✓ (delivered)
    
    %% Read Status
    UserB->>AppB: Opens chat
    AppB->>MessageService: Mark as read
    MessageService->>Firestore: Update status: read
    Firestore->>Listener: Status update
    Listener->>AppA: Update UI
    AppA-->>UserA: Show ✓✓ blue (read)
```

---

## Offline Message Queue Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant ChatStore
    participant SQLite
    participant NetworkMonitor
    participant MessageQueue
    participant Firestore
    
    User->>App: Goes offline (airplane mode)
    NetworkMonitor->>App: Network disconnected
    App->>User: Show "⚠️ No internet" banner
    
    User->>App: Sends message
    App->>ChatStore: sendMessage()
    ChatStore->>SQLite: Save (syncStatus: pending)
    SQLite-->>ChatStore: Queued
    ChatStore->>App: Show message with ⏱️
    App-->>User: Message visible locally
    
    User->>App: Sends more messages
    loop Each message
        App->>SQLite: Queue message
    end
    
    User->>App: Goes back online
    NetworkMonitor->>App: Network connected
    App->>User: Hide offline banner
    
    App->>MessageQueue: Process queue (FIFO)
    MessageQueue->>SQLite: Get pending messages
    SQLite-->>MessageQueue: Queued messages
    
    loop For each message
        MessageQueue->>Firestore: Upload message
        alt Upload Success
            Firestore-->>MessageQueue: Success
            MessageQueue->>SQLite: Update (syncStatus: synced)
            MessageQueue->>App: Update UI (✓)
        else Upload Failed
            MessageQueue->>MessageQueue: Retry (max 3 times)
            alt All retries failed
                MessageQueue->>SQLite: Mark as failed
                MessageQueue->>App: Show "Message not sent"
                App-->>User: Retry button
            end
        end
    end
```

---

## Virtual Scrolling & Message Loading

```mermaid
flowchart TD
    Start[User opens chat] --> CheckCache{Messages in<br/>SQLite?}
    
    CheckCache -->|Yes - Existing Chat| LoadLocal[Load 40 messages around<br/>last read position<br/>From SQLite]
    CheckCache -->|No - New Chat| LoadRemote[Load last 50 messages<br/>From Firestore]
    
    LoadLocal --> Display1[Display instantly<br/>&lt;100ms]
    LoadRemote --> SaveFirst[Save to SQLite]
    SaveFirst --> Display2[Display messages<br/>1-2 seconds]
    
    Display1 --> ScrollToLast[Scroll to last<br/>read position]
    Display2 --> ScrollToBottom[Scroll to bottom]
    
    ScrollToLast --> BackgroundSync[Background: Check for<br/>new messages on Firestore]
    ScrollToBottom --> StartListener[Start real-time listener]
    
    BackgroundSync --> CountUnread{How many<br/>unread?}
    CountUnread -->|≤50| DownloadAll[Download all at once]
    CountUnread -->|51-500| DownloadBatches[Batch 1: 100 msgs<br/>Batch 2: 200 msgs<br/>Batch 3: rest]
    CountUnread -->|500+| LazyLoad[Load 50 at a time<br/>as user scrolls]
    
    DownloadAll --> SaveToCache1[Save to SQLite]
    DownloadBatches --> SaveToCache2[Save batches to SQLite]
    LazyLoad --> SaveToCache3[Save as loaded]
    
    SaveToCache1 --> RenderBuffer[Keep ~40 messages<br/>in RAM]
    SaveToCache2 --> RenderBuffer
    SaveToCache3 --> RenderBuffer
    
    RenderBuffer --> UserScrolls{User scrolls?}
    
    UserScrolls -->|Scroll Up| LoadOlder[Load 50 older messages<br/>From SQLite - instant]
    UserScrolls -->|Scroll Down| CheckNewer{In SQLite?}
    UserScrolls -->|Jump to Bottom| JumpInstant[Instant teleport<br/>Load last 40 messages]
    
    CheckNewer -->|Yes| LoadNewer1[Load from SQLite - instant]
    CheckNewer -->|No| LoadNewer2[Load from Firestore<br/>1-2 seconds]
    
    LoadOlder --> UpdateBuffer[Update buffer<br/>Remove bottom messages]
    LoadNewer1 --> UpdateBuffer
    LoadNewer2 --> SaveNew[Save to SQLite]
    SaveNew --> UpdateBuffer
    
    UpdateBuffer --> RenderBuffer
    JumpInstant --> RenderBuffer
    
    StartListener --> RealTime[Real-time updates]
    RealTime --> NewMessage{New message<br/>arrives?}
    NewMessage -->|Yes| AppendMessage[Append to list<br/>Save to SQLite]
    AppendMessage --> RenderBuffer
    
    style LoadLocal fill:#e1f5ff
    style LoadRemote fill:#fff4e1
    style RenderBuffer fill:#e1ffe1
    style SQLite fill:#e1f5ff
```

---

## Image Upload & Compression Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant ImagePicker
    participant ImageManipulator
    participant StorageService
    participant FirebaseStorage
    participant MessageService
    participant Firestore
    participant RecipientApp
    participant Recipient
    
    User->>App: Tap image button
    App->>ImagePicker: Open picker
    ImagePicker-->>App: Selected image URI
    
    App->>App: Show preview with caption input
    User->>App: Enter caption (max 1,024 chars)
    User->>App: Tap send
    
    %% Compression
    App->>ImageManipulator: Compress image
    Note over ImageManipulator: 85% quality<br/>Max 10MB
    ImageManipulator-->>App: Compressed image
    
    %% Thumbnail
    App->>ImageManipulator: Generate thumbnail
    Note over ImageManipulator: 200x200px
    ImageManipulator-->>App: Thumbnail
    
    %% Upload Full Image
    App->>StorageService: uploadMessageImage()
    StorageService->>FirebaseStorage: Upload full image
    Note over FirebaseStorage: /chats/{chatId}/{messageId}/image.jpg
    FirebaseStorage-->>StorageService: Full image URL
    
    %% Upload Thumbnail
    StorageService->>FirebaseStorage: Upload thumbnail
    Note over FirebaseStorage: /chats/{chatId}/{messageId}/thumbnail.jpg
    FirebaseStorage-->>StorageService: Thumbnail URL
    
    StorageService-->>App: Both URLs
    
    %% Save Message
    App->>MessageService: Send image message
    MessageService->>Firestore: Create message
    Note over Firestore: type: image<br/>imageUrl, thumbnailUrl<br/>caption
    Firestore-->>MessageService: Saved
    
    %% Recipient Receives
    Firestore->>RecipientApp: Real-time update
    RecipientApp->>RecipientApp: Load thumbnail first
    RecipientApp-->>Recipient: Show thumbnail
    
    Recipient->>RecipientApp: Tap to view full
    RecipientApp->>RecipientApp: Load full image
    RecipientApp-->>Recipient: Full-screen viewer
```

---

## Group Chat & Admin Flow

```mermaid
stateDiagram-v2
    [*] --> Creating: User creates group
    
    Creating --> Active: Group created<br/>Creator = Admin<br/>Invite code generated
    
    state Active {
        [*] --> AdminActive
        
        AdminActive --> MemberJoins: Admin adds member<br/>OR<br/>Member joins via invite link
        MemberJoins --> AdminActive
        
        AdminActive --> AdminLeaves: Admin leaves group
        AdminLeaves --> Transitioning: Find oldest member
        Transitioning --> NewAdminActive: Transfer admin role
        NewAdminActive --> AdminActive
        
        AdminActive --> LastMemberLeaves: Admin leaves<br/>No members remain
    }
    
    Active --> Deleted: Last member leaves
    Deleted --> [*]
    
    note right of Creating
        - Name (required)
        - Description (optional)
        - Icon (optional)
        - Members selection
    end note
    
    note right of AdminActive
        Admin can:
        - Add/remove members
        - Edit group info
        - Generate invite links
        - Delete group
    end note
    
    note right of MemberJoins
        Members can:
        - Send messages
        - Leave group
        - View group info
    end note
    
    note right of Transitioning
        Admin transition rules:
        1. Find oldest member (by joinedAt)
        2. Transfer admin role
        3. Notify new admin
        4. Update Firestore
    end note
```

---

## Real-Time Presence & Typing Indicators

```mermaid
sequenceDiagram
    participant UserA as User A
    participant AppA as App A
    participant PresenceService
    participant Firestore
    participant Listener
    participant AppB as App B
    participant UserB as User B
    
    %% User A goes online
    UserA->>AppA: Opens app
    AppA->>PresenceService: setOnline()
    PresenceService->>Firestore: Update /users/{userAId}
    Note over Firestore: isOnline: true<br/>lastSeen: null
    PresenceService->>Firestore: Set onDisconnect handler
    Note over Firestore: Auto-update on disconnect:<br/>isOnline: false<br/>lastSeen: timestamp
    
    %% User B sees User A online
    Firestore->>Listener: Presence update
    Listener->>AppB: User A is online
    AppB-->>UserB: Show green dot
    
    %% Typing Indicator
    UserA->>AppA: Starts typing
    AppA->>PresenceService: startTyping(chatId)
    PresenceService->>Firestore: Create /chats/{chatId}/typing/{userAId}
    Note over Firestore: timestamp: now<br/>TTL: 3 seconds
    
    loop Every 2 seconds while typing
        AppA->>PresenceService: Update typing timestamp
        PresenceService->>Firestore: Update timestamp
    end
    
    %% User B sees typing
    Firestore->>Listener: Typing update
    Listener->>AppB: User A is typing
    AppB-->>UserB: Show "User A is typing..."
    
    %% User A stops typing
    UserA->>AppA: Stops typing
    AppA->>PresenceService: stopTyping(chatId)
    PresenceService->>Firestore: Delete /chats/{chatId}/typing/{userAId}
    
    alt After 3 seconds
        Firestore->>Firestore: TTL expires, auto-delete
    end
    
    Firestore->>Listener: Typing stopped
    Listener->>AppB: Hide typing indicator
    AppB-->>UserB: Indicator disappears
    
    %% User A closes app
    UserA->>AppA: Closes app
    AppA->>PresenceService: setOffline()
    PresenceService->>Firestore: onDisconnect triggered
    Firestore->>Firestore: Update /users/{userAId}
    Note over Firestore: isOnline: false<br/>lastSeen: timestamp
    
    Firestore->>Listener: Presence update
    Listener->>AppB: User A offline
    AppB-->>UserB: Show "Last seen: 2 min ago"
```

---

## Push Notification Flow

```mermaid
flowchart TD
    Start[App launches] --> RequestPerm{First launch?}
    
    RequestPerm -->|Yes| AskUser[Request notification<br/>permission]
    RequestPerm -->|No| CheckToken[Check FCM token]
    
    AskUser -->|Granted| GetToken[Get FCM token]
    AskUser -->|Denied| NoNotif[App works without<br/>notifications]
    
    GetToken --> SaveToken[Save token to<br/>Firestore /users/{userId}]
    SaveToken --> Listen[Listen for notifications]
    CheckToken --> Listen
    
    Listen --> NotifReceived{Notification<br/>received?}
    
    NotifReceived -->|Foreground| ShowInApp[Display in-app notification]
    NotifReceived -->|Background| ShowSystem[System notification banner]
    
    ShowInApp --> UserTaps1{User taps?}
    ShowSystem --> UserTaps2{User taps?}
    
    UserTaps1 -->|Yes| Navigate[Navigate to chat]
    UserTaps2 -->|Yes| Navigate
    
    Navigate --> OpenChat[Open specific chat<br/>or screen]
    
    subgraph "Notification Types"
        NewMsg[New Message<br/>Show preview if &lt;50 chars]
        ImageMsg[Image Message<br/>'Name sent an image']
        FriendReq[Friend Request<br/>'New request from Name']
        ReqAccept[Request Accepted<br/>'Name accepted your request']
        AddedGroup[Added to Group<br/>'Name added you to Group']
    end
    
    NotifReceived -.Type.-> NewMsg
    NotifReceived -.Type.-> ImageMsg
    NotifReceived -.Type.-> FriendReq
    NotifReceived -.Type.-> ReqAccept
    NotifReceived -.Type.-> AddedGroup
    
    style GetToken fill:#e1f5ff
    style ShowInApp fill:#ffe1e1
    style ShowSystem fill:#ffe1e1
    style Navigate fill:#e1ffe1
```

---

## Technology Stack Summary

```mermaid
graph LR
    subgraph "Frontend"
        RN[React Native 0.81.4]
        Expo[Expo SDK 54]
        TS[TypeScript 5.9]
        Router[Expo Router]
        Paper[React Native Paper]
        FlashList[@shopify/flash-list]
        Zustand[Zustand State]
        DateFns[date-fns]
    end
    
    subgraph "Local Storage"
        SQL[Expo SQLite]
        Async[AsyncStorage]
    end
    
    subgraph "Firebase"
        FAuth[Firebase Auth]
        FStore[Firestore]
        FStorage[Firebase Storage]
        FFCM[Firebase Cloud Messaging]
        FFunctions[Cloud Functions<br/>Future]
    end
    
    subgraph "External APIs"
        Google[Google Sign-In API]
    end
    
    subgraph "Development"
        Jest[Jest Testing]
        ESLint[ESLint]
        Prettier[Prettier]
    end
    
    RN --> Expo
    Expo --> TS
    Expo --> Router
    RN --> Paper
    RN --> FlashList
    RN --> Zustand
    RN --> DateFns
    
    RN --> SQL
    RN --> Async
    
    RN --> FAuth
    RN --> FStore
    RN --> FStorage
    RN --> FFCM
    
    FAuth --> Google
    
    style RN fill:#61dafb
    style Expo fill:#000020
    style FStore fill:#ffca28
    style FAuth fill:#ffca28
    style SQL fill:#e1f5ff
```

---

## Data Sync Strategy

```mermaid
graph TD
    subgraph "Source of Truth"
        Firestore[(Firestore<br/>Complete History)]
    end
    
    subgraph "Local Cache"
        SQLite[(SQLite<br/>200+ messages per chat<br/>Recently viewed)]
    end
    
    subgraph "In-Memory"
        RAM[RAM<br/>~40 rendered messages<br/>Active chat only]
    end
    
    Firestore -->|Background Sync| SQLite
    Firestore -->|Real-time Listener| RAM
    SQLite -->|Instant Load| RAM
    
    RAM -->|Optimistic Update| SQLite
    SQLite -->|Background Upload| Firestore
    
    RAM -.Evict old messages.-> RAM
    SQLite -.Keep minimum 200.-> SQLite
    Firestore -.Keep forever.-> Firestore
    
    style Firestore fill:#ffca28
    style SQLite fill:#e1f5ff
    style RAM fill:#e1ffe1
```

---

## Friend Request & Contact Flow

```mermaid
stateDiagram-v2
    [*] --> Searching: User searches username
    
    Searching --> Found: Username found
    Found --> SendRequest: Tap "Add Friend"
    
    SendRequest --> Pending: Request sent
    
    state Pending {
        [*] --> WaitingResponse
    }
    
    Pending --> Accepted: Recipient accepts
    Pending --> Ignored: Recipient ignores
    Pending --> Blocked: Recipient blocks
    
    Accepted --> ChatCreated: Create 1-on-1 chat
    ChatCreated --> InContacts: Both users in contacts
    
    Ignored --> [*]: Request removed
    Blocked --> [*]: Sender can't send<br/>new requests
    
    note right of SendRequest
        Creates document in
        /friendRequests/{requestId}
        status: pending
    end note
    
    note right of Accepted
        - Create chat document
        - Add to both contact lists
        - Send notification
    end note
    
    note right of Blocked
        - Add to blockedUsers collection
        - Delete any existing chat
        - Prevent future communication
    end note
    
    state InContacts {
        [*] --> CanChat
        CanChat --> Messaging: Send messages
        CanChat --> BlockUser: Block contact
        BlockUser --> Blocked2: Chat deleted for both
    }
    
    Blocked2 --> [*]
```

---

## Performance Optimization Strategy

```mermaid
flowchart TD
    Start[App Performance Goals] --> Target1[Chat opens: &lt;500ms]
    Start --> Target2[Scroll: 60fps constant]
    Start --> Target3[Jump to bottom: &lt;100ms]
    Start --> Target4[Memory: &lt;50MB per chat]
    
    Target1 --> Opt1[SQLite for instant load]
    Target2 --> Opt2[Virtual scrolling<br/>FlashList]
    Target3 --> Opt3[Direct position jump<br/>No intermediate loading]
    Target4 --> Opt4[Render only ~40 messages]
    
    Opt1 --> Tech1[Indexed queries<br/>Prepared statements]
    Opt2 --> Tech2[React.memo<br/>getItemType<br/>Proper keys]
    Opt3 --> Tech3[scrollToIndex<br/>Pre-load target messages]
    Opt4 --> Tech4[Automatic eviction<br/>Load on demand]
    
    Tech1 --> Measure[Performance Monitoring]
    Tech2 --> Measure
    Tech3 --> Measure
    Tech4 --> Measure
    
    Measure --> Test{Meets targets?}
    Test -->|No| Debug[Profile & optimize]
    Test -->|Yes| Success[✓ Performance verified]
    
    Debug --> Measure
    
    style Target1 fill:#e1ffe1
    style Target2 fill:#e1ffe1
    style Target3 fill:#e1ffe1
    style Target4 fill:#e1ffe1
    style Success fill:#e1ffe1
```

---

## Security & Privacy Architecture

```mermaid
graph TB
    subgraph "Authentication Security"
        EmailVerif[Email Verification<br/>Required before access]
        GoogleAuth[Google OAuth 2.0]
        SecureTokens[Secure token storage]
    end
    
    subgraph "Data Security"
        FirestoreRules[Firestore Security Rules<br/>User can only read/write<br/>their own data]
        StorageRules[Storage Security Rules<br/>Only authenticated users<br/>can upload]
        ValidationServer[Server-side validation<br/>Cloud Functions]
    end
    
    subgraph "Privacy Controls"
        BlockUsers[Block Users<br/>Deletes chat for both]
        FriendRequest[Friend Request System<br/>No unsolicited messages]
        AlwaysOnReceipts[Read Receipts<br/>Always on<br/>Cannot disable]
    end
    
    subgraph "Environment Security"
        EnvFile[.env file<br/>Not committed to Git]
        ExpoSecrets[EAS Secrets<br/>For production builds]
        ApiKeyRotation[API key rotation<br/>capability]
    end
    
    subgraph "Local Data Security"
        SQLiteEncrypt[SQLite encryption<br/>Future: encrypted database]
        SecureStore[Secure token storage<br/>Platform keychain]
    end
    
    EmailVerif --> FirestoreRules
    GoogleAuth --> FirestoreRules
    FirestoreRules --> ValidationServer
    StorageRules --> ValidationServer
    
    BlockUsers --> FirestoreRules
    FriendRequest --> FirestoreRules
    
    EnvFile --> ExpoSecrets
    ExpoSecrets --> ApiKeyRotation
    
    SecureTokens --> SecureStore
    SQLiteEncrypt --> SecureStore
    
    style FirestoreRules fill:#ffe1e1
    style StorageRules fill:#ffe1e1
    style BlockUsers fill:#e1ffe1
    style EnvFile fill:#fff4e1
```

---

## Deployment Pipeline

```mermaid
flowchart LR
    Dev[Development<br/>Local + Expo Go] --> Test[Testing<br/>Unit + Integration]
    
    Test --> Build{EAS Build}
    
    Build -->|iOS| TestFlight[TestFlight<br/>Internal Testing]
    Build -->|Android| PlayInternal[Play Store<br/>Internal Testing]
    
    TestFlight --> Review1[Team Review<br/>QA Testing]
    PlayInternal --> Review1
    
    Review1 -->|Pass| Beta[Beta Release]
    Review1 -->|Fail| Fix[Bug Fixes]
    Fix --> Test
    
    Beta --> Feedback[User Feedback<br/>Analytics]
    
    Feedback --> Review2{Ready for<br/>Production?}
    
    Review2 -->|Yes| Prod[Production Release]
    Review2 -->|No| Iterate[Iterate]
    Iterate --> Dev
    
    Prod -->|iOS| AppStore[App Store]
    Prod -->|Android| PlayStore[Google Play Store]
    
    AppStore --> Monitor[Monitor<br/>Crashlytics<br/>Analytics]
    PlayStore --> Monitor
    
    Monitor --> Maintain[Maintenance<br/>& Updates]
    Maintain --> Dev
    
    style Test fill:#e1f5ff
    style Beta fill:#fff4e1
    style Prod fill:#e1ffe1
    style Monitor fill:#ffe1e1
```

---

## Future: AI Translation Architecture (Post-MVP)

```mermaid
graph TB
    subgraph "Client App"
        Message[User sends message<br/>in original language]
        Display[Display both<br/>original + translation]
    end
    
    subgraph "Firebase"
        Firestore[(Firestore<br/>Original messages)]
        Functions[Cloud Functions<br/>Translation processor]
        Cache[(Translation Cache<br/>Avoid redundant API calls)]
    end
    
    subgraph "AI Services"
        OpenAI[OpenAI GPT-4]
        Claude[Anthropic Claude]
        LanguageDetect[Language Detection]
    end
    
    subgraph "Context Engine"
        RAG[RAG System<br/>Last 20 messages<br/>for context]
        CulturalHints[Cultural Context<br/>Idioms, Slang]
    end
    
    Message --> Firestore
    Firestore --> Functions
    
    Functions --> LanguageDetect
    LanguageDetect --> RAG
    RAG --> OpenAI
    RAG --> Claude
    
    Functions --> Cache
    Cache --> Functions
    
    OpenAI --> CulturalHints
    Claude --> CulturalHints
    
    CulturalHints --> Firestore
    Firestore --> Display
    
    style Functions fill:#e1ffe1
    style OpenAI fill:#ffe1e1
    style RAG fill:#e1f5ff
```

---

## Comprehensive Interaction Summary

| Component | Technology | Purpose | Connects To |
|-----------|-----------|---------|-------------|
| **UI Layer** | React Native + Expo Router | User interface | State stores, hooks |
| **State Management** | Zustand | Global state | Services, SQLite |
| **Local Database** | Expo SQLite | Offline storage, cache | All stores |
| **Firebase Auth** | Firebase Auth SDK | Authentication | Firestore, Google |
| **Firestore** | NoSQL Database | Real-time data | All Firebase services |
| **Storage** | Firebase Storage | File storage | Firestore (URLs) |
| **Notifications** | FCM | Push alerts | Firestore triggers |
| **Real-time** | Firestore Listeners | Live updates | All collections |
| **Image Handling** | Expo Image Manipulator | Compression, thumbnails | Firebase Storage |
| **Virtual Scroll** | FlashList | Performance | SQLite, State |

---

*This architecture is designed for scalability, performance, and a seamless user experience. All components work together to provide real-time messaging with robust offline support.*

