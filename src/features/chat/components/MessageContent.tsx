import { useTheme } from '@/shared/hooks/useTheme';
import { Message, MessageTranslation } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface MessageContentProps {
  message: Message;
  isSent: boolean;
  isDeleted: boolean;
  
  // Translation props
  showTranslation: boolean;
  translatedText: string | null;
  translationData: MessageTranslation | string | null;
  showTranslatedText: boolean;
  isTranslating: boolean;
  onSetShowTranslation: (show: boolean) => void;
  renderTranslatedTextWithHighlights: (text: string) => React.ReactNode;
  
  // Image props
  showFullImage: boolean;
  imageLoading: boolean;
  imageDimensions: { width: number; height: number };
  onSetShowFullImage: (show: boolean) => void;
  onSetImageLoading: (loading: boolean) => void;
  onSetImageDimensions: (dimensions: { width: number; height: number }) => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isSent,
  isDeleted,
  showTranslation,
  translatedText,
  translationData,
  showTranslatedText,
  isTranslating,
  onSetShowTranslation,
  renderTranslatedTextWithHighlights,
  showFullImage,
  imageLoading,
  imageDimensions,
  onSetShowFullImage,
  onSetImageLoading,
  onSetImageDimensions,
}) => {
  const theme = useTheme();

  if (isDeleted) {
    return (
      <Text style={[
        styles.deletedText, 
        { color: isSent ? 'rgba(0,0,0,0.5)' : theme.colors.textSecondary }
      ]}>
        {message.deletedForEveryone ? '🚫 This message was deleted' : '🚫 You deleted this message'}
      </Text>
    );
  }

  return (
    <>
      {/* Quote/Reply Visual (for demonstration) - Shows on some sent messages */}
      {isSent && message.text && message.text.includes('usually buy') && (
        <View style={[styles.quotedMessage, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
          <View style={[styles.quotedBorder, { backgroundColor: theme.colors.primary }]} />
          <View style={styles.quotedContent}>
            <Text style={[styles.quotedSender, { color: theme.colors.primary }]}>
              Zaire Dorwart
            </Text>
            <Text style={[styles.quotedText, { color: theme.colors.messageText }]} numberOfLines={1}>
              Please help me find a good monitor for the...
            </Text>
          </View>
        </View>
      )}
      
      {/* Image Message */}
      {message.type === 'image' && message.thumbnailUrl && (
        <Pressable onPress={() => onSetShowFullImage(true)}>
          <View style={[
            styles.imageContainer,
            imageDimensions.width > 0 && {
              width: imageDimensions.width,
              height: imageDimensions.height,
            }
          ]}>
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator color={isSent ? theme.colors.messageText : theme.colors.primary} />
              </View>
            )}
            <Image
              source={{ uri: message.thumbnailUrl }}
              style={styles.thumbnail}
              onLoadStart={() => onSetImageLoading(true)}
              onLoad={(e) => {
                onSetImageLoading(false);
                // Calculate dimensions to fit image while maintaining aspect ratio
                const { width, height } = e.nativeEvent.source;
                const maxWidth = 280;
                const maxHeight = 400;
                const minWidth = 150;
                const minHeight = 150;
                
                let displayWidth = width;
                let displayHeight = height;
                
                // If image is too wide
                if (width > maxWidth) {
                  displayWidth = maxWidth;
                  displayHeight = (height / width) * maxWidth;
                }
                
                // If image is too tall
                if (displayHeight > maxHeight) {
                  displayHeight = maxHeight;
                  displayWidth = (width / height) * maxHeight;
                }
                
                // Ensure minimum dimensions
                if (displayWidth < minWidth) {
                  displayWidth = minWidth;
                  displayHeight = (height / width) * minWidth;
                }
                
                if (displayHeight < minHeight) {
                  displayHeight = minHeight;
                  displayWidth = (width / height) * minHeight;
                }
                
                onSetImageDimensions({
                  width: Math.round(displayWidth),
                  height: Math.round(displayHeight),
                });
              }}
              resizeMode="cover"
            />
          </View>
          {/* Caption */}
          {message.caption && (
            <>
              {/* Translation Display for Image Caption - Show ABOVE original caption */}
              {showTranslation && translatedText && (
                <View style={[styles.translationContainer, { 
                  backgroundColor: isSent ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.05)',
                  borderBottomColor: isSent ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)',
                  marginTop: 4,
                }]}>
                  <View style={styles.translationHeader}>
                    <Ionicons 
                      name="language" 
                      size={12} 
                      color={isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.translationLabel, { 
                      color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary 
                    }]}>
                      Translation
                    </Text>
                    
                    {/* Formality Badge */}
                    {translationData && typeof translationData !== 'string' && translationData.formalityLevel && (
                      <View style={[styles.formalityBadge, {
                        backgroundColor: isSent ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      }]}>
                        <Text style={[styles.formalityText, {
                          color: isSent ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary,
                        }]}>
                          {translationData.formalityLevel === 'casual' && '😊 Casual'}
                          {translationData.formalityLevel === 'formal' && '👔 Formal'}
                          {translationData.formalityLevel === 'professional' && '💼 Professional'}
                          {translationData.formalityLevel === 'friendly' && '🤗 Friendly'}
                        </Text>
                      </View>
                    )}
                    
                    <Pressable 
                      onPress={() => onSetShowTranslation(false)}
                      hitSlop={8}
                    >
                      <Ionicons 
                        name="close-circle" 
                        size={12} 
                        color={isSent ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary} 
                      />
                    </Pressable>
                  </View>
                  <Text style={[
                    theme.typography.body,
                    styles.translationText,
                    {
                      color: isSent ? theme.colors.messageText : theme.colors.messageTextReceived,
                      fontWeight: '700', // Bold text
                    }
                  ]}>
                    {translatedText}
                  </Text>
                </View>
              )}

              {/* Original Caption */}
              <Text style={[
                theme.typography.body,
                styles.caption,
                { color: isSent ? theme.colors.messageText : theme.colors.text }
              ]}>
                {message.caption}
              </Text>

              {/* Show translation button only if translation exists but is hidden */}
              {!showTranslation && translatedText && (
                <Pressable 
                  style={styles.translateButton}
                  onPress={() => onSetShowTranslation(true)}
                  hitSlop={8}
                >
                  <Ionicons 
                    name="language" 
                    size={12} 
                    color={isSent ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary} 
                  />
                  <Text style={[styles.translateButtonText, { 
                    color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary 
                  }]}>
                    See translation
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </Pressable>
      )}
      
      {/* Text Message */}
      {message.type === 'text' && message.text && (
        <>
          {/* Message Text - Show either original or translated based on swap state */}
          {showTranslatedText && translatedText ? (
            // Show translated text - simple, like normal message
            <Text style={[
              theme.typography.body,
              { color: isSent ? theme.colors.messageText : theme.colors.messageTextReceived }
            ]}>
              {translatedText}
            </Text>
          ) : isTranslating ? (
            // Show loading state while translating - keep original text visible with spinner
            <View style={styles.translatingContainer}>
              <Text style={[
                theme.typography.body,
                { color: isSent ? theme.colors.messageText : theme.colors.messageTextReceived }
              ]}>
                {message.text}
              </Text>
              <View style={styles.translatingIndicator}>
                <ActivityIndicator size="small" color={isSent ? 'rgba(255,255,255,0.8)' : theme.colors.primary} />
                <Text style={[
                  styles.translatingText,
                  { color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }
                ]}>
                  Translating...
                </Text>
              </View>
            </View>
          ) : (
            // Show original text
            <Text style={[
              theme.typography.body, 
              { color: isSent ? theme.colors.messageText : theme.colors.messageTextReceived }
            ]}>
              {message.text}
            </Text>
          )}
          
          {/* Translation Metadata - Show original text when sent as translation */}
          {message.sentAsTranslation && message.originalText && (
            <View style={[styles.translationMetadata, { 
              backgroundColor: isSent ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderLeftColor: isSent ? 'rgba(255,255,255,0.3)' : theme.colors.primary,
            }]}>
              <View style={styles.translationMetadataHeader}>
                <Ionicons 
                  name="language" 
                  size={12} 
                  color={isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary} 
                />
                <Text style={[styles.translationMetadataLabel, { 
                  color: isSent ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary 
                }]}>
                  Original ({message.originalLanguage?.toUpperCase() || 'Unknown'})
                </Text>
              </View>
              <Text style={[styles.translationMetadataText, { 
                color: isSent ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary 
              }]}>
                {message.originalText}
              </Text>
            </View>
          )}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  quotedMessage: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  quotedBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
  },
  quotedContent: {
    flex: 1,
  },
  quotedSender: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  quotedText: {
    fontSize: 13,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    width: 200,
    height: 200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  caption: {
    marginTop: 4,
  },
  // Translation styles
  translationContainer: {
    marginBottom: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 6,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  translationLabel: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formalityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  formalityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  translationText: {
    fontSize: 15,
    lineHeight: 22,
  },
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 2,
  },
  translateButtonText: {
    fontSize: 11,
    fontWeight: '400',
  },
  // Translation metadata styles (for sent-as-translation feature)
  translationMetadata: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  translationMetadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  translationMetadataLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  translationMetadataText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  translatingContainer: {
    gap: 8,
  },
  translatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  translatingText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
