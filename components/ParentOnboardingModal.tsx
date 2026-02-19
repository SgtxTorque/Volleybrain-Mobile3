import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  color: string;
}

type Props = {
  visible: boolean;
  onDone?: () => void;
  onMount?: () => void;
  onUnmount?: () => void;
  onVisibleChange?: (v: boolean) => void;
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      elevation: 9999,
    },
    container: {
      width: '92%',
      maxHeight: '90%',
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 0,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 24,
      paddingBottom: 32,
    },
    slide: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.glassCard,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    indicators: {
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.glassBorder,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    nextBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#000',
    },
    skipBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    skipBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });

export default function ParentOnboardingModal({
  visible,
  onDone,
  onMount,
  onUnmount,
}: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  React.useEffect(() => {
    if (visible) {
      onMount?.();
    } else {
      onUnmount?.();
    }
  }, [visible, onMount, onUnmount]);

  const slides: Slide[] = [
    {
      id: 'welcome',
      title: 'Welcome to Volleybrain',
      subtitle: 'Team Management Made Easy',
      icon: 'volleyball',
      description: 'Connect with coaches, track your child\'s progress, and stay updated with team events.',
      color: '#FF6B6B',
    },
    {
      id: 'teams',
      title: 'Join Your Child\'s Team',
      subtitle: 'Connect & Communicate',
      icon: 'people',
      description: 'Get invited to teams by coaches. Accept invitations to access schedules, results, and team chat.',
      color: '#4ECDC4',
    },
    {
      id: 'notifications',
      title: 'Stay Connected',
      subtitle: 'Get Important Updates',
      icon: 'notifications',
      description: 'Receive notifications about games, practices, payments, and important team announcements.',
      color: '#45B7D1',
    },
    {
      id: 'payments',
      title: 'Manage Payments',
      subtitle: 'Easy Payment Processing',
      icon: 'card',
      description: 'View season fees, make payments securely, and track your payment history.',
      color: '#96CEB4',
    },
    {
      id: 'ready',
      title: 'You\'re All Set!',
      subtitle: 'Ready to Go',
      icon: 'checkmark-circle',
      description: 'You\'re ready to manage your child\'s volleyball journey. Let\'s get started!',
      color: '#FFEAA7',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onDone?.();
    }
  };

  const handleSkip = () => {
    onDone?.();
  };

  if (!user || !profile || !visible) {
    if (__DEV__) console.log('[ParentOnboardingModal] Return null - user:', !!user, 'profile:', !!profile, 'visible:', visible);
    return null;
  }

  const styles = createStyles(colors);
  const slide = slides[currentSlide];

  return (
    <View
      style={styles.overlay}
      onTouchStart={() => {
        if (__DEV__) console.log('[ParentOnboardingModal] OVERLAY TAP CAPTURED');
      }}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: slide.color + '20' }]}>
              <Ionicons name={slide.icon as any} size={50} color={slide.color} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.indicators}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === currentSlide && styles.dotActive]}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>
                  {currentSlide === slides.length - 1 ? 'Done' : 'Skip'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>
                  {currentSlide === slides.length - 1 ? 'Finish' : 'Next'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
