/**
 * RegistrationStatusCard — Shows pending/approved registration status on parent home.
 * Progress steps: Submitted → Admin Review → Team Assignment → Payment Confirmation.
 * Gold left border for pending, teal for approved.
 */
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { radii } from '@/lib/design-tokens';

type RegistrationStatus = {
  id: string;
  childName: string;
  seasonName: string;
  status: string; // pending | submitted | approved | denied | paid
  teamName: string | null;
  submittedAt: string | null;
  hasPaid: boolean;
};

const PROGRESS_STEPS = [
  { label: 'Registration submitted', icon: 'checkmark-circle' as const },
  { label: 'Admin reviews your registration', icon: 'ellipse-outline' as const },
  { label: 'Team assignment', icon: 'ellipse-outline' as const },
  { label: 'Payment confirmation', icon: 'ellipse-outline' as const },
];

function getCompletedSteps(reg: RegistrationStatus): number {
  if (reg.hasPaid) return 4;
  if (reg.teamName) return 3;
  if (reg.status === 'approved') return 2;
  return 1; // submitted
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function RegistrationStatusCard() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [registrations, setRegistrations] = useState<RegistrationStatus[]>([]);

  useEffect(() => {
    fetchPendingRegistrations();
  }, [user?.id]);

  const fetchPendingRegistrations = async () => {
    if (!user?.id || !profile?.id) return;

    // Get player IDs for this parent
    const { data: links } = await supabase
      .from('player_parents')
      .select('player_id')
      .eq('parent_id', profile.id);

    if (!links || links.length === 0) return;

    const playerIds = links.map(l => l.player_id);

    // Get recent registrations for these players
    const { data: regs } = await supabase
      .from('registrations')
      .select(`
        id,
        status,
        created_at,
        player_id,
        season_id,
        players(first_name, last_name),
        seasons(name),
        team_players(teams(name))
      `)
      .in('player_id', playerIds)
      .in('status', ['pending', 'submitted', 'approved'])
      .order('created_at', { ascending: false });

    if (!regs || regs.length === 0) {
      setRegistrations([]);
      return;
    }

    // Check payment status for these registrations
    const { data: payments } = await supabase
      .from('payments')
      .select('player_id, status')
      .in('player_id', playerIds)
      .eq('status', 'verified');

    const paidPlayerIds = new Set((payments || []).map(p => p.player_id));

    const mapped: RegistrationStatus[] = regs.map((r: any) => {
      const player = r.players;
      const season = r.seasons;
      const teamPlayer = r.team_players?.[0];

      return {
        id: r.id,
        childName: player ? `${player.first_name} ${player.last_name}` : 'Unknown',
        seasonName: season?.name || '',
        status: r.status,
        teamName: teamPlayer?.teams?.name || null,
        submittedAt: r.created_at,
        hasPaid: paidPlayerIds.has(r.player_id),
      };
    });

    setRegistrations(mapped);
  };

  if (registrations.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      {registrations.map((reg) => {
        const completedSteps = getCompletedSteps(reg);
        const isPending = reg.status === 'pending' || reg.status === 'submitted';
        const isApproved = reg.status === 'approved';
        const borderColor = isApproved ? BRAND.teal : '#E5A100';
        const statusLabel = isApproved ? 'APPROVED' : 'REGISTRATION PENDING';
        const statusIcon = isApproved ? 'checkmark-circle' : 'time-outline';

        return (
          <View key={reg.id} style={[styles.card, { borderLeftColor: borderColor }]}>
            {/* Status header */}
            <View style={styles.statusRow}>
              <Ionicons
                name={statusIcon as any}
                size={18}
                color={borderColor}
              />
              <Text style={[styles.statusLabel, { color: borderColor }]}>
                {statusLabel}
              </Text>
            </View>

            {/* Child & season info */}
            <Text style={styles.childName}>{reg.childName}</Text>
            <Text style={styles.seasonInfo}>
              {reg.seasonName}
              {reg.submittedAt && ` \u00B7 Submitted ${formatDate(reg.submittedAt)}`}
              {isPending && ' \u00B7 Awaiting approval'}
              {isApproved && reg.teamName && ` \u00B7 ${reg.teamName}`}
            </Text>

            {/* Progress steps */}
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>What happens next:</Text>
              {PROGRESS_STEPS.map((step, idx) => {
                const isComplete = idx < completedSteps;
                const isCurrent = idx === completedSteps;
                return (
                  <View key={idx} style={styles.stepRow}>
                    <Ionicons
                      name={isComplete ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={isComplete ? BRAND.teal : isCurrent ? '#E5A100' : BRAND.textMuted}
                    />
                    <Text style={[
                      styles.stepLabel,
                      isComplete && styles.stepLabelComplete,
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {isPending && (
              <Text style={styles.notifyText}>You'll be notified when approved!</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: BRAND.white,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderLeftWidth: 4,
    padding: 16,
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  childName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: BRAND.textPrimary,
  },
  seasonInfo: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 8,
  },
  stepsContainer: {
    backgroundColor: `${BRAND.teal}06`,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  stepsTitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textMuted,
  },
  stepLabelComplete: {
    color: BRAND.textPrimary,
  },
  notifyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
