/**
 * AthleteCardV2 — multi-sport player card for the parent home scroll.
 * Shows one child with ALL their sport/team affiliations as tappable pills.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING, SHADOWS } from '@/theme/spacing';
import type { FamilyChild, FamilyEvent } from '@/hooks/useParentHomeData';

type Props = {
  child: FamilyChild;
  /** Currently selected team ID for context highlight */
  selectedTeamId: string | null;
  /** Callback when a sport pill is tapped */
  onSelectTeam: (childId: string, teamId: string) => void;
  /** Next event for this child across any sport */
  nextEvent?: FamilyEvent | null;
  /** Whether the family has multiple orgs (show org name on pills) */
  isMultiOrg?: boolean;
};

function getSportPillColor(sport: string): { bg: string; text: string } {
  const s = sport.toLowerCase();
  if (s.includes('volleyball')) return { bg: 'rgba(8,145,178,0.12)', text: '#0891B2' };
  if (s.includes('basketball')) return { bg: 'rgba(239,68,68,0.10)', text: BRAND.coral };
  if (s.includes('soccer') || s.includes('football')) return { bg: 'rgba(22,163,74,0.10)', text: '#16A34A' };
  return { bg: 'rgba(56,189,248,0.10)', text: BRAND.skyBlue };
}

export default function AthleteCardV2({ child, selectedTeamId, onSelectTeam, nextEvent, isMultiOrg }: Props) {
  const router = useRouter();
  const hasPhoto = Boolean(child.photoUrl);
  const initials = child.firstName[0]?.toUpperCase() || '?';
  const avatarColor = child.teams[0]?.teamColor || child.teams[0]?.sportColor || BRAND.skyBlue;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/child-detail?playerId=${child.playerId}` as any)}
    >
      <View style={styles.topRow}>
        {/* Player avatar */}
        {hasPhoto ? (
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Image source={{ uri: child.photoUrl! }} style={styles.avatarImage} />
          </View>
        ) : (
          <View style={[styles.initialCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.initialText}>{initials}</Text>
          </View>
        )}

        {/* Name + sport pills */}
        <View style={styles.info}>
          <Text style={styles.playerName} numberOfLines={1}>{child.firstName} {child.lastName}</Text>

          {/* Sport pills */}
          <View style={styles.pillRow}>
            {child.teams.map((team) => {
              const pillColor = getSportPillColor(team.sport);
              const isSelected = team.teamId === selectedTeamId;
              const pillLabel = [
                team.sportIcon,
                team.teamName,
                team.jerseyNumber ? `#${team.jerseyNumber}` : null,
                team.position,
              ].filter(Boolean).join(' \u00B7 ');

              return (
                <TouchableOpacity
                  key={team.teamId}
                  style={[
                    styles.sportPill,
                    { backgroundColor: pillColor.bg },
                    isSelected && styles.sportPillSelected,
                    isSelected && { borderColor: pillColor.text },
                  ]}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onSelectTeam(child.playerId, team.teamId);
                  }}
                >
                  <Text style={[styles.sportPillText, { color: pillColor.text }]} numberOfLines={1}>
                    {isMultiOrg && team.orgName ? `${pillLabel} \u00B7 ${team.orgName}` : pillLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Next event */}
          {nextEvent && (
            <Text style={styles.nextEvent} numberOfLines={1}>
              Next: {nextEvent.sportIcon} {(nextEvent.eventType || 'Event').charAt(0).toUpperCase() + (nextEvent.eventType || 'Event').slice(1)}{' '}
              {formatNextDate(nextEvent.date)}{formatNextTime(nextEvent)}
            </Text>
          )}
        </View>

        {/* Level badge */}
        {child.level > 0 && (
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LVL {child.level}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatNextDate(dateStr: string): string {
  const today = new Date();
  const evtDate = new Date(dateStr + 'T00:00:00');
  if (evtDate.toDateString() === today.toDateString()) return 'today';
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  if (evtDate.toDateString() === tmrw.toDateString()) return 'tomorrow';
  try {
    return evtDate.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return dateStr;
  }
}

function formatNextTime(event: FamilyEvent): string {
  if (event.startTime) {
    const d = new Date(event.startTime);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      const m = d.getMinutes();
      return ` ${h % 12 || 12}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${h >= 12 ? 'pm' : 'am'}`;
    }
  }
  if (event.time) {
    const [h] = event.time.split(':');
    const hr = parseInt(h);
    return ` ${hr % 12 || 12}${hr >= 12 ? 'pm' : 'am'}`;
  }
  return '';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.white,
    borderRadius: 16,
    padding: 16,
    ...SHADOWS.light,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initialCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 18,
    color: BRAND.white,
  },
  info: {
    flex: 1,
  },
  playerName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    color: BRAND.textPrimary,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sportPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sportPillSelected: {
    borderWidth: 1.5,
  },
  sportPillText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  nextEvent: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 8,
  },
  levelBadge: {
    backgroundColor: BRAND.gold,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.navyDeep,
    letterSpacing: 0.5,
  },
});
