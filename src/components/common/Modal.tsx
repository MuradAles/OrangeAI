/**
 * Modal Component
 * 
 * Reusable modal dialog with overlay
 * All styling from theme - NO hardcoded values
 */

import { useTheme } from '@/shared/hooks/useTheme';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Modal as RNModal,
    ModalProps as RNModalProps,
    ScrollView,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

export interface ModalProps extends Omit<RNModalProps, 'visible'> {
  /**
   * Modal visibility
   */
  visible: boolean;
  
  /**
   * Close callback
   */
  onClose: () => void;
  
  /**
   * Modal title
   */
  title?: string;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Show close button
   */
  showCloseButton?: boolean;
  
  /**
   * Close on backdrop press
   */
  closeOnBackdropPress?: boolean;
  
  /**
   * Custom modal style
   */
  modalStyle?: ViewStyle;
  
  /**
   * Full screen modal
   */
  fullScreen?: boolean;
  
  /**
   * Scrollable content
   */
  scrollable?: boolean;
  
  /**
   * Disable keyboard avoiding behavior (e.g., for modals with fixed footer buttons)
   */
  disableKeyboardAvoid?: boolean;
}

/**
 * Modal Component
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdropPress = true,
  modalStyle,
  fullScreen = false,
  scrollable = false,
  disableKeyboardAvoid = false,
  ...props
}) => {
  const theme = useTheme();
  
  const overlayStyle: ViewStyle = {
    ...styles.overlay,
    backgroundColor: theme.colors.overlay,
  };
  
  const containerStyle: ViewStyle = fullScreen
    ? {
        ...styles.fullScreenContainer,
        backgroundColor: theme.colors.background,
        ...modalStyle,
      }
    : {
        ...styles.modalContainer,
        backgroundColor: theme.colors.background,
        borderRadius: theme.componentBorderRadius.modal,
        padding: theme.componentSpacing.modalPadding,
        margin: theme.componentSpacing.modalMargin,
        ...theme.componentShadows.modal,
        ...modalStyle,
      };
  
  const titleStyle: TextStyle = {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  };
  
  const closeButtonStyle: ViewStyle = {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundInput,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  };
  
  const closeTextStyle: TextStyle = {
    fontSize: 20,
    color: theme.colors.textSecondary,
  };
  
  const ContentWrapper = scrollable ? ScrollView : View;
  
  // Content wrapper style - needs flex: 1 for full-screen modals
  const contentWrapperStyle = scrollable 
    ? styles.scrollContent 
    : fullScreen 
      ? styles.fullScreenContent 
      : undefined;
  
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      {...props}
    >
      {disableKeyboardAvoid ? (
        <View style={styles.keyboardAvoid}>
        <TouchableOpacity
          style={overlayStyle}
          activeOpacity={1}
          onPress={closeOnBackdropPress ? onClose : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={containerStyle}
          >
            {/* Close Button */}
            {showCloseButton && !fullScreen && (
              <TouchableOpacity style={closeButtonStyle} onPress={onClose}>
                <Text style={closeTextStyle}>✕</Text>
              </TouchableOpacity>
            )}
            
            {/* Title */}
            {title && <Text style={titleStyle}>{title}</Text>}
            
            {/* Content */}
            <ContentWrapper
              style={contentWrapperStyle}
              showsVerticalScrollIndicator={scrollable}
            >
              {children}
            </ContentWrapper>
          </TouchableOpacity>
        </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <TouchableOpacity
            style={overlayStyle}
            activeOpacity={1}
            onPress={closeOnBackdropPress ? onClose : undefined}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={containerStyle}
            >
              {/* Close Button */}
              {showCloseButton && !fullScreen && (
                <TouchableOpacity style={closeButtonStyle} onPress={onClose}>
                  <Text style={closeTextStyle}>✕</Text>
                </TouchableOpacity>
              )}
              
              {/* Title */}
              {title && <Text style={titleStyle}>{title}</Text>}
              
              {/* Content */}
              <ContentWrapper
                style={contentWrapperStyle}
                showsVerticalScrollIndicator={scrollable}
              >
                {children}
              </ContentWrapper>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </RNModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fullScreenContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});


