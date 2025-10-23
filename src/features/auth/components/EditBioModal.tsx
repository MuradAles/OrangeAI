/**
 * EditBioModal - Modal for editing user bio
 * 
 * Features:
 * - Text input with 200 character limit
 * - Character counter
 * - Save and Cancel buttons
 */

import { Button } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import * as React from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface EditBioModalProps {
  visible: boolean;
  currentBio: string;
  onSave: (newBio: string) => void;
  onClose: () => void;
}

const MAX_BIO_LENGTH = 200;

export const EditBioModal = ({
  visible,
  currentBio,
  onSave,
  onClose,
}: EditBioModalProps) => {
  const theme = useTheme();
  const [bio, setBio] = React.useState(currentBio);

  React.useEffect(() => {
    if (visible) {
      setBio(currentBio);
    }
  }, [visible, currentBio]);

  const handleSave = () => {
    onSave(bio.trim());
    onClose();
  };

  const remainingChars = MAX_BIO_LENGTH - bio.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[theme.typography.h3, { color: theme.colors.text }]}>
              Edit Bio
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>

          {/* Bio Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.bioInput,
                theme.typography.body,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={MAX_BIO_LENGTH}
              textAlignVertical="top"
            />
            
            {/* Character Counter */}
            <Text
              style={[
                theme.typography.bodySmall,
                {
                  color: remainingChars < 20 ? theme.colors.warning : theme.colors.textSecondary,
                  marginTop: 8,
                },
              ]}
            >
              {remainingChars} characters remaining
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Save"
              onPress={handleSave}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    maxHeight: 200,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
});

