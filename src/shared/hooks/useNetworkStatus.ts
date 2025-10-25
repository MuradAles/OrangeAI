import { MessageQueue } from '@/database/MessageQueue';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useNetworkStatus
 * 
 * Hook to monitor network connectivity
 * Features:
 * - Detects online/offline state
 * - Auto-processes message queue when connection restored
 * - Provides connection type and quality info
 */

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOnline: boolean; // Simplified status (true if connected and internet reachable)
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
    isOnline: true,
  });

  const [wasOffline, setWasOffline] = useState(false);
  const previousOnlineState = useRef(true); // Track previous state in ref

  const handleConnectivityChange = useCallback(async (state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable ?? null;
    const isOnline = isConnected && (isInternetReachable === null || isInternetReachable === true);

    const wasOfflineBefore = !previousOnlineState.current;
    const isOnlineNow = isOnline;

    console.log(`📡 Network status: ${isOnline ? 'ONLINE' : 'OFFLINE'} (was: ${previousOnlineState.current ? 'ONLINE' : 'OFFLINE'})`);

    // Update state
    setNetworkStatus({
      isConnected,
      isInternetReachable,
      type: state.type,
      isOnline,
    });

    // If we just came back online, process message queue
    if (wasOfflineBefore && isOnlineNow) {
      setWasOffline(true);
      console.log('🌐 Network restored! Processing message queue...');
      
      // Wait a bit for network to stabilize
      setTimeout(async () => {
        try {
          const result = await MessageQueue.processQueue();
          if (result.total > 0) {
            console.log(`📨 Synced ${result.success}/${result.total} offline messages`);
          }
        } catch (error) {
          console.error('❌ Error processing queue after reconnection:', error);
        }
      }, 1500); // 1.5 second delay
    }

    // Track offline state
    if (!isOnline) {
      setWasOffline(true);
    }

    // Update ref for next comparison
    previousOnlineState.current = isOnline;
  }, []);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    // Get initial state
    NetInfo.fetch().then(handleConnectivityChange);

    return () => {
      unsubscribe();
    };
  }, [handleConnectivityChange]);

  /**
   * Manually refresh network status
   */
  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    handleConnectivityChange(state);
  }, [handleConnectivityChange]);

  /**
   * Check if device has ever been offline in this session
   */
  const hasBeenOffline = useCallback(() => {
    return wasOffline;
  }, [wasOffline]);

  return {
    ...networkStatus,
    refresh,
    hasBeenOffline,
  };
};

