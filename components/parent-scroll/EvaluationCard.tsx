/**
 * EvaluationCard (Parent) — Shows when a child has a new evaluation.
 * "[Child]'s latest evaluation is in!" with overall rating + improvements.
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
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type ChildInfo = {
  id: string;
  first_name: string;
};

type Props = {
  children: ChildInfo[];
};

type ChildEval = {
  childId: string;
  childName: string;
  ovr: number;
  tierColor: string;
  date: string;
  improvements: string[];
};

export default function ParentEvaluationCard({ children }: Props) {
  const router = useRouter();
  const [evals, setEvals] = useState<ChildEval[]>([]);

  useEffect(() => {
    if (!children || children.length === 0) return;
    loadEvals();
  }, [children]);

  const loadEvals = async () => {
    const childIds = children.map(c => c.id);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    // Get recent evaluations for all children
    const { data } = await supabase
      .from('player_evaluations')
      .select('player_id, overall_score, evaluation_date, skills')
      .in('player_id', childIds)
      .gte('evaluation_date', cutoff)
      .order('evaluation_date', { ascending: false });

    if (!data || data.length === 0) return;

    // Group by child, take latest per child
    const childMap = new Map<string, typeof data[0]>();
    data.forEach(d => {
      if (!childMap.has(d.player_id)) {
        childMap.set(d.player_id, d);
      }
    });

    const results: ChildEval[] = [];
    for (const [pid, evalRow] of childMap) {
      const child = children.find(c => c.id === pid);
      if (!child) continue;

      const skills = (evalRow.skills as Record<string, number>) || {};
      const ovr = calculateOVR(skills);

      // Find improvements by comparing to an older eval
      const { data: prevData } = await supabase
        .from('player_evaluations')
        .select('skills')
        .eq('player_id', pid)
        .lt('evaluation_date', evalRow.evaluation_date)
        .order('evaluation_date', { ascending: false })
        .limit(1);

      const imps: string[] = [];
      if (prevData && prevData.length > 0) {
        const prevSkills = (prevData[0].skills as Record<string, number>) || {};
        for (const sk of EVAL_SKILLS) {
          const curr = skills[sk.key] || 0;
          const old = prevSkills[sk.key] || 0;
          if (curr > old && old > 0) imps.push(`${sk.label} \u2191`);
        }
      }

      results.push({
        childId: pid,
        childName: child.first_name,
        ovr,
        tierColor: getOvrTierColor(ovr),
        date: evalRow.evaluation_date,
        improvements: imps.slice(0, 3),
      });
    }

    setEvals(results);
  };

  if (evals.length === 0) return null;

  return (
    <View style={s.container}>
      {evals.map(ev => (
        <TouchableOpacity
          key={ev.childId}
          style={s.card}
          activeOpacity={0.8}
          onPress={() => router.push(`/child-detail?playerId=${ev.childId}` as any)}
        >
          <View style={s.badgeRow}>
            <View style={s.newBadge}>
              <Ionicons name="star" size={12} color={BRAND.goldBrand} />
              <Text style={s.badgeText}>NEW EVALUATION</Text>
            </View>
            <Text style={s.dateText}>
              {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>

          <View style={s.content}>
            <View style={[s.ovrCircle, { backgroundColor: ev.tierColor + '15' }]}>
              <Text style={[s.ovrLabel, { color: ev.tierColor }]}>OVR</Text>
              <Text style={[s.ovrValue, { color: ev.tierColor }]}>{ev.ovr}</Text>
            </View>
            <View style={s.details}>
              <Text style={s.mainText}>{ev.childName}'s evaluation is in!</Text>
              {ev.improvements.length > 0 && (
                <Text style={s.improvementsText}>{ev.improvements.join('  ')}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={BRAND.textFaint} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  card: {
    backgroundColor: BRAND.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.goldBrand + '25',
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
    backgroundColor: BRAND.goldBrand + '12',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
    color: BRAND.goldBrand,
  },
  dateText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textFaint,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ovrCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovrLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 8,
    letterSpacing: 1,
  },
  ovrValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
  },
  details: { flex: 1 },
  mainText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  improvementsText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.success,
    marginTop: 2,
  },
});
