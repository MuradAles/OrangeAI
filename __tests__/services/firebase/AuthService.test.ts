/**
 * AuthService Tests
 * 
 * Tests authentication flows including sign up, sign in, and sign out
 */

import { AuthService } from '@/services/firebase/AuthService';
import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUpWithEmail', () => {
    it('should successfully create a new user', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };

      (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      const result = await AuthService.signUpWithEmail('test@example.com', 'Password123!');

      expect(result).toEqual(mockUser);
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    });

    it('should throw error for existing email', async () => {
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
        code: 'auth/email-already-in-use',
        message: 'Email already in use',
      });

      await expect(
        AuthService.signUpWithEmail('existing@example.com', 'Password123!')
      ).rejects.toThrow();
    });

    it('should throw error for weak password', async () => {
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue({
        code: 'auth/weak-password',
        message: 'Password is too weak',
      });

      await expect(
        AuthService.signUpWithEmail('test@example.com', 'weak')
      ).rejects.toThrow();
    });
  });

  describe('signInWithEmail', () => {
    it('should successfully sign in existing user', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
      };

      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
        user: mockUser,
      });

      const result = await AuthService.signInWithEmail('test@example.com', 'Password123!');

      expect(result).toEqual(mockUser);
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
        code: 'auth/invalid-credential',
        message: 'Invalid credentials',
      });

      await expect(
        AuthService.signInWithEmail('test@example.com', 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should throw error for user not found', async () => {
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });

      await expect(
        AuthService.signInWithEmail('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      (signOut as jest.Mock).mockResolvedValue(undefined);

      await AuthService.signOut();

      expect(signOut).toHaveBeenCalled();
    });

    it('should throw error if sign out fails', async () => {
      (signOut as jest.Mock).mockRejectedValue(new Error('Sign out failed'));

      await expect(AuthService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      await AuthService.resetPassword('test@example.com');

      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should throw error for invalid email', async () => {
      (sendPasswordResetEmail as jest.Mock).mockRejectedValue({
        code: 'auth/invalid-email',
        message: 'Invalid email',
      });

      await expect(
        AuthService.resetPassword('invalid-email')
      ).rejects.toThrow();
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      expect(AuthService.validateEmail('test@example.com')).toBe(true);
      expect(AuthService.validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(AuthService.validateEmail('notanemail')).toBe(false);
      expect(AuthService.validateEmail('@example.com')).toBe(false);
      expect(AuthService.validateEmail('test@')).toBe(false);
      expect(AuthService.validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate password with 6+ characters', () => {
      const result = AuthService.validatePassword('pass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate strong password', () => {
      const result = AuthService.validatePassword('StrongPass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 6 characters', () => {
      const result = AuthService.validatePassword('12345');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters');
    });

    it('should reject password longer than 128 characters', () => {
      const result = AuthService.validatePassword('a'.repeat(129));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    it('should accept passwords between 6 and 128 characters', () => {
      const result = AuthService.validatePassword('validPassword123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

