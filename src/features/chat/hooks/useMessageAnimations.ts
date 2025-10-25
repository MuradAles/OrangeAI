import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const useMessageAnimations = (isAnalyzing: boolean, isTranslating: boolean) => {
  // Magical animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkle1Anim = useRef(new Animated.Value(0)).current;
  const sparkle2Anim = useRef(new Animated.Value(0)).current;
  const sparkle3Anim = useRef(new Animated.Value(0)).current;

  // Translation animation values
  const translatePulseAnim = useRef(new Animated.Value(1)).current;
  const translateSparkle1Anim = useRef(new Animated.Value(0)).current;
  const translateSparkle2Anim = useRef(new Animated.Value(0)).current;
  const translateSparkle3Anim = useRef(new Animated.Value(0)).current;

  // Start magical animation when analyzing
  useEffect(() => {
    if (isAnalyzing) {
      // Pulse animation for the bulb
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      // Sparkle animations
      const sparkle1Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle1Anim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle1Anim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const sparkle2Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle2Anim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle2Anim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      const sparkle3Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle3Anim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(sparkle3Anim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      sparkle1Animation.start();
      sparkle2Animation.start();
      sparkle3Animation.start();

      return () => {
        pulseAnimation.stop();
        sparkle1Animation.stop();
        sparkle2Animation.stop();
        sparkle3Animation.stop();
      };
    } else {
      // Reset animations
      pulseAnim.setValue(1);
      sparkle1Anim.setValue(0);
      sparkle2Anim.setValue(0);
      sparkle3Anim.setValue(0);
    }
  }, [isAnalyzing, pulseAnim, sparkle1Anim, sparkle2Anim, sparkle3Anim]);

  // Start magical animation when translating
  useEffect(() => {
    if (isTranslating) {
      // Pulse animation for the translate button
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(translatePulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translatePulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      // Sparkle animations
      const sparkle1Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateSparkle1Anim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(translateSparkle1Anim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const sparkle2Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateSparkle2Anim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(translateSparkle2Anim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      const sparkle3Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateSparkle3Anim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(translateSparkle3Anim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      sparkle1Animation.start();
      sparkle2Animation.start();
      sparkle3Animation.start();

      return () => {
        pulseAnimation.stop();
        sparkle1Animation.stop();
        sparkle2Animation.stop();
        sparkle3Animation.stop();
      };
    } else {
      // Reset animations
      translatePulseAnim.setValue(1);
      translateSparkle1Anim.setValue(0);
      translateSparkle2Anim.setValue(0);
      translateSparkle3Anim.setValue(0);
    }
  }, [isTranslating, translatePulseAnim, translateSparkle1Anim, translateSparkle2Anim, translateSparkle3Anim]);

  return {
    // Cultural analysis animations
    pulseAnim,
    sparkle1Anim,
    sparkle2Anim,
    sparkle3Anim,
    
    // Translation animations
    translatePulseAnim,
    translateSparkle1Anim,
    translateSparkle2Anim,
    translateSparkle3Anim,
  };
};
