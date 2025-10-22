/**
 * ContactPicker
 * Select contacts for chat (single or multi-select)
 */

import { Avatar, Button } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface ContactPickerProps {
  contacts: Contact[];
  mode: 'single' | 'multi';
  selectedContactIds: Set<string>;
  onToggleContact: (contactId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const ContactPicker: React.FC<ContactPickerProps> = ({
  contacts,
  mode,
  selectedContactIds,
  onToggleContact,
  onConfirm,
  onBack,
  isLoading = false,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Debug: log contacts
  React.useEffect(() => {
    console.log('📋 ContactPicker: contacts count =', contacts.length);
    console.log('📋 ContactPicker: mode =', mode);
  }, [contacts, mode]);

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(query) ||
        c.username.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleContactPress = (contactId: string) => {
    if (mode === 'single') {
      // For single select, select and immediately confirm
      onToggleContact(contactId);
      // Give a tiny delay for visual feedback
      setTimeout(() => onConfirm(), 100);
    } else {
      // For multi-select, toggle selection
      onToggleContact(contactId);
    }
  };

  const getButtonText = () => {
    const count = selectedContactIds.size;
    if (mode === 'single') return 'Select a friend';
    if (count === 0) return 'Select friends';
    if (count === 1) return 'Next (1 selected)';
    return `Next (${count} selected)`;
  };

  const renderContactItem = ({ item }: { item: Contact }) => {
    const isSelected = selectedContactIds.has(item.userId);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.contactItem,
          { borderBottomColor: theme.colors.border },
          isSelected && { backgroundColor: theme.colors.primaryLight },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => handleContactPress(item.userId)}
      >
        {mode === 'multi' && (
          <View style={styles.checkbox}>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            ) : (
              <Ionicons
                name="ellipse-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
            )}
          </View>
        )}
        <Avatar
          name={item.displayName}
          imageUrl={item.profilePictureUrl}
          size={48}
        />
        <View style={styles.contactInfo}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
            {item.displayName}
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            @{item.username}
          </Text>
        </View>
        {item.isOnline && (
          <View
            style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]}
          />
        )}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="people-outline"
        size={64}
        color={theme.colors.textSecondary}
        style={{ opacity: 0.3 }}
      />
      <Text
        style={[
          theme.typography.body,
          { color: theme.colors.textSecondary, marginTop: 16, textAlign: 'center' },
        ]}
      >
        {searchQuery ? 'No friends found' : 'No friends yet. Add friends to start chatting!'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[theme.typography.h3, { color: theme.colors.text, flex: 1 }]}>
          {mode === 'single' ? 'Select Friend' : 'Select Friends'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[
            styles.searchInput,
            theme.typography.body,
            { color: theme.colors.text },
          ]}
          placeholder="Search friends..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Contact List */}
      <FlatList
        data={filteredContacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filteredContacts.length === 0 && styles.emptyContainer}
      />

      {/* Footer - only for multi-select */}
      {mode === 'multi' && (
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {selectedContactIds.size} selected
          </Text>
          <Button
            variant="primary"
            onPress={onConfirm}
            disabled={selectedContactIds.size === 0 || isLoading}
            loading={isLoading}
          >
            {getButtonText()}
          </Button>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  checkbox: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

