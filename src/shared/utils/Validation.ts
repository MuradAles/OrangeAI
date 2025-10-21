/**
 * Validation Utilities
 * 
 * Common validation functions for forms and inputs
 */

/**
 * Validate email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (
  password: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate username format
 */
export const validateUsername = (
  username: string
): { isValid: boolean; error?: string } => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { isValid: false, error: 'Username must be less than 20 characters' };
  }

  // Only lowercase letters, numbers, and underscores
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(trimmed.toLowerCase())) {
    return {
      isValid: false,
      error: 'Username can only contain lowercase letters, numbers, and underscores',
    };
  }

  // Cannot start with a number
  if (/^\d/.test(trimmed)) {
    return { isValid: false, error: 'Username cannot start with a number' };
  }

  return { isValid: true };
};

/**
 * Validate display name
 */
export const validateDisplayName = (
  displayName: string
): { isValid: boolean; error?: string } => {
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, error: 'Display name is required' };
  }

  const trimmed = displayName.trim();

  if (trimmed.length < 1) {
    return { isValid: false, error: 'Display name is required' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Display name must be less than 50 characters' };
  }

  return { isValid: true };
};

/**
 * Validate message text length
 */
export const validateMessageText = (
  text: string
): { isValid: boolean; error?: string } => {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (text.length > 4096) {
    return { isValid: false, error: 'Message cannot exceed 4,096 characters' };
  }

  return { isValid: true };
};

/**
 * Validate image caption length
 */
export const validateImageCaption = (
  caption: string
): { isValid: boolean; error?: string } => {
  if (caption.length > 1024) {
    return { isValid: false, error: 'Caption cannot exceed 1,024 characters' };
  }

  return { isValid: true };
};


