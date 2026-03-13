/**
 * UpcomingSection — next 3 events + coach quick links.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import EventCard, { ScheduleEvent } from '@/components/EventCard';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type UpcomingSectionProps = {
  teamId: string;
  seasonId: string | null;
  isCoachOrAdmin: boolean;
};

type QuickLink = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

const COACH_QUICK_LINKS: QuickLink[] = [
  { label: 'Evaluate Players', icon: 'clipboard-outline', color: BRAND.skyBlue, route: '/evaluation-session' },
  { label: 'Create Challenge', icon: 'trophy-outline', color: BRAND.goldBrand, route: '/challenge-library' },
  { label: 'Send Blast', icon: 'megaphone-outline', color: BRAND.skyBlue, route: '/blast-composer' },
  { label: 'View Attendance', icon: 'people-outline', color: BRAND.teal, route: '/attendance' },
];

export default function UpcomingSection({ teamId, seasonId, isCoachOrAdmin }: UpcomingSectionProps) {
  const router = useRouter();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const query = supabase
      .from('schedule_events')
      .select('*')
      .eq('team_id', teamId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(3);

    const { data } = await query;
    setEvents((data || []) as ScheduleEvent[]);
    setLoading(false);
  }, [teamId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (loading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color={BRAND.teal} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Upcoming events */}
      {events.length > 0 && (
        <>
          <View style={s.headerRow}>
            <Text style={s.headerLabel}>UPCOMING</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/coach-schedule' as any)}
              activeOpacity={0.7}
            >
              <Text style={s.viewAll}>Full Schedule →</Text>
            </TouchableOpacity>
          </View>
          <View style={s.eventsList}>
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => {
                  // Navigate to event detail if available
                }}
              />
            ))}
          </View>
        </>
      )}

      {events.length === 0 && (
        <View style={s.emptyWrap}>
          <Ionicons name="calendar-outline" size={32} color={BRAND.textFaint} />
          <Text style={s.emptyText}>No upcoming events</Text>
        </View>
      )}

      {/* Coach quick links */}
      {isCoachOrAdmin && (
        <View style={s.quickLinksSection}>
          {COACH_QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.route}
              style={s.quickLink}
              onPress={() => router.push(link.route as any)}
              activeOpacity={0.7}
            >
              <View style={[s.quickLinkIcon, { backgroundColor: link.color + '15' }]}>
                <Ionicons name={link.icon} size={18} color={link.color} />
              </View>
              <Text style={s.quickLinkText}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={BRAND.textFaint} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.textMuted,
    letterSpacing: 1.2,
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.teal,
  },
  eventsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  quickLinksSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 2,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  quickLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkText: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
});
