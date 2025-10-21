/**
 * IconButton Component
 * 
 * Touchable button with an icon
 * Used for actions in headers, chat interface, etc.
 */

import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  size?: number;
  color?: string;
  variant?: 'transparent' | 'filled' | 'outline';
  disabled?: boolean;
  badge?: number;
  style?: ViewStyle;
}

export const IconButton = ({
  icon,
  onPress,
  size = 24,
  color,
  variant = 'transparent',
  disabled = false,
  badge,
  style,
}: IconButtonProps) => {
  const theme = useTheme();

  // Default color
  const iconColor = color || theme.colors.text;

  // Background styles for variants
  const getVariantStyles = (pressed: boolean) => {
    if (variant === 'transparent') {
      return {
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
      };
    }
    if (variant === 'filled') {
      return {
        backgroundColor: pressed
          ? theme.colors.surfaceVariant
          : theme.colors.surface,
      };
    }
    if (variant === 'outline') {
      return {
        backgroundColor: pressed ? theme.colors.surface : 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      };
    }
    return {};
  };

  // Button size based on icon size
  const buttonSize = size + 20; // Add padding

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          opacity: disabled ? 0.5 : 1,
        },
        getVariantStyles(pressed),
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={size} color={iconColor} />
        
        {/* Badge for unread count */}
        {badge !== undefined && badge > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.colors.error },
            ]}
          >
            <Ionicons name="ellipse" size={8} color="#fff" />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

