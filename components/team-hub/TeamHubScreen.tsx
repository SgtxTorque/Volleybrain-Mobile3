/**
 * TeamHubScreen — shared team hub component used by ALL roles.
 * Composes: HeroBanner → TeamIdentityBar → TickerBanner → QuickActionPills →
 *   Feed (TeamWall) → Gallery → Roster → Upcoming Events → Coach Links
 *
 * The hub is ONE scrollable page with sections.
 * QuickActionPills scroll-to-section, they don't replace content.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { supabase } from '@/lib/supabase';
import { useResponsive } from '@/lib/responsive';
import { BRAND } from '@/theme/colors';

import HeroBanner, { HeroBannerProps } from './HeroBanner';
import TeamIdentityBar from './TeamIdentityBar';
import TickerBanner from './TickerBanner';
import QuickActionPills from './QuickActionPills';
import GalleryPreview from './GalleryPreview';
import RosterSection from './RosterSection';
import UpcomingSection from './UpcomingSection';
import TeamWall from '@/components/TeamWall';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamHubScreenProps {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  role: 'admin' | 'coach' | 'parent' | 'player';
}

type TeamData = {
  id: string;
  name: string;
  color: string | null;
  banner_url: string | null;
  logo_url: string | null;
  motto: string | null;
  season_id: string | null;
};

type SeasonPulse = {
  wins: number;
  losses: number;
  streak: string;
  playerCount: number;
  topPerformer: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamHubScreen({ teamId, teamName, teamColor, role }: TeamHubScreenProps) {
  const { user } = useAuth();
  const { isCoach, isAdmin } = usePermissions();
  const { workingSeason } = useSeason();
  const { isTabletAny, contentMaxWidth, contentPadding } = useResponsive();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // Section refs for scroll-to
  const sectionRefs = useRef<Record<string, number>>({});
  const [activeSection, setActiveSection] = useState('feed');

  // Data state
  const [team, setTeam] = useState<TeamData | null>(null);
  const [nextGame, setNextGame] = useState<HeroBannerProps['nextGame']>(null);
  const [seasonPulse, setSeasonPulse] = useState<SeasonPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canEdit = role === 'admin' || role === 'coach';
  const isCoachOrAdmin = isAdmin || isCoach;
  const seasonId = team?.season_id || workingSeason?.id || null;
  const seasonName = workingSeason?.name || null;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;

    // Team details
    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name, color, banner_url, logo_url, motto, season_id')
      .eq('id', teamId)
      .single();

    if (teamData) setTeam(teamData as TeamData);

    // Next game
    const today = new Date().toISOString().split('T')[0];
    const { data: nextGameData } = await supabase
      .from('schedule_events')
      .select('id, opponent_name, opponent, event_date, start_time, event_time, location, venue_name')
      .eq('team_id', teamId)
      .in('event_type', ['game', 'match', 'tournament'])
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(1);

    if (nextGameData?.[0]) setNextGame(nextGameData[0] as any);

    // Season pulse — wins/losses from completed games
    const { data: games } = await supabase
      .from('schedule_events')
      .select('our_score, opponent_score')
      .eq('team_id', teamId)
      .in('event_type', ['game', 'match'])
      .not('our_score', 'is', null)
      .not('opponent_score', 'is', null);

    if (games && games.length > 0) {
      let wins = 0, losses = 0;
      const results: ('W' | 'L')[] = [];
      for (const g of games) {
        if ((g.our_score ?? 0) > (g.opponent_score ?? 0)) {
          wins++;
          results.push('W');
        } else {
          losses++;
          results.push('L');
        }
      }

      // Current streak
      let streak = '';
      if (results.length > 0) {
        const last = results[results.length - 1];
        let count = 0;
        for (let i = results.length - 1; i >= 0; i--) {
          if (results[i] === last) count++;
          else break;
        }
        streak = `${last}${count}`;
      }

      // Player count
      const { count: playerCount } = await supabase
        .from('team_players')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      setSeasonPulse({
        wins,
        losses,
        streak,
        playerCount: playerCount || 0,
        topPerformer: null, // Could be computed from player_stats if needed
      });
    }

    setLoading(false);
    setRefreshing(false);
  }, [teamId]);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTeamData();
  }, [fetchTeamData]);

  // ---------------------------------------------------------------------------
  // Section scroll-to
  // ---------------------------------------------------------------------------

  const handlePillPress = (key: string) => {
    setActiveSection(key);
    if (key === 'chat') {
      // Navigate to team chat channel
      router.push('/(tabs)/chats' as any);
      return;
    }
    const y = sectionRefs.current[key];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y, animated: true });
    }
  };

  const onSectionLayout = (key: string, y: number) => {
    sectionRefs.current[key] = y;
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading || !team) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND.teal} />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Build record string
  // ---------------------------------------------------------------------------

  const recordParts: string[] = [];
  if (seasonPulse) {
    recordParts.push(`${seasonPulse.wins}-${seasonPulse.losses}`);
    if (seasonPulse.streak) recordParts.push(seasonPulse.streak);
  }
  const recordStr = recordParts.length > 0 ? recordParts.join(' · ') : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      ref={scrollRef}
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        { paddingBottom: 100 },
        isTabletAny && {
          maxWidth: contentMaxWidth,
          alignSelf: 'center' as const,
          width: '100%',
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.teal} />
      }
    >
      {/* ─── HERO BANNER ──────────────────────────────── */}
      <HeroBanner
        team={{
          id: team.id,
          name: team.name,
          color: team.color,
          banner_url: team.banner_url,
          logo_url: team.logo_url,
          motto: team.motto,
        }}
        nextGame={nextGame}
        seasonPulse={seasonPulse}
        canEdit={canEdit}
        onBannerUpdated={(url) => setTeam(prev => prev ? { ...prev, banner_url: url } : prev)}
      />

      {/* ─── TEAM IDENTITY BAR ────────────────────────── */}
      <TeamIdentityBar
        teamName={team.name}
        logoUrl={team.logo_url}
        teamColor={team.color}
        record={recordStr}
        canEdit={canEdit}
      />

      {/* ─── TICKER BANNER ────────────────────────────── */}
      <TickerBanner
        teamId={team.id}
        teamName={team.name}
        motto={team.motto}
        canEdit={canEdit}
        onMottoUpdated={(motto) => setTeam(prev => prev ? { ...prev, motto } : prev)}
      />

      {/* ─── QUICK ACTION PILLS ───────────────────────── */}
      <QuickActionPills activeSection={activeSection} onPress={handlePillPress} />

      {/* ─── FEED SECTION ─────────────────────────────── */}
      <View onLayout={(e) => onSectionLayout('feed', e.nativeEvent.layout.y)}>
        <TeamWall teamId={teamId} embedded feedOnly />
      </View>

      {/* ─── GALLERY SECTION ──────────────────────────── */}
      <View onLayout={(e) => onSectionLayout('gallery', e.nativeEvent.layout.y)}>
        <GalleryPreview teamId={teamId} teamName={team.name} />
      </View>

      {/* ─── ROSTER SECTION ───────────────────────────── */}
      <View onLayout={(e) => onSectionLayout('roster', e.nativeEvent.layout.y)}>
        <RosterSection
          teamId={teamId}
          teamName={team.name}
          teamColor={team.color}
          seasonId={seasonId}
          seasonName={seasonName}
        />
      </View>

      {/* ─── UPCOMING EVENTS + COACH LINKS ────────────── */}
      <View onLayout={(e) => onSectionLayout('schedule', e.nativeEvent.layout.y)}>
        <UpcomingSection
          teamId={teamId}
          seasonId={seasonId}
          isCoachOrAdmin={isCoachOrAdmin}
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND.offWhite,
  },
});
