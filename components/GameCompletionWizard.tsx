import {
  calculateMatchResult,
  calculatePeriodResult,
  getScoringConfig,
  isSetComplete,
  isVolleyballFormat,
  isPeriodFormat,
  type PeriodFormat,
  type SetScore,
  type ScoringFormat,
  type VolleyballFormat,
} from '@/constants/scoring-formats';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

type PlayerStats = {
  kills: number;
  aces: number;
  blocks: number;
  digs: number;
  assists: number;
  errors: number;
};

type RosterPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: string | null;
};

type Game = {
  id: string;
  opponent_name: string | null;
};

export type GameCompletionResult = {
  scoringFormat: string;
  setScores: SetScore[];
  periodScores: SetScore[];
  ourScore: number;
  opponentScore: number;
  ourSetsWon: number;
  opponentSetsWon: number;
  pointDifferential: number;
  gameResult: 'win' | 'loss' | 'tie';
  attendance: Record<string, 'present' | 'absent'>;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (result: GameCompletionResult) => Promise<void>;
  game: Game;
  roster: RosterPlayer[];
  liveSetScores: SetScore[];
  livePlayerStats: Record<string, PlayerStats>;
  sportName: string;
};

// ============================================================================
// COMPONENT
// ============================================================================

const STEPS = ['Format', 'Scores', 'Roster', 'Confirm'];

export default function GameCompletionWizard({
  visible,
  onClose,
  onComplete,
  game,
  roster,
  liveSetScores,
  livePlayerStats,
  sportName,
}: Props) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  const sportConfig = useMemo(() => getScoringConfig(sportName), [sportName]);

  // Step state
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Format
  const [selectedFormat, setSelectedFormat] = useState<ScoringFormat>(sportConfig.formats[0]);

  // Step 2: Scores
  const [setScores, setSetScoresState] = useState<SetScore[]>([]);
  const [periodScores, setPeriodScores] = useState<SetScore[]>([]);

  // Step 3: Attendance
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});

  // Reset on open
  useEffect(() => {
    if (visible) {
      setStep(0);
      setSaving(false);

      // Auto-select format based on sets played
      const playedSets = liveSetScores.filter(s => s.our > 0 || s.their > 0).length;
      const bestFormat = sportConfig.formats.find(f => {
        if (isVolleyballFormat(f)) return f.maxSets >= playedSets;
        return true;
      }) || sportConfig.formats[0];
      setSelectedFormat(bestFormat);

      // Initialize attendance (all present)
      const att: Record<string, 'present' | 'absent'> = {};
      roster.forEach(p => { att[p.id] = 'present'; });
      setAttendance(att);
    }
  }, [visible]);

  // Initialize scores when format changes
  useEffect(() => {
    if (isVolleyballFormat(selectedFormat)) {
      const played = liveSetScores.filter(s => s.our > 0 || s.their > 0);
      const initial: SetScore[] = [];
      for (let i = 0; i < selectedFormat.maxSets; i++) {
        initial.push(played[i] ? { ...played[i] } : { our: 0, their: 0 });
      }
      setSetScoresState(initial);
    } else if (isPeriodFormat(selectedFormat)) {
      const initial: SetScore[] = [];
      for (let i = 0; i < selectedFormat.periods; i++) {
        initial.push({ our: 0, their: 0 });
      }
      setPeriodScores(initial);
    }
  }, [selectedFormat]);

  // Computed match result
  const matchResult = useMemo(() => {
    if (isVolleyballFormat(selectedFormat)) {
      return calculateMatchResult(setScores, selectedFormat);
    }
    if (isPeriodFormat(selectedFormat)) {
      const pr = calculatePeriodResult(periodScores, selectedFormat);
      return { ...pr, ourSetsWon: 0, theirSetsWon: 0 };
    }
    return { result: 'in_progress' as const, ourSetsWon: 0, theirSetsWon: 0, ourTotalPoints: 0, theirTotalPoints: 0, pointDifferential: 0 };
  }, [setScores, periodScores, selectedFormat]);

  // Top performers
  const topPerformers = useMemo(() => {
    return Object.entries(livePlayerStats)
      .map(([pid, stats]) => ({ pid, total: stats.kills + stats.aces + stats.blocks, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(({ pid, ...rest }) => {
        const p = roster.find(r => r.id === pid);
        return p ? { ...rest, name: `#${p.jersey_number || '?'} ${p.last_name}` } : null;
      })
      .filter(Boolean) as { name: string; kills: number; aces: number; blocks: number; digs: number; total: number }[];
  }, [livePlayerStats, roster]);

  // Final game result for confirm step
  const finalResult = useMemo((): 'win' | 'loss' | 'tie' => {
    const r = matchResult.result;
    if (r === 'win') return 'win';
    if (r === 'loss') return 'loss';
    if (r === 'tie') return 'tie';
    // Fallback for in_progress or none: derive from total points
    if (matchResult.ourTotalPoints > matchResult.theirTotalPoints) return 'win';
    if (matchResult.theirTotalPoints > matchResult.ourTotalPoints) return 'loss';
    return 'tie';
  }, [matchResult]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onComplete({
        scoringFormat: selectedFormat.id,
        setScores: isVolleyballFormat(selectedFormat) ? setScores.filter(s => s.our > 0 || s.their > 0) : [],
        periodScores: isPeriodFormat(selectedFormat) ? periodScores : [],
        ourScore: matchResult.ourTotalPoints,
        opponentScore: matchResult.theirTotalPoints,
        ourSetsWon: matchResult.ourSetsWon,
        opponentSetsWon: matchResult.theirSetsWon,
        pointDifferential: matchResult.pointDifferential,
        gameResult: finalResult,
        attendance,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  // ---- STEP RENDERERS ----

  const renderStepDots = () => (
    <View style={s.stepDotsRow}>
      {STEPS.map((label, i) => (
        <View key={label} style={s.stepDotWrap}>
          <View style={[s.stepDot, i <= step && s.stepDotActive]}>
            {i < step ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : (
              <Text style={[s.stepDotNum, i <= step && s.stepDotNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[s.stepDotLabel, i <= step && s.stepDotLabelActive]}>{label}</Text>
          {i < STEPS.length - 1 && <View style={[s.stepLine, i < step && s.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  // Step 1: Format Selection
  const renderFormatStep = () => (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>SCORING FORMAT</Text>
      <Text style={s.stepSubtitle}>{sportConfig.icon} {sportConfig.name}</Text>
      <View style={s.formatGrid}>
        {sportConfig.formats.map(fmt => {
          const isSelected = fmt.id === selectedFormat.id;
          return (
            <TouchableOpacity
              key={fmt.id}
              style={[s.formatCard, isSelected && s.formatCardSelected]}
              onPress={() => setSelectedFormat(fmt)}
            >
              <View style={s.formatCardHeader}>
                <Text style={[s.formatName, isSelected && s.formatNameSelected]}>{fmt.name}</Text>
                <View style={[s.formatRadio, isSelected && s.formatRadioSelected]}>
                  {isSelected && <View style={s.formatRadioDot} />}
                </View>
              </View>
              <Text style={[s.formatDesc, isSelected && s.formatDescSelected]}>{fmt.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Step 2: Score Entry
  const renderScoreStep = () => {
    const isSetBased = isVolleyballFormat(selectedFormat);

    // Summary bar
    const resultColor = finalResult === 'win' ? '#10B981' : finalResult === 'loss' ? '#EF4444' : '#F59E0B';
    const resultLabel = finalResult === 'win' ? 'WIN' : finalResult === 'loss' ? 'LOSS' : 'TIE';

    return (
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>ENTER SCORES</Text>

        {/* Live result banner */}
        <View style={[s.resultBanner, { borderColor: resultColor + '40' }]}>
          <Text style={[s.resultBannerScore, { color: resultColor }]}>
            {matchResult.ourTotalPoints} — {matchResult.theirTotalPoints}
          </Text>
          {isSetBased && (
            <Text style={s.resultBannerSets}>
              Sets: {matchResult.ourSetsWon} - {matchResult.theirSetsWon}
            </Text>
          )}
          <View style={[s.resultBadge, { backgroundColor: resultColor + '20' }]}>
            <Text style={[s.resultBadgeText, { color: resultColor }]}>{resultLabel}</Text>
          </View>
        </View>

        {isSetBased ? (
          // Volleyball: set-by-set
          <View style={s.scoresWrap}>
            {setScores.map((score, idx) => {
              const fmt = selectedFormat as VolleyballFormat;
              const target = fmt.setScores[idx] ?? fmt.setScores[fmt.setScores.length - 1];
              const cap = fmt.caps[idx] ?? fmt.caps[fmt.caps.length - 1];
              const complete = isSetComplete(score.our, score.their, target, cap, fmt.winByTwo);
              const weWon = complete && score.our > score.their;
              const theyWon = complete && score.their > score.our;
              const isDeciding = fmt.setsToWin !== null && idx === (fmt.setsToWin * 2 - 2);

              return (
                <View key={idx} style={[s.setRow, weWon && s.setRowWon, theyWon && s.setRowLost]}>
                  <View style={s.setHeader}>
                    <Text style={s.setLabel}>Set {idx + 1}</Text>
                    {isDeciding && <Text style={s.decidingBadge}>DECIDING</Text>}
                    <Text style={s.setTarget}>to {target}</Text>
                  </View>
                  <View style={s.setScoreRow}>
                    <Text style={s.setScoreSide}>US</Text>
                    <TouchableOpacity style={s.stepper} onPress={() => updateSetScore(idx, 'our', -1)}>
                      <Ionicons name="remove" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <Text style={[s.setScoreNum, weWon && { color: '#10B981' }]}>{score.our}</Text>
                    <TouchableOpacity style={s.stepperPlus} onPress={() => updateSetScore(idx, 'our', 1)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>

                    <Text style={s.setScoreVs}>vs</Text>

                    <TouchableOpacity style={s.stepper} onPress={() => updateSetScore(idx, 'their', -1)}>
                      <Ionicons name="remove" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <Text style={[s.setScoreNum, theyWon && { color: '#EF4444' }]}>{score.their}</Text>
                    <TouchableOpacity style={[s.stepperPlus, { backgroundColor: '#EF4444' }]} onPress={() => updateSetScore(idx, 'their', 1)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={s.setScoreSide}>THEM</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          // Period-based sports
          <View style={s.scoresWrap}>
            {periodScores.map((score, idx) => {
              const fmt = selectedFormat as PeriodFormat;
              return (
                <View key={idx} style={s.setRow}>
                  <Text style={s.setLabel}>{fmt.periodAbbr}{idx + 1}</Text>
                  <View style={s.setScoreRow}>
                    <Text style={s.setScoreSide}>US</Text>
                    <TouchableOpacity style={s.stepper} onPress={() => updatePeriodScore(idx, 'our', -1)}>
                      <Ionicons name="remove" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <Text style={s.setScoreNum}>{score.our}</Text>
                    <TouchableOpacity style={s.stepperPlus} onPress={() => updatePeriodScore(idx, 'our', 1)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>

                    <Text style={s.setScoreVs}>vs</Text>

                    <TouchableOpacity style={s.stepper} onPress={() => updatePeriodScore(idx, 'their', -1)}>
                      <Ionicons name="remove" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                    <Text style={s.setScoreNum}>{score.their}</Text>
                    <TouchableOpacity style={[s.stepperPlus, { backgroundColor: '#EF4444' }]} onPress={() => updatePeriodScore(idx, 'their', 1)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={s.setScoreSide}>THEM</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const updateSetScore = (idx: number, side: 'our' | 'their', delta: number) => {
    setSetScoresState(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [side]: Math.max(0, next[idx][side] + delta) };
      return next;
    });
  };

  const updatePeriodScore = (idx: number, side: 'our' | 'their', delta: number) => {
    setPeriodScores(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [side]: Math.max(0, next[idx][side] + delta) };
      return next;
    });
  };

  // Step 3: Attendance
  const renderAttendanceStep = () => {
    const presentCount = Object.values(attendance).filter(v => v === 'present').length;
    return (
      <View style={s.stepContent}>
        <Text style={s.stepTitle}>ATTENDANCE</Text>
        <Text style={s.stepSubtitle}>{presentCount}/{roster.length} Present</Text>
        <View style={s.attendList}>
          {roster.map(p => {
            const status = attendance[p.id] || 'present';
            const isPresent = status === 'present';
            return (
              <TouchableOpacity
                key={p.id}
                style={s.attendRow}
                onPress={() => setAttendance(prev => ({ ...prev, [p.id]: isPresent ? 'absent' : 'present' }))}
              >
                <View style={s.attendJersey}>
                  <Text style={s.attendJerseyText}>{p.jersey_number || '—'}</Text>
                </View>
                <Text style={s.attendName}>{p.first_name} {p.last_name}</Text>
                <View style={[s.attendToggle, isPresent ? s.attendToggleOn : s.attendToggleOff]}>
                  <Ionicons
                    name={isPresent ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={isPresent ? '#10B981' : '#EF4444'}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Step 4: Confirm
  const renderConfirmStep = () => {
    const resultColor = finalResult === 'win' ? '#10B981' : finalResult === 'loss' ? '#EF4444' : '#F59E0B';
    const resultLabel = finalResult === 'win' ? 'WIN' : finalResult === 'loss' ? 'LOSS' : 'TIE';
    const presentCount = Object.values(attendance).filter(v => v === 'present').length;

    return (
      <View style={s.stepContent}>
        {/* Result Badge */}
        <View style={[s.confirmResultBadge, { backgroundColor: resultColor + '20', borderColor: resultColor + '40' }]}>
          <Text style={[s.confirmResultText, { color: resultColor }]}>{resultLabel}</Text>
        </View>

        {/* Big Score */}
        <View style={s.confirmScoreWrap}>
          <Text style={[s.confirmScoreUs, { color: '#10B981' }]}>{matchResult.ourTotalPoints}</Text>
          <Text style={s.confirmScoreDash}>—</Text>
          <Text style={[s.confirmScoreThem, { color: '#EF4444' }]}>{matchResult.theirTotalPoints}</Text>
        </View>

        <Text style={s.confirmOpponent}>vs {game.opponent_name || 'TBD'}</Text>

        {/* Set/Period breakdown */}
        {isVolleyballFormat(selectedFormat) && (
          <View style={s.confirmSetsWrap}>
            <Text style={s.confirmSetsLabel}>Sets: {matchResult.ourSetsWon} - {matchResult.theirSetsWon}</Text>
            {setScores.filter(sc => sc.our > 0 || sc.their > 0).map((sc, i) => (
              <Text key={i} style={sc.our > sc.their ? s.confirmSetLineWin : s.confirmSetLineLoss}>
                Set {i + 1}: {sc.our} - {sc.their}
              </Text>
            ))}
          </View>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <View style={s.confirmPerformers}>
            <Text style={s.confirmPerfTitle}>TOP PERFORMERS</Text>
            {topPerformers.map((perf, i) => (
              <View key={i} style={s.confirmPerfRow}>
                <Text style={s.confirmPerfName}>{perf.name}</Text>
                <Text style={s.confirmPerfStats}>
                  {perf.kills}K {perf.aces}A {perf.blocks}B {perf.digs}D
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Attendance summary */}
        <View style={s.confirmAttendance}>
          <Ionicons name="people" size={16} color="#64748B" />
          <Text style={s.confirmAttText}>{presentCount}/{roster.length} players present</Text>
        </View>

        <Text style={s.confirmFormat}>Format: {selectedFormat.name}</Text>
      </View>
    );
  };

  // ---- MAIN RENDER ----

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>END GAME</Text>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Step Dots */}
          {renderStepDots()}

          {/* Step Content */}
          <ScrollView style={s.scrollContent} showsVerticalScrollIndicator={false}>
            {step === 0 && renderFormatStep()}
            {step === 1 && renderScoreStep()}
            {step === 2 && renderAttendanceStep()}
            {step === 3 && renderConfirmStep()}
          </ScrollView>

          {/* Nav Buttons */}
          <View style={s.navRow}>
            {step > 0 ? (
              <TouchableOpacity style={s.navBtnBack} onPress={() => setStep(step - 1)}>
                <Ionicons name="arrow-back" size={18} color="#94A3B8" />
                <Text style={s.navBtnBackText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.navBtnBack} onPress={onClose}>
                <Text style={s.navBtnBackText}>Continue Playing</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity style={s.navBtnNext} onPress={() => setStep(step + 1)}>
                <Text style={s.navBtnNextText}>{step === 2 ? 'Review' : 'Next'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.navBtnSave} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#000" />
                    <Text style={s.navBtnSaveText}>SAVE & FINISH</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.glassCard,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  closeBtn: { padding: 8 },

  // Step dots
  stepDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 0,
  },
  stepDotWrap: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
  },
  stepDotActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  stepDotNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepDotNumActive: {
    color: '#fff',
  },
  stepDotLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  stepDotLabelActive: {
    color: '#F97316',
  },
  stepLine: {
    position: 'absolute',
    top: 13,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: '#334155',
    zIndex: -1,
  },
  stepLineActive: {
    backgroundColor: '#F97316',
  },

  scrollContent: {
    paddingHorizontal: 20,
    maxHeight: 420,
  },
  stepContent: {
    paddingBottom: 12,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },

  // Format cards (Step 1)
  formatGrid: { gap: 10 },
  formatCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  formatCardSelected: {
    borderColor: '#F97316',
    backgroundColor: '#F9731610',
  },
  formatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  formatName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  formatNameSelected: {
    color: '#F97316',
  },
  formatDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  formatDescSelected: {
    color: '#94A3B8',
  },
  formatRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatRadioSelected: {
    borderColor: '#F97316',
  },
  formatRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F97316',
  },

  // Score entry (Step 2)
  resultBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#0D111720',
  },
  resultBannerScore: {
    fontSize: 32,
    fontWeight: '900',
  },
  resultBannerSets: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoresWrap: { gap: 10 },
  setRow: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  setRowWon: {
    backgroundColor: '#10B98110',
    borderColor: '#10B98140',
  },
  setRowLost: {
    backgroundColor: '#EF444410',
    borderColor: '#EF444440',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#CBD5E1',
  },
  decidingBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  setTarget: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 'auto',
  },
  setScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  setScoreSide: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    width: 30,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  setScoreNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    width: 44,
    textAlign: 'center',
  },
  setScoreVs: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '700',
    marginHorizontal: 4,
  },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperPlus: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Attendance (Step 3)
  attendList: { gap: 4 },
  attendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B50',
  },
  attendJersey: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attendJerseyText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#94A3B8',
    textAlign: 'center',
  },
  attendName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  attendToggle: {
    padding: 4,
  },
  attendToggleOn: {},
  attendToggleOff: {},

  // Confirm (Step 4)
  confirmResultBadge: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  confirmResultText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  confirmScoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 4,
  },
  confirmScoreUs: {
    fontSize: 48,
    fontWeight: '900',
  },
  confirmScoreDash: {
    fontSize: 36,
    fontWeight: '300',
    color: '#64748B',
  },
  confirmScoreThem: {
    fontSize: 48,
    fontWeight: '900',
  },
  confirmOpponent: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  confirmSetsWrap: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  confirmSetsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmSetLineWin: {
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: '600',
  },
  confirmSetLineLoss: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 2,
  },
  confirmPerformers: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  confirmPerfTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
    letterSpacing: 1,
    marginBottom: 8,
  },
  confirmPerfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  confirmPerfName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  confirmPerfStats: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmAttendance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  confirmAttText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmFormat: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },

  // Nav buttons
  navRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  navBtnBack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  navBtnBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navBtnNext: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F97316',
  },
  navBtnNextText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
  },
  navBtnSave: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  navBtnSaveText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1,
  },
});
