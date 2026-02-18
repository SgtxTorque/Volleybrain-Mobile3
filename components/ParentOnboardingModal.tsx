import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ONBOARDING_KEY = 'vb_parent_onboarded';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

type Props = {
  onDismiss?: () => void;
};

export default function ParentOnboardingModal({ onDismiss }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides: Slide[] = [
    {
      title: 'Welcome to VolleyBrain!',
      description: 'Your one-stop hub for managing your child\'s volleyball journey',
      icon: 'home',
      iconColor: colors.primary,
    },
    {
      title: 'Track Your Child',
      description: 'View stats, schedules, and achievements from My Kids',
      icon: 'people',
      iconColor: colors.info,
    },
    {
      title: 'Stay Connected',
      description: 'Chat with coaches, get schedule updates, and never miss a game',
      icon: 'chatbubbles',
      iconColor: colors.success,
    },
    {
      title: 'Manage Payments',
      description: 'View and pay registration fees from the Payments section',
      icon: 'wallet',
      iconColor: colors.warning,
    },
  ];

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const hasOnboarded = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (hasOnboarded) {
        setVisible(false);
        return;
      }
      // Small delay to let the dashboard render first
      setTimeout(() => setVisible(true), 500);
    } catch (e) {
      // On error, don't show modal — don't block the user
      console.log('Error checking onboarding status:', e);
      setVisible(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (e) {
      console.log('Error saving onboarding status:', e);
    }
    setVisible(false);
    onDismiss?.();
  };

  const animateSlideTransition = (nextSlide: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentSlide(nextSlide);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      animateSlideTransition(currentSlide + 1);
    } else {
      handleDismiss();
    }
  };

  const s = createStyles(colors);
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={s.overlay}>
        <View style={s.modalContainer}>
          {/* Skip button — always visible */}
          <TouchableOpacity style={s.skipBtn} onPress={handleDismiss}>
            <Text style={s.skipText}>{isLastSlide ? 'Close' : 'Skip'}</Text>
          </TouchableOpacity>

          {/* Slide Content */}
          <Animated.View style={[s.slideContent, { opacity: fadeAnim }]}>
            {/* Icon */}
            <View style={[s.iconCircle, { backgroundColor: slide.iconColor + '20' }]}>
              <Ionicons name={slide.icon} size={48} color={slide.iconColor} />
            </View>

            {/* Text */}
            <Text style={s.slideTitle}>{slide.title}</Text>
            <Text style={s.slideDescription}>{slide.description}</Text>
          </Animated.View>

          {/* Dots Indicator */}
          <View style={s.dotsRow}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  s.dot,
                  index === currentSlide
                    ? { backgroundColor: colors.primary, width: 24 }
                    : { backgroundColor: colors.textMuted + '40' },
                ]}
              />
            ))}
          </View>

          {/* Next / Get Started Button */}
          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={s.nextBtnText}>
              {isLastSlide ? 'Get Started!' : 'Next'}
            </Text>
            {!isLastSlide && (
              <Ionicons name="arrow-forward" size={18} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
        },
        android: { elevation: 12 },
      }),
    },
    skipBtn: {
      position: 'absolute',
      top: 16,
      right: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    skipText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
    slideContent: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 24,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    slideTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    slideDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    nextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 16,
      borderRadius: 14,
    },
    nextBtnText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#000',
    },
  });
