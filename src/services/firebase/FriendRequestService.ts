/**
 * Friend Request Service
 * 
 * Handles friend request operations in Firestore
 */

import { FriendRequest } from '@/shared/types';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    Unsubscribe,
    where,
    writeBatch
} from 'firebase/firestore';
import { firestore } from './FirebaseConfig';
import { UserService } from './UserService';

/**
 * Friend Request Service
 */
export class FriendRequestService {
  private static readonly FRIEND_REQUESTS_COLLECTION = 'friendRequests';
  private static readonly USERS_COLLECTION = 'users';
  private static readonly CHATS_COLLECTION = 'chats';

  /**
   * Send a friend request
   */
  static async sendFriendRequest(
    fromUserId: string,
    toUserId: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Validate inputs
      if (!fromUserId || !toUserId) {
        return { success: false, error: 'Invalid user IDs' };
      }

      if (fromUserId === toUserId) {
        return { success: false, error: 'Cannot send friend request to yourself' };
      }

      // Check if recipient exists
      const recipientProfile = await UserService.getProfile(toUserId);
      if (!recipientProfile) {
        return { success: false, error: 'User not found' };
      }

      // Check if request already exists
      const existingRequest = await this.getExistingRequest(fromUserId, toUserId);
      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return { success: false, error: 'Friend request already sent' };
        }
        if (existingRequest.status === 'accepted') {
          return { success: false, error: 'Already friends' };
        }
      }

      // Check reverse request (if recipient already sent request to sender)
      const reverseRequest = await this.getExistingRequest(toUserId, fromUserId);
      if (reverseRequest && reverseRequest.status === 'pending') {
        // Auto-accept the reverse request instead of creating a new one
        await this.acceptFriendRequest(reverseRequest.id, toUserId);
        return { 
          success: true, 
          requestId: reverseRequest.id,
          error: 'Friend request accepted automatically'
        };
      }

      // Create friend request
      const requestRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const requestData = {
        fromUserId,
        toUserId,
        status: 'pending' as const,
        createdAt: Date.now(),
        respondedAt: null,
      };

      const docRef = await addDoc(requestRef, requestData);

      return { success: true, requestId: docRef.id };
    } catch (error: any) {
      console.error('❌ Failed to send friend request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; chatId?: string; error?: string }> {
    try {
      // Get friend request
      const requestRef = doc(firestore, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        return { success: false, error: 'Friend request not found' };
      }

      const requestData = requestSnap.data();

      // Verify user is the recipient
      if (requestData.toUserId !== userId) {
        return { success: false, error: 'Unauthorized to accept this request' };
      }

      // Verify request is pending
      if (requestData.status !== 'pending') {
        return { success: false, error: 'Friend request is no longer pending' };
      }

      const batch = writeBatch(firestore);

      // Delete the friend request (no longer needed once accepted)
      batch.delete(requestRef);

      // Add to each user's contacts subcollection
      // NOTE: Chat will be created when first message is sent
      const fromUserContactRef = doc(
        firestore,
        this.USERS_COLLECTION,
        requestData.toUserId,
        'contacts',
        requestData.fromUserId
      );

      const toUserContactRef = doc(
        firestore,
        this.USERS_COLLECTION,
        requestData.fromUserId,
        'contacts',
        requestData.toUserId
      );

      batch.set(fromUserContactRef, {
        userId: requestData.fromUserId,
        addedAt: Date.now(),
      });

      batch.set(toUserContactRef, {
        userId: requestData.toUserId,
        addedAt: Date.now(),
      });

      // Commit all changes
      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to accept friend request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ignore/decline a friend request
   */
  static async ignoreFriendRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get friend request
      const requestRef = doc(firestore, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        return { success: false, error: 'Friend request not found' };
      }

      const requestData = requestSnap.data();

      // Verify user is the recipient
      if (requestData.toUserId !== userId) {
        return { success: false, error: 'Unauthorized to ignore this request' };
      }

      // Delete the friend request (no longer needed once ignored)
      await deleteDoc(requestRef);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to ignore friend request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to friend requests (REAL-TIME)
   */
  static subscribeFriendRequests(
    userId: string,
    onUpdate: (requests: FriendRequest[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    try {
      const requestsRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const q = query(
        requestsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        async (snapshot) => {
          const requests: FriendRequest[] = [];

          // Fetch sender details for each request
          for (const doc of snapshot.docs) {
            const data = doc.data();
            const senderProfile = await UserService.getProfile(data.fromUserId);

            requests.push({
              id: doc.id,
              fromUserId: data.fromUserId,
              toUserId: data.toUserId,
              status: data.status,
              createdAt: data.createdAt,
              respondedAt: data.respondedAt,
              fromUserName: senderProfile?.displayName,
              fromUserAvatar: senderProfile?.profilePictureUrl,
              fromUserUsername: senderProfile?.username,
            });
          }

          onUpdate(requests);
        },
        (error) => {
          console.error('❌ Friend requests listener error:', error);
          onError(error as Error);
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to subscribe to friend requests:', error);
      onError(error);
      // Return a no-op unsubscribe function
      return () => {};
    }
  }

  /**
   * Subscribe to sent friend requests (REAL-TIME)
   */
  static subscribeSentFriendRequests(
    userId: string,
    onUpdate: (requests: FriendRequest[]) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    try {
      const requestsRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const q = query(
        requestsRef,
        where('fromUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        async (snapshot) => {
          const requests: FriendRequest[] = [];

          // Fetch recipient details for each request
          for (const doc of snapshot.docs) {
            const data = doc.data();
            const recipientProfile = await UserService.getProfile(data.toUserId);

            requests.push({
              id: doc.id,
              fromUserId: data.fromUserId,
              toUserId: data.toUserId,
              status: data.status,
              createdAt: data.createdAt,
              respondedAt: data.respondedAt,
              fromUserName: recipientProfile?.displayName,
              fromUserAvatar: recipientProfile?.profilePictureUrl,
              fromUserUsername: recipientProfile?.username,
            });
          }

          onUpdate(requests);
        },
        (error) => {
          console.error('❌ Sent requests listener error:', error);
          onError(error as Error);
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to subscribe to sent requests:', error);
      onError(error);
      // Return a no-op unsubscribe function
      return () => {};
    }
  }

  /**
   * Get all friend requests for a user (incoming only)
   */
  static async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const requestsRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const q = query(
        requestsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests: FriendRequest[] = [];

      // Fetch sender details for each request
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const senderProfile = await UserService.getProfile(data.fromUserId);

        requests.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          createdAt: data.createdAt,
          respondedAt: data.respondedAt,
          fromUserName: senderProfile?.displayName,
          fromUserAvatar: senderProfile?.profilePictureUrl,
          fromUserUsername: senderProfile?.username,
        });
      }

      return requests;
    } catch (error: any) {
      console.error('❌ Failed to get friend requests:', error);
      return [];
    }
  }

  /**
   * Get sent friend requests (outgoing)
   */
  static async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    try {
      const requestsRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const q = query(
        requestsRef,
        where('fromUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const requests: FriendRequest[] = [];

      // Fetch recipient details for each request
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        const recipientProfile = await UserService.getProfile(data.toUserId);

        requests.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          status: data.status,
          createdAt: data.createdAt,
          respondedAt: data.respondedAt,
          fromUserName: recipientProfile?.displayName,
          fromUserAvatar: recipientProfile?.profilePictureUrl,
          fromUserUsername: recipientProfile?.username,
        });
      }

      return requests;
    } catch (error: any) {
      console.error('❌ Failed to get sent friend requests:', error);
      return [];
    }
  }

  /**
   * Get existing friend request between two users
   */
  private static async getExistingRequest(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest | null> {
    try {
      const requestsRef = collection(firestore, this.FRIEND_REQUESTS_COLLECTION);
      const q = query(
        requestsRef,
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      return {
        id: doc.id,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        status: data.status,
        createdAt: data.createdAt,
        respondedAt: data.respondedAt,
      };
    } catch (error: any) {
      console.error('❌ Failed to get existing request:', error);
      return null;
    }
  }

  /**
   * Cancel a sent friend request (before it's accepted)
   */
  static async cancelFriendRequest(
    requestId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const requestRef = doc(firestore, this.FRIEND_REQUESTS_COLLECTION, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        return { success: false, error: 'Friend request not found' };
      }

      const requestData = requestSnap.data();

      // Verify user is the sender
      if (requestData.fromUserId !== userId) {
        return { success: false, error: 'Unauthorized to cancel this request' };
      }

      // Verify request is pending
      if (requestData.status !== 'pending') {
        return { success: false, error: 'Can only cancel pending requests' };
      }

      // Delete the request
      await deleteDoc(requestRef);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to cancel friend request:', error);
      return { success: false, error: error.message };
    }
  }
}

