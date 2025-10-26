/**
 * ChatTypeSelector
 * First step: Choose between one-on-one or group chat
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ChatTypeSelectorProps {
  onSelectType: (type: 'one-on-one' | 'group') => void;
}

export const ChatTypeSelector: React.FC<ChatTypeSelectorProps> = ({ onSelectType }) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {/* One-on-One Option */}
      <Pressable
        style={({ pressed }) => [
          styles.option,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onSelectType('one-on-one')}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Ionicons name="person" size={40} color={theme.colors.primary} />
        </View>
        <View style={styles.optionText}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            One-on-One Chat
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Chat with a single friend
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
      </Pressable>

      {/* Group Option */}
      <Pressable
        style={({ pressed }) => [
          styles.option,
          { 
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onSelectType('group')}
      >
        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="people" size={40} color={theme.colors.success} />
        </View>
        <View style={styles.optionText}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            Group Chat
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Chat with multiple friends
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
});

