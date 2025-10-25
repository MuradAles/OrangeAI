/**
 * Clean logging utility for multi-user debugging
 * 
 * Format:
 * _______________
 * USER: bob
 * ACTION: Message sent
 * DETAILS: ...
 * _______________
 */

// User emoji mapping for easy visual identification
const USER_EMOJIS = ['👤', '👥', '🧑', '👨', '👩', '🧔', '👱', '🧑‍🦱', '👨‍🦰', '👩‍🦳'];

export class Logger {
  private static userEmojiMap: Map<string, string> = new Map();
  private static emojiIndex = 0;
  private static enabled = true; // Can disable logging globally
  
  /**
   * Enable/disable logging
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Get consistent emoji for a user
   */
  private static getUserEmoji(userId: string): string {
    if (!this.userEmojiMap.has(userId)) {
      this.userEmojiMap.set(userId, USER_EMOJIS[this.emojiIndex % USER_EMOJIS.length]);
      this.emojiIndex++;
    }
    return this.userEmojiMap.get(userId)!;
  }

  /**
   * Get user display string
   */
  private static getUserDisplay(userId: string, username?: string): string {
    const emoji = this.getUserEmoji(userId);
    const name = username || userId.substring(0, 8);
    return `${emoji} ${name}`;
  }
  
  /**
   * Print a clean log entry
   */
  private static log(user: string, action: string, details?: Record<string, unknown>): void {
    if (!this.enabled) return;
    
    // Logging disabled
  }

  /**
   * Message sent log
   */
  static messageSent(
    senderId: string,
    senderName: string,
    recipientIds: string[],
    recipientNames: string[],
    messagePreview: string
  ): void {
    const recipients = recipientIds.map((id, i) => this.getUserDisplay(id, recipientNames[i])).join(', ');
    this.log(
      this.getUserDisplay(senderId, senderName),
      'Message sent',
      {
        'TO': recipients,
        'MESSAGE': `"${messagePreview}"`
      }
    );
  }

  /**
   * Push notification status
   */
  static pushNotification(
    senderId: string,
    senderName: string,
    recipientTokens: { userId: string; username: string; hasToken: boolean }[],
    success: boolean,
    error?: string
  ): void {
    const recipientsWithToken = recipientTokens.filter(r => r.hasToken);
    const recipientsWithoutToken = recipientTokens.filter(r => !r.hasToken);
    
    const details: Record<string, unknown> = {
      'RECIPIENTS': `${recipientTokens.length} total`,
    };
    
    if (recipientsWithToken.length > 0) {
      details['✅ WITH TOKEN'] = recipientsWithToken.map(r => this.getUserDisplay(r.userId, r.username)).join(', ');
    }
    
    if (recipientsWithoutToken.length > 0) {
      details['⚠️  NO TOKEN'] = recipientsWithoutToken.map(r => this.getUserDisplay(r.userId, r.username)).join(', ') + ' (emulator/not signed in)';
    }
    
    details['STATUS'] = success ? '✅ SENT' : '❌ FAILED';
    if (error) details['ERROR'] = error;
    
    this.log(
      this.getUserDisplay(senderId, senderName),
      'Push notification',
      details
    );
  }

  /**
   * Message received log
   */
  static messageReceived(
    recipientId: string,
    recipientName: string,
    senderId: string,
    senderName: string,
    messagePreview: string
  ): void {
    this.log(
      this.getUserDisplay(recipientId, recipientName),
      'Message received',
      {
        'FROM': this.getUserDisplay(senderId, senderName),
        'MESSAGE': `"${messagePreview}"`
      }
    );
  }

  /**
   * FCM token registration
   */
  static fcmTokenRegistered(
    userId: string,
    username: string,
    displayName: string,
    token: string,
    deviceType: string
  ): void {
    this.log(
      this.getUserDisplay(userId, username),
      'FCM token registered',
      {
        'DISPLAY NAME': displayName,
        'DEVICE': deviceType,
        'TOKEN': token.substring(0, 30) + '...',
        'STATUS': '✅ Can receive push notifications'
      }
    );
  }

  /**
   * User sign in
   */
  static userSignIn(userId: string, username: string, displayName: string): void {
    this.log(
      this.getUserDisplay(userId, username),
      '🔓 Signed in',
      { 'DISPLAY NAME': displayName }
    );
  }

  /**
   * User sign out
   */
  static userSignOut(userId: string, username: string): void {
    this.log(
      this.getUserDisplay(userId, username),
      '🔒 Signed out'
    );
  }

  /**
   * Chat opened
   */
  static chatOpened(userId: string, username: string, chatId: string, otherUser?: string): void {
    const details: Record<string, unknown> = {
      'CHAT ID': chatId.substring(0, 12) + '...'
    };
    if (otherUser) details['WITH'] = otherUser;
    
    this.log(
      this.getUserDisplay(userId, username),
      'Opened chat',
      details
    );
  }

  /**
   * Generic info log with user context
   */
  static info(userId: string, username: string, message: string, data?: Record<string, unknown>): void {
    this.log(
      this.getUserDisplay(userId, username),
      message,
      data
    );
  }

  /**
   * Warning log with user context
   */
  static warn(userId: string, username: string, message: string, data?: Record<string, unknown>): void {
    this.log(
      this.getUserDisplay(userId, username),
      `⚠️  ${message}`,
      data
    );
  }

  /**
   * Error log with user context
   */
  static error(userId: string, username: string, message: string, error?: unknown): void {
    this.log(
      this.getUserDisplay(userId, username),
      `❌ ${message}`,
      error ? { 'ERROR': String(error) } : undefined
    );
  }

  /**
   * Clear user emoji mapping (useful for testing)
   */
  static clearUserMapping(): void {
    this.userEmojiMap.clear();
    this.emojiIndex = 0;
  }

  /**
   * Show current user mapping (all active users)
   */
  static showUserMapping(): void {
    if (!this.enabled) return;
    
    // Logging disabled
  }
}

