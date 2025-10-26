/**
 * NewChatModal
 * Multi-step modal for creating one-on-one or group chats
 * 
 * Flow:
 * 1. Choose chat type (one-on-one or group)
 * 2. Select contacts (single or multi-select)
 * 3. For groups: Enter group details (name, description, icon)
 */

import { Modal } from '@/components/common';
import { Contact } from '@/shared/types';
import { useRouter } from 'expo-router';
import React from 'react';
import { ChatTypeSelector } from './ChatTypeSelector';
import { ContactPicker } from './ContactPicker';
import { GroupDetailsForm } from './GroupDetailsForm';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  contacts: Contact[];
  onCreateOneOnOneChat: (contact: Contact) => void;
  onCreateGroupChat: (name: string, description: string, icon: string | null, memberIds: string[]) => void;
  isCreating?: boolean;
}

type Step = 'select-type' | 'select-contacts' | 'group-details';

export const NewChatModal: React.FC<NewChatModalProps> = ({
  visible,
  onClose,
  contacts,
  onCreateOneOnOneChat,
  onCreateGroupChat,
  isCreating = false,
}) => {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('select-type');
  const [chatType, setChatType] = React.useState<'one-on-one' | 'group'>('one-on-one');
  const [selectedContactIds, setSelectedContactIds] = React.useState<Set<string>>(new Set());

  // Reset state when modal closes
  React.useEffect(() => {
    if (!visible) {
      setStep('select-type');
      setChatType('one-on-one');
      setSelectedContactIds(new Set());
    }
  }, [visible]);

  // Debug logging
  // Removed debug logs for cleaner console

  const handleSelectChatType = (type: 'one-on-one' | 'group') => {
    setChatType(type);
    setSelectedContactIds(new Set());
    
    if (type === 'one-on-one') {
      // For one-on-one, close modal and navigate to Friends tab
      onClose();
      router.push('/(tabs)/friends');
    } else {
      // For group, continue with contact selection
      setStep('select-contacts');
    }
  };

  const handleToggleContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        if (chatType === 'one-on-one') {
          // For one-on-one, only allow one selection
          return new Set([contactId]);
        } else {
          next.add(contactId);
        }
      }
      return next;
    });
  };

  const handleConfirmContacts = () => {
    if (chatType === 'one-on-one') {
      // For one-on-one, immediately create chat
      const selectedContact = contacts.find((c) => selectedContactIds.has(c.userId));
      if (selectedContact) {
        onCreateOneOnOneChat(selectedContact);
      }
    } else {
      // For group, go to group details step
      setStep('group-details');
    }
  };

  const handleCreateGroup = (name: string, description: string, iconUri: string | null) => {
    const memberIds = Array.from(selectedContactIds);
    onCreateGroupChat(name, description, iconUri, memberIds);
  };

  const handleBack = () => {
    if (step === 'select-contacts') {
      setStep('select-type');
      setSelectedContactIds(new Set());
    } else if (step === 'group-details') {
      setStep('select-contacts');
    }
  };

  const getSelectedContacts = (): Contact[] => {
    return contacts.filter((c) => selectedContactIds.has(c.userId));
  };

  const renderContent = () => {
    switch (step) {
      case 'select-type':
        return <ChatTypeSelector onSelectType={handleSelectChatType} />;

      case 'select-contacts':
        return (
          <ContactPicker
            contacts={contacts}
            mode={chatType === 'one-on-one' ? 'single' : 'multi'}
            selectedContactIds={selectedContactIds}
            onToggleContact={handleToggleContact}
            onConfirm={handleConfirmContacts}
            onBack={handleBack}
            isLoading={isCreating}
          />
        );

      case 'group-details':
        return (
          <GroupDetailsForm
            selectedContacts={getSelectedContacts()}
            onSubmit={handleCreateGroup}
            onBack={handleBack}
            isLoading={isCreating}
          />
        );

      default:
        return null;
    }
  };

  // Use full screen for contact picker and group details
  const shouldUseFullScreen = step !== 'select-type';
  // Disable keyboard avoiding for group details to keep button fixed at bottom
  const shouldDisableKeyboardAvoid = step === 'group-details';

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      showCloseButton={step === 'select-type'}
      title={step === 'select-type' ? 'New Chat' : undefined}
      fullScreen={shouldUseFullScreen}
      closeOnBackdropPress={step === 'select-type'}
      disableKeyboardAvoid={shouldDisableKeyboardAvoid}
    >
      {renderContent()}
    </Modal>
  );
};

