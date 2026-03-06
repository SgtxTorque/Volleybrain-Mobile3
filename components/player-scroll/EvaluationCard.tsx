/**
 * EvaluationCard — Player home scroll card for new evaluations.
 * Shows "NEW EVALUATION" banner with overall rating + top improvements.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import {
  EVAL_SKILLS,
  calculateOVR,
  getOvrTierColor,
} from '@/lib/evaluations';
import { FONTS } from '@/theme/fonts';

const PT = {
  cardBg: '#10284C',
  gold: '#FFD700',
  teal: '#4BB9EC',
  textPrimary: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.30)',
  success: '#10B981',
  error: '#EF4444',
  borderGold: 'rgba(255,215,0,0.20)',
};

type Props = {
  playerId: string | null;
  teamId: string | null;
};

type EvalData = {
  overallScore: number;
  evaluationDate: string;
  skills: Record<string, number>;
};

export default function EvaluationCard({ playerId, teamId }: Props) {
  const router = useRouter();
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);

  useEffect(() => {
    if (!playerId) return;
    loadLatestEval();
  }, [playerId]);

  const loadLatestEval = async () => {
    if (!playerId) return;

    // Get the two most recent evaluations
    const { data } = await supabase
      .from('player_evaluations')
      .select('overall_score, evaluation_date, skills')
      .eq('player_id', playerId)
      .order('evaluation_date', { ascending: false })
      .limit(2);

    if (!data || data.length === 0) return;

    const latest = data[0];
    // Check if this evaluation is "new" (within last 7 days)
    const evalDate = new Date(latest.evaluation_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (evalDate < sevenDaysAgo) return;

    setEvalData({
      overallScore: latest.overall_score || 0,
      evaluationDate: latest.evaluation_date,
      skills: (latest.skills as Record<string, number>) || {},
    });

    // Compute improvements if there's a previous eval
    if (data.length > 1) {
      const prev = data[1];
      const prevSkills = (prev.skills as Record<string, number>) || {};
      const imps: string[] = [];

      for (const sk of EVAL_SKILLS) {
        const curr = latest.skills?.[sk.key] || 0;
        const old = prevSkills[sk.key] || 0;
        if (curr > old && old > 0) {
          imps.push(`${sk.label} \u2191`);
        }
      }
      setImprovements(imps.slice(0, 3));
    }
  };

  if (!evalData) return null;

  const ovr = calculateOVR(evalData.skills);
  const tierColor = getOvrTierColor(ovr);

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.8}
        onPress={() => router.push('/my-stats' as any)}
      >
        {/* Badge */}
        <View style={s.badgeRow}>
          <View style={[s.newBadge, { backgroundColor: PT.gold + '20', borderColor: PT.borderGold }]}>
            <Ionicons name="star" size={12} color={PT.gold} />
            <Text style={s.badgeText}>NEW EVALUATION</Text>
          </View>
          <Text style={s.dateText}>
            {new Date(evalData.evaluationDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={[s.ovrCircle, { backgroundColor: tierColor + '20' }]}>
            <Text style={[s.ovrLabel, { color: tierColor }]}>OVR</Text>
            <Text style={[s.ovrValue, { color: tierColor }]}>{ovr}</Text>
          </View>

          <View style={s.details}>
            <Text style={s.mainText}>Coach evaluated your skills!</Text>
            {improvements.length > 0 && (
              <Text style={s.improvementsText}>
                {improvements.join('  ')}
              </Text>
            )}
          </View>

          <Ionicons name="chevron-forward" size={18} color={PT.textMuted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: PT.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PT.borderGold,
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: PT.gold,
  },
  dateText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: PT.textMuted,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ovrCircle: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovrLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  ovrValue: {
    fontFamily: FONTS.display,
    fontSize: 22,
  },
  details: {
    flex: 1,
  },
  mainText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: PT.textPrimary,
  },
  improvementsText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PT.success,
    marginTop: 3,
  },
});
