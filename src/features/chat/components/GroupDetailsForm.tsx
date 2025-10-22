/**
 * GroupDetailsForm
 * Form to enter group name, description, and icon
 */

import { Avatar, Button, Input } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface GroupDetailsFormProps {
  selectedContacts: Contact[];
  onSubmit: (name: string, description: string, iconUri: string | null) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const GroupDetailsForm: React.FC<GroupDetailsFormProps> = ({
  selectedContacts,
  onSubmit,
  onBack,
  isLoading = false,
}) => {
  const theme = useTheme();
  const [groupName, setGroupName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [groupIcon, setGroupIcon] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ name?: string }>({});

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setGroupIcon(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSubmit = () => {
    // Validate
    const newErrors: { name?: string } = {};
    if (!groupName.trim()) {
      newErrors.name = 'Group name is required';
    } else if (groupName.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    } else if (groupName.trim().length > 50) {
      newErrors.name = 'Group name must be less than 50 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit
    onSubmit(groupName.trim(), description.trim(), groupIcon);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[theme.typography.h3, { color: theme.colors.text, flex: 1 }]}>
          New Group
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Icon */}
        <View style={styles.iconSection}>
          <Pressable onPress={handlePickImage} style={styles.iconButton}>
            {groupIcon ? (
              <Avatar imageUrl={groupIcon} size={100} />
            ) : (
              <View style={[styles.placeholderIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="camera" size={32} color={theme.colors.textSecondary} />
              </View>
            )}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text
            style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}
          >
            Tap to {groupIcon ? 'change' : 'add'} group icon
          </Text>
        </View>

        {/* Group Name */}
        <View style={styles.inputSection}>
          <Input
            label="Group Name"
            placeholder="Enter group name"
            value={groupName}
            onChangeText={(text) => {
              setGroupName(text);
              if (errors.name) setErrors({});
            }}
            error={errors.name}
            maxLength={50}
            autoFocus
          />
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            {groupName.length}/50
          </Text>
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <Input
            label="Description (optional)"
            placeholder="What's this group about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text
            style={[
              theme.typography.caption,
              { color: theme.colors.textSecondary, marginTop: 4 },
            ]}
          >
            {description.length}/200
          </Text>
        </View>

        {/* Members Preview */}
        <View style={styles.membersSection}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text, marginBottom: 12 }]}>
            Members ({selectedContacts.length})
          </Text>
          <View style={styles.membersList}>
            {selectedContacts.map((contact) => (
              <View key={contact.userId} style={styles.memberItem}>
                <Avatar
                  name={contact.displayName}
                  imageUrl={contact.profilePictureUrl}
                  size={40}
                />
                <Text
                  style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 4 }]}
                  numberOfLines={1}
                >
                  {contact.displayName.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <Button
          variant="primary"
          onPress={handleSubmit}
          disabled={isLoading || !groupName.trim()}
          loading={isLoading}
        >
          Create Group
        </Button>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconButton: {
    position: 'relative',
  },
  placeholderIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  iconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 20,
  },
  membersSection: {
    marginTop: 8,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberItem: {
    alignItems: 'center',
    width: 60,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
});


