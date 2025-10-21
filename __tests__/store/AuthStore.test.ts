/**
 * AuthStore Tests
 * 
 * Tests authentication state management
 */

import { AuthService } from '@/services/firebase/AuthService';

import { UserService } from '@/services/firebase/UserService';
import { useAuthStore } from '@/store/AuthStore';

jest.mock('@/services/firebase/AuthService');
jest.mock('@/services/firebase/UserService', () => ({
  UserService: {
    getUserById: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
  }
}));

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      firebaseUser: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };

      (AuthService.validateEmail as jest.Mock).mockReturnValue(true);
      (AuthService.validatePassword as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (AuthService.signUpWithEmail as jest.Mock).mockResolvedValue(mockFirebaseUser);

      const { signUp } = useAuthStore.getState();
      await signUp('test@example.com', 'Password123!');

      const state = useAuthStore.getState();
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on sign up failure', async () => {
      (AuthService.validateEmail as jest.Mock).mockReturnValue(true);
      (AuthService.validatePassword as jest.Mock).mockReturnValue({ isValid: true, errors: [] });
      (AuthService.signUpWithEmail as jest.Mock).mockRejectedValue(
        new Error('Email already in use')
      );

      const { signUp } = useAuthStore.getState();
      
      await expect(
        signUp('existing@example.com', 'Password123!')
      ).rejects.toThrow('Email already in use');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Email already in use');
      expect(state.isLoading).toBe(false);
    });

    it('should validate email format before sign up', async () => {
      (AuthService.validateEmail as jest.Mock).mockReturnValue(false);

      const { signUp } = useAuthStore.getState();

      await expect(
        signUp('invalid-email', 'Password123!')
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate password before sign up', async () => {
      (AuthService.validateEmail as jest.Mock).mockReturnValue(true);
      (AuthService.validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password too weak']
      });

      const { signUp } = useAuthStore.getState();

      await expect(
        signUp('test@example.com', 'weak')
      ).rejects.toThrow('Password too weak');
    });
  });

  describe('signIn', () => {
    it('should successfully sign in existing user', async () => {
      const mockFirebaseUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };

      const mockUserProfile = {
        id: 'test-uid-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      };

      (AuthService.signInWithEmail as jest.Mock).mockResolvedValue(mockFirebaseUser);
      (UserService.getProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      const { signIn } = useAuthStore.getState();
      await signIn('test@example.com', 'Password123!');

      const state = useAuthStore.getState();
      expect(state.firebaseUser).toEqual(mockFirebaseUser);
      expect(state.user).toEqual(mockUserProfile);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should set error on sign in failure', async () => {
      (AuthService.signInWithEmail as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { signIn } = useAuthStore.getState();

      await expect(
        signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear all state on sign out', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: 'user-123', username: 'test', displayName: 'Test', email: 'test@example.com' },
        firebaseUser: { uid: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      (AuthService.signOut as jest.Mock).mockResolvedValue(undefined);

      const { signOut } = useAuthStore.getState();
      await signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.firebaseUser).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('loadUserProfile', () => {
    it('should load user profile from Firestore', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
      };

      (UserService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      const { loadUserProfile } = useAuthStore.getState();
      await loadUserProfile('user-123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockProfile);
    });

    it('should set user to null if profile not found', async () => {
      (UserService.getProfile as jest.Mock).mockResolvedValue(null);

      const { loadUserProfile } = useAuthStore.getState();
      await loadUserProfile('nonexistent-id');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile', async () => {
      const initialProfile = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Old Name',
        email: 'test@example.com',
      };

      useAuthStore.setState({ user: initialProfile });

      (UserService.updateProfile as jest.Mock).mockResolvedValue(undefined);

      const { updateUserProfile } = useAuthStore.getState();
      await updateUserProfile({ displayName: 'New Name' });

      const state = useAuthStore.getState();
      expect(state.user?.displayName).toBe('New Name');
    });
  });
});

