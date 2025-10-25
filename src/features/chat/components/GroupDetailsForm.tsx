/**
 * GroupDetailsForm
 * Form to enter group name, description, and icon
 */

import { Avatar, Input } from '@/components/common';
import { useTheme } from '@/shared/hooks/useTheme';
import { Contact } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 48
        }
      ]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <Text style={[theme.typography.h3, { color: theme.colors.text, flex: 1 }]}>
          New Group
        </Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Group Icon */}
        <View style={styles.iconSection}>
          <Pressable onPress={handlePickImage} style={styles.iconButton}>
            {groupIcon ? (
              <Avatar name={groupName || 'Group'} imageUrl={groupIcon} size={120} />
            ) : (
              <View style={[styles.placeholderIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
              </View>
            )}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
          <Text
            style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 16 }]}
          >
            Tap to add group icon
          </Text>
        </View>

        {/* Group Name */}
        <View style={styles.inputSection}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text, marginBottom: 8 }]}>
            Group Name
          </Text>
          <Input
            placeholder="Enter group name"
            value={groupName}
            onChangeText={(text) => {
              setGroupName(text);
              if (errors.name) setErrors({});
            }}
            error={errors.name}
            maxLength={50}
          />
          {errors.name ? (
            <Text style={[theme.typography.caption, { color: theme.colors.error, marginTop: 4 }]}>
              {errors.name}
            </Text>
          ) : (
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
              {groupName.length}/50 characters
            </Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.inputSection}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text, marginBottom: 8 }]}>
            Description (optional)
          </Text>
          <Input
            placeholder="What's this group about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            {description.length}/200 characters
          </Text>
        </View>

        {/* Members Preview */}
        <View style={styles.membersSection}>
          <Text style={[theme.typography.bodyBold, { color: theme.colors.text, marginBottom: 16 }]}>
            Members ({selectedContacts.length})
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersList}
          >
            {selectedContacts.map((contact) => (
              <View key={contact.userId} style={styles.memberItem}>
                <Avatar
                  name={contact.displayName}
                  imageUrl={contact.profilePictureUrl}
                  size={56}
                />
                <Text
                  style={[theme.typography.caption, { color: theme.colors.text, marginTop: 8, textAlign: 'center' }]}
                  numberOfLines={1}
                >
                  {contact.displayName.split(' ')[0]}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { 
        backgroundColor: theme.colors.background,
        borderTopColor: theme.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 20 : 16
      }]}>
        <Pressable
          style={[
            styles.createButton,
            { 
              backgroundColor: theme.colors.primary,
              opacity: (isLoading || !groupName.trim()) ? 0.5 : 1,
              marginBottom: 20
            }
          ]}
          onPress={handleSubmit}
          disabled={isLoading || !groupName.trim()}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Create Group
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconButton: {
    position: 'relative',
  },
  placeholderIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  iconBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  inputSection: {
    marginBottom: 24,
  },
  membersSection: {
    marginTop: 8,
  },
  membersList: {
    gap: 16,
    paddingRight: 20,
  },
  memberItem: {
    alignItems: 'center',
    width: 64,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  createButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});


