/**
 * NewChatModal
 * Modal for selecting friends to start a new chat
 */

import { Avatar, Button, Modal } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  contacts: Contact[];
  onCreateChat: (selectedContacts: Contact[]) => void;
  isCreating?: boolean;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  visible,
  onClose,
  contacts,
  onCreateChat,
  isCreating = false,
}) => {
  const theme = useTheme();
  const [selectedContacts, setSelectedContacts] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!visible) {
      setSelectedContacts(new Set());
    }
  }, [visible]);

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  };

  const handleCreate = () => {
    const selected = contacts.filter((c) => selectedContacts.has(c.userId));
    onCreateChat(selected);
  };

  const getButtonText = () => {
    const count = selectedContacts.size;
    if (count === 0) return 'Select friends';
    if (count === 1) return 'Create Chat';
    return `Create Group (${count})`;
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Chat">
      <View style={styles.content}>
        {/* Contact List */}
        <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
          {contacts.length === 0 ? (
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
                No friends yet. Add friends to start chatting!
              </Text>
            </View>
          ) : (
            contacts.map((contact) => {
              const isSelected = selectedContacts.has(contact.userId);
              return (
                <Pressable
                  key={contact.userId}
                  style={[
                    styles.contactItem,
                    { borderBottomColor: theme.colors.border },
                    isSelected && { backgroundColor: theme.colors.primaryLight },
                  ]}
                  onPress={() => toggleContact(contact.userId)}
                >
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
                  <Avatar
                    name={contact.displayName}
                    imageUrl={contact.profilePictureUrl}
                    size={44}
                  />
                  <View style={styles.contactInfo}>
                    <Text style={[theme.typography.bodyBold, { color: theme.colors.text }]}>
                      {contact.displayName}
                    </Text>
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
                      @{contact.username}
                    </Text>
                  </View>
                  {contact.isOnline && (
                    <View
                      style={[styles.onlineIndicator, { backgroundColor: theme.colors.success }]}
                    />
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {selectedContacts.size} selected
          </Text>
          <View style={styles.actions}>
            <Button variant="outline" onPress={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleCreate}
              disabled={selectedContacts.size === 0 || isCreating}
              loading={isCreating}
            >
              {getButtonText()}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    maxHeight: '80%',
  },
  contactList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
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
  footer: {
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});

