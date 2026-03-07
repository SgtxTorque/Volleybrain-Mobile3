/**
 * HeroBanner — 3-slide auto-advancing carousel for the Team Hub.
 * Slide 1: Team Photo
 * Slide 2: Next Game Countdown
 * Slide 3: Season Pulse (record, streak, top performer)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import CarouselDots from '@/components/ui/CarouselDots';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TeamData = {
  id: string;
  name: string;
  color: string | null;
  banner_url: string | null;
  logo_url: string | null;
  motto: string | null;
};

type NextGame = {
  id: string;
  opponent_name: string | null;
  opponent: string | null;
  event_date: string;
  start_time: string | null;
  event_time: string | null;
  location: string | null;
  venue_name: string | null;
};

type SeasonPulse = {
  wins: number;
  losses: number;
  streak: string; // "W3" or "L1"
  playerCount: number;
  topPerformer: string | null; // "Kills Leader: Ava (67)"
};

export type HeroBannerProps = {
  team: TeamData;
  nextGame: NextGame | null;
  seasonPulse: SeasonPulse | null;
  canEdit: boolean;
  onBannerUpdated?: (url: string) => void;
};

// ---------------------------------------------------------------------------
// Countdown helper
// ---------------------------------------------------------------------------

function useCountdown(targetDate: string | null, targetTime: string | null) {
  const [remaining, setRemaining] = useState({ days: 0, hrs: 0, mins: 0, secs: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const tick = () => {
      let target: Date;
      if (targetTime) {
        // targetTime could be ISO timestamp or HH:MM
        const timeStr = targetTime.includes('T') ? targetTime : `${targetDate}T${targetTime}`;
        target = new Date(timeStr);
      } else {
        target = new Date(`${targetDate}T00:00:00`);
      }
      const now = new Date();
      const diff = Math.max(0, target.getTime() - now.getTime());

      setRemaining({
        days: Math.floor(diff / 86400000),
        hrs: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate, targetTime]);

  return remaining;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SLIDE_INTERVAL = 7000;
const BANNER_HEIGHT = 200;

export default function HeroBanner({ team, nextGame, seasonPulse, canEdit, onBannerUpdated }: HeroBannerProps) {
  const { width: screenWidth } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const teamColor = team.color || BRAND.teal;
  const countdown = useCountdown(
    nextGame?.event_date || null,
    nextGame?.start_time || nextGame?.event_time || null,
  );

  // Build slides array dynamically
  const slides: string[] = ['photo'];
  if (nextGame) slides.push('countdown');
  if (seasonPulse) slides.push('pulse');

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  const handleScroll = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / screenWidth);
    if (idx >= 0 && idx < slides.length && idx !== activeIndex) {
      setActiveIndex(idx);
      // Reset auto-advance timer on manual swipe
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setActiveIndex(prev => {
          const next = (prev + 1) % slides.length;
          flatListRef.current?.scrollToIndex({ index: next, animated: true });
          return next;
        });
      }, SLIDE_INTERVAL);
    }
  }, [screenWidth, slides.length, activeIndex]);

  // Upload banner photo
  const handleUploadBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'jpg';
    const fileName = `team-banners/${team.id}/${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri: asset.uri, name: fileName, type: `image/${ext}` } as any);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, formData, { upsert: true });

    if (uploadError) return;

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
    const url = urlData?.publicUrl;
    if (!url) return;

    const { error } = await supabase.from('teams').update({ banner_url: url }).eq('id', team.id);
    if (!error) onBannerUpdated?.(url);
  };

  // ─── Slide renderers ────────────────────────────────────

  const renderSlide = ({ item }: { item: string }) => {
    switch (item) {
      case 'photo': return renderPhotoSlide();
      case 'countdown': return renderCountdownSlide();
      case 'pulse': return renderPulseSlide();
      default: return null;
    }
  };

  const renderPhotoSlide = () => (
    <View style={[s.slide, { width: screenWidth }]}>
      {team.banner_url ? (
        <Image source={{ uri: team.banner_url }} style={s.bannerImage} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[teamColor, teamColor + 'B0', teamColor + '40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.bannerImage}
        >
          <Text style={s.placeholderText}>{team.name}</Text>
        </LinearGradient>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={s.gradient}
      />
      {canEdit && (
        <TouchableOpacity style={s.cameraBtn} onPress={handleUploadBanner} activeOpacity={0.7}>
          <Ionicons name="camera" size={18} color={BRAND.white} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCountdownSlide = () => {
    const opponentName = nextGame?.opponent_name || nextGame?.opponent || 'TBD';
    const venue = nextGame?.venue_name || nextGame?.location || '';
    const isToday = countdown.days === 0 && countdown.hrs < 24;
    return (
      <View style={[s.slide, { width: screenWidth }]}>
        <LinearGradient
          colors={[teamColor, teamColor + 'CC', BRAND.navyDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.bannerImage}
        >
          <Text style={s.countdownLabel}>{isToday ? 'GAME DAY' : 'NEXT MATCH'}</Text>
          <Text style={s.countdownOpponent}>vs {opponentName}</Text>
          <View style={s.countdownRow}>
            {[
              { val: countdown.days, label: 'DAYS' },
              { val: countdown.hrs, label: 'HRS' },
              { val: countdown.mins, label: 'MINS' },
              { val: countdown.secs, label: 'SECS' },
            ].map((unit) => (
              <View key={unit.label} style={s.countdownUnit}>
                <Text style={s.countdownValue}>{String(unit.val).padStart(2, '0')}</Text>
                <Text style={s.countdownUnitLabel}>{unit.label}</Text>
              </View>
            ))}
          </View>
          {venue ? <Text style={s.countdownVenue}>{venue}</Text> : null}
        </LinearGradient>
      </View>
    );
  };

  const renderPulseSlide = () => {
    if (!seasonPulse) return null;
    const record = `${seasonPulse.wins}-${seasonPulse.losses}`;
    return (
      <View style={[s.slide, { width: screenWidth }]}>
        <LinearGradient
          colors={[BRAND.navyDeep, teamColor + '90', BRAND.navyDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.bannerImage}
        >
          <Text style={s.pulseLabel}>SEASON PULSE</Text>
          <View style={s.pulseRow}>
            <View style={s.pulseStat}>
              <Text style={s.pulseRecord}>{record}</Text>
              <Text style={s.pulseStatLabel}>RECORD</Text>
            </View>
            <View style={s.pulseDivider} />
            <View style={s.pulseStat}>
              <Text style={s.pulseStreak}>{seasonPulse.streak}</Text>
              <Text style={s.pulseStatLabel}>STREAK</Text>
            </View>
            <View style={s.pulseDivider} />
            <View style={s.pulseStat}>
              <Text style={s.pulsePlayerCount}>{seasonPulse.playerCount}</Text>
              <Text style={s.pulseStatLabel}>PLAYERS</Text>
            </View>
          </View>
          {seasonPulse.topPerformer && (
            <Text style={s.pulsePerformer}>{seasonPulse.topPerformer}</Text>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <View>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />
      {slides.length > 1 && (
        <View style={s.dotsContainer}>
          <CarouselDots
            total={slides.length}
            activeIndex={activeIndex}
            activeColor={BRAND.white}
            inactiveColor="rgba(255,255,255,0.4)"
          />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  slide: {
    height: BANNER_HEIGHT,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  placeholderText: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  cameraBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
  },

  // Countdown slide
  countdownLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  countdownOpponent: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: BRAND.white,
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    gap: 20,
  },
  countdownUnit: {
    alignItems: 'center',
  },
  countdownValue: {
    fontFamily: FONTS.display,
    fontSize: 32,
    color: BRAND.white,
    lineHeight: 36,
  },
  countdownUnitLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 2,
  },
  countdownVenue: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },

  // Pulse slide
  pulseLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  pulseStat: {
    alignItems: 'center',
  },
  pulseRecord: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: BRAND.white,
    lineHeight: 40,
  },
  pulseStreak: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: BRAND.gold,
    lineHeight: 40,
  },
  pulsePlayerCount: {
    fontFamily: FONTS.display,
    fontSize: 36,
    color: BRAND.skyBlue,
    lineHeight: 40,
  },
  pulseStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginTop: 2,
  },
  pulseDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pulsePerformer: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.gold,
    marginTop: 12,
  },
});
