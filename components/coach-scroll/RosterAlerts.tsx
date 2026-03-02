/**
 * RosterAlerts — Roster section with collapsible alerts.
 * C2: When 2+ alerts, collapse to summary line instead of individual cards.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type AlertPlayer = {
  id: string;
  name: string;
  issues: string[];
  severity: 'red' | 'amber';
};

type Props = {
  teamId: string | null;
  rosterSize: number;
  missingRsvpNames: string[];
};

export default function RosterAlerts({ teamId, rosterSize, missingRsvpNames }: Props) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertPlayer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        const alertList: AlertPlayer[] = [];

        for (const name of missingRsvpNames) {
          alertList.push({
            id: name,
            name,
            issues: ['No RSVP for next event'],
            severity: 'amber',
          });
        }

        const today = localToday();
        const { data: recentEvents } = await supabase
          .from('schedule_events')
          .select('id')
          .eq('team_id', teamId)
          .lt('event_date', today)
          .order('event_date', { ascending: false })
          .limit(5);

        if (recentEvents && recentEvents.length >= 2) {
          const eventIds = recentEvents.map(e => e.id);
          const { data: roster } = await supabase
            .from('team_players')
            .select('player_id, players(id, first_name, last_name)')
            .eq('team_id', teamId);

          if (roster && roster.length > 0) {
            const playerIds = roster.map((r: any) => r.player_id);
            const { data: rsvps } = await supabase
              .from('event_rsvps')
              .select('player_id, event_id, status')
              .in('event_id', eventIds)
              .in('player_id', playerIds);

            const missedMap = new Map<string, number>();
            for (const pid of playerIds) {
              let missed = 0;
              for (const eid of eventIds) {
                const rsvp = (rsvps || []).find(r => r.player_id === pid && r.event_id === eid);
                if (!rsvp || rsvp.status === 'no' || rsvp.status === 'absent') {
                  missed++;
                }
              }
              if (missed >= 2) missedMap.set(pid, missed);
            }

            for (const [pid, missed] of missedMap) {
              const player = roster.find((r: any) => r.player_id === pid);
              const pData = (player as any)?.players;
              const name = pData ? `${pData.first_name} ${pData.last_name}` : 'Unknown';
              const existing = alertList.find(a => a.name === name);
              if (existing) {
                existing.issues.push(`Missed last ${missed} events`);
                existing.severity = 'red';
              } else {
                alertList.push({
                  id: pid,
                  name,
                  issues: [`Missed last ${missed} events`],
                  severity: missed >= 3 ? 'red' : 'amber',
                });
              }
            }
          }
        }

        setAlerts(alertList);
      } catch (err) {
        if (__DEV__) console.error('[RosterAlerts] Error:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [teamId, missingRsvpNames.join(',')]);

  if (!loaded || !teamId) return null;

  const goToRoster = () => router.push('/(tabs)/coach-roster' as any);

  // Build issue summary text for collapsed view
  const issueSummary = (() => {
    const issueTypes = new Set<string>();
    for (const a of alerts) {
      for (const issue of a.issues) {
        if (issue.includes('RSVP')) issueTypes.add('No RSVP');
        if (issue.includes('Missed')) issueTypes.add('attendance gaps');
      }
    }
    return Array.from(issueTypes).join(', ') || 'needs attention';
  })();

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7} onPress={goToRoster}>
        <Text style={styles.sectionHeader}>
          ROSTER {'\u00B7'} {rosterSize} PLAYERS
        </Text>
      </TouchableOpacity>

      {alerts.length === 0 ? (
        <Text style={styles.allClearText}>
          All {rosterSize} confirmed and current. {'\u2713'}
        </Text>
      ) : alerts.length === 1 ? (
        /* Single alert — show one lightweight card */
        <TouchableOpacity style={styles.alertCard} activeOpacity={0.7} onPress={goToRoster}>
          <View style={[styles.dot, { backgroundColor: alerts[0].severity === 'red' ? BRAND.error : '#F59E0B' }]} />
          <View style={styles.alertContent}>
            <Text style={styles.alertName}>
              {alerts[0].name} {'\u00B7'} {alerts[0].issues[0]}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        /* 2+ alerts — collapse to summary */
        <TouchableOpacity style={styles.summaryWrap} activeOpacity={0.7} onPress={goToRoster}>
          <Text style={styles.summaryLine}>
            {'\u{1F534}'} {alerts.length} players need attention {'\u2192'}
          </Text>
          <Text style={styles.summaryNames} numberOfLines={1}>
            {alerts.slice(0, 3).map(a => a.name).join(', ')} {'\u2014'} {issueSummary}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  allClearText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
    paddingHorizontal: 24,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.offWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  alertContent: {
    flex: 1,
  },
  alertName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  summaryWrap: {
    paddingHorizontal: 24,
  },
  summaryLine: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: BRAND.textPrimary,
    marginBottom: 2,
  },
  summaryNames: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
});
