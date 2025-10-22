import { MessageQueue } from '@/database/MessageQueue';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useCallback, useEffect, useState } from 'react';

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

  const handleConnectivityChange = useCallback(async (state: NetInfoState) => {
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable ?? null;
    const isOnline = isConnected && (isInternetReachable === null || isInternetReachable === true);

    // Track network changes silently

    // Detect transition from offline to online
    const wasOfflineBefore = !networkStatus.isOnline;
    const isOnlineNow = isOnline;

    setNetworkStatus({
      isConnected,
      isInternetReachable,
      type: state.type,
      isOnline,
    });

    // If we just came back online, process message queue
    if (wasOfflineBefore && isOnlineNow) {
      console.log('🔄 Connection restored! Processing message queue...');
      setWasOffline(true);
      
      try {
        const result = await MessageQueue.processQueue();
        console.log(`✅ Queue processed: ${result.success} sent, ${result.failed} failed`);
      } catch (error) {
        console.error('Error processing queue after reconnection:', error);
      }
    }

    // Track offline state
    if (!isOnline && networkStatus.isOnline) {
      setWasOffline(true);
    }
  }, [networkStatus.isOnline]);

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

