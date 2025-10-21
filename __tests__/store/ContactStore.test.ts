/**
 * ContactStore Tests
 * 
 * Tests contact and friend request state management
 */

import { FriendRequestService, UserService } from '@/services/firebase';
import { useContactStore } from '@/store/ContactStore';

jest.mock('@/services/firebase');

describe('ContactStore', () => {
  beforeEach(() => {
    // Reset store state
    useContactStore.setState({
      contacts: [],
      contactsLoading: false,
      contactsError: null,
      friendRequests: [],
      friendRequestsLoading: false,
      friendRequestsError: null,
      sentRequests: [],
      sentRequestsLoading: false,
      blockedUsers: [],
      blockedUsersLoading: false,
      searchResults: [],
      searchLoading: false,
      searchError: null,
      friendRequestsUnsubscribe: null,
      sentRequestsUnsubscribe: null,
    });
    jest.clearAllMocks();
  });

  describe('loadContacts', () => {
    it('should load user contacts', async () => {
      const mockContacts = [
        { userId: 'user-1', displayName: 'User One', addedAt: Date.now() },
        { userId: 'user-2', displayName: 'User Two', addedAt: Date.now() }
      ];

      (UserService.getContacts as jest.Mock).mockResolvedValue(mockContacts);

      const { loadContacts } = useContactStore.getState();
      await loadContacts('current-user');

      const state = useContactStore.getState();
      expect(state.contacts).toEqual(mockContacts);
      expect(state.contactsLoading).toBe(false);
    });

    it('should set error if loading contacts fails', async () => {
      (UserService.getContacts as jest.Mock).mockRejectedValue(
        new Error('Failed to load contacts')
      );

      const { loadContacts } = useContactStore.getState();
      await loadContacts('current-user');

      const state = useContactStore.getState();
      expect(state.contactsError).toBe('Failed to load contacts');
      expect(state.contactsLoading).toBe(false);
    });
  });

  describe('sendFriendRequest', () => {
    it('should send friend request and add optimistic update', async () => {
      (FriendRequestService.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: true,
        requestId: 'req-123'
      });

      const { sendFriendRequest } = useContactStore.getState();
      const result = await sendFriendRequest('user-1', 'user-2');

      expect(result.success).toBe(true);
      
      // Check optimistic update was added
      const state = useContactStore.getState();
      expect(state.sentRequests.length).toBeGreaterThan(0);
      expect(state.sentRequests[0].toUserId).toBe('user-2');
    });

    it('should not add optimistic update if request fails', async () => {
      (FriendRequestService.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User not found'
      });

      const { sendFriendRequest } = useContactStore.getState();
      await sendFriendRequest('user-1', 'nonexistent-user');

      const state = useContactStore.getState();
      expect(state.sentRequests).toHaveLength(0);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request and reload contacts', async () => {
      const mockContacts = [
        { userId: 'user-2', displayName: 'New Friend', addedAt: Date.now() }
      ];

      useContactStore.setState({
        friendRequests: [{
          id: 'req-123',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          status: 'pending',
          createdAt: Date.now()
        }]
      });

      (FriendRequestService.acceptFriendRequest as jest.Mock).mockResolvedValue({
        success: true
      });
      (UserService.getContacts as jest.Mock).mockResolvedValue(mockContacts);

      const { acceptFriendRequest } = useContactStore.getState();
      const result = await acceptFriendRequest('req-123', 'user-1');

      expect(result.success).toBe(true);
      
      // Should remove from friend requests (optimistic update)
      const state = useContactStore.getState();
      expect(state.friendRequests).toHaveLength(0);
    });
  });

  describe('ignoreFriendRequest', () => {
    it('should ignore friend request and remove from list', async () => {
      useContactStore.setState({
        friendRequests: [{
          id: 'req-123',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          status: 'pending',
          createdAt: Date.now()
        }]
      });

      (FriendRequestService.ignoreFriendRequest as jest.Mock).mockResolvedValue({
        success: true
      });

      const { ignoreFriendRequest } = useContactStore.getState();
      const result = await ignoreFriendRequest('req-123', 'user-1');

      expect(result.success).toBe(true);

      // Should be removed from list
      const state = useContactStore.getState();
      expect(state.friendRequests).toHaveLength(0);
    });
  });

  describe('cancelFriendRequest', () => {
    it('should cancel sent friend request', async () => {
      useContactStore.setState({
        sentRequests: [{
          id: 'req-123',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          status: 'pending',
          createdAt: Date.now()
        }]
      });

      (FriendRequestService.cancelFriendRequest as jest.Mock).mockResolvedValue({
        success: true
      });

      const { cancelFriendRequest } = useContactStore.getState();
      const result = await cancelFriendRequest('req-123', 'user-1');

      expect(result.success).toBe(true);

      // Should be removed from list
      const state = useContactStore.getState();
      expect(state.sentRequests).toHaveLength(0);
    });
  });

  describe('searchUsers', () => {
    it('should search users by username', async () => {
      const mockResults = [
        { id: 'user-1', username: 'john', displayName: 'John Doe', email: 'john@example.com' },
        { id: 'user-2', username: 'johnny', displayName: 'Johnny Smith', email: 'johnny@example.com' }
      ];

      (UserService.searchByUsername as jest.Mock).mockResolvedValue(mockResults);

      const { searchUsers } = useContactStore.getState();
      await searchUsers('john');

      const state = useContactStore.getState();
      expect(state.searchResults).toEqual(mockResults);
      expect(state.searchLoading).toBe(false);
    });

    it('should clear results for short search terms', async () => {
      const { searchUsers } = useContactStore.getState();
      await searchUsers('j'); // Less than 2 characters

      const state = useContactStore.getState();
      expect(state.searchResults).toHaveLength(0);
    });

    it('should set error if search fails', async () => {
      (UserService.searchByUsername as jest.Mock).mockRejectedValue(
        new Error('Search failed')
      );

      const { searchUsers } = useContactStore.getState();
      await searchUsers('john');

      const state = useContactStore.getState();
      expect(state.searchError).toBe('Search failed');
    });
  });

  describe('utility methods', () => {
    it('isContact should return true for existing contacts', () => {
      useContactStore.setState({
        contacts: [
          { userId: 'user-2', displayName: 'Contact', addedAt: Date.now() }
        ]
      });

      const { isContact } = useContactStore.getState();
      expect(isContact('user-2')).toBe(true);
      expect(isContact('user-3')).toBe(false);
    });

    it('hasPendingRequest should check incoming requests', () => {
      useContactStore.setState({
        friendRequests: [{
          id: 'req-123',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          status: 'pending',
          createdAt: Date.now()
        }]
      });

      const { hasPendingRequest } = useContactStore.getState();
      expect(hasPendingRequest('user-2')).toBe(true);
      expect(hasPendingRequest('user-3')).toBe(false);
    });

    it('hasSentRequest should check outgoing requests', () => {
      useContactStore.setState({
        sentRequests: [{
          id: 'req-123',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          status: 'pending',
          createdAt: Date.now()
        }]
      });

      const { hasSentRequest } = useContactStore.getState();
      expect(hasSentRequest('user-2')).toBe(true);
      expect(hasSentRequest('user-3')).toBe(false);
    });
  });
});

