// Simplified UserService tests focusing on behavior
import { UserService } from '@/services/firebase/UserService';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('@/services/firebase/FirebaseConfig', () => ({
  firestore: {},
}));

// Use actual UserService implementation
jest.mock('@/services/firebase/UserService', () => {
  const actual = jest.requireActual('@/services/firebase/UserService');
  return actual;
});

describe('UserService - Validation', () => {
  describe('validateUsername', () => {
    it('should validate valid usernames', () => {
      expect(UserService.validateUsername('testuser').isValid).toBe(true);
      expect(UserService.validateUsername('test123').isValid).toBe(true);
      expect(UserService.validateUsername('test_user').isValid).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(UserService.validateUsername('ab').isValid).toBe(false); // Too short
      expect(UserService.validateUsername('ThisHasUpperCase').isValid).toBe(false); // Has uppercase
      expect(UserService.validateUsername('test user').isValid).toBe(false); // Has space
      expect(UserService.validateUsername('test@user').isValid).toBe(false); // Has special char
      expect(UserService.validateUsername('123test').isValid).toBe(false); // Starts with number
    });
  });

  describe('validateDisplayName', () => {
    it('should validate valid display names', () => {
      expect(UserService.validateDisplayName('John Doe').isValid).toBe(true);
      expect(UserService.validateDisplayName('AB').isValid).toBe(true); // Min 2 chars
    });

    it('should reject invalid display names', () => {
      expect(UserService.validateDisplayName('J').isValid).toBe(false); // Too short
      expect(UserService.validateDisplayName('A'.repeat(51)).isValid).toBe(false); // Too long
      expect(UserService.validateDisplayName('').isValid).toBe(false); // Empty
    });
  });

  describe('validateBio', () => {
    it('should validate valid bios', () => {
      expect(UserService.validateBio('')).toBe(true); // Optional
      expect(UserService.validateBio('Short bio')).toBe(true);
      expect(UserService.validateBio('A'.repeat(200))).toBe(true); // Max length
    });

    it('should reject invalid bios', () => {
      expect(UserService.validateBio('A'.repeat(201))).toBe(false); // Too long
    });
  });
});

