import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export type DrawerBadges = {
  pendingRegistrations: number;
  pendingApprovals: number;
  unpaidPaymentsAdmin: number;
  unpaidPaymentsParent: number;
  unrosteredPlayers: number;
  unsignedWaivers: number;
  unreadChats: number;
};

const EMPTY_BADGES: DrawerBadges = {
  pendingRegistrations: 0,
  pendingApprovals: 0,
  unpaidPaymentsAdmin: 0,
  unpaidPaymentsParent: 0,
  unrosteredPlayers: 0,
  unsignedWaivers: 0,
  unreadChats: 0,
};

export function useDrawerBadges(isOpen: boolean) {
  const { user, profile } = useAuth();
  const { isAdmin, isParent, isTeamManager } = usePermissions();
  const [badges, setBadges] = useState<DrawerBadges>(EMPTY_BADGES);
  const [loading, setLoading] = useState(false);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    const counts: DrawerBadges = { ...EMPTY_BADGES };

    try {
      // ---- Admin badges ----
      if (isAdmin) {
        const [regResult, approvalResult, paymentResult, unrosteredResult] =
          await Promise.allSettled([
            // Pending registrations
            supabase
              .from('registrations')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'new'),

            // Pending profile approvals
            supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('pending_approval', true),

            // Unpaid payments (admin-wide)
            supabase
              .from('payments')
              .select('*', { count: 'exact', head: true })
              .eq('paid', false),

            // Unrostered players (approved but not assigned to team)
            supabase
              .from('registrations')
              .select('*', { count: 'exact', head: true })
              .in('status', ['approved', 'active'])
              .is('rostered_at', null),
          ]);

        if (regResult.status === 'fulfilled' && regResult.value.count) {
          counts.pendingRegistrations = regResult.value.count;
        }
        if (approvalResult.status === 'fulfilled' && approvalResult.value.count) {
          counts.pendingApprovals = approvalResult.value.count;
        }
        if (paymentResult.status === 'fulfilled' && paymentResult.value.count) {
          counts.unpaidPaymentsAdmin = paymentResult.value.count;
        }
        if (unrosteredResult.status === 'fulfilled' && unrosteredResult.value.count) {
          counts.unrosteredPlayers = unrosteredResult.value.count;
        }
      }

      // ---- Parent badges ----
      if (isParent && user?.email) {
        const [paymentResult, waiverResult] = await Promise.allSettled([
          // Unpaid payments for this family
          supabase
            .from('payments')
            .select('*', { count: 'exact', head: true })
            .eq('paid', false)
            .eq('family_email', user.email),

          // Unsigned waivers sent to this parent
          supabase
            .from('waiver_sends')
            .select('*', { count: 'exact', head: true })
            .eq('sent_to_email', user.email)
            .is('signed_at', null),
        ]);

        if (paymentResult.status === 'fulfilled' && paymentResult.value.count) {
          counts.unpaidPaymentsParent = paymentResult.value.count;
        }
        if (waiverResult.status === 'fulfilled' && waiverResult.value.count) {
          counts.unsignedWaivers = waiverResult.value.count;
        }
      }

      // ---- All-role badges ----
      if (profile?.id) {
        // Unread chat messages
        const { data: memberships } = await supabase
          .from('channel_members')
          .select('channel_id, last_read_at')
          .eq('user_id', profile.id)
          .is('left_at', null);

        if (memberships && memberships.length > 0) {
          const channelIds = memberships.map((m) => m.channel_id);
          // Batch: count all unread messages across channels at once
          let totalUnread = 0;
          for (const m of memberships) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', m.channel_id)
              .eq('is_deleted', false)
              .gt('created_at', m.last_read_at || '1970-01-01');
            totalUnread += count || 0;
          }
          counts.unreadChats = totalUnread;
        }
      }
    } catch (error) {
      if (__DEV__) console.error('useDrawerBadges fetch error:', error);
    }

    setBadges(counts);
    setLoading(false);
  }, [isAdmin, isParent, user?.email, profile?.id]);

  // Fetch when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchBadges();
    }
  }, [isOpen, fetchBadges]);

  // Computed totals for convenience
  const totalActionable =
    badges.pendingRegistrations +
    badges.pendingApprovals +
    badges.unpaidPaymentsAdmin +
    badges.unpaidPaymentsParent +
    badges.unrosteredPlayers +
    badges.unsignedWaivers +
    badges.unreadChats;

  return { badges, loading, totalActionable, refetch: fetchBadges };
}
