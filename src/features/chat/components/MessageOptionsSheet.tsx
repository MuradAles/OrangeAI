/**
 * MessageOptionsSheet - Beautiful bottom sheet for message actions
 * Replaces alert dialogs with a smooth, bubble-style UI
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessageOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface MessageOptionsSheetProps {
  visible: boolean;
  message: Message | null;
  options: MessageOption[];
  onClose: () => void;
}

export const MessageOptionsSheet = ({
  visible,
  message,
  options,
  onClose,
}: MessageOptionsSheetProps) => {
  const theme = useTheme();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: theme.colors.border },
              ]}
            />
          </View>

          {/* Message preview */}
          {message.text && (
            <View
              style={[
                styles.messagePreview,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: theme.colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* Options */}
          <ScrollView
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option, index) => (
              <Pressable
                key={option.id}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceVariant
                      : 'transparent',
                  },
                  index === 0 && styles.firstOption,
                  index === options.length - 1 && styles.lastOption,
                ]}
                onPress={() => {
                  option.onPress();
                  handleClose();
                }}
                disabled={option.disabled}
              >
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: option.destructive
                        ? theme.colors.error + '15'
                        : theme.colors.primary + '15',
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      option.destructive
                        ? theme.colors.error
                        : theme.colors.primary
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: option.destructive
                        ? theme.colors.error
                        : theme.colors.text,
                    },
                    option.disabled && { opacity: 0.5 },
                  ]}
                >
                  {option.label}
                </Text>
                {option.disabled && (
                  <Text
                    style={[
                      styles.disabledText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    (Coming soon)
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>

          {/* Cancel button */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: pressed
                  ? theme.colors.surfaceVariant
                  : theme.colors.background,
              },
            ]}
            onPress={handleClose}
          >
            <Text
              style={[styles.cancelText, { color: theme.colors.text }]}
            >
              Cancel
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  messagePreview: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    paddingHorizontal: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  firstOption: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  lastOption: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  disabledText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

