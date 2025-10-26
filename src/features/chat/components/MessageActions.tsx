import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageActionsProps {
  message: Message;
  isSent: boolean;
  isGroupChat: boolean;
  showAvatar: boolean;
  senderName?: string;
  
  // Translation props
  translatedText: string | null;
  showTranslatedText: boolean;
  isTranslating: boolean;
  onTranslationSwap: () => void;
  
  // Cultural analysis props
  isAnalyzing: boolean;
  onCulturalAnalysis: () => void;
  
  // Language props
  detectedLanguage?: string;
  preferredLanguage: string;
  
  // Animation refs
  translatePulseAnim: Animated.Value;
  translateSparkle1Anim: Animated.Value;
  translateSparkle2Anim: Animated.Value;
  translateSparkle3Anim: Animated.Value;
  pulseAnim: Animated.Value;
  sparkle1Anim: Animated.Value;
  sparkle2Anim: Animated.Value;
  sparkle3Anim: Animated.Value;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isSent,
  isGroupChat,
  showAvatar,
  senderName,
  translatedText,
  showTranslatedText,
  isTranslating,
  onTranslationSwap,
  isAnalyzing,
  onCulturalAnalysis,
  detectedLanguage,
  preferredLanguage,
  translatePulseAnim,
  translateSparkle1Anim,
  translateSparkle2Anim,
  translateSparkle3Anim,
  pulseAnim,
  sparkle1Anim,
  sparkle2Anim,
  sparkle3Anim,
}) => {
  const theme = useTheme();
  
  // Get language codes for the buttons
  const originalLang = (detectedLanguage || message.detectedLanguage || 'EN').toUpperCase();
  const translatedLang = preferredLanguage.toUpperCase();

  // Get status icon
  const getStatusIcon = () => {
    if (!isSent) return null;

    // Use white/light colors for sent messages (on blue background)
    switch (message.status) {
      case 'sending':
        return <Ionicons name={'time-outline' as any} size={14} color="rgba(255, 255, 255, 0.8)" />;
      case 'sent':
        return <Ionicons name={'checkmark' as any} size={14} color="rgba(255, 255, 255, 0.9)" />;
      case 'delivered':
        return <Ionicons name={'checkmark-done' as any} size={14} color="rgba(255, 255, 255, 0.9)" />;
      case 'read':
        return <Ionicons name={'checkmark-done' as any} size={14} color="#FFFFFF" />;
      case 'failed':
        return <Ionicons name={'alert-circle' as any} size={14} color="#FF6B6B" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Sender name and translation button for received messages in groups */}
      {!isSent && senderName && (isGroupChat || showAvatar) && (
        <View style={styles.senderNameRow}>
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>
            {senderName}
          </Text>
          
          {/* Translation/Cultural Analysis Button */}
          <View style={styles.buttonRow}>
            {translatedText ? (
              <>
                {/* Swap Button with Language Codes - Shows current view */}
                <Pressable 
                  onPress={onTranslationSwap}
                  style={[styles.translationButtonTop, {
                    backgroundColor: isSent ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                    marginRight: 4,
                  }]}
                >
                  <Text style={[styles.translationButtonTextTop, {
                    color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
                  }]}>
                    {showTranslatedText ? `${translatedLang} ⇄ ${originalLang}` : `${originalLang} ⇄ ${translatedLang}`}
                  </Text>
                </Pressable>
                
                {/* Cultural Analysis Button - Just a magical bulb */}
                <Pressable 
                  onPress={onCulturalAnalysis}
                  disabled={isAnalyzing}
                  style={[styles.culturalBulbButton, {
                    backgroundColor: isSent ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                    opacity: isAnalyzing ? 0.8 : 1,
                  }]}
                >
                  {isAnalyzing ? (
                    <View style={styles.magicalAnimation}>
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Ionicons 
                          name="bulb" 
                          size={16} 
                          color="#FFD700" 
                        />
                      </Animated.View>
                      <View style={styles.sparkleContainer}>
                        <Animated.View style={{ 
                          opacity: sparkle1Anim,
                          transform: [{ scale: sparkle1Anim }]
                        }}>
                          <Ionicons name="star" size={8} color="#FFD700" style={styles.sparkle1} />
                        </Animated.View>
                        <Animated.View style={{ 
                          opacity: sparkle2Anim,
                          transform: [{ scale: sparkle2Anim }]
                        }}>
                          <Ionicons name="star" size={6} color="#FFA500" style={styles.sparkle2} />
                        </Animated.View>
                        <Animated.View style={{ 
                          opacity: sparkle3Anim,
                          transform: [{ scale: sparkle3Anim }]
                        }}>
                          <Ionicons name="star" size={7} color="#FFD700" style={styles.sparkle3} />
                        </Animated.View>
                      </View>
                    </View>
                  ) : (
                    <Ionicons 
                      name="bulb-outline" 
                      size={16} 
                      color={isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary} 
                    />
                  )}
                </Pressable>
              </>
            ) : (
              /* Translate Button - Shows source ⇄ target languages */
              <Pressable 
                onPress={onTranslationSwap}
                disabled={isTranslating}
                style={[styles.translationButtonTop, {
                  backgroundColor: isSent ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                  opacity: isTranslating ? 0.8 : 1,
                }]}
              >
                {isTranslating ? (
                  <Text style={[styles.translationButtonTextTop, {
                    color: '#FFD700',
                    fontWeight: '700',
                  }]}>
                    Translating...
                  </Text>
                ) : (
                  <Text style={[styles.translationButtonTextTop, {
                    color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
                  }]}>
                    {originalLang} ⇄ {translatedLang}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      )}

    </>
  );
};

// Format timestamp helper function
const formatTimestamp = (timestamp: Date | number): string => {
  try {
    // Convert to Date object if it's a number (milliseconds)
    const dateObj = typeof timestamp === 'number' 
      ? new Date(timestamp)
      : timestamp instanceof Date 
        ? timestamp 
        : new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    if (isToday(dateObj)) {
      return format(dateObj, 'h:mm a');
    } else if (isYesterday(dateObj)) {
      return `Yesterday ${format(dateObj, 'h:mm a')}`;
    } else {
      return format(dateObj, 'MMM d, h:mm a');
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return 'Invalid date';
  }
};

const styles = StyleSheet.create({
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  senderNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  translationButtonTextTop: {
    fontSize: 12,
    fontWeight: '600',
  },
  culturalBulbButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  magicalAnimation: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle1: {
    position: 'absolute',
    top: 5,
    right: 8,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 8,
    left: 5,
  },
  sparkle3: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
  },
});
