// Set up environment variables for tests
process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
process.env.EXPO_PUBLIC_DATABASE_URL = 'https://test.firebasedatabase.app';

// Mock import.meta for Expo winter runtime
global.__ExpoImportMetaRegistry = {
  entries: new Map(),
  set: function(key, value) {
    this.entries.set(key, value);
  },
  get: function(key) {
    return this.entries.get(key);
  },
  has: function(key) {
    return this.entries.has(key);
  }
};

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock Expo winter runtime completely - MUST BE BEFORE OTHER MOCKS
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
}));

// Mock expo-file-system (full module)
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 5000000 })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock React Native (without requiring actual module to avoid turbo module errors)
jest.mock('react-native', () => {
  const React = require('react');
  
  // Mock TouchableOpacity to respect disabled prop
  const MockTouchableOpacity = (props) => {
    const { onPress, disabled, children, ...rest } = props;
    
    // Wrap onPress to check disabled state
    const handlePress = (event) => {
      if (!disabled && onPress) {
        onPress(event);
      }
    };
    
    return React.createElement(
      'TouchableOpacity',
      {
        ...rest,
        onPress: handlePress,
        disabled,
      },
      children
    );
  };
  
  return {
    Platform: {
      OS: 'ios',
      Version: 123,
      select: jest.fn((obj) => obj.ios || obj.default),
      isTV: false,
      isTesting: true,
    },
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
      flatten: jest.fn((style) => style),
      hairlineWidth: 1,
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    Image: 'Image',
    TouchableOpacity: MockTouchableOpacity,
    Pressable: 'Pressable',
    FlatList: 'FlatList',
    Modal: 'Modal',
    ActivityIndicator: 'ActivityIndicator',
    Clipboard: {
      setString: jest.fn(),
      getString: jest.fn(() => Promise.resolve('')),
    },
  };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
}));

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => {
  const mockAuth = { currentUser: { uid: 'test-user' } };
  return {
    getAuth: jest.fn(() => mockAuth),
    signInWithEmailAndPassword: jest.fn((auth) => Promise.resolve({ user: {} })),
    createUserWithEmailAndPassword: jest.fn((auth) => Promise.resolve({ user: {} })),
    signOut: jest.fn((auth) => Promise.resolve()),
    onAuthStateChanged: jest.fn(),
    sendEmailVerification: jest.fn(),
    sendPasswordResetEmail: jest.fn((auth) => Promise.resolve()),
  };
});

jest.mock('firebase/firestore', () => {
  const mockAuth = { currentUser: { uid: 'test-user' } };
  return {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn(),
    doc: jest.fn(() => ({})),
    getDoc: jest.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({}),
      id: 'mock-id'
    })),
    getDocs: jest.fn(() => Promise.resolve({ 
      docs: [],
      forEach: function(callback) {
        this.docs.forEach(callback);
      }
    })),
    setDoc: jest.fn(() => Promise.resolve()),
    updateDoc: jest.fn(() => Promise.resolve()),
    deleteDoc: jest.fn(() => Promise.resolve()),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    onSnapshot: jest.fn(),
    writeBatch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve())
    })),
    serverTimestamp: jest.fn(() => Date.now()),
    addDoc: jest.fn(() => Promise.resolve({ id: 'mock-message-id' })),
    arrayUnion: jest.fn((...values) => ({ _methodName: 'arrayUnion', _elements: values })),
    arrayRemove: jest.fn((...values) => ({ _methodName: 'arrayRemove', _elements: values })),
  };
});

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(() => ({})),
  set: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
  onValue: jest.fn((ref, callback) => {
    // Return unsubscribe function
    return jest.fn();
  }),
  onDisconnect: jest.fn(() => ({
    set: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
  })),
  serverTimestamp: jest.fn(() => Date.now()),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(),
    runSync: jest.fn(),
  })),
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      const tx = {
        executeSql: jest.fn((sql, params, success) => {
          if (success) success(tx, { rows: { length: 0, item: () => ({}) } });
        }),
      };
      callback(tx);
    }),
    readTransaction: jest.fn((callback) => {
      const tx = {
        executeSql: jest.fn((sql, params, success) => {
          if (success) success(tx, { rows: { length: 0, item: () => ({}) } });
        }),
      };
      callback(tx);
    }),
    close: jest.fn(),
  })),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      EXPO_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
      EXPO_PUBLIC_DATABASE_URL: 'https://test.firebasedatabase.app'
    }
  }
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  manufacturer: 'Apple',
  modelName: 'iPhone 13',
  osName: 'iOS',
  osVersion: '15.0',
  deviceName: 'Test iPhone',
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[mock-token]' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
  setString: jest.fn(),
  getString: jest.fn(),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock expo-file-system
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock services
jest.mock('./src/database/SQLiteService', () => ({
  SQLiteService: {
    initialize: jest.fn(() => Promise.resolve()),
    saveMessage: jest.fn(() => Promise.resolve()),
    updateMessage: jest.fn(() => Promise.resolve()),
    updateMessageStatus: jest.fn(() => Promise.resolve()),
    deleteMessage: jest.fn(() => Promise.resolve()),
    deleteMessageForMe: jest.fn(() => Promise.resolve()),
    getMessages: jest.fn(() => Promise.resolve([])),
    getMessageById: jest.fn(() => Promise.resolve(null)),
    getPendingMessages: jest.fn(() => Promise.resolve([])),
    saveUser: jest.fn(() => Promise.resolve()),
    getUser: jest.fn(() => Promise.resolve(null)),
    getUserById: jest.fn(() => Promise.resolve(null)),
    saveChat: jest.fn(() => Promise.resolve()),
    getChat: jest.fn(() => Promise.resolve(null)),
    getChatById: jest.fn(() => Promise.resolve(null)),
    getChats: jest.fn(() => Promise.resolve([])),
    updateChat: jest.fn(() => Promise.resolve()),
    deleteChat: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
    getScrollPosition: jest.fn(() => Promise.resolve(null)),
    saveScrollPosition: jest.fn(() => Promise.resolve()),
    transaction: jest.fn(() => Promise.resolve()),
    clearAll: jest.fn(() => Promise.resolve()),
  }
}));

jest.mock('./src/services/firebase/UserService', () => ({
  UserService: {
    createProfile: jest.fn(() => Promise.resolve()),
    getProfile: jest.fn(() => Promise.resolve(null)),
    updateProfile: jest.fn(() => Promise.resolve()),
    checkUsernameAvailability: jest.fn(() => Promise.resolve(true)),
    searchByUsername: jest.fn(() => Promise.resolve([])),
    getUserByUsername: jest.fn(() => Promise.resolve(null)),
    getContacts: jest.fn(() => Promise.resolve([])),
    updateOnlineStatus: jest.fn(() => Promise.resolve()),
    updateActiveChatId: jest.fn(() => Promise.resolve()),
    // Aliases
    getUserById: jest.fn(() => Promise.resolve(null)),
    createUserProfile: jest.fn(() => Promise.resolve()),
    updateUserProfile: jest.fn(() => Promise.resolve()),
    searchUsers: jest.fn(() => Promise.resolve([])),
    deleteUserProfile: jest.fn(() => Promise.resolve()),
    validateUsername: jest.fn(() => true),
    validateDisplayName: jest.fn(() => true),
    validateBio: jest.fn(() => true),
  }
}));

// Mock global fetch for tests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock ThemeContext
jest.mock('@/shared/context/ThemeContext', () => {
  const React = require('react');
  const mockTheme = {
    colors: {
      primary: '#4A90E2',
      secondary: '#7B68EE',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#1A1A1A',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      borderFocus: '#4A90E2',
      error: '#F44336',
      online: '#4CAF50',
      offline: '#999999',
      backgroundInput: '#F5F5F5',
      // Button colors
      buttonPrimary: '#4A90E2',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondary: '#7B68EE',
      buttonSecondaryText: '#FFFFFF',
      buttonDisabled: '#CCCCCC',
      buttonDisabledText: '#999999',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    typography: {
      fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
      },
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
      },
      // Button typography
      button: {
        fontSize: 16,
        fontWeight: '600',
      },
      buttonSmall: {
        fontSize: 14,
        fontWeight: '600',
      },
      buttonLarge: {
        fontSize: 18,
        fontWeight: '600',
      },
      // Input typography
      input: {
        fontSize: 16,
      },
      label: {
        fontSize: 14,
        fontWeight: '500',
      },
      caption: {
        fontSize: 12,
      },
    },
    borders: {
      radius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 9999,
      },
    },
    // Component-specific styles
    componentShadows: {
      button: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    },
    componentSpacing: {
      // Button spacing
      buttonPadding: 12,
      buttonPaddingSmall: 8,
      buttonPaddingLarge: 16,
      buttonGap: 8,
      // Input spacing
      inputPadding: 12,
      inputLabelGap: 8,
      // Avatar sizes
      avatarSizeSmall: 32,
      avatarSizeMedium: 48,
      avatarSizeLarge: 64,
      avatarSizeXLarge: 96,
    },
    componentBorderWidth: {
      button: 1,
      input: 1,
      inputFocused: 2,
    },
    componentBorderRadius: {
      button: 8,
      input: 8,
    },
    innerShadow: {},
    fontWeight: {
      semiBold: '600',
    },
    getAvatarColor: jest.fn((name) => '#4A90E2'),
  };

  return {
    ThemeProvider: ({ children }) => React.createElement(React.Fragment, {}, children),
    useThemeContext: () => ({
      theme: mockTheme,
      themeMode: 'light',
      setThemeMode: jest.fn(),
      isDark: false,
    }),
  };
});

// Mock useTheme hook
jest.mock('@/shared/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4A90E2',
      secondary: '#7B68EE',
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#1A1A1A',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      borderFocus: '#4A90E2',
      error: '#F44336',
      online: '#4CAF50',
      offline: '#999999',
      backgroundInput: '#F5F5F5',
      // Button colors
      buttonPrimary: '#4A90E2',
      buttonPrimaryText: '#FFFFFF',
      buttonSecondary: '#7B68EE',
      buttonSecondaryText: '#FFFFFF',
      buttonDisabled: '#CCCCCC',
      buttonDisabledText: '#999999',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    typography: {
      fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
      },
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
      },
      // Button typography
      button: {
        fontSize: 16,
        fontWeight: '600',
      },
      buttonSmall: {
        fontSize: 14,
        fontWeight: '600',
      },
      buttonLarge: {
        fontSize: 18,
        fontWeight: '600',
      },
      // Input typography
      input: {
        fontSize: 16,
      },
      label: {
        fontSize: 14,
        fontWeight: '500',
      },
      caption: {
        fontSize: 12,
      },
    },
    borders: {
      radius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 9999,
      },
    },
    // Component-specific styles
    componentShadows: {
      button: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    },
    componentSpacing: {
      // Button spacing
      buttonPadding: 12,
      buttonPaddingSmall: 8,
      buttonPaddingLarge: 16,
      buttonGap: 8,
      // Input spacing
      inputPadding: 12,
      inputLabelGap: 8,
      // Avatar sizes
      avatarSizeSmall: 32,
      avatarSizeMedium: 48,
      avatarSizeLarge: 64,
      avatarSizeXLarge: 96,
    },
    componentBorderWidth: {
      button: 1,
      input: 1,
      inputFocused: 2,
    },
    componentBorderRadius: {
      button: 8,
      input: 8,
    },
    innerShadow: {},
    fontWeight: {
      semiBold: '600',
    },
    getAvatarColor: jest.fn((name) => '#4A90E2'),
  }),
  useThemeColorScheme: () => 'light',
  useThemeMode: () => ({
    themeMode: 'light',
    setThemeMode: jest.fn(),
  }),
}));

