/**
 * UnreadSeparator - Shows "Unread Messages" divider
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { StyleSheet, Text, View } from 'react-native';

interface UnreadSeparatorProps {
  count: number;
}

export const UnreadSeparator = ({ count }: UnreadSeparatorProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.line, { backgroundColor: theme.colors.error }]} />
      <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
        <Text style={[theme.typography.caption, { color: '#fff', fontWeight: '600' }]}>
          {count} Unread Message{count !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={[styles.line, { backgroundColor: theme.colors.error }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  line: {
    flex: 1,
    height: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 12,
  },
});


