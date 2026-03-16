/**
 * useTeamManagerData — operational data for Team Manager cards on Coach Home.
 * Fetches payment health, RSVP summary, registration status, and roster counts.
 * Only called when isTeamManager is true; returns defaults when teamId is null.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSeason } from '@/lib/season';

export interface TeamManagerData {
  // Payment health
  overduePayments: number;
  overdueAmount: number;
  pendingPayments: number;
  totalCollected: number;

  // Next event RSVP
  nextEventTitle: string | null;
  nextEventDate: string | null;
  nextEventType: string | null;
  rsvpConfirmed: number;
  rsvpMaybe: number;
  rsvpNoResponse: number;
  rsvpTotal: number;
  nextEventId: string | null;

  // Registration
  registrationOpen: boolean;
  registrationFilled: number;
  registrationCapacity: number;
  registrationPending: number;

  // Roster health
  rosterCount: number;

  // Loading
  loading: boolean;
}

const DEFAULTS: TeamManagerData = {
  overduePayments: 0,
  overdueAmount: 0,
  pendingPayments: 0,
  totalCollected: 0,
  nextEventTitle: null,
  nextEventDate: null,
  nextEventType: null,
  rsvpConfirmed: 0,
  rsvpMaybe: 0,
  rsvpNoResponse: 0,
  rsvpTotal: 0,
  nextEventId: null,
  registrationOpen: false,
  registrationFilled: 0,
  registrationCapacity: 0,
  registrationPending: 0,
  rosterCount: 0,
  loading: true,
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useTeamManagerData(teamId: string | null) {
  const { workingSeason } = useSeason();
  const [data, setData] = useState<TeamManagerData>(DEFAULTS);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      setData(prev => ({ ...prev, loading: true }));

      // ── Get player IDs on this team (needed for payment + registration joins) ──
      const { data: rosterRows } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', teamId);

      const playerIds = (rosterRows || []).map(r => r.player_id);
      const rosterCount = playerIds.length;

      // ── Payment health ──
      // payments table has player_id (not team_id), use `paid` boolean + `due_date`
      let overduePayments = 0;
      let overdueAmount = 0;
      let pendingPayments = 0;
      let totalCollected = 0;

      if (playerIds.length > 0 && workingSeason?.id) {
        try {
          const { data: payments } = await supabase
            .from('payments')
            .select('amount, paid, due_date')
            .in('player_id', playerIds)
            .eq('season_id', workingSeason.id);

          const todayStr = localToday();
          if (payments) {
            for (const p of payments) {
              const amt = Number(p.amount) || 0;
              if (p.paid) {
                totalCollected += amt;
              } else if (p.due_date && p.due_date < todayStr) {
                overduePayments++;
                overdueAmount += amt;
              } else {
                pendingPayments++;
              }
            }
          }
        } catch {
          // payments query may fail — graceful fallback
        }
      }

      // ── Next event RSVP ──
      const todayStr = localToday();
      let nextEventTitle: string | null = null;
      let nextEventDate: string | null = null;
      let nextEventType: string | null = null;
      let nextEventId: string | null = null;
      let rsvpConfirmed = 0;
      let rsvpMaybe = 0;
      let rsvpNoResponse = 0;
      let rsvpTotal = rosterCount;

      const { data: nextEvent } = await supabase
        .from('schedule_events')
        .select('id, title, event_type, event_date')
        .eq('team_id', teamId)
        .gte('event_date', todayStr)
        .order('event_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextEvent) {
        nextEventTitle = nextEvent.title;
        nextEventDate = nextEvent.event_date;
        nextEventType = nextEvent.event_type;
        nextEventId = nextEvent.id;

        try {
          const { data: rsvps } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', nextEvent.id);

          if (rsvps) {
            for (const r of rsvps) {
              if (r.status === 'yes' || r.status === 'confirmed') rsvpConfirmed++;
              else if (r.status === 'maybe' || r.status === 'tentative') rsvpMaybe++;
            }
          }
        } catch {
          // RSVP query may fail — graceful fallback
        }

        rsvpNoResponse = Math.max(0, rsvpTotal - rsvpConfirmed - rsvpMaybe);
      }

      // ── Registration status (season-scoped, filtered to team players) ──
      let registrationOpen = false;
      let registrationFilled = 0;
      let registrationCapacity = 0;
      let registrationPending = 0;

      if (workingSeason?.id) {
        try {
          // Check if registration is open on the season
          const { data: season } = await supabase
            .from('seasons')
            .select('registration_open, capacity')
            .eq('id', workingSeason.id)
            .maybeSingle();

          if (season?.registration_open) {
            registrationOpen = true;
            registrationCapacity = season.capacity || 0;

            const { data: regData } = await supabase
              .from('registrations')
              .select('status')
              .eq('season_id', workingSeason.id);

            if (regData) {
              for (const r of regData) {
                if (r.status === 'approved' || r.status === 'rostered' || r.status === 'paid') {
                  registrationFilled++;
                } else if (r.status === 'pending' || r.status === 'submitted') {
                  registrationPending++;
                }
              }
            }
          }
        } catch {
          // Registration query may fail — graceful fallback
        }
      }

      setData({
        overduePayments,
        overdueAmount,
        pendingPayments,
        totalCollected,
        nextEventTitle,
        nextEventDate,
        nextEventType,
        nextEventId,
        rsvpConfirmed,
        rsvpMaybe,
        rsvpNoResponse,
        rsvpTotal,
        registrationOpen,
        registrationFilled,
        registrationCapacity,
        registrationPending,
        rosterCount,
        loading: false,
      });
    } catch (err) {
      if (__DEV__) console.error('[useTeamManagerData] Error:', err);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [teamId, workingSeason?.id]);

  useEffect(() => {
    if (teamId) {
      loadData();
    } else {
      setData({ ...DEFAULTS, loading: false });
    }
  }, [loadData, teamId]);

  return { ...data, refreshData: loadData };
}
