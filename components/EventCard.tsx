import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type VolunteerSummary = {
  line_judge?: string | null;  // Primary line judge name
  scorekeeper?: string | null; // Primary scorekeeper name
};

export type ScheduleEvent = {
  id: string;
  team_id: string;
  season_id: string;
  event_type: 'game' | 'practice' | 'event' | string;
  title: string;
  description?: string | null;
  event_date: string;
  start_time: string | null;
  end_time?: string | null;
  duration_minutes?: number;
  location: string | null;
  location_type?: 'home' | 'away' | 'neutral';
  opponent_name?: string | null;
  opponent?: string | null;
  opponent_team_id?: string | null;
  our_score?: number | null;
  opponent_score?: number | null;
  arrival_time?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  notes?: string | null;
  team_name?: string;
  team_color?: string;
  rsvp_count?: { yes: number; no: number; maybe: number; pending: number };
  volunteers?: VolunteerSummary;
};

type EventCardProps = {
  event: ScheduleEvent;
  onPress: () => void;
  compact?: boolean;
};

const eventTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  game: { icon: 'trophy', color: BRAND.coral, label: 'Match' },
  practice: { icon: 'fitness', color: BRAND.teal, label: 'Practice' },
  event: { icon: 'calendar', color: BRAND.skyBlue, label: 'Event' },
  tournament: { icon: 'medal', color: BRAND.goldBrand, label: 'Tournament' },
  team_event: { icon: 'people', color: BRAND.skyBlue, label: 'Team Event' },
  other: { icon: 'calendar', color: BRAND.skyBlue, label: 'Other' },
};

const locationTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  home: { icon: 'home', color: BRAND.teal, label: 'HOME' },
  away: { icon: 'airplane', color: BRAND.coral, label: 'AWAY' },
  neutral: { icon: 'location', color: BRAND.skyBlue, label: 'NEUTRAL' },
};

const formatTime = (time: string | null): string => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export default function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const locConfig = event.location_type ? locationTypeConfig[event.location_type] : null;

  const eventDate = new Date(event.event_date + 'T00:00:00');
  const dayNum = eventDate.getDate();
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

  const hasScore =
    event.our_score !== null &&
    event.our_score !== undefined &&
    event.opponent_score !== null &&
    event.opponent_score !== undefined;
  const isWin = hasScore && event.our_score! > event.opponent_score!;
  const opponentName = event.opponent_name || event.opponent;

  // RSVP status icon
  const rsvpIcon = () => {
    if (!event.rsvp_count) return null;
    const { yes, pending } = event.rsvp_count;
    const total = yes + pending + event.rsvp_count.no + event.rsvp_count.maybe;
    if (total === 0) return null;
    if (pending > 0) {
      return (
        <View style={[s.rsvpCircle, { backgroundColor: BRAND.goldBrand + '20' }]}>
          <Ionicons name="time" size={14} color={BRAND.goldBrand} />
        </View>
      );
    }
    return (
      <View style={[s.rsvpCircle, { backgroundColor: BRAND.success + '20' }]}>
        <Ionicons name="checkmark" size={14} color={BRAND.success} />
      </View>
    );
  };

  // Volunteer status
  const needsVolunteers =
    event.event_type === 'game' &&
    (!event.volunteers?.line_judge || !event.volunteers?.scorekeeper);

  // ── Compact mode ──
  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.compact, { borderLeftColor: typeConfig.color }]}>
        <View style={s.compactIconWrap}>
          <Ionicons name={typeConfig.icon as any} size={16} color={typeConfig.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.compactTitle, { color: BRAND.textPrimary }]} numberOfLines={1}>{event.title}</Text>
          <Text style={[s.compactMeta, { color: BRAND.textMuted }]}>{formatTime(event.start_time)}</Text>
        </View>
        {event.event_type === 'game' && locConfig && (
          <View style={[s.locBadgeMini, { backgroundColor: locConfig.color + '20' }]}>
            <Text style={[s.locBadgeMiniText, { color: locConfig.color }]}>{locConfig.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ── Full card — v0 Schedule Card ──
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.card, { borderLeftColor: typeConfig.color }]}>
      {/* LEFT: Day number + Day name */}
      <View style={s.dateBlock}>
        <Text style={s.dayNum}>{dayNum}</Text>
        <Text style={[s.dayName, { color: BRAND.textMuted }]}>{dayName}</Text>
      </View>

      {/* CENTER: Content */}
      <View style={s.cardContent}>
        {/* Type badge + Time */}
        <View style={s.cardTopRow}>
          <View style={[s.typeBadge, { backgroundColor: typeConfig.color }]}>
            <Text style={s.typeBadgeText}>{typeConfig.label.toUpperCase()}</Text>
          </View>
          <Text style={[s.timeText, { color: BRAND.textPrimary }]}>
            {formatTime(event.start_time)}
            {event.end_time ? ` \u2014 ${formatTime(event.end_time)}` : ''}
          </Text>
        </View>

        {/* Title / Opponent */}
        {opponentName ? (
          <Text style={[s.cardTitle, { color: BRAND.textPrimary }]} numberOfLines={1}>
            vs {opponentName}
          </Text>
        ) : (
          <Text style={[s.cardTitle, { color: BRAND.textPrimary }]} numberOfLines={1}>
            {event.title}
          </Text>
        )}

        {/* Venue */}
        {(event.venue_name || event.location) && (
          <Text style={[s.venueText, { color: BRAND.textMuted }]} numberOfLines={1}>
            {event.venue_name || event.location}
            {locConfig ? ` \u00B7 ${locConfig.label}` : ''}
          </Text>
        )}

        {/* Score (if completed) */}
        {hasScore && (
          <View style={s.scoreRow}>
            <Text style={[s.scoreResult, { color: isWin ? BRAND.success : BRAND.coral }]}>
              {isWin ? 'WIN' : 'LOSS'}
            </Text>
            <Text style={[s.scoreValue, { color: BRAND.textPrimary }]}>
              {event.our_score}-{event.opponent_score}
            </Text>
          </View>
        )}

        {/* RSVP summary */}
        {event.rsvp_count && (
          <View style={s.rsvpRow}>
            <Text style={{ color: BRAND.teal, fontSize: 11, fontFamily: FONTS.bodySemiBold }}>
              {event.rsvp_count.yes} going
            </Text>
            {event.rsvp_count.pending > 0 && (
              <Text style={{ color: BRAND.textMuted, fontSize: 11, fontFamily: FONTS.bodyMedium }}>
                {event.rsvp_count.pending} pending
              </Text>
            )}
          </View>
        )}

        {/* Volunteer needs */}
        {needsVolunteers && (
          <View style={s.volunteerRow}>
            <Ionicons name="hand-left" size={10} color={BRAND.goldBrand} />
            <Text style={s.volunteerText}>Volunteers needed</Text>
          </View>
        )}

        {/* Team badge */}
        {event.team_name && (
          <View style={[s.teamBadge, { backgroundColor: (event.team_color || '#2C5F7C') + '20' }]}>
            <Text style={[s.teamBadgeText, { color: event.team_color || '#2C5F7C' }]}>
              {event.team_name}
            </Text>
          </View>
        )}
      </View>

      {/* RIGHT: RSVP status icon */}
      {rsvpIcon()}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // ── Full Card ──
  card: {
    flexDirection: 'row',
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderLeftWidth: 4,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...shadows.card,
  },
  dateBlock: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayNum: {
    ...displayTextStyle,
    fontSize: 22,
    lineHeight: 26,
    color: BRAND.navy,
  },
  dayName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: BRAND.textMuted,
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: BRAND.white,
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  timeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  cardTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    marginBottom: 2,
    color: BRAND.textPrimary,
  },
  venueText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    marginBottom: 4,
    color: BRAND.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  scoreResult: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  scoreValue: {
    ...displayTextStyle,
    fontSize: 16,
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  volunteerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  volunteerText: {
    color: BRAND.goldBrand,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
  },
  teamBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  teamBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
  },

  // ── RSVP circle ──
  rsvpCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },

  // ── Compact mode ──
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderLeftWidth: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
    ...shadows.card,
  },
  compactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  compactMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    marginTop: 1,
    color: BRAND.textMuted,
  },
  locBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  locBadgeMiniText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 9,
  },
});
