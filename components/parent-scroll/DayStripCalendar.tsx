/**
 * DayStripCalendar — horizontal 7-day calendar strip for parent home scroll.
 * Shows week centered on today, highlights today, shows event dots.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import { SCROLL_THRESHOLDS } from '@/hooks/useScrollAnimations';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

type DayItem = {
  date: Date;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  hasEvent: boolean;
};

type Props = {
  scrollY: SharedValue<number>;
  eventDates: Set<string>; // ISO date strings (YYYY-MM-DD)
};

function buildWeek(): DayItem[] {
  const today = new Date();
  const result: DayItem[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    result.push({
      date: d,
      dayName: DAYS[d.getDay()],
      dayNum: d.getDate(),
      isToday: offset === 0,
      hasEvent: false, // caller sets via eventDates
    });
  }
  return result;
}

export default function DayStripCalendar({ scrollY, eventDates }: Props) {
  const week = useMemo(() => {
    const days = buildWeek();
    return days.map((d) => ({
      ...d,
      hasEvent: eventDates.has(
        `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`,
      ),
    }));
  }, [eventDates]);

  // Slides down from under compact header
  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [SCROLL_THRESHOLDS.CALENDAR_APPEAR_START, SCROLL_THRESHOLDS.CALENDAR_APPEAR_END],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [SCROLL_THRESHOLDS.CALENDAR_APPEAR_START, SCROLL_THRESHOLDS.CALENDAR_APPEAR_END],
          [-50, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {week.map((day) => (
          <TouchableOpacity
            key={day.date.toISOString()}
            style={styles.dayCell}
            activeOpacity={0.7}
          >
            <Text style={styles.dayName}>{day.dayName}</Text>
            <View style={[styles.dayNumWrap, day.isToday && styles.dayNumWrapToday]}>
              <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>
                {day.dayNum}
              </Text>
            </View>
            {day.hasEvent && (
              <View
                style={[
                  styles.eventDot,
                  { backgroundColor: day.isToday ? BRAND.skyBlue : BRAND.navy },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    backgroundColor: BRAND.white,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  scrollContent: {
    paddingHorizontal: SPACING.pagePadding,
    gap: 4,
  },
  dayCell: {
    width: (Dimensions_WIDTH - SPACING.pagePadding * 2 - 24) / 7,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumWrapToday: {
    backgroundColor: BRAND.skyBlue,
  },
  dayNum: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
  },
  dayNumToday: {
    color: BRAND.white,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
});

// Need Dimensions for width calc
import { Dimensions } from 'react-native';
const Dimensions_WIDTH = Dimensions.get('window').width;
