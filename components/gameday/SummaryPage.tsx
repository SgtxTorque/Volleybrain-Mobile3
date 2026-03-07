/**
 * SummaryPage — Screen 4 of the Game Day Command Center.
 *
 * Post-game summary auto-generated from match data:
 * - W/L badge + overall score
 * - Set-by-set breakdown
 * - Top performers (Tier 2)
 * - Serve chart (if tracked)
 * - "Save to Lynx" sync button
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMatch } from '@/lib/gameday/use-match';
import type { ServeEvent } from '@/lib/gameday/match-state';
import { FONTS } from '@/theme/fonts';
import { BRAND } from '@/theme/colors';
import { useResponsive } from '@/lib/responsive';

const ACCENT = BRAND.skyBlue;
const TEAL = '#10B981';
const CORAL = BRAND.error;
const GOLD = BRAND.gold;

export default function SummaryPage() {
  const { match } = useMatch();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const { isTabletAny, contentMaxWidth } = useResponsive();

  const sets = match?.sets || [];
  const starters = match?.starters || [];

  // ── Sets won ──

  const setsWon = useMemo(() => {
    let home = 0, away = 0;
    for (const s of sets) {
      if (s.setComplete) {
        if (s.winner === 'home') home++;
        else if (s.winner === 'away') away++;
      }
    }
    return { home, away };
  }, [sets]);

  const isWin = setsWon.home > setsWon.away;

  // ── Top performers ──

  const topPerformers = useMemo(() => {
    const totals = new Map<string, { kills: number; errors: number; digs: number; blocks: number; aces: number; assists: number }>();

    for (const set of sets) {
      // Rally stats
      for (const rally of set.rallyLog) {
        for (const act of rally.actions) {
          let pt = totals.get(act.playerId);
          if (!pt) { pt = { kills: 0, errors: 0, digs: 0, blocks: 0, aces: 0, assists: 0 }; totals.set(act.playerId, pt); }
          switch (act.action) {
            case 'kill': case 'good_hit': pt.kills++; break;
            case 'hit_error': case 'error': case 'bad_set': pt.errors++; break;
            case 'dig': pt.digs++; break;
            case 'block': pt.blocks++; break;
            case 'assist': case 'good_set': pt.assists++; break;
          }
        }
      }

      // Serve stats
      for (const serve of set.serveLog) {
        let pt = totals.get(serve.serverId);
        if (!pt) { pt = { kills: 0, errors: 0, digs: 0, blocks: 0, aces: 0, assists: 0 }; totals.set(serve.serverId, pt); }
        if (serve.result === 'ace') pt.aces++;
        if (serve.result === 'error') pt.errors++;
      }
    }

    return Array.from(totals.entries())
      .map(([id, t]) => {
        const p = starters.find(s => s?.playerId === id);
        return {
          ...t,
          playerId: id,
          name: p ? `${p.firstName} ${p.lastName.charAt(0)}.` : '?',
          jersey: p?.jerseyNumber ?? 0,
        };
      })
      .sort((a, b) => (b.kills + b.aces + b.blocks) - (a.kills + a.aces + a.blocks));
  }, [sets, starters]);

  // ── Serve zones aggregate ──

  const serveZones = useMemo(() => {
    const zones: ServeEvent[] = [];
    for (const set of sets) {
      zones.push(...set.serveLog);
    }
    return zones;
  }, [sets]);

  const serveStats = useMemo(() => {
    if (serveZones.length === 0) return null;
    const total = serveZones.length;
    const aces = serveZones.filter(s => s.result === 'ace').length;
    const errors = serveZones.filter(s => s.result === 'error').length;
    const good = serveZones.filter(s => s.result === 'in').length;
    return { total, aces, errors, good, inPct: Math.round(((good + aces) / total) * 100) };
  }, [serveZones]);

  // ── Sub usage ──

  const totalSubs = useMemo(() => {
    return sets.reduce((sum, s) => sum + s.subsUsed, 0);
  }, [sets]);

  // ── MVP / top awards ──

  const mvp = topPerformers[0];
  const topServer = useMemo(() => {
    return [...topPerformers].sort((a, b) => b.aces - a.aces)[0];
  }, [topPerformers]);
  const topDefender = useMemo(() => {
    return [...topPerformers].sort((a, b) => b.digs - a.digs)[0];
  }, [topPerformers]);

  // ── Sync handler (stubbed — Phase 7B) ──

  const handleSync = useCallback(async () => {
    setSyncing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // TODO: Phase 7B — replay pendingActions to Supabase
    // For now, just simulate a delay
    setTimeout(() => {
      setSyncing(false);
      Alert.alert('Saved', 'Match data saved locally. Sync will complete when online.');
    }, 1000);
  }, []);

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <ScrollView style={s.root} contentContainerStyle={[
      s.content,
      isTabletAny && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const },
    ]}>
      {/* Match hero */}
      <Animated.View entering={FadeIn.duration(400)} style={s.heroBanner}>
        <View style={[s.resultBadge, { backgroundColor: isWin ? TEAL + '20' : CORAL + '20' }]}>
          <Text style={[s.resultLetter, { color: isWin ? TEAL : CORAL }]}>
            {isWin ? 'W' : 'L'}
          </Text>
        </View>
        <View style={s.heroInfo}>
          <Text style={s.heroOpponent}>vs {match?.opponentName || 'Opponent'}</Text>
          <Text style={s.heroScore}>
            Sets: {setsWon.home} — {setsWon.away}
          </Text>
        </View>
        <Ionicons
          name={isWin ? 'trophy' : 'sad-outline'}
          size={32}
          color={isWin ? GOLD : 'rgba(255,255,255,0.2)'}
        />
      </Animated.View>

      {/* Set-by-set breakdown */}
      <Text style={s.sectionTitle}>SET BREAKDOWN</Text>
      {sets.map((set, i) => (
        <Animated.View
          key={set.setNumber}
          entering={FadeInDown.delay(i * 60).duration(250)}
          style={s.setCard}
        >
          <View style={s.setHeader}>
            <Text style={s.setNum}>Set {set.setNumber}</Text>
            <Ionicons
              name={set.winner === 'home' ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={set.winner === 'home' ? TEAL : CORAL}
            />
          </View>
          <Text style={s.setScoreText}>{set.homeScore} — {set.awayScore}</Text>
          <Text style={s.setMeta}>
            Subs: {set.subsUsed} · Rallies: {set.rallyLog.length}
          </Text>
        </Animated.View>
      ))}

      {/* Awards */}
      {topPerformers.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>AWARDS</Text>
          <View style={s.awardsRow}>
            {mvp && mvp.kills > 0 && (
              <View style={[s.awardCard, isTabletAny && { minWidth: 120 }]}>
                <Ionicons name="flash" size={18} color={GOLD} />
                <Text style={s.awardLabel}>MVP</Text>
                <Text style={s.awardPlayer}>#{mvp.jersey} {mvp.name}</Text>
                <Text style={s.awardStat}>{mvp.kills} kills</Text>
              </View>
            )}
            {topServer && topServer.aces > 0 && (
              <View style={[s.awardCard, isTabletAny && { minWidth: 120 }]}>
                <Ionicons name="tennisball" size={18} color={TEAL} />
                <Text style={s.awardLabel}>TOP SERVER</Text>
                <Text style={s.awardPlayer}>#{topServer.jersey} {topServer.name}</Text>
                <Text style={s.awardStat}>{topServer.aces} aces</Text>
              </View>
            )}
            {topDefender && topDefender.digs > 0 && (
              <View style={[s.awardCard, isTabletAny && { minWidth: 120 }]}>
                <Ionicons name="shield" size={18} color={ACCENT} />
                <Text style={s.awardLabel}>TOP DEFENDER</Text>
                <Text style={s.awardPlayer}>#{topDefender.jersey} {topDefender.name}</Text>
                <Text style={s.awardStat}>{topDefender.digs} digs</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Serve stats */}
      {serveStats && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>SERVE SUMMARY</Text>
          <View style={s.serveStatsRow}>
            <View style={s.serveStat}>
              <Text style={s.serveStatValue}>{serveStats.total}</Text>
              <Text style={s.serveStatLabel}>Total</Text>
            </View>
            <View style={s.serveStat}>
              <Text style={[s.serveStatValue, { color: TEAL }]}>{serveStats.good}</Text>
              <Text style={s.serveStatLabel}>Good</Text>
            </View>
            <View style={s.serveStat}>
              <Text style={[s.serveStatValue, { color: GOLD }]}>{serveStats.aces}</Text>
              <Text style={s.serveStatLabel}>Aces</Text>
            </View>
            <View style={s.serveStat}>
              <Text style={[s.serveStatValue, { color: CORAL }]}>{serveStats.errors}</Text>
              <Text style={s.serveStatLabel}>Errors</Text>
            </View>
            <View style={s.serveStat}>
              <Text style={s.serveStatValue}>{serveStats.inPct}%</Text>
              <Text style={s.serveStatLabel}>In %</Text>
            </View>
          </View>
        </>
      )}

      {/* Sub usage */}
      <Text style={[s.sectionTitle, { marginTop: 16 }]}>MATCH INFO</Text>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>Total Substitutions</Text>
        <Text style={s.infoValue}>{totalSubs}</Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>Formation</Text>
        <Text style={s.infoValue}>{match?.formation || '—'}</Text>
      </View>
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>Sync Status</Text>
        <Text style={[s.infoValue, {
          color: match?.syncStatus === 'synced' ? TEAL
            : match?.syncStatus === 'syncing' ? GOLD
            : CORAL,
        }]}>
          {match?.syncStatus === 'synced' ? 'Synced' : 'Local'}
        </Text>
      </View>

      {/* Post-game evaluation nudge */}
      <TouchableOpacity
        style={s.evalNudge}
        activeOpacity={0.7}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push(`/player-evaluations?teamId=${match?.teamId || ''}` as any);
        }}
      >
        <Ionicons name="clipboard-outline" size={20} color={ACCENT} />
        <View style={{ flex: 1 }}>
          <Text style={s.evalNudgeTitle}>Evaluate player performance</Text>
          <Text style={s.evalNudgeSubtitle}>Rate skills while observations are fresh</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.syncBtn} onPress={handleSync} disabled={syncing}>
          <Ionicons name={syncing ? 'sync' : 'cloud-upload'} size={18} color="#fff" />
          <Text style={s.syncBtnText}>
            {syncing ? 'Saving...' : 'Save to Lynx'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.doneBtn} onPress={handleDone}>
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },

  // Hero
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  resultBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultLetter: {
    fontFamily: FONTS.display,
    fontSize: 28,
  },
  heroInfo: {
    flex: 1,
  },
  heroOpponent: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },
  heroScore: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  // Sections
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Set cards
  setCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  setNum: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#fff',
  },
  setScoreText: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: '#fff',
  },
  setMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
  },

  // Awards
  awardsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  awardCard: {
    flex: 1,
    minWidth: 90,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  awardLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  awardPlayer: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
  },
  awardStat: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },

  // Serve stats
  serveStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  serveStat: {
    alignItems: 'center',
    gap: 2,
  },
  serveStatValue: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: '#fff',
  },
  serveStatLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  infoLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  infoValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },

  // Actions
  actions: {
    marginTop: 28,
    gap: 10,
    alignItems: 'center',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TEAL,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  syncBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  doneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  doneBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: ACCENT,
  },
  evalNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(75,185,236,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(75,185,236,0.15)',
    padding: 14,
    marginBottom: 16,
  },
  evalNudgeTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#fff',
  },
  evalNudgeSubtitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
});
