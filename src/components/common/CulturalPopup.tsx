/**
 * Cultural Popup Component
 * Displays cultural explanations in a modal popup
 */

import React from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { CulturalPhrase, SlangExpression } from '../../shared/types/CulturalTypes';

interface CulturalPopupProps {
  phrase: CulturalPhrase | SlangExpression;
  type: 'cultural' | 'slang';
  visible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export const CulturalPopup: React.FC<CulturalPopupProps> = ({
  phrase,
  type,
  visible,
  onClose,
  position,
}) => {
  if (!visible) return null;

  const isCultural = type === 'cultural';
  const culturalPhrase = phrase as CulturalPhrase;
  const slangExpression = phrase as SlangExpression;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.popup}>
          <View style={[styles.header, isCultural ? styles.culturalHeader : styles.slangHeader]}>
            <Text style={styles.headerText}>
              {isCultural ? '💡 Cultural Context' : '🔤 Slang Explanation'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.phraseContainer}>
              <Text style={styles.phraseText}>
                "{isCultural ? culturalPhrase.phrase : slangExpression.slang}"
              </Text>
              {!isCultural && slangExpression.translatedWord && (
                <Text style={styles.translatedText}>
                  {slangExpression.slang} / {slangExpression.translatedWord}
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionText}>
                {isCultural ? culturalPhrase.explanation : slangExpression.standardMeaning}
              </Text>
            </View>

            {!isCultural && slangExpression.fullExplanation && (
              <View style={styles.fullExplanationSection}>
                <Text style={styles.fullExplanationText}>
                  {slangExpression.fullExplanation}
                </Text>
              </View>
            )}

            {isCultural && culturalPhrase.culturalContext && (
              <View style={styles.contextBadge}>
                <Text style={styles.contextText}>{culturalPhrase.culturalContext}</Text>
              </View>
            )}
            
            {!isCultural && slangExpression.usage && (
              <View style={styles.usageBadge}>
                <Text style={styles.usageText}>{slangExpression.usage}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: Math.min(screenWidth - 60, 300),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  culturalHeader: {
    backgroundColor: '#FFC107',
  },
  slangHeader: {
    backgroundColor: '#28A745',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    padding: 16,
  },
  phraseContainer: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  translatedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#212529',
    textAlign: 'center',
  },
  fullExplanationSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28A745',
  },
  fullExplanationText: {
    fontSize: 14,
    lineHeight: 18,
    color: '#495057',
    textAlign: 'left',
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#495057',
    marginBottom: 4,
  },
  confidenceContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  confidenceText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contextBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  contextText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#856404',
  },
  usageBadge: {
    backgroundColor: '#D4EDDA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  usageText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#155724',
  },
});

export default CulturalPopup;
