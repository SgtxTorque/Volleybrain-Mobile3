/**
 * usePlayerHomeData — data fetching hook for the Player Home Scroll experience.
 * Mirrors web admin PlayerDashboard.jsx loadPlayerDashboard() pattern.
 * Columns verified against SCHEMA_REFERENCE.csv.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useSeason } from '@/lib/season';
import { calculateStreakWithFreeze, checkStreakState, StreakState } from '@/lib/streak-engine';
import { getLevelFromXP, getLevelTier } from '@/lib/engagement-constants';
import { checkEarlyBird, checkAndCreateAutoBoosts } from '@/lib/xp-boost-engine';
import { supabase } from '@/lib/supabase';
import { onRefresh } from '@/lib/refresh-bus';

/** Local date string (YYYY-MM-DD) to avoid UTC timezone shift issues */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── XP & OVR Formulas (from web admin PlayerDashboard.jsx) ──────

function computeXP(
  seasonStats: Record<string, number> | null,
  badgeCount: number,
): number {
  const gp = seasonStats?.games_played || 0;
  const k = seasonStats?.total_kills || 0;
  const a = seasonStats?.total_aces || 0;
  const d = seasonStats?.total_digs || 0;
  const bl = seasonStats?.total_blocks || 0;
  const as = seasonStats?.total_assists || 0;
  return (gp * 100) + (k * 10) + (a * 25) + (d * 5) + (bl * 15) + (as * 10) + (badgeCount * 50);
}

function computeOVR(seasonStats: Record<string, number> | null): number {
  if (!seasonStats) return 0;
  const gp = seasonStats.games_played || 0;
  if (gp === 0) return 0;
  const hitPct = seasonStats.hitting_percentage || 0;
  const servePct = seasonStats.serve_percentage || 0;
  const killsPg = (seasonStats.total_kills || 0) / gp;
  const acesPg = (seasonStats.total_aces || 0) / gp;
  const digsPg = (seasonStats.total_digs || 0) / gp;
  const blocksPg = (seasonStats.total_blocks || 0) / gp;
  const assistsPg = (seasonStats.total_assists || 0) / gp;
  const raw = (hitPct * 100 * 0.25) + (servePct * 100 * 0.15) +
    (killsPg * 4) + (acesPg * 6) + (digsPg * 2.5) + (blocksPg * 5) + (assistsPg * 3) +
    Math.min(gp * 1.5, 15);
  return Math.min(99, Math.max(40, Math.round(raw + 35)));
}

// ─── Types ─────────────────────────────────────────────────────

export type PlayerTeam = {
  id: string;
  name: string;
  color: string | null;
};

export type PlayerBadge = {
  id: string;
  earned_at: string;
  achievement: {
    id: string;
    name: string;
    icon: string | null;
    rarity: string | null;
    color_primary: string | null;
    description: string | null;
  } | null;
};

export type LastGameStats = {
  kills: number;
  aces: number;
  digs: number;
  blocks: number;
  assists: number;
  points: number;
  event_date: string | null;
  opponent_name: string | null;
  our_score: number | null;
  opponent_score: number | null;
};

export type NextEvent = {
  id: string;
  title: string | null;
  event_type: string;
  event_date: string;
  event_time: string | null;
  start_time: string | null;
  location: string | null;
  venue_name: string | null;
  opponent_name: string | null;
  team_name: string;
};

export type RsvpStatus = 'yes' | 'no' | 'maybe' | 'confirmed' | null;

export type BestRank = {
  stat: string;
  rank: number;
  value: number;
};

export type PhotoPreview = {
  id: string;
  media_url: string;
  created_at: string;
};

export type RecentShoutout = {
  id: string;
  giverName: string;
  categoryName: string;
  categoryEmoji: string;
  message: string | null;
  created_at: string;
};

// ─── Hook ──────────────────────────────────────────────────────

export function usePlayerHomeData(playerId: string | null) {
  const { user } = useAuth();
  const { isAdmin, isCoach } = usePermissions();
  const { workingSeason } = useSeason();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(true);

  // Player info
  const [playerName, setPlayerName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [teams, setTeams] = useState<PlayerTeam[]>([]);

  // Stats
  const [seasonStats, setSeasonStats] = useState<Record<string, number> | null>(null);
  const [lastGame, setLastGame] = useState<LastGameStats | null>(null);
  const [badges, setBadges] = useState<PlayerBadge[]>([]);

  // Events
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [attendanceStreak, setAttendanceStreak] = useState(0);
  const [streakFreezeUsed, setStreakFreezeUsed] = useState(false);

  // Rankings
  const [bestRank, setBestRank] = useState<BestRank | null>(null);

  // Social (tables may not exist)
  const [recentPhotos, setRecentPhotos] = useState<PhotoPreview[]>([]);

  // Personal best detection
  const [personalBest, setPersonalBest] = useState<string | null>(null);

  // Shoutouts received (last 7 days)
  const [recentShoutouts, setRecentShoutouts] = useState<RecentShoutout[]>([]);

  // Feature flags
  const [challengesAvailable, setChallengesAvailable] = useState(false);

  // Engagement system
  const [dbXp, setDbXp] = useState(0);
  const [dbLevel, setDbLevel] = useState(1);
  const [dbTier, setDbTier] = useState('Rookie');
  const [dbXpToNext, setDbXpToNext] = useState(100);
  const [engagementStreak, setEngagementStreak] = useState<StreakState | null>(null);
  const [engagementProfileId, setEngagementProfileId] = useState<string | undefined>(undefined);

  // ─── Fetch all data ──
  const fetchAll = useCallback(async () => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Player info + teams
      const { data: playerData } = await supabase
        .from('players')
        .select('id, first_name, last_name, jersey_number, position, photo_url, parent_account_id')
        .eq('id', playerId)
        .maybeSingle();

      if (!playerData) {
        setLoading(false);
        return;
      }

      // ── Ownership check: verify user has access to this player ──
      if (!isAdmin && !isCoach) {
        let hasAccess = playerData.parent_account_id === user?.id;
        if (!hasAccess) {
          const { count } = await supabase
            .from('player_guardians')
            .select('id', { count: 'exact', head: true })
            .eq('guardian_id', user?.id ?? '')
            .eq('player_id', playerId);
          hasAccess = (count ?? 0) > 0;
        }
        if (!hasAccess) {
          setAuthorized(false);
          setLoading(false);
          return;
        }
      }

      setFirstName(playerData.first_name || '');
      setLastName(playerData.last_name || '');
      setPlayerName(`${playerData.first_name} ${playerData.last_name}`);
      setJerseyNumber(playerData.jersey_number);
      setPosition(playerData.position);
      setPhotoUrl(playerData.photo_url);

      const { data: teamData } = await supabase
        .from('team_players')
        .select('team_id, teams(id, name, color)')
        .eq('player_id', playerId);

      const playerTeams: PlayerTeam[] = (teamData || [])
        .map((tp: any) => tp.teams)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, color: t.color }));
      setTeams(playerTeams);
      const teamIds = playerTeams.map(t => t.id);

      // Auto XP boost check (Game Day / Practice Day / Weekend Warrior)
      if (teamIds.length > 0) {
        checkAndCreateAutoBoosts(teamIds[0]).catch(() => {});
      }

      // 2. Season stats
      if (workingSeason?.id) {
        const { data: stats } = await supabase
          .from('player_season_stats')
          .select('*')
          .eq('player_id', playerId)
          .eq('season_id', workingSeason.id)
          .maybeSingle();
        setSeasonStats(stats);

        // 10. Rankings
        const { data: allStats } = await supabase
          .from('player_season_stats')
          .select('player_id, total_kills, total_aces, total_digs, total_blocks, total_assists, total_points')
          .eq('season_id', workingSeason.id);

        if (allStats && allStats.length > 0) {
          const statKeys = ['kills', 'aces', 'digs', 'blocks', 'assists', 'points'] as const;
          let best: BestRank | null = null;
          for (const stat of statKeys) {
            const col = `total_${stat}` as string;
            const sorted = [...allStats].sort((a: any, b: any) => (b[col] || 0) - (a[col] || 0));
            const rank = sorted.findIndex((s: any) => s.player_id === playerId) + 1;
            const value = (stats as any)?.[col] || 0;
            if (rank > 0 && value > 0 && (!best || rank < best.rank)) {
              best = { stat, rank, value };
            }
          }
          setBestRank(best);
        }
      }

      // 3. Last game stats + personal best detection
      const { data: recentGames } = await supabase
        .from('game_player_stats')
        .select('kills, aces, digs, blocks, assists, points, event_id, created_at')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(10);

      const lastGameData = recentGames?.[0] || null;

      if (lastGameData) {
        // Get event details
        const { data: eventData } = await supabase
          .from('schedule_events')
          .select('event_date, opponent_name, our_score, opponent_score')
          .eq('id', lastGameData.event_id)
          .maybeSingle();

        setLastGame({
          kills: lastGameData.kills || 0,
          aces: lastGameData.aces || 0,
          digs: lastGameData.digs || 0,
          blocks: lastGameData.blocks || 0,
          assists: lastGameData.assists || 0,
          points: lastGameData.points || 0,
          event_date: eventData?.event_date || null,
          opponent_name: eventData?.opponent_name || null,
          our_score: eventData?.our_score ?? null,
          opponent_score: eventData?.opponent_score ?? null,
        });

        // Personal best: compare last game to previous games
        const previousGames = (recentGames || []).slice(1);
        if (previousGames.length > 0) {
          const statFields = [
            { key: 'kills', label: 'kills' },
            { key: 'aces', label: 'aces' },
            { key: 'digs', label: 'digs' },
            { key: 'blocks', label: 'blocks' },
            { key: 'assists', label: 'assists' },
          ] as const;
          let bestStat: string | null = null;
          for (const field of statFields) {
            const lastVal = (lastGameData as any)[field.key] || 0;
            const prevMax = Math.max(...previousGames.map((g: any) => g[field.key] || 0), 0);
            if (lastVal > prevMax && lastVal > 0) {
              bestStat = field.label;
              break;
            }
          }
          setPersonalBest(bestStat);
        } else {
          setPersonalBest(null);
        }
      } else {
        setLastGame(null);
        setPersonalBest(null);
      }

      // 4. Badges — filter to only keep records with a valid joined achievement
      try {
        const { data: badgeData } = await supabase
          .from('player_achievements')
          .select('id, earned_at, achievement:achievement_id(id, name, icon, rarity, color_primary, description)')
          .eq('player_id', playerId)
          .order('earned_at', { ascending: false });
        const validBadges = (badgeData || []).filter((b: any) => b.achievement && b.achievement.id);
        setBadges(validBadges as any);
      } catch {
        setBadges([]);
      }

      // 6. Next upcoming event
      if (teamIds.length > 0) {
        const today = localToday();
        const { data: nextEvt } = await supabase
          .from('schedule_events')
          .select('id, title, event_type, event_date, event_time, start_time, location, venue_name, opponent_name, team_id')
          .in('team_id', teamIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextEvt) {
          const team = playerTeams.find(t => t.id === nextEvt.team_id);
          setNextEvent({
            id: nextEvt.id,
            title: nextEvt.title,
            event_type: nextEvt.event_type,
            event_date: nextEvt.event_date,
            event_time: nextEvt.event_time,
            start_time: nextEvt.start_time,
            location: nextEvt.location,
            venue_name: nextEvt.venue_name,
            opponent_name: nextEvt.opponent_name,
            team_name: team?.name || '',
          });

          // 7. RSVP status
          const { data: rsvp } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', nextEvt.id)
            .eq('player_id', playerId)
            .maybeSingle();
          setRsvpStatus((rsvp?.status as RsvpStatus) || null);
        } else {
          setNextEvent(null);
          setRsvpStatus(null);
        }

        // 13. Attendance streak
        const todayStr = localToday();
        const { data: recentEvents } = await supabase
          .from('schedule_events')
          .select('id')
          .in('team_id', teamIds)
          .lt('event_date', todayStr)
          .order('event_date', { ascending: false })
          .limit(20);

        if (recentEvents && recentEvents.length > 0) {
          const eventIds = recentEvents.map(e => e.id);
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('event_id, status')
            .in('event_id', eventIds)
            .eq('player_id', playerId);

          const rsvpMap = new Map((rsvps || []).map(r => [r.event_id, r.status]));
          const rsvpStatuses = recentEvents.map(evt => ({ status: rsvpMap.get(evt.id) || '' }));
          const { streak, freezeUsed } = calculateStreakWithFreeze(rsvpStatuses);
          setAttendanceStreak(streak);
          setStreakFreezeUsed(freezeUsed);
        }
      }

      // 11. Recent photos (team_posts with media_urls)
      if (teamIds.length > 0) {
        try {
          const { data: posts } = await supabase
            .from('team_posts')
            .select('id, media_urls, created_at')
            .in('team_id', teamIds)
            .eq('is_published', true)
            .not('media_urls', 'is', null)
            .order('created_at', { ascending: false })
            .limit(8);

          const photos: PhotoPreview[] = [];
          for (const post of (posts || [])) {
            const urls = post.media_urls as string[] | null;
            if (urls && urls.length > 0) {
              for (const url of urls) {
                if (photos.length < 8) {
                  photos.push({ id: `${post.id}-${photos.length}`, media_url: url, created_at: post.created_at });
                }
              }
            }
          }
          setRecentPhotos(photos);
        } catch {
          setRecentPhotos([]);
        }
      }

      // 12. Recent shoutouts received (last 7 days)
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        // receiver_id in shoutouts references profiles.id
        // players.parent_account_id links to profiles.id
        const { data: playerLink } = await supabase
          .from('players')
          .select('parent_account_id')
          .eq('id', playerId)
          .maybeSingle();

        const profileId = playerLink?.parent_account_id;
        if (profileId) {
          const { data: shoutouts } = await supabase
            .from('shoutouts')
            .select(`
              id, message, created_at, category,
              giver:profiles!giver_id(full_name, avatar_url),
              category_info:shoutout_categories!category_id(name, emoji)
            `)
            .eq('receiver_id', profileId)
            .gte('created_at', weekAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(3);

          if (shoutouts && shoutouts.length > 0) {
            setRecentShoutouts(shoutouts.map((s: any) => {
              const giver = Array.isArray(s.giver) ? s.giver[0] : s.giver;
              const catInfo = Array.isArray(s.category_info) ? s.category_info[0] : s.category_info;
              return {
                id: s.id,
                giverName: giver?.full_name || 'A teammate',
                categoryName: catInfo?.name || s.category || 'Shoutout',
                categoryEmoji: catInfo?.emoji || '\u{2B50}',
                message: s.message,
                created_at: s.created_at,
              };
            }));
          } else {
            setRecentShoutouts([]);
          }
        }
      } catch {
        setRecentShoutouts([]);
      }
      // Check if challenges exist for the player's team
      if (teamIds.length > 0) {
        try {
          const { count } = await supabase
            .from('coach_challenges')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', teamIds[0])
            .eq('status', 'active');
          setChallengesAvailable((count ?? 0) > 0);
        } catch {
          setChallengesAvailable(false);
        }
      }

      // 14. Engagement system — DB XP + streak
      const engProfileId = playerData.parent_account_id;
      setEngagementProfileId(engProfileId || undefined);
      if (engProfileId) {
        try {
          const { data: engData } = await supabase
            .from('profiles')
            .select('total_xp, player_level, tier, xp_to_next_level')
            .eq('id', engProfileId)
            .maybeSingle();

          if (engData) {
            setDbXp(engData.total_xp ?? 0);
            setDbLevel(engData.player_level ?? 1);
            setDbTier(engData.tier ?? 'Rookie');
            setDbXpToNext(engData.xp_to_next_level ?? 100);
          }
        } catch {
          // DB engagement columns may not exist yet — fall back silently
        }

        try {
          const streakState = await checkStreakState(engProfileId);
          setEngagementStreak(streakState);
        } catch {
          // streak_data table may not exist yet — fall back silently
        }
      }
    } catch (err) {
      if (__DEV__) console.error('[usePlayerHomeData] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [playerId, workingSeason?.id, user?.id, isAdmin, isCoach]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Subscribe to refresh bus — re-fetch on XP or streak changes
  useEffect(() => {
    const unsubXp = onRefresh('xp', fetchAll);
    const unsubStreak = onRefresh('streak', fetchAll);
    return () => { unsubXp(); unsubStreak(); };
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // RSVP action
  const sendRsvp = useCallback(async (status: 'yes' | 'no') => {
    if (!playerId || !nextEvent) return;
    try {
      await supabase.from('event_rsvps').upsert(
        {
          event_id: nextEvent.id,
          player_id: playerId,
          status: status === 'yes' ? 'confirmed' : 'no',
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,player_id' },
      );
      setRsvpStatus(status === 'yes' ? 'confirmed' : 'no');

      // Early Bird check — award XP if among first 5 RSVPs
      if (status === 'yes' && user?.id) {
        checkEarlyBird(nextEvent.id, user.id).catch(() => {});
      }
    } catch (err) {
      if (__DEV__) console.error('[usePlayerHomeData] RSVP error:', err);
    }
  }, [playerId, nextEvent, user?.id]);

  // Computed values — use DB XP if available, else fall back to formula
  const computedXp = useMemo(() => computeXP(seasonStats, badges.length), [seasonStats, badges.length]);
  const xp = dbXp > 0 ? dbXp : computedXp;

  // Use the real exponential XP_LEVELS thresholds instead of flat modulo
  const levelInfo = useMemo(() => getLevelFromXP(xp), [xp]);
  const level = levelInfo.level;
  const levelTier = getLevelTier(level);
  const tier = levelTier.name;
  const xpProgress = levelInfo.progress;
  const xpToNext = levelInfo.nextLevelXp - xp;
  const xpNextLevel = levelInfo.nextLevelXp;
  const ovr = useMemo(() => computeOVR(seasonStats), [seasonStats]);

  const primaryTeam = teams[0] || null;

  return {
    loading,
    refreshing,
    refresh,
    authorized,
    // Player info
    playerName,
    firstName,
    lastName,
    jerseyNumber,
    position,
    photoUrl,
    teams,
    primaryTeam,
    // Stats
    seasonStats,
    lastGame,
    badges,
    personalBest,
    // Computed
    xp,
    level,
    tier,
    xpProgress,
    xpToNext,
    xpNextLevel,
    ovr,
    bestRank,
    // Events
    nextEvent,
    rsvpStatus,
    sendRsvp,
    attendanceStreak,
    streakFreezeUsed,
    // Engagement
    engagementStreak,
    engagementProfileId,
    // Social
    recentPhotos,
    recentShoutouts,
    challengesAvailable,
  };
}
