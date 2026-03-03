import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_W } = Dimensions.get('window');
const TOUR_KEY = 'lynx_tour_completed';

type TourSlide = {
  id: string;
  icon: string;
  color: string;
  title: string;
  body: string;
};

const SLIDES: TourSlide[] = [
  {
    id: '1',
    icon: 'paw',
    color: BRAND.teal,
    title: 'Welcome to Lynx',
    body: 'Lynx helps you manage your youth sports team — schedules, communication, stats, and more.',
  },
  {
    id: '2',
    icon: 'chatbubbles',
    color: BRAND.skyBlue,
    title: 'Stay Connected',
    body: 'See your schedule, RSVP to events, chat with your team — all in one place.',
  },
  {
    id: '3',
    icon: 'trophy',
    color: BRAND.goldBrand,
    title: 'Track Progress',
    body: 'Earn badges, track stats, and celebrate achievements together.',
  },
];

type Props = {
  onDismiss: () => void;
};

export default function FirstLaunchTour({ onDismiss }: Props) {
  const router = useRouter();
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const dismiss = async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    onDismiss();
  };

  const handleCodeEntry = async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    router.push('/(auth)/redeem-code');
    onDismiss();
  };

  const handleCreateOrg = async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    router.push({ pathname: '/(auth)/signup', params: { createOrg: 'true' } });
    onDismiss();
  };

  const isLast = activeIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: TourSlide }) => (
    <View style={s.slide}>
      <View style={[s.iconCircle, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={56} color={item.color} />
      </View>
      <Text style={s.slideTitle}>{item.title}</Text>
      <Text style={s.slideBody}>{item.body}</Text>
    </View>
  );

  return (
    <View style={s.overlay}>
      {/* Skip button */}
      <TouchableOpacity style={s.skipBtn} onPress={dismiss}>
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        style={s.list}
      />

      {/* Dot indicators */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
        ))}
      </View>

      {/* Bottom CTAs — only on last slide */}
      {isLast ? (
        <View style={s.ctaWrap}>
          <TouchableOpacity style={s.ctaPrimary} onPress={handleCodeEntry}>
            <Ionicons name="ticket" size={18} color="#fff" />
            <Text style={s.ctaPrimaryText}>I have an invite code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.ctaOutline} onPress={dismiss}>
            <Text style={s.ctaOutlineText}>My coach will add me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCreateOrg}>
            <Text style={s.ctaLink}>I'm starting a new organization</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.ctaWrap}>
          <TouchableOpacity
            style={s.ctaPrimary}
            onPress={() => flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true })}
          >
            <Text style={s.ctaPrimaryText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND.offWhite,
    zIndex: 999,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  list: {
    flex: 1,
    marginTop: 80,
  },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  slideTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 26,
    color: BRAND.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  slideBody: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: BRAND.teal,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  ctaPrimary: {
    backgroundColor: BRAND.teal,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaPrimaryText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  ctaOutline: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaOutlineText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textMuted,
  },
  ctaLink: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.teal,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
