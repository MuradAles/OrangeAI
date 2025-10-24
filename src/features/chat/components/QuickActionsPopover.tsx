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

interface QuickActionsPopoverProps {
  visible: boolean;
  onClose: () => void;
  message: Message;
  messagePosition: { x: number; y: number; width: number; height: number };
  onTranslate: () => void;
  onReaction: (emoji: string) => void;
  onCopy: () => void;
  onDeleteForEveryone: () => void;
}

const QUICK_EMOJIS = ['❤️', '😂', '👍', '🔥'];

export const QuickActionsPopover: React.FC<QuickActionsPopoverProps> = ({
  visible,
  onClose,
  message,
  messagePosition,
  onTranslate,
  onReaction,
  onCopy,
  onDeleteForEveryone,
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
  const popoverWidth = 240;
  const translateButtonHeight = 44;
  const emojisHeight = 56;
  const actionsHeight = 44; // Copy and Delete buttons
  const spacing = 8;
  const totalHeight = translateButtonHeight + spacing + emojisHeight + spacing + actionsHeight;

  // Center horizontally relative to message
  const left = Math.max(
    16,
    Math.min(
      messagePosition.x + messagePosition.width / 2 - popoverWidth / 2,
      SCREEN_WIDTH - popoverWidth - 16
    )
  );

  // Position above message
  const top = messagePosition.y - totalHeight - 12;

  // If too close to top, show below message instead
  const showBelow = top < 100;
  const finalTop = showBelow ? messagePosition.y + messagePosition.height + 12 : top;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Backdrop - tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Popover container */}
        <Animated.View
          style={[
            styles.popoverContainer,
            {
              left,
              top: finalTop,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
           {/* Translate Button */}
           <Pressable
             style={[
               styles.translateButton,
               { backgroundColor: '#F8F9FA' },
             ]}
             onPress={() => {
               onTranslate();
               onClose();
             }}
           >
             <Ionicons name="language" size={20} color="#0084FF" />
             <Text style={[styles.translateText, { color: '#000000' }]}>
               Translate
             </Text>
           </Pressable>

           {/* Emoji Reactions */}
           <View
             style={[
               styles.emojisContainer,
               { backgroundColor: '#F0F1F2' },
             ]}
           >
             {QUICK_EMOJIS.map((emoji, index) => (
               <Pressable
                 key={emoji}
                 style={styles.emojiButton}
                 onPress={() => {
                   onReaction(emoji);
                   onClose();
                 }}
               >
                 <Text style={styles.emojiText}>{emoji}</Text>
               </Pressable>
             ))}
           </View>

           {/* Copy and Delete Actions */}
           <View style={styles.actionsRow}>
             <Pressable
               style={[styles.actionButton, { backgroundColor: '#F8F9FA' }]}
               onPress={() => {
                 onCopy();
                 onClose();
               }}
             >
               <Ionicons name="copy-outline" size={18} color="#000000" />
               <Text style={styles.actionText}>Copy</Text>
             </Pressable>
             
             <Pressable
               style={[styles.actionButton, { backgroundColor: '#F8F9FA' }]}
               onPress={() => {
                 onDeleteForEveryone();
                 onClose();
               }}
             >
               <Ionicons name="trash-outline" size={18} color="#FF3B30" />
               <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete</Text>
             </Pressable>
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
  popoverContainer: {
    position: 'absolute',
    width: 240,
    alignItems: 'center',
  },
   translateButton: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     width: '100%',
     height: 44,
     borderRadius: 12,
     gap: 8,
   },
  translateText: {
    fontSize: 16,
    fontWeight: '600',
  },
   emojisContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     width: '100%',
     height: 56,
     borderRadius: 28,
     paddingHorizontal: 8,
     marginTop: 8,
   },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  emojiText: {
    fontSize: 24,
    opacity: 1, // Ensure full opacity
  },
   arrow: {
     position: 'absolute',
     width: 12,
     height: 12,
     transform: [{ rotate: '45deg' }],
     left: '50%',
     marginLeft: -6,
   },
   actionsRow: {
     flexDirection: 'row',
     width: '100%',
     gap: 8,
     marginTop: 8,
   },
   actionButton: {
     flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     height: 44,
     borderRadius: 12,
     gap: 6,
   },
   actionText: {
     fontSize: 14,
     fontWeight: '600',
     color: '#000000',
   },
});

