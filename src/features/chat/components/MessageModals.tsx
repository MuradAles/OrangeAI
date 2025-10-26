import { useTheme } from '@/shared/hooks/useTheme';
import { Message } from '@/shared/types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface CulturalAnalysis {
  messageExplanation?: string; // Overall explanation of what the message means
  culturalPhrases: {
    phrase: string;
    explanation: string;
    culturalContext: string;
    examples: string[];
    confidence: number;
    englishPhrase?: string;
  }[];
  slangExpressions: {
    slang: string;
    standardMeaning: string;
    usage: string;
    confidence: number;
    englishSlang?: string;
  }[];
}

interface MessageModalsProps {
  // Image modal props
  message: Message;
  showFullImage: boolean;
  onCloseImage: () => void;
  
  // Cultural popup props (individual phrase)
  showCulturalPopup: boolean;
  selectedPhrase: {
    phrase: any;
    type: 'cultural' | 'slang';
  } | null;
  onCloseCulturalPopup: () => void;
  
  // Comprehensive cultural context modal
  showCulturalContext?: boolean;
  culturalAnalysis?: CulturalAnalysis | null;
  translatedText?: string | null;
  isAnalyzing?: boolean;
  onCloseCulturalContext?: () => void;
}

export const MessageModals: React.FC<MessageModalsProps> = ({
  message,
  showFullImage,
  onCloseImage,
  showCulturalPopup,
  selectedPhrase,
  onCloseCulturalPopup,
  showCulturalContext = false,
  culturalAnalysis = null,
  translatedText = null,
  isAnalyzing = false,
  onCloseCulturalContext,
}) => {
  const theme = useTheme();
  const dynamicStyles = getStyles(theme);
  
  return (
    <>
      {/* Full-Screen Image Modal */}
      {message.type === 'image' && message.imageUrl && (
        <Modal
          visible={showFullImage}
          transparent
          onRequestClose={onCloseImage}
          animationType="fade"
        >
            <Pressable 
              style={dynamicStyles.fullImageModal}
              onPress={onCloseImage}
            >
              <View style={dynamicStyles.fullImageHeader}>
                <Pressable onPress={onCloseImage}>
                  <Ionicons name="close" size={32} color="#fff" />
                </Pressable>
              </View>
              <Image
                source={{ uri: message.imageUrl }}
                style={dynamicStyles.fullImage}
                resizeMode="contain"
              />
              {message.caption && (
                <View style={dynamicStyles.fullImageCaptionContainer}>
                  <Text style={dynamicStyles.fullImageCaption}>{message.caption}</Text>
                </View>
              )}
            </Pressable>
        </Modal>
      )}

       {/* Cultural Analysis Popup (individual phrase) */}
       {showCulturalPopup && selectedPhrase && (
         <Modal
           visible={showCulturalPopup}
           transparent={true}
           animationType="none"
           onRequestClose={onCloseCulturalPopup}
         >
           <View style={dynamicStyles.popupOverlay}>
             <View style={[dynamicStyles.popupContent, { backgroundColor: theme.colors.background }]}>
               {/* Close button in top right */}
               <Pressable
                 style={dynamicStyles.popupCloseX}
                 onPress={onCloseCulturalPopup}
               >
                 <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
               </Pressable>
               
               <Text style={[dynamicStyles.popupTitle, { color: theme.colors.text }]}>
                 {selectedPhrase.type === 'cultural' ? 'Cultural Phrase' : 'Slang/Idiom'}
               </Text>
               
               <View style={dynamicStyles.popupItem}>
                 <Text style={dynamicStyles.popupPhrase}>
                   {selectedPhrase.phrase.phrase || selectedPhrase.phrase.slang} / {selectedPhrase.phrase.englishPhrase || selectedPhrase.phrase.englishSlang || 'N/A'}
                 </Text>
                 <Text style={[dynamicStyles.popupExplanation, { color: theme.colors.text }]}>
                   {selectedPhrase.type === 'cultural' 
                     ? selectedPhrase.phrase.explanation 
                     : selectedPhrase.phrase.standardMeaning
                   }
                 </Text>
                 {selectedPhrase.type === 'cultural' && selectedPhrase.phrase.culturalContext && (
                   <Text style={[dynamicStyles.popupContext, { color: theme.colors.textSecondary }]}>
                     Cultural Context: {selectedPhrase.phrase.culturalContext}
                   </Text>
                 )}
                 {selectedPhrase.type === 'slang' && selectedPhrase.phrase.usage && (
                   <Text style={[dynamicStyles.popupContext, { color: theme.colors.textSecondary }]}>
                     Usage: {selectedPhrase.phrase.usage}
                   </Text>
                 )}
               </View>
             </View>
           </View>
         </Modal>
       )}

      {/* Comprehensive Cultural Context Modal */}
      {showCulturalContext && (
        <Modal
          visible={showCulturalContext}
          transparent={true}
          animationType="slide"
          onRequestClose={onCloseCulturalContext}
        >
          <Pressable 
            style={dynamicStyles.culturalContextOverlay}
            onPress={onCloseCulturalContext}
          >
            <Pressable 
              style={[dynamicStyles.culturalContextContainer, { backgroundColor: theme.colors.background }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={[dynamicStyles.culturalContextHeader, { borderBottomColor: theme.colors.border }]}>
                <View style={dynamicStyles.headerTitleRow}>
                  <Ionicons name="bulb" size={24} color="#FFD700" />
                  <Text style={[dynamicStyles.culturalContextTitle, { color: theme.colors.text }]}>Cultural Context</Text>
                </View>
                <Pressable onPress={onCloseCulturalContext}>
                  <Ionicons name="close" size={28} color={theme.colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={dynamicStyles.culturalContextScroll} showsVerticalScrollIndicator={false}>
                {/* 1. Translation Section - ALWAYS AT TOP */}
                {translatedText && (
                  <View style={dynamicStyles.translationSection}>
                    <View style={dynamicStyles.sectionHeader}>
                      <Ionicons name="swap-horizontal" size={20} color="#007AFF" />
                      <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Translation</Text>
                    </View>
                    <View style={[dynamicStyles.translationBox, { backgroundColor: theme.colors.backgroundElevated }]}>
                      <Text style={[dynamicStyles.translationText, { color: theme.colors.text }]}>{translatedText}</Text>
                    </View>
                  </View>
                )}

                {/* Loading State - BELOW TRANSLATION */}
                {isAnalyzing && !culturalAnalysis && (
                  <View style={dynamicStyles.loadingState}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={[dynamicStyles.loadingText, { color: theme.colors.text }]}>Analyzing cultural context...</Text>
                    <Text style={[dynamicStyles.loadingSubtext, { color: theme.colors.textSecondary }]}>This may take a few seconds</Text>
                  </View>
                )}

                {/* 2. Message Explanation Section - IN MIDDLE */}
                {culturalAnalysis && culturalAnalysis.messageExplanation && (
                  <View style={dynamicStyles.explanationSection}>
                    <View style={dynamicStyles.sectionHeader}>
                      <Ionicons name="bulb" size={22} color="#FFD700" />
                      <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>What This Means</Text>
                    </View>
                    <View style={[dynamicStyles.explanationBox, { backgroundColor: theme.colors.backgroundElevated }]}>
                      <Text style={[dynamicStyles.explanationMainText, { color: theme.colors.text }]}>{culturalAnalysis.messageExplanation}</Text>
                    </View>
                  </View>
                )}

                {/* Cultural Context (Slangs & Idioms combined) - Only show if items exist */}
                {culturalAnalysis && (culturalAnalysis.culturalPhrases.length > 0 || culturalAnalysis.slangExpressions.length > 0) && (
                  <View style={dynamicStyles.section}>
                    <View style={dynamicStyles.sectionHeader}>
                      <Ionicons name="book-outline" size={20} color="#FF9500" />
                      <Text style={[dynamicStyles.sectionTitle, { color: theme.colors.text }]}>Cultural Details</Text>
                      <View style={[dynamicStyles.badge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={dynamicStyles.badgeText}>
                          {culturalAnalysis.culturalPhrases.length + culturalAnalysis.slangExpressions.length}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Cultural Phrases */}
                    {culturalAnalysis.culturalPhrases.map((item, index) => (
                      <View key={`cultural-${index}`} style={[dynamicStyles.culturalItem, { backgroundColor: theme.colors.backgroundElevated }]}>
                        <Text style={[dynamicStyles.phraseText, { color: theme.colors.text }]}>
                          {item.phrase}
                          {item.englishPhrase && <Text style={dynamicStyles.phraseEnglish}> → {item.englishPhrase}</Text>}
                        </Text>
                        <Text style={[dynamicStyles.explanationText, { color: theme.colors.textSecondary }]}>{item.explanation}</Text>
                        {item.culturalContext && (
                          <View style={[dynamicStyles.contextBox, { borderTopColor: theme.colors.border }]}>
                            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                            <Text style={[dynamicStyles.contextText, { color: theme.colors.textSecondary }]}>{item.culturalContext}</Text>
                          </View>
                        )}
                        {item.examples && item.examples.length > 0 && (
                          <View style={[dynamicStyles.examplesBox, { borderTopColor: theme.colors.border }]}>
                            <Text style={[dynamicStyles.examplesLabel, { color: theme.colors.textTertiary }]}>Examples:</Text>
                            {item.examples.slice(0, 2).map((example, idx) => (
                              <Text key={idx} style={[dynamicStyles.exampleText, { color: theme.colors.textSecondary }]}>• {example}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                    
                    {/* Slang Expressions */}
                    {culturalAnalysis.slangExpressions.map((item, index) => (
                      <View key={`slang-${index}`} style={[dynamicStyles.culturalItem, { backgroundColor: theme.colors.backgroundElevated }]}>
                        <Text style={[dynamicStyles.phraseText, { color: theme.colors.text }]}>
                          {item.slang}
                          {item.englishSlang && <Text style={dynamicStyles.phraseEnglish}> → {item.englishSlang}</Text>}
                        </Text>
                        <Text style={[dynamicStyles.explanationText, { color: theme.colors.textSecondary }]}>{item.standardMeaning}</Text>
                        {item.usage && (
                          <View style={[dynamicStyles.usageBox, { borderTopColor: theme.colors.border }]}>
                            <Text style={[dynamicStyles.usageLabel, { color: theme.colors.textTertiary }]}>Usage: </Text>
                            <Text style={[dynamicStyles.usageText, { color: theme.colors.textSecondary }]}>{item.usage}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* No Analysis Found (shouldn't happen often) */}
                {!culturalAnalysis && !translatedText && (
                  <View style={dynamicStyles.emptyState}>
                    <Ionicons name="bulb-outline" size={48} color={theme.colors.textTertiary} />
                    <Text style={[dynamicStyles.emptyStateText, { color: theme.colors.textSecondary }]}>No analysis available</Text>
                    <Text style={[dynamicStyles.emptyStateSubtext, { color: theme.colors.textTertiary }]}>
                      Press the translate button first to analyze this message
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

const getStyles = (theme: any) => StyleSheet.create({
  fullImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  fullImageCaptionContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 12,
  },
  fullImageCaption: {
    color: '#fff',
    fontSize: 16,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContent: {
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxHeight: '80%',
    width: '95%',
    maxWidth: 400,
  },
  popupCloseX: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  popupItem: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  popupPhrase: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  popupExplanation: {
    fontSize: 16,
    lineHeight: 22,
  },
  popupContext: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
  },
  popupCloseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  popupCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Comprehensive Cultural Context Modal Styles
  culturalContextOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  culturalContextContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    paddingBottom: 20,
  },
  culturalContextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  culturalContextTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  culturalContextScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  explanationSection: {
    marginBottom: 20,
  },
  explanationBox: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  explanationMainText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  translationSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  translationBox: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  translationText: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  culturalItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  phraseText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 8,
  },
  phraseEnglish: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  examplesBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  examplesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  contextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  contextText: {
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
  usageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  usageText: {
    fontSize: 13,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
