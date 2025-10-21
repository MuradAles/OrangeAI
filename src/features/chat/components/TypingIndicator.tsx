/**
 * TypingIndicator - Shows who is currently typing in a chat
 * 
 * Displays:
 * - 1 person: "John is typing..."
 * - 2 people: "John and Sarah are typing..."
 * - 3+ people: "Multiple people are typing..."
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { StyleSheet, Text, View } from 'react-native';

interface TypingIndicatorProps {
  typingUserNames: string[];
}

export const TypingIndicator = ({ typingUserNames }: TypingIndicatorProps) => {
  const theme = useTheme();

  if (typingUserNames.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (typingUserNames.length === 1) {
      return `${typingUserNames[0]} is typing...`;
    } else if (typingUserNames.length === 2) {
      return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
    } else {
      return 'Multiple people are typing...';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
        {getTypingText()}
      </Text>
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, { backgroundColor: theme.colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.textSecondary }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
});

