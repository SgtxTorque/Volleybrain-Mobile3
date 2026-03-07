/**
 * FirstTimeTour — 3-screen swipeable intro for new users.
 * Shows once after first registration. Stored in AsyncStorage.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOUR_STORAGE_KEY = 'lynx_has_seen_tour';

type TourSlide = {
  image: any;
  title: string;
  subtitle: string;
};

const SLIDES: TourSlide[] = [
  {
    image: require('@/assets/images/Meet-Lynx.png'),
    title: 'Welcome to Lynx!',
    subtitle: 'Your team\'s home base. Everything you need in one app.',
  },
  {
    image: require('@/assets/images/HiLynx.png'),
    title: 'Never Miss a Game',
    subtitle: 'RSVPs, directions, countdowns, and live updates — all at your fingertips.',
  },
  {
    image: require('@/assets/images/celebrate.png'),
    title: 'Watch Them Grow',
    subtitle: 'Stats, badges, challenges, and a player card that levels up all season.',
  },
];

type Props = {
  onDismiss: () => void;
};

export default function FirstTimeTour({ onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkTourStatus();
  }, []);

  const checkTourStatus = async () => {
    const seen = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      setVisible(true);
    }
  };

  const handleDismiss = useCallback(async () => {
    await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setVisible(false);
    onDismiss();
  }, [onDismiss]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDismiss();
    }
  }, [currentIndex, handleDismiss]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {/* Skip button */}
        <TouchableOpacity style={s.skipBtn} onPress={handleDismiss}>
          <Text style={s.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={s.slide}>
              <Image source={item.image} style={s.slideImage} resizeMode="contain" />
              <Text style={s.slideTitle}>{item.title}</Text>
              <Text style={s.slideSubtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Dots + CTA */}
        <View style={s.footer}>
          {/* Page dots */}
          <View style={s.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === currentIndex && s.dotActive]}
              />
            ))}
          </View>

          {/* Next / Get Started */}
          <TouchableOpacity style={s.ctaBtn} onPress={handleNext}>
            <Text style={s.ctaText}>
              {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.white,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 15,
    color: BRAND.textMuted,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  slideImage: {
    width: 200,
    height: 200,
  },
  slideTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 26,
    color: BRAND.textPrimary,
    textAlign: 'center',
  },
  slideSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    backgroundColor: BRAND.teal,
    width: 24,
  },
  ctaBtn: {
    backgroundColor: BRAND.teal,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 17,
    color: BRAND.white,
  },
});
