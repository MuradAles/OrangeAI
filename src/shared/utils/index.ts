/**
 * Shared Utilities Barrel Export
 * 
 * Central export point for all utility functions
 */

export * from './Logger';
export * from './ProfilePictureGenerator';
export * from './Validation';

/**
 * Generate a random invite code for groups
 * Format: 6 uppercase alphanumeric characters
 * Example: "A3K9XZ"
 */
export function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}


