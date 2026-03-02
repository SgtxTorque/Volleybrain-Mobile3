/**
 * RosterAlerts — Tier 1.5 lightweight cards for players needing attention.
 * Only shows players with issues (no RSVP, attendance problems).
 * When all players are fine, shows a Tier 3 "all clear" ambient message.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

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

        // Players missing RSVPs (from parent data)
        for (const name of missingRsvpNames) {
          alertList.push({
            id: name,
            name,
            issues: ['No RSVP for next event'],
            severity: 'amber',
          });
        }

        // Players with attendance issues (missed 2+ of last 5 events)
        const today = new Date().toISOString().split('T')[0];
        const { data: recentEvents } = await supabase
          .from('schedule_events')
          .select('id')
          .eq('team_id', teamId)
          .lt('event_date', today)
          .order('event_date', { ascending: false })
          .limit(5);

        if (recentEvents && recentEvents.length >= 2) {
          const eventIds = recentEvents.map(e => e.id);

          // Get roster
          const { data: roster } = await supabase
            .from('team_players')
            .select('player_id, players(id, first_name, last_name)')
            .eq('team_id', teamId);

          if (roster && roster.length > 0) {
            const playerIds = roster.map((r: any) => r.player_id);

            // Get all RSVPs for recent events
            const { data: rsvps } = await supabase
              .from('event_rsvps')
              .select('player_id, event_id, status')
              .in('event_id', eventIds)
              .in('player_id', playerIds);

            // Count missed events per player
            const missedMap = new Map<string, number>();
            for (const pid of playerIds) {
              let missed = 0;
              for (const eid of eventIds) {
                const rsvp = (rsvps || []).find(r => r.player_id === pid && r.event_id === eid);
                if (!rsvp || rsvp.status === 'no' || rsvp.status === 'absent') {
                  missed++;
                }
              }
              if (missed >= 2) {
                missedMap.set(pid, missed);
              }
            }

            // Add to alerts if not already there by name
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push('/(tabs)/coach-roster' as any)}
      >
        <Text style={styles.sectionHeader}>
          ROSTER {'\u00B7'} {rosterSize} players
        </Text>
      </TouchableOpacity>

      {alerts.length === 0 ? (
        // All clear — Tier 3 ambient
        <Text style={styles.allClearText}>
          All {rosterSize} players confirmed and current.{'\n'}
          Nothing to chase down this week. {'\u2713'}
        </Text>
      ) : (
        // Alert cards — Tier 1.5
        <View style={styles.alertList}>
          {alerts.slice(0, 4).map((alert, i) => (
            <TouchableOpacity
              key={alert.id + i}
              style={styles.alertCard}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/coach-roster' as any)}
            >
              <View style={[styles.dot, { backgroundColor: alert.severity === 'red' ? BRAND.error : '#F59E0B' }]} />
              <View style={styles.alertContent}>
                <Text style={styles.alertName}>
                  {alert.name} {'\u00B7'} {alert.issues[0]}
                </Text>
                {alert.issues.length > 1 && (
                  <Text style={styles.alertSubtitle}>{alert.issues.slice(1).join(' · ')}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  alertList: {
    paddingHorizontal: 20,
    gap: 8,
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
  alertSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 2,
  },
});
