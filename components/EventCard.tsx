import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

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
  game: { icon: 'trophy', color: '#FF6B6B', label: 'Game' },
  practice: { icon: 'fitness', color: '#4ECDC4', label: 'Practice' },
  event: { icon: 'calendar', color: '#96CEB4', label: 'Event' },
  tournament: { icon: 'medal', color: '#FFB347', label: 'Tournament' },
  team_event: { icon: 'people', color: '#AF52DE', label: 'Team Event' },
  other: { icon: 'calendar', color: '#5AC8FA', label: 'Other' },
};

const locationTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  home: { icon: 'home', color: '#4ECDC4', label: 'HOME' },
  away: { icon: 'airplane', color: '#FF6B6B', label: 'AWAY' },
  neutral: { icon: 'location', color: '#96CEB4', label: 'NEUTRAL' },
};

export default function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const { colors } = useTheme();
  const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.other;
  const locConfig = event.location_type ? locationTypeConfig[event.location_type] : locationTypeConfig.home;
  
  const eventDate = new Date(event.event_date + 'T00:00:00');
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
  
  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const hasScore = event.our_score !== null && event.our_score !== undefined && 
                   event.opponent_score !== null && event.opponent_score !== undefined;
  const isWin = hasScore && event.our_score! > event.opponent_score!;
  const isLoss = hasScore && event.our_score! < event.opponent_score!;
  const opponentName = event.opponent_name || event.opponent;

  // Check volunteer status for games
  const hasLineJudge = event.volunteers?.line_judge;
  const hasScorekeeper = event.volunteers?.scorekeeper;
  const needsVolunteers = event.event_type === 'game' && (!hasLineJudge || !hasScorekeeper);

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          backgroundColor: colors.card,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: typeConfig.color,
          marginBottom: 8,
        }}
      >
        <View style={{ marginRight: 12 }}>
          <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {formatTime(event.start_time)}
          </Text>
        </View>
        {event.event_type === 'game' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {needsVolunteers && (
              <View style={{ 
                backgroundColor: '#FFB34720',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <Text style={{ color: '#FFB347', fontSize: 9, fontWeight: 'bold' }}>NEED HELP</Text>
              </View>
            )}
            {event.location_type && (
              <View style={{ 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                backgroundColor: locConfig.color + '20',
                borderRadius: 4,
              }}>
                <Text style={{ color: locConfig.color, fontSize: 10, fontWeight: 'bold' }}>
                  {locConfig.label}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: colors.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      {/* Header with type and location */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: typeConfig.color + '15',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={typeConfig.icon as any} size={18} color={typeConfig.color} />
          <Text style={{ color: typeConfig.color, fontWeight: '600', fontSize: 13 }}>
            {typeConfig.label.toUpperCase()}
          </Text>
        </View>
        {event.event_type === 'game' && event.location_type && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={locConfig.icon as any} size={14} color={locConfig.color} />
            <Text style={{ color: locConfig.color, fontWeight: 'bold', fontSize: 11 }}>
              {locConfig.label}
            </Text>
          </View>
        )}
      </View>

      <View style={{ padding: 16 }}>
        {/* Date/Time Row */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          {/* Date Box */}
          <View style={{ 
            width: 60, 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: colors.primary + '20',
            borderRadius: 8,
            paddingVertical: 8,
            marginRight: 14,
          }}>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
              {dayName.toUpperCase()}
            </Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
              {eventDate.getDate()}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
              {eventDate.toLocaleDateString('en-US', { month: 'short' })}
            </Text>
          </View>

          {/* Title and Details */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
              {event.title}
            </Text>
            
            {opponentName && (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>
                vs {opponentName}
              </Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {formatTime(event.start_time)}
                {event.end_time && ` - ${formatTime(event.end_time)}`}
                {event.duration_minutes && !event.end_time && ` (${event.duration_minutes} min)`}
              </Text>
            </View>

            {(event.venue_name || event.location) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
                  {event.venue_name || event.location}
                </Text>
              </View>
            )}
          </View>

          {/* Score (if game completed) */}
          {hasScore && (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              paddingLeft: 12,
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
            }}>
              <Text style={{ 
                color: isWin ? '#4ECDC4' : isLoss ? '#FF6B6B' : colors.textMuted, 
                fontSize: 11, 
                fontWeight: '600',
                marginBottom: 4,
              }}>
                {isWin ? 'WIN' : isLoss ? 'LOSS' : 'TIE'}
              </Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                {event.our_score}-{event.opponent_score}
              </Text>
            </View>
          )}
        </View>

        {/* RSVP Summary */}
        {event.rsvp_count && (event.event_type === 'game' || event.event_type === 'practice') && (
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            gap: 12, 
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={16} color={colors.textMuted} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#4ECDC4', fontSize: 13, fontWeight: '600' }}>
                {event.rsvp_count.yes} going
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#FF6B6B', fontSize: 13 }}>
                {event.rsvp_count.no} can't
              </Text>
            </View>
            {event.rsvp_count.maybe > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#FFB347', fontSize: 13 }}>
                  {event.rsvp_count.maybe} maybe
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Volunteer Summary (games only) */}
        {event.event_type === 'game' && (
          <View style={{ 
            paddingTop: 12,
            marginTop: event.rsvp_count ? 12 : 0,
            borderTopWidth: event.rsvp_count ? 1 : 0,
            borderTopColor: colors.border,
          }}>
            {/* Line Judge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="flag" size={14} color={hasLineJudge ? '#4ECDC4' : '#FFB347'} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 6, width: 80 }}>
                Line Judge:
              </Text>
              <Text style={{ 
                color: hasLineJudge ? colors.text : '#FFB347', 
                fontSize: 13,
                fontWeight: hasLineJudge ? '500' : '600',
              }}>
                {hasLineJudge ? event.volunteers!.line_judge : 'Need Volunteer'}
              </Text>
            </View>
            
            {/* Scorekeeper */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="clipboard" size={14} color={hasScorekeeper ? '#4ECDC4' : '#FFB347'} />
              <Text style={{ color: colors.textMuted, fontSize: 12, marginLeft: 6, width: 80 }}>
                Scorekeeper:
              </Text>
              <Text style={{ 
                color: hasScorekeeper ? colors.text : '#FFB347', 
                fontSize: 13,
                fontWeight: hasScorekeeper ? '500' : '600',
              }}>
                {hasScorekeeper ? event.volunteers!.scorekeeper : 'Need Volunteer'}
              </Text>
            </View>
          </View>
        )}

        {/* Team Badge */}
        {event.team_name && (
          <View style={{ 
            position: 'absolute',
            top: 16,
            right: 16,
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: (event.team_color || colors.primary) + '30',
            borderRadius: 4,
          }}>
            <Text style={{ 
              color: event.team_color || colors.primary, 
              fontSize: 10, 
              fontWeight: 'bold' 
            }}>
              {event.team_name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
