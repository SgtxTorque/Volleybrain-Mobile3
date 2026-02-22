import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  game: { icon: 'trophy', color: '#D94F4F', label: 'Match' },
  practice: { icon: 'fitness', color: '#14B8A6', label: 'Practice' },
  event: { icon: 'calendar', color: '#2C5F7C', label: 'Event' },
  tournament: { icon: 'medal', color: '#E8913A', label: 'Tournament' },
  team_event: { icon: 'people', color: '#2C5F7C', label: 'Team Event' },
  other: { icon: 'calendar', color: '#2C5F7C', label: 'Other' },
};

const locationTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  home: { icon: 'home', color: '#14B8A6', label: 'HOME' },
  away: { icon: 'airplane', color: '#E8913A', label: 'AWAY' },
  neutral: { icon: 'location', color: '#0EA5E9', label: 'NEUTRAL' },
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
  const { colors } = useTheme();
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
        <View style={[s.rsvpCircle, { backgroundColor: '#E8913A20' }]}>
          <Ionicons name="time" size={14} color="#E8913A" />
        </View>
      );
    }
    return (
      <View style={[s.rsvpCircle, { backgroundColor: '#22C55E20' }]}>
        <Ionicons name="checkmark" size={14} color="#22C55E" />
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
          <Text style={[s.compactTitle, { color: colors.text }]} numberOfLines={1}>{event.title}</Text>
          <Text style={[s.compactMeta, { color: colors.textMuted }]}>{formatTime(event.start_time)}</Text>
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
        <Text style={[s.dayNum, { color: colors.navy || '#1B2838' }]}>{dayNum}</Text>
        <Text style={[s.dayName, { color: colors.textMuted }]}>{dayName}</Text>
      </View>

      {/* CENTER: Content */}
      <View style={s.cardContent}>
        {/* Type badge + Time */}
        <View style={s.cardTopRow}>
          <View style={[s.typeBadge, { backgroundColor: typeConfig.color }]}>
            <Text style={s.typeBadgeText}>{typeConfig.label.toUpperCase()}</Text>
          </View>
          <Text style={[s.timeText, { color: colors.text }]}>
            {formatTime(event.start_time)}
            {event.end_time ? ` \u2014 ${formatTime(event.end_time)}` : ''}
          </Text>
        </View>

        {/* Title / Opponent */}
        {opponentName ? (
          <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
            vs {opponentName}
          </Text>
        ) : (
          <Text style={[s.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
        )}

        {/* Venue */}
        {(event.venue_name || event.location) && (
          <Text style={[s.venueText, { color: colors.textMuted }]} numberOfLines={1}>
            {event.venue_name || event.location}
            {locConfig ? ` \u00B7 ${locConfig.label}` : ''}
          </Text>
        )}

        {/* Score (if completed) */}
        {hasScore && (
          <View style={s.scoreRow}>
            <Text style={[s.scoreResult, { color: isWin ? '#22C55E' : '#D94F4F' }]}>
              {isWin ? 'WIN' : 'LOSS'}
            </Text>
            <Text style={[s.scoreValue, { color: colors.text }]}>
              {event.our_score}-{event.opponent_score}
            </Text>
          </View>
        )}

        {/* RSVP summary */}
        {event.rsvp_count && (
          <View style={s.rsvpRow}>
            <Text style={{ color: '#14B8A6', fontSize: 11, fontWeight: '600' }}>
              {event.rsvp_count.yes} going
            </Text>
            {event.rsvp_count.pending > 0 && (
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {event.rsvp_count.pending} pending
              </Text>
            )}
          </View>
        )}

        {/* Volunteer needs */}
        {needsVolunteers && (
          <View style={s.volunteerRow}>
            <Ionicons name="hand-left" size={10} color="#E8913A" />
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
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
  },
  dayName: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  venueText: {
    fontSize: 11,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  scoreResult: {
    fontSize: 10,
    fontWeight: '800',
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
    color: '#E8913A',
    fontSize: 10,
    fontWeight: '600',
  },
  teamBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  teamBadgeText: {
    fontSize: 9,
    fontWeight: '700',
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
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    borderLeftWidth: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
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
    fontSize: 13,
    fontWeight: '600',
  },
  compactMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  locBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  locBadgeMiniText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
