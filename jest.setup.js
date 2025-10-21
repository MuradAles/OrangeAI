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

// Mock Expo winter runtime completely
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });

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
    getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
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

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
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
    saveMessage: jest.fn(() => Promise.resolve()),
    updateMessage: jest.fn(() => Promise.resolve()),
    deleteMessage: jest.fn(() => Promise.resolve()),
    getMessages: jest.fn(() => Promise.resolve([])),
    getMessageById: jest.fn(() => Promise.resolve(null)),
    saveUser: jest.fn(() => Promise.resolve()),
  }
}));

jest.mock('./src/services/firebase/UserService', () => ({
  UserService: {
    getUserById: jest.fn(() => Promise.resolve(null)),
    getProfile: jest.fn(() => Promise.resolve(null)),
    updateUser: jest.fn(() => Promise.resolve()),
    updateProfile: jest.fn(() => Promise.resolve()),
    searchByUsername: jest.fn(() => Promise.resolve([])),
    getContacts: jest.fn(() => Promise.resolve([])),
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

