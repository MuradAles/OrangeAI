/**
 * Firebase Configuration
 * 
 * Initializes Firebase services using environment variables.
 * All Firebase credentials should be stored in .env file with EXPO_PUBLIC_ prefix.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Functions, getFunctions } from 'firebase/functions';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

// Firebase configuration from environment variables
// In Expo SDK 54+, EXPO_PUBLIC_* variables are automatically available via process.env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_DATABASE_URL,
};

// Validate Firebase configuration
const validateConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase configuration keys: ${missingKeys.join(', ')}. ` +
      'Please ensure all EXPO_PUBLIC_FIREBASE_* variables are set in your .env file and app.json extra config.'
    );
  }
};

// Validate configuration on import
validateConfig();

// Initialize Firebase App (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let storage: FirebaseStorage;
let database: Database;
let functions: Functions;

/**
 * Initialize Firebase services
 * Call this once at app startup
 */
export const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (getApps().length === 0) {
      // Initialize Firebase App
      app = initializeApp(firebaseConfig);
      
      // Initialize Auth with AsyncStorage persistence
      if (Platform.OS !== 'web') {
        try {
          // React Native specific import for persistence
          const { getReactNativePersistence } = require('firebase/auth');
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        } catch (error) {
          // Fallback if persistence not available
          console.warn('Failed to initialize auth with persistence:', error);
          auth = getAuth(app);
        }
      } else {
        auth = getAuth(app);
      }
      
      // Initialize Firestore
      // Note: React Native doesn't support persistentLocalCache (requires IndexedDB)
      // Using default cache which works for both platforms
      firestore = getFirestore(app);
      
      // Initialize Storage
      storage = getStorage(app);
      
      // Initialize Realtime Database
      database = getDatabase(app);
      
      // Initialize Cloud Functions (region must match deployment region)
      functions = getFunctions(app, 'us-central1');
      
      
    } else {
      // Use existing Firebase app
      app = getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
      storage = getStorage(app);
      database = getDatabase(app);
      functions = getFunctions(app, 'us-central1');
    }
    
    return { app, auth, firestore, storage, database, functions };
    
  } catch (error) {
    console.error('❌ Error initializing Firebase:', error);
    throw error;
  }
};

/**
 * Get Firebase services (use after initialization)
 */
export const getFirebaseServices = () => {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return { app, auth, firestore, storage, database, functions };
};

// Export Firebase services for direct import
export { app, auth, database, firestore, functions, storage };

// Export Firebase SDK modules for use in services
  export * from 'firebase/app';
    export type { User as FirebaseUser } from 'firebase/auth';
    export type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

