import { useTheme } from '@/shared/hooks/useTheme';
import type { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AICommandsMenuProps {
  visible: boolean;
  onClose: () => void;
  message: Message;
  messagePosition: { x: number; y: number; width: number; height: number };
  onSummarize: () => void;
}

// Long press menu shows: Summary only (Auto-Translate moved to navbar)
const AI_COMMANDS = [
  { id: 'summarize', label: 'Summary', icon: 'sparkles' as const, color: '#34C759' },
];

export const AICommandsMenu: React.FC<AICommandsMenuProps> = ({
  visible,
  onClose,
  message,
  messagePosition,
  onSummarize,
}) => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  // Calculate position (above the message, centered)
  const menuWidth = 150;
  const menuHeight = 80; // 1 command

  // Center horizontally relative to message
  const left = Math.max(
    16,
    Math.min(
      messagePosition.x + messagePosition.width / 2 - menuWidth / 2,
      SCREEN_WIDTH - menuWidth - 16
    )
  );

  // Position above message
  const top = messagePosition.y - menuHeight - 12;

  // If too close to top, show below message instead
  const showBelow = top < 100;
  const finalTop = showBelow ? messagePosition.y + messagePosition.height + 12 : top;

  const handleCommand = (commandId: string) => {
    if (commandId === 'summarize') {
      onSummarize();
      onClose();
    }
  };

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Backdrop - tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Menu container */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              left,
              top: finalTop,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* AI Commands Grid */}
          <View style={[styles.commandsGrid, { backgroundColor: '#F8F9FA' }]}>
            {AI_COMMANDS.map((command) => (
              <Pressable
                key={command.id}
                style={styles.commandButton}
                onPress={() => handleCommand(command.id)}
              >
                <View style={[styles.commandIcon, { backgroundColor: command.color }]}>
                  <Ionicons name={command.icon} size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.commandLabel}>{command.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Arrow pointing to message */}
          <View
            style={[
              styles.arrow,
              {
                backgroundColor: '#F8F9FA',
                [showBelow ? 'top' : 'bottom']: -6,
              },
            ]}
          />
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    width: 200,
    alignItems: 'center',
  },
  commandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: 12,
    padding: 8,
  },
  commandButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  commandIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  commandLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    left: '50%',
    marginLeft: -6,
  },
});
