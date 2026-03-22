/**
 * WelcomeScreen — 4-screen onboarding carousel with mascot illustrations.
 * Swipeable horizontal paging with page indicator dots.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACHIEVEMENT_IMAGES, FAMILY_IMAGES } from '@/constants/mascot-images';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_W } = Dimensions.get('window');

type OnboardingSlide = {
  key: string;
  image: any;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  imageWidth: number;
};

const SLIDES: OnboardingSlide[] = [
  {
    key: 'meet',
    image: FAMILY_IMAGES.MEET_LYNX,
    title: "Hey! I'm Lynx!",
    subtitle: 'Your sports companion',
    accessibilityLabel: 'Meet Lynx mascot',
    imageWidth: SCREEN_W * 0.55,
  },
  {
    key: 'family',
    image: FAMILY_IMAGES.FAMILY,
    title: 'Built for Players, Parents & Coaches',
    subtitle: 'Everyone gets their own experience',
    accessibilityLabel: 'Lynx family illustration',
    imageWidth: SCREEN_W * 0.6,
  },
  {
    key: 'journey',
    image: ACHIEVEMENT_IMAGES.REACHED_GOAL,
    title: 'Earn Badges. Level Up. Get Better.',
    subtitle: 'Every practice, game, and achievement counts',
    accessibilityLabel: 'Reached goal illustration',
    imageWidth: SCREEN_W * 0.55,
  },
  {
    key: 'start',
    image: ACHIEVEMENT_IMAGES.ACHIEVEMENT_EARNED,
    title: 'Ready to earn your first badge?',
    subtitle: '',
    accessibilityLabel: 'Achievement earned illustration',
    imageWidth: SCREEN_W * 0.55,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const goToEnd = () => {
    flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  };

  const isFinal = currentIndex === SLIDES.length - 1;

  const renderSlide = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <View style={s.slide}>
        <Image
          source={item.image}
          style={{ width: item.imageWidth, height: item.imageWidth }}
          resizeMode="contain"
          accessibilityLabel={item.accessibilityLabel}
        />
        <Text style={s.title}>{item.title}</Text>
        {item.subtitle ? <Text style={s.subtitle}>{item.subtitle}</Text> : null}

        {/* Final screen CTAs */}
        {index === SLIDES.length - 1 && (
          <View style={s.ctaWrap}>
            <TouchableOpacity
              style={s.ctaPrimary}
              onPress={() => router.push('/(auth)/signup')}
              activeOpacity={0.85}
            >
              <Text style={s.ctaPrimaryText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={s.ctaSecondaryText}>I Already Have an Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [router],
  );

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safe}>
        {/* Skip button */}
        {!isFinal && (
          <Pressable onPress={goToEnd} style={s.skipBtn} hitSlop={12}>
            <Text style={s.skipText}>Skip</Text>
          </Pressable>
        )}

        {/* Carousel */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
          keyExtractor={item => item.key}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          style={s.carousel}
        />

        {/* Bottom section: dots + navigation */}
        <View style={s.bottomSection}>
          <View style={s.dotsRow}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === currentIndex && s.dotActive]} />
            ))}
          </View>

          {!isFinal ? (
            <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={s.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <Text style={s.legal}>
              By continuing, you agree to our{' '}
              <Text style={s.legalLink} onPress={() => router.push('/privacy-policy')}>
                Privacy Policy
              </Text>{' '}
              and{' '}
              <Text style={s.legalLink} onPress={() => router.push('/terms-of-service')}>
                Terms of Service
              </Text>
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.navy,
  },
  safe: {
    flex: 1,
  },
  skipBtn: {
    position: 'absolute',
    top: 8,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: FONTS.bodyBold,
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  ctaWrap: {
    width: '100%',
    gap: 12,
    marginTop: 40,
    alignItems: 'center',
  },
  ctaPrimary: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPrimaryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: '#fff',
  },
  ctaSecondaryText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: BRAND.skyBlue,
    width: 24,
  },
  nextBtn: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  legal: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 16,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});
