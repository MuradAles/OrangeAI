/**
 * useChatKeyboard Hook
 * 
 * Handles keyboard events and animations for chat modal
 * - Animated keyboard height
 * - Keyboard show/hide listeners
 * - Jump to bottom button visibility
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export function useChatKeyboard(visible: boolean) {
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Handle keyboard events for proper modal keyboard behavior
  useEffect(() => {
    if (!visible) {
      // Dismiss keyboard and reset height when modal closes
      Keyboard.dismiss();
      keyboardHeight.setValue(0);
      return;
    }

    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        // Add 12px spacing between input and keyboard
        const targetHeight = e.endCoordinates.height + 12;
        Animated.timing(keyboardHeight, {
          toValue: targetHeight,
          duration: Platform.OS === 'ios' ? (e.duration || 250) : 250,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
      // Ensure keyboard is dismissed on unmount
      Keyboard.dismiss();
      keyboardHeight.setValue(0);
    };
  }, [visible, keyboardHeight]);

  return {
    keyboardHeight,
    showJumpToBottom,
    setShowJumpToBottom,
  };
}


