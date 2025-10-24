/**
 * Cultural Highlight Component
 * Highlights cultural phrases and slang with dotted underlines
 */

import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { CulturalPhrase, SlangExpression } from '../../shared/types/CulturalTypes';

interface CulturalHighlightProps {
  phrase: CulturalPhrase | SlangExpression;
  type: 'cultural' | 'slang';
  onTap: (phrase: CulturalPhrase | SlangExpression) => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CulturalHighlight: React.FC<CulturalHighlightProps> = ({
  phrase,
  type,
  onTap,
  children,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    onTap(phrase);
  };

  // Use inline Text with onPress instead of TouchableOpacity to avoid layout issues
  const underlineColor = type === 'cultural' ? '#FFC107' : '#28A745';
  
  return (
    <Text
      style={[
        textStyle,
        {
          textDecorationLine: 'underline',
          textDecorationColor: underlineColor,
          textDecorationStyle: 'solid', // 'dotted' doesn't work well on Android
        }
      ]}
      onPress={handlePress}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  // Removed - using inline styles for simplicity
});

export default CulturalHighlight;
