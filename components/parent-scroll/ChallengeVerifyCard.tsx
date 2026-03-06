/**
 * ChallengeVerifyCard -- parent home scroll card showing children's
 * active challenge progress and any items needing parent verification.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchActiveChallenges, type ChallengeWithParticipants } from '@/lib/challenge-service';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type ChildInfo = {
  id: string;
  first_name: string;
  teamId: string | null;
};

type Props = {
  children: ChildInfo[];
};

type ChildChallengeRow = {
  childId: string;
  childName: string;
  challengeId: string;
  challengeTitle: string;
  progress: number; // 0-1
  needsVerification: boolean;
};

export default function ChallengeVerifyCard({ children }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ChildChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Deduplicate team IDs across children
        const teamMap = new Map<string, ChildInfo[]>();
        for (const child of children) {
          if (!child.teamId) continue;
          const arr = teamMap.get(child.teamId) || [];
          arr.push(child);
          teamMap.set(child.teamId, arr);
        }

        if (teamMap.size === 0) {
          if (!cancelled) {
            setRows([]);
            setLoading(false);
          }
          return;
        }

        // Fetch challenges for each unique team in parallel
        const entries = Array.from(teamMap.entries());
        const results = await Promise.all(
          entries.map(([teamId]) => fetchActiveChallenges(teamId)),
        );

        const allRows: ChildChallengeRow[] = [];

        entries.forEach(([_teamId, teamChildren], idx) => {
          const challenges: ChallengeWithParticipants[] = results[idx];
          for (const challenge of challenges) {
            const targetValue = challenge.target_value ?? 1;

            for (const child of teamChildren) {
              // Find this child's participation record
              const participant = challenge.participants.find(
                (p) => p.player_id === child.id,
              );
              if (!participant) continue;

              const progress =
                targetValue > 0
                  ? Math.min(participant.current_value / targetValue, 1)
                  : 0;

              // Self-report challenges where the child has reported completion
              // need parent verification
              const needsVerification =
                challenge.metric_type === 'self_report' &&
                participant.completed;

              allRows.push({
                childId: child.id,
                childName: child.first_name,
                challengeId: challenge.id,
                challengeTitle: challenge.title,
                progress,
                needsVerification,
              });
            }
          }
        });

        if (!cancelled) {
          setRows(allRows);
          setLoading(false);
        }
      } catch (err) {
        if (__DEV__) console.error('[ChallengeVerifyCard] Error:', err);
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [children.map((c) => `${c.id}:${c.teamId}`).join(',')]);

  // Return null while loading or if no children have active challenges
  if (loading || rows.length === 0) return null;

  const hasVerificationNeeded = rows.some((r) => r.needsVerification);

  return (
    <View style={styles.card}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="trophy" size={16} color={BRAND.warning} />
          <Text style={styles.sectionHeader}>CHALLENGES</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/challenges' as any)}>
          <Text style={styles.viewAll}>View Challenges {'\u2192'}</Text>
        </TouchableOpacity>
      </View>

      {/* Verification banner */}
      {hasVerificationNeeded && (
        <TouchableOpacity
          style={styles.verificationBanner}
          activeOpacity={0.7}
          onPress={() => router.push('/challenges' as any)}
        >
          <Ionicons name="alert-circle" size={16} color={BRAND.white} />
          <Text style={styles.verificationText}>Needs Your Verification</Text>
        </TouchableOpacity>
      )}

      {/* Challenge rows per child */}
      {rows.map((row) => (
        <View key={`${row.childId}-${row.challengeId}`} style={styles.challengeRow}>
          <View style={styles.challengeInfo}>
            <Text style={styles.childName}>{row.childName}</Text>
            <Text style={styles.challengeTitle} numberOfLines={1}>
              {row.challengeTitle}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(row.progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(row.progress * 100)}%
            </Text>
          </View>
          {row.needsVerification && (
            <View style={styles.verifyBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={BRAND.warning} />
            </View>
          )}
        </View>
      ))}

      {/* View button */}
      <TouchableOpacity
        style={styles.viewButton}
        activeOpacity={0.7}
        onPress={() => router.push('/challenges' as any)}
      >
        <Text style={styles.viewButtonText}>View Challenges</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BRAND.cardBg,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    textTransform: 'uppercase',
  },
  viewAll: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND.warning,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  verificationText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.white,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  challengeInfo: {
    flex: 1,
    marginRight: 10,
  },
  childName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  challengeTitle: {
    fontFamily: FONTS.bodyLight,
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 110,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.warmGray,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: BRAND.teal,
  },
  progressLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    width: 30,
    textAlign: 'right',
  },
  verifyBadge: {
    marginLeft: 6,
  },
  viewButton: {
    backgroundColor: BRAND.skyBlue,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  viewButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.white,
  },
});
