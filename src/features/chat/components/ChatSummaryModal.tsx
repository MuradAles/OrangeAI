/**
 * ChatSummaryModal Component
 * 
 * Modal for displaying chat summaries with:
 * - Summary generation
 * - Loading states
 * - Scrollable content
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface ChatSummaryModalProps {
  visible: boolean;
  chatSummary: string | null;
  isGeneratingSummary: boolean;
  onClose: () => void;
}

export const ChatSummaryModal: React.FC<ChatSummaryModalProps> = ({
  visible,
  chatSummary,
  isGeneratingSummary,
  onClose,
}) => {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.summaryOverlay}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={[styles.summaryCardHeader, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.summaryCardTitle}>✨ Chat Summary</Text>
            <Pressable 
              onPress={onClose}
              hitSlop={8}
            >
              <Text style={styles.summaryCardClose}>✕</Text>
            </Pressable>
          </View>

          {/* Content */}
          <View style={styles.summaryCardBody}>
            {isGeneratingSummary ? (
              <View style={styles.summaryCardLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.summaryCardLoadingText, { color: theme.colors.textSecondary }]}>
                  Generating summary...
                </Text>
              </View>
            ) : chatSummary ? (
              <ScrollView 
                style={styles.summaryCardScroll}
                contentContainerStyle={styles.summaryCardScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text style={[styles.summaryCardText, { color: theme.colors.text }]}>
                  {chatSummary}
                </Text>
              </ScrollView>
            ) : (
              <Text style={[styles.summaryCardText, { color: theme.colors.textSecondary, fontStyle: 'italic' }]}>
                No summary available.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  summaryCard: {
    width: '98%',
    height: 600, // 80% of screen height
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden', // Ensure content doesn't overflow
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCardClose: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryCardBody: {
    flex: 1, // Takes all remaining space after header
  },
  summaryCardScroll: {
    flex: 1,
  },
  summaryCardScrollContent: {
    padding: 20,
  },
  summaryCardText: {
    fontSize: 16,
    lineHeight: 24,
  },
  summaryCardLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  summaryCardLoadingText: {
    marginTop: 16,
    fontSize: 15,
  },
});
