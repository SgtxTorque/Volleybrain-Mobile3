/**
 * EndSetPage — Screen 3 of the Game Day Command Center.
 *
 * Shown between sets and at match end.  Displays:
 * - Set summary (score, sub count, top stats)
 * - Start Next Set button
 * - End Match button (when enough sets won)
 */
import React, { useMemo } from 'react';
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
import { useMatch } from '@/lib/gameday/use-match';
import { isMatchComplete } from '@/lib/gameday/rotation-engine';
import type { SetState, RallyEvent } from '@/lib/gameday/match-state';
import { FONTS } from '@/theme/fonts';
import { useResponsive } from '@/lib/responsive';

const ACCENT = '#4BB9EC';
const TEAL = '#10B981';
const CORAL = '#EF4444';
const GOLD = '#FFD700';

export default function EndSetPage() {
  const { match, startNextSet, endMatch, setCurrentPage } = useMatch();
  const { isTabletAny, contentMaxWidth } = useResponsive();

  const sets = match?.sets || [];
  const currentSetNum = match?.currentSet ?? 1;
  const lastSet = sets[sets.length - 1];

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

  const matchOver = useMemo(() => {
    if (!match) return false;
    return isMatchComplete(sets, match.bestOf);
  }, [match, sets]);

  const matchWinner = matchOver
    ? (setsWon.home > setsWon.away ? 'home' : 'away')
    : null;

  // ── Top performers from Tier 2 rally stats ──

  const topPerformers = useMemo(() => {
    if (!match?.trackRallyStats) return [];
    const totals = new Map<string, { kills: number; errors: number; digs: number; aces: number; blocks: number }>();

    for (const set of sets) {
      for (const rally of set.rallyLog) {
        for (const act of rally.actions) {
          let pt = totals.get(act.playerId);
          if (!pt) { pt = { kills: 0, errors: 0, digs: 0, aces: 0, blocks: 0 }; totals.set(act.playerId, pt); }
          switch (act.action) {
            case 'kill': case 'good_hit': pt.kills++; break;
            case 'hit_error': case 'error': case 'bad_set': pt.errors++; break;
            case 'dig': pt.digs++; break;
            case 'block': pt.blocks++; break;
          }
        }
      }
    }

    const starters = match.starters || [];
    return Array.from(totals.entries())
      .map(([id, t]) => {
        const p = starters.find(s => s?.playerId === id);
        return { ...t, playerId: id, name: p ? `${p.firstName} ${p.lastName.charAt(0)}.` : '?', jersey: p?.jerseyNumber ?? 0 };
      })
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 5);
  }, [match, sets]);

  // ── Handlers ──

  const handleStartNextSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startNextSet();
    setCurrentPage(1); // go to live match
  };

  const handleEndMatch = () => {
    Alert.alert(
      'End Match?',
      `Sets: ${setsWon.home} - ${setsWon.away}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Match',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            endMatch();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={[
      s.content,
      isTabletAny && { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const },
    ]}>
      {/* Match result banner (if match is over) */}
      {matchOver && (
        <Animated.View entering={FadeIn.duration(400)} style={s.resultBanner}>
          <Ionicons
            name={matchWinner === 'home' ? 'trophy' : 'sad'}
            size={36}
            color={matchWinner === 'home' ? GOLD : CORAL}
          />
          <Text style={[s.resultText, { color: matchWinner === 'home' ? GOLD : CORAL }]}>
            {matchWinner === 'home' ? 'VICTORY!' : 'MATCH LOST'}
          </Text>
          <Text style={s.resultScore}>
            Sets: {setsWon.home} - {setsWon.away}
          </Text>
        </Animated.View>
      )}

      {/* Set-by-set scores */}
      <Text style={s.sectionTitle}>SET SCORES</Text>
      {sets.map((set, i) => (
        <Animated.View
          key={set.setNumber}
          entering={FadeInDown.delay(i * 80).duration(300)}
          style={[s.setRow, set.setComplete && (set.winner === 'home' ? s.setWon : s.setLost), isTabletAny && { padding: 16 }]}
        >
          <View style={s.setLabel}>
            <Text style={[s.setNumber, isTabletAny && { fontSize: 15 }]}>Set {set.setNumber}</Text>
            {set.setComplete && (
              <Ionicons
                name={set.winner === 'home' ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={set.winner === 'home' ? TEAL : CORAL}
              />
            )}
          </View>
          <Text style={[s.setScore, isTabletAny && { fontSize: 26 }]}>
            {set.homeScore} — {set.awayScore}
          </Text>
          <View style={s.setMeta}>
            <Text style={s.setMetaText}>Subs: {set.subsUsed}</Text>
            {set.rallyLog.length > 0 && (
              <Text style={s.setMetaText}>Rallies: {set.rallyLog.length}</Text>
            )}
          </View>
        </Animated.View>
      ))}

      {/* Top performers (Tier 2) */}
      {topPerformers.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 16 }]}>TOP PERFORMERS</Text>
          {topPerformers.map((p, i) => (
            <View key={p.playerId} style={[s.performerRow, isTabletAny && { paddingVertical: 12 }]}>
              <Text style={s.performerRank}>{i + 1}</Text>
              <View style={s.performerJerseyBadge}>
                <Text style={s.performerJersey}>{p.jersey}</Text>
              </View>
              <Text style={[s.performerName, isTabletAny && { fontSize: 15 }]}>{p.name}</Text>
              <View style={s.performerStats}>
                {p.kills > 0 && <Text style={[s.statBadge, { color: TEAL }, isTabletAny && { fontSize: 13 }]}>{p.kills}K</Text>}
                {p.digs > 0 && <Text style={[s.statBadge, { color: ACCENT }, isTabletAny && { fontSize: 13 }]}>{p.digs}D</Text>}
                {p.blocks > 0 && <Text style={[s.statBadge, { color: GOLD }, isTabletAny && { fontSize: 13 }]}>{p.blocks}B</Text>}
                {p.errors > 0 && <Text style={[s.statBadge, { color: CORAL }, isTabletAny && { fontSize: 13 }]}>{p.errors}E</Text>}
              </View>
            </View>
          ))}
        </>
      )}

      {/* Action buttons */}
      <View style={s.actions}>
        {!matchOver ? (
          <>
            {lastSet?.setComplete && (
              <TouchableOpacity style={s.primaryBtn} onPress={handleStartNextSet}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={s.primaryBtnText}>Start Set {currentSetNum + 1}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setCurrentPage(1)}>
              <Text style={s.secondaryBtnText}>Back to Live Match</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endMatchBtn} onPress={handleEndMatch}>
              <Ionicons name="flag" size={16} color={CORAL} />
              <Text style={s.endMatchText}>End Match Early</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={s.primaryBtn} onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              endMatch();
            }}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.primaryBtnText}>View Summary</Text>
            </TouchableOpacity>
          </>
        )}
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
    paddingBottom: 40,
  },

  // Result banner
  resultBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  resultText: {
    fontFamily: FONTS.display,
    fontSize: 28,
    textAlign: 'center',
  },
  resultScore: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },

  // Sections
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Set rows
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  setWon: {
    borderColor: TEAL + '30',
    backgroundColor: TEAL + '08',
  },
  setLost: {
    borderColor: CORAL + '20',
    backgroundColor: CORAL + '05',
  },
  setLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 70,
  },
  setNumber: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },
  setScore: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  setMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  setMetaText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    color: 'rgba(255,255,255,0.25)',
  },

  // Performers
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  performerRank: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    width: 16,
    textAlign: 'center',
  },
  performerJerseyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  performerJersey: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12,
    color: '#fff',
  },
  performerName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
  performerStats: {
    flexDirection: 'row',
    gap: 6,
  },
  statBadge: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

  // Actions
  actions: {
    marginTop: 24,
    gap: 10,
    alignItems: 'center',
  },
  primaryBtn: {
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
  primaryBtnText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: ACCENT,
  },
  endMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: CORAL + '30',
    marginTop: 8,
  },
  endMatchText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: CORAL,
  },
});
