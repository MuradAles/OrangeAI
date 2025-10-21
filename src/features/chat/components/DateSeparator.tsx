/**
 * DateSeparator - Shows date divider in chat
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { format, isToday, isYesterday } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const theme = useTheme();

  const formatDate = (date: Date): string => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
          {formatDate(date)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});


