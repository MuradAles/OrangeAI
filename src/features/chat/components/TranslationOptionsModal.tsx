import { useTheme } from '@/shared/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface TranslationOption {
  id: string;
  label: string;
  text: string;
  language?: string;
}

interface TranslationOptionsModalProps {
  visible: boolean;
  originalText: string;
  originalLanguage: string;
  chatLanguages: string[];
  onClose: () => void;
  onSelectOption: (text: string) => void;
}

export const TranslationOptionsModal: React.FC<TranslationOptionsModalProps> = ({
  visible,
  originalText,
  originalLanguage,
  chatLanguages,
  onClose,
  onSelectOption,
}) => {
  const theme = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [options, setOptions] = useState<TranslationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);

  // Language names
  const languageNames: Record<string, string> = {
    en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
    it: 'Italiano', pt: 'Português', ru: 'Русский', ja: '日本語',
    ko: '한국어', zh: '中文', ar: 'العربية', hi: 'हिन्दी',
    tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska',
  };

  // Set default language when modal opens
  useEffect(() => {
    if (visible && chatLanguages.length > 0) {
      // Choose first chat language that's not the original language
      let targetLang = chatLanguages.find(lang => lang !== originalLanguage);
      
      // If no different language found in chat, default to English if original isn't English
      if (!targetLang) {
        targetLang = originalLanguage !== 'en' ? 'en' : 'es';
        console.log('⚠️ All chat languages are same as original, defaulting to:', targetLang);
      }
      
      console.log('🎯 Default target language:', targetLang, '(from original:', originalLanguage + ')');
      setSelectedLanguage(targetLang);
    }
  }, [visible, chatLanguages, originalLanguage]);

  // Generate translation options when language or visibility changes
  useEffect(() => {
    if (visible && originalText && selectedLanguage) {
      generateOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, originalText, selectedLanguage, originalLanguage]);

  const generateOptions = async () => {
    console.log('🔄 Generating translation options:', {
      originalLanguage,
      selectedLanguage,
      originalText: originalText.substring(0, 50),
    });
    
    setIsLoading(true);
    setError(null);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/services/firebase/FirebaseConfig');

      // Always include original
      const newOptions: TranslationOption[] = [
        {
          id: 'original',
          label: `Original (${languageNames[originalLanguage] || originalLanguage})`,
          text: originalText,
          language: originalLanguage,
        },
      ];

      // If translating to different language, get all variations
      if (selectedLanguage !== originalLanguage) {
         console.log('🌐 Calling translatePreview function...');
         // Get standard translation
         const translateFn = httpsCallable(functions, 'translatePreview');
         const translateResult: any = await translateFn({
           messageText: originalText,
           targetLanguage: selectedLanguage,
         });
         
         console.log('✅ Translation result:', translateResult.data);

        if (translateResult.data.success && translateResult.data.translated) {
          const translatedText = translateResult.data.translated;
          
          newOptions.push({
            id: 'translated',
            label: `Translated (${languageNames[selectedLanguage] || selectedLanguage})`,
            text: translatedText,
            language: selectedLanguage,
          });

          // Get formality variations (Casual, Formal, Professional)
          const adjustFn = httpsCallable(functions, 'adjustFormality');
          
          const tones = [
            { id: 'casual', label: 'Casual' },
            { id: 'formal', label: 'Formal' },
            { id: 'professional', label: 'Professional' },
          ];

          for (const tone of tones) {
            try {
              const adjustResult: any = await adjustFn({
                messageText: translatedText,
                formalityLevel: tone.id,
                targetLanguage: selectedLanguage,
              });

              if (adjustResult.data.success && adjustResult.data.adjustedMessage) {
                newOptions.push({
                  id: tone.id,
                  label: `${tone.label} (${languageNames[selectedLanguage] || selectedLanguage})`,
                  text: adjustResult.data.adjustedMessage,
                  language: selectedLanguage,
                });
              }
            } catch (error) {
              console.error(`Error generating ${tone.id} version:`, error);
            }
          }
        } else {
          console.log('⚠️ No translation returned from API');
        }
      } else {
        console.log('ℹ️ Same language - skipping translation');
      }

      console.log('✅ Generated options:', newOptions.length, 'options');
      setOptions(newOptions);
    } catch (error: any) {
      console.error('❌ Error generating translation options:', error);
      const errorMessage = error?.message || 'Failed to generate translations';
      setError(errorMessage);
      // Fallback to just original
      setOptions([
        {
          id: 'original',
          label: `Original (${languageNames[originalLanguage] || originalLanguage})`,
          text: originalText,
          language: originalLanguage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (option: TranslationOption) => {
    console.log('🎯 Option selected:', option.label, '- Text:', option.text.substring(0, 50));
    onSelectOption(option.text);
    onClose();
  };

  return (
    <>
      {/* Main Translation Options Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable 
          style={styles.overlay}
          onPress={onClose}
        >
          <Pressable 
            style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Translation Options
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            {/* Language Selector */}
            <View style={[styles.languageSelectorContainer, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.languageLabel, { color: theme.colors.textSecondary }]}>
                Translate to:
              </Text>
              <Pressable
                style={[styles.languageButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setShowLanguageMenu(true)}
                disabled={isLoading}
              >
                <Text style={[styles.languageButtonText, { color: theme.colors.text }]}>
                  {languageNames[selectedLanguage] || selectedLanguage}
                </Text>
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                )}
              </Pressable>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '15' }]}>
                <Ionicons name="warning" size={20} color={theme.colors.error} />
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {error}
                </Text>
              </View>
            )}

            {/* Options List */}
            <ScrollView style={styles.optionsList}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                    Generating options...
                  </Text>
                </View>
              ) : (
                options.map((option) => (
                  <Pressable
                    key={option.id}
                    style={[styles.optionItem, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleSelectOption(option)}
                  >
                    <View style={styles.optionHeader}>
                      <Text style={[styles.optionLabel, { color: theme.colors.primary }]}>
                        {option.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.optionText, { color: theme.colors.text }]} numberOfLines={3}>
                      {option.text}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageMenu(false)}
      >
        <Pressable 
          style={styles.overlay}
          onPress={() => setShowLanguageMenu(false)}
        >
          <View style={[styles.languageMenuContainer, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.languageMenuTitle, { color: theme.colors.text }]}>
              Select Language
            </Text>
            <ScrollView style={styles.languageList}>
              {/* Chat Languages Section */}
              {chatLanguages.length > 0 && (
                <>
                  <Text style={[styles.languageSectionTitle, { color: theme.colors.textSecondary }]}>
                    Chat Languages
                  </Text>
                  {chatLanguages.map((lang) => (
                    <Pressable
                      key={`chat-${lang}`}
                      style={[
                        styles.languageMenuItem,
                        selectedLanguage === lang && { backgroundColor: theme.colors.primary + '15' }
                      ]}
                      onPress={() => {
                        // Clear options immediately to show loading state
                        setOptions([]);
                        setSelectedLanguage(lang);
                        setShowLanguageMenu(false);
                      }}
                    >
                      <Text style={[styles.languageMenuItemText, { color: theme.colors.text }]}>
                        {languageNames[lang] || lang}
                      </Text>
                      {selectedLanguage === lang && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </Pressable>
                  ))}
                </>
              )}
              
              {/* All Languages Section */}
              <Text style={[styles.languageSectionTitle, { color: theme.colors.textSecondary }]}>
                All Languages
              </Text>
              {Object.keys(languageNames)
                .filter(lang => !chatLanguages.includes(lang))
                .map((lang) => (
                  <Pressable
                    key={`all-${lang}`}
                    style={[
                      styles.languageMenuItem,
                      selectedLanguage === lang && { backgroundColor: theme.colors.primary + '15' }
                    ]}
                    onPress={() => {
                      // Clear options immediately to show loading state
                      setOptions([]);
                      setSelectedLanguage(lang);
                      setShowLanguageMenu(false);
                    }}
                  >
                    <Text style={[styles.languageMenuItemText, { color: theme.colors.text }]}>
                      {languageNames[lang] || lang}
                    </Text>
                    {selectedLanguage === lang && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  languageSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  languageLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionsList: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  optionItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  languageMenuContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    borderRadius: 12,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  languageMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  languageList: {
    maxHeight: 240,
  },
  languageMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  languageMenuItemText: {
    fontSize: 15,
  },
});

