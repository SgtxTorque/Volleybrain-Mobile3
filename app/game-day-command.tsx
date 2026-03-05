/**
 * Game Day Command Center — main screen with 4-page workflow.
 *
 * Route:  /game-day-command?eventId=xxx&teamId=xxx&opponent=xxx
 *         /game-day-command?matchId=xxx  (resume in-progress)
 *
 * Pages:
 *   0 — Game Prep / Lineup
 *   1 — Live Match
 *   2 — End Set / End Match
 *   3 — Post-Game Summary
 */
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchProvider, useMatch } from '@/lib/gameday/use-match';
import GamePrepPage from '@/components/gameday/GamePrepPage';
import LiveMatchPage from '@/components/gameday/LiveMatchPage';
import { FONTS } from '@/theme/fonts';

const PAGE_LABELS = ['GAME PREP', 'LIVE MATCH', 'END SET', 'SUMMARY'];
const ACCENT = '#4BB9EC';

// ── Inner content (has access to MatchContext) ──────────────────

function CommandCenterContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { match, currentPage, setCurrentPage, loading } = useMatch();

  // Placeholder pages for Phase 3-7
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 0:
        return <GamePrepPage />;
      case 1:
        return <LiveMatchPage />;
      case 2:
        return (
          <View style={s.placeholder}>
            <Ionicons name="flag" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={s.placeholderText}>End Set / Match — Phase 6</Text>
          </View>
        );
      case 3:
        return (
          <View style={s.placeholder}>
            <Ionicons name="trophy" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={s.placeholderText}>Post-Game Summary — Phase 7</Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        {/* Page dots */}
        <View style={s.dotsRow}>
          {PAGE_LABELS.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={s.dotWrap}
              onPress={() => {
                // Only allow going back to prep, or forward if conditions met
                if (i === 0 || (i === 1 && match && match.starters.filter(Boolean).length === 6)) {
                  setCurrentPage(i);
                }
              }}
            >
              <View style={[s.dot, currentPage === i && s.dotActive]} />
              <Text style={[s.dotLabel, currentPage === i && s.dotLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sync status */}
        <View style={[s.syncDot, {
          backgroundColor: match?.syncStatus === 'synced' ? '#10B981'
            : match?.syncStatus === 'syncing' ? '#F59E0B'
            : '#EF4444',
        }]} />
      </View>

      {/* Current page */}
      {loading ? (
        <View style={s.placeholder}>
          <Text style={s.placeholderText}>Loading...</Text>
        </View>
      ) : (
        renderCurrentPage()
      )}
    </View>
  );
}

// ── Main export (wraps in MatchProvider) ─────────────────────────

export default function GameDayCommandScreen() {
  const params = useLocalSearchParams<{
    eventId?: string;
    teamId?: string;
    opponent?: string;
    matchId?: string;
  }>();

  return (
    <MatchProvider
      eventId={params.eventId}
      teamId={params.teamId}
      opponentName={params.opponent}
      matchId={params.matchId}
    >
      <CommandCenterContent />
    </MatchProvider>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  dotWrap: {
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    backgroundColor: ACCENT,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 7,
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 0.5,
  },
  dotLabelActive: {
    color: ACCENT,
    fontFamily: FONTS.bodyBold,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Placeholder for unbuilt pages
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
  placeholderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 8,
  },
  placeholderBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: ACCENT,
  },
});
