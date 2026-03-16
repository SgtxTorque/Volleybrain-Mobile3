/**
 * SkillModuleScreen — Tip > Drill > Quiz sequential flow.
 * Dark navy theme. Each step on its own "page".
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInRight,
  FadeOutLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSkillModule, type QuizQuestion } from '@/hooks/useSkillModule';
import { getMascotImage } from '@/lib/mascot-images';
import { getSkillImage } from '@/constants/mascot-images';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Derive a volleyball skill category from the module title for hero illustration. */
function deriveCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('pass') || t.includes('bump') || t.includes('dig')) return 'passing';
  if (t.includes('serve')) return 'serving';
  if (t.includes('set')) return 'setting';
  if (t.includes('block')) return 'blocking';
  if (t.includes('hit') || t.includes('attack') || t.includes('spike')) return 'hitting';
  if (t.includes('defense') || t.includes('ready')) return 'defense';
  return 'passing';
}

export default function SkillModuleScreen() {
  const router = useRouter();
  const { nodeId, skillContentId, nodeTitle } = useLocalSearchParams<{
    nodeId: string;
    skillContentId: string;
    nodeTitle: string;
  }>();

  const {
    moduleData,
    currentStep,
    loading,
    xpEarned,
    quizScore,
    quizTotal,
    loadModule,
    completeTip,
    completeDrill,
    completeQuiz,
  } = useSkillModule(nodeId ?? '', skillContentId ?? '');

  useEffect(() => {
    if (skillContentId) loadModule();
  }, [skillContentId, loadModule]);

  const handleBack = () => {
    if (currentStep !== 'tip') {
      Alert.alert(
        'Leave?',
        'Progress on this step will be lost',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ],
      );
    } else {
      router.back();
    }
  };

  if (loading || !moduleData) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={getMascotImage('LYNXREADY.png')}
          style={styles.loadingMascot}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>Loading module...</Text>
      </View>
    );
  }

  // If complete, show celebration (navigated via Phase 6 component)
  if (currentStep === 'complete') {
    return (
      <NodeCompletionInline
        xpEarned={xpEarned}
        quizScore={quizScore}
        quizTotal={quizTotal}
        hasQuiz={moduleData.has_quiz}
        onContinue={() => router.back()}
      />
    );
  }

  const stepIndex = currentStep === 'tip' ? 0 : currentStep === 'drill' ? 1 : 2;
  const totalSteps = moduleData.has_quiz ? 3 : 2;

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {decodeURIComponent(nodeTitle ?? '')}
          </Text>
          <View style={styles.stepDots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === stepIndex && styles.dotActive,
                  i < stepIndex && styles.dotDone,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Hero header */}
        <View style={styles.heroWrap}>
          <Image
            source={getSkillImage(deriveCategory(decodeURIComponent(nodeTitle ?? '')), 0)}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={`${decodeURIComponent(nodeTitle ?? '')} skill illustration`}
          />
          <LinearGradient
            colors={['transparent', '#0B1628']}
            style={styles.heroGradient}
          >
            <Text style={styles.heroTitle}>
              {decodeURIComponent(nodeTitle ?? '')}
            </Text>
          </LinearGradient>
        </View>

        {/* Step content */}
        {currentStep === 'tip' && (
          <TipStep moduleData={moduleData} onNext={completeTip} />
        )}
        {currentStep === 'drill' && (
          <DrillStep moduleData={moduleData} onNext={completeDrill} />
        )}
        {currentStep === 'quiz' && (
          <QuizStep
            questions={moduleData.quizzes}
            onComplete={completeQuiz}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Tip Step ────────────────────────────────────────────────
function TipStep({
  moduleData,
  onNext,
}: {
  moduleData: any;
  onNext: () => void;
}) {
  const mascotSource = getMascotImage(moduleData.tip_image_url);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stepContainer}>
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tipMascotWrap}>
          <Image source={mascotSource} style={styles.tipMascot} resizeMode="contain" />
        </View>
        <Text style={styles.tipTitle}>{moduleData.title}</Text>
        {moduleData.tip_text && (
          <Text style={styles.tipText}>{moduleData.tip_text}</Text>
        )}
      </ScrollView>
      <View style={styles.bottomAction}>
        <Pressable onPress={onNext}>
          <LinearGradient
            colors={['#4BB9EC', '#2980b9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Got it — next</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Drill Step ──────────────────────────────────────────────
function DrillStep({
  moduleData,
  onNext,
}: {
  moduleData: any;
  onNext: () => void;
}) {
  const demoFrames = moduleData.mascot_demo_frames ?? [];

  return (
    <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContainer}>
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Demo frames horizontal scroll */}
        {demoFrames.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.demoScroll}
            contentContainerStyle={styles.demoScrollContent}
          >
            {demoFrames.map((frame: string, i: number) => (
              <Image
                key={i}
                source={getMascotImage(frame)}
                style={styles.demoFrame}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
        )}

        {moduleData.drill_title && (
          <Text style={styles.drillTitle}>{moduleData.drill_title}</Text>
        )}
        {moduleData.drill_instructions && (
          <Text style={styles.drillInstructions}>{moduleData.drill_instructions}</Text>
        )}

        {/* Reps pill */}
        {moduleData.drill_reps && (
          <View style={styles.repsPill}>
            <Ionicons name="repeat" size={16} color={PLAYER_THEME.accent} />
            <Text style={styles.repsText}>{moduleData.drill_reps}</Text>
          </View>
        )}

        {/* Location indicator */}
        {moduleData.drill_location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={PLAYER_THEME.textMuted} />
            <Text style={styles.locationText}>{moduleData.drill_location}</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.bottomAction}>
        <Pressable onPress={onNext}>
          <LinearGradient
            colors={['#22C55E', '#0ea371']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>I completed this drill</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Quiz Step ───────────────────────────────────────────────
function QuizStep({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[];
  onComplete: (correct: number) => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const question = questions[currentQ];
  if (!question && !showResults) return null;

  const handleSelectOption = (idx: number) => {
    if (hasSubmitted) return;
    setSelectedIdx(idx);
  };

  const handleSubmit = () => {
    if (selectedIdx === null) return;
    setHasSubmitted(true);
    if (selectedIdx === question.correct_option_index) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      const finalCount = correctCount + (selectedIdx === question.correct_option_index ? 0 : 0);
      // correctCount is already updated from handleSubmit
      setShowResults(true);
    } else {
      setCurrentQ(prev => prev + 1);
      setSelectedIdx(null);
      setHasSubmitted(false);
    }
  };

  // Quiz results screen
  if (showResults) {
    const allCorrect = correctCount === questions.length;
    const noneCorrect = correctCount === 0;
    const mascotImg = allCorrect
      ? 'EXCITEDACHIEVEMENT.png'
      : noneCorrect
        ? 'confused.png'
        : 'AREYOUREADY.png';
    const message = allCorrect
      ? 'Perfect!'
      : noneCorrect
        ? "You'll get it next time!"
        : 'Nice effort!';

    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.quizResults}>
        <Image
          source={getMascotImage(mascotImg)}
          style={styles.quizResultMascot}
          resizeMode="contain"
        />
        <Text style={styles.quizResultTitle}>{message}</Text>
        <Text style={styles.quizResultScore}>
          {correctCount}/{questions.length} correct
        </Text>
        <Pressable onPress={() => onComplete(correctCount)} style={{ width: '100%' }}>
          <LinearGradient
            colors={['#4BB9EC', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={SlideInRight.duration(300)} style={styles.stepContainer}>
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.quizProgress}>
          Question {currentQ + 1} of {questions.length}
        </Text>
        <Text style={styles.quizQuestion}>{question.question_text}</Text>

        <View style={styles.optionsContainer}>
          {question.options.map((option: string, idx: number) => {
            const isCorrectAnswer = idx === question.correct_option_index;
            const isSelected = idx === selectedIdx;

            const bgColor = hasSubmitted && isCorrectAnswer
              ? 'rgba(34,197,94,0.25)'
              : hasSubmitted && isSelected
                ? 'rgba(239,68,68,0.25)'
                : PLAYER_THEME.cardBg;

            const borderColor = hasSubmitted && isCorrectAnswer
              ? PLAYER_THEME.success
              : hasSubmitted && isSelected
                ? PLAYER_THEME.error
                : isSelected
                  ? PLAYER_THEME.accent
                  : PLAYER_THEME.border;

            const textColor = hasSubmitted && (isCorrectAnswer || isSelected)
              ? '#FFFFFF'
              : PLAYER_THEME.textSecondary;

            return (
              <Pressable
                key={idx}
                onPress={() => handleSelectOption(idx)}
                style={[styles.optionCard, { backgroundColor: bgColor, borderColor }]}
              >
                <Text style={[styles.optionText, { color: textColor }]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Explanation after submit */}
        {hasSubmitted && question.explanation && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={styles.explanation}>{question.explanation}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.bottomAction}>
        {!hasSubmitted ? (
          <Pressable onPress={handleSubmit} disabled={selectedIdx === null}>
            <LinearGradient
              colors={selectedIdx !== null ? ['#4BB9EC', '#2980b9'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryButton, selectedIdx === null && { opacity: 0.4 }]}
            >
              <Text style={styles.primaryButtonText}>Submit</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={handleNext}>
            <LinearGradient
              colors={['#4BB9EC', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {currentQ + 1 >= questions.length ? 'See results' : 'Next question'}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Inline Celebration (Phase 6 mini version) ──────────────
function NodeCompletionInline({
  xpEarned,
  quizScore,
  quizTotal,
  hasQuiz,
  onContinue,
}: {
  xpEarned: number;
  quizScore: number;
  quizTotal: number;
  hasQuiz: boolean;
  onContinue: () => void;
}) {
  const mascotSource = getMascotImage('EXCITEDACHIEVEMENT.png');

  return (
    <View style={styles.celebrationContainer}>
      <Animated.View entering={FadeIn.delay(200).springify().damping(12)}>
        <Image source={mascotSource} style={styles.celebrationMascot} resizeMode="contain" />
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(400)} style={styles.celebrationTitle}>
        Node Complete!
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(600)} style={styles.celebrationXp}>
        +{xpEarned} XP
      </Animated.Text>
      {hasQuiz && (
        <Animated.Text entering={FadeIn.delay(800)} style={styles.celebrationQuiz}>
          Quiz: {quizScore}/{quizTotal} correct
        </Animated.Text>
      )}
      <Animated.View entering={FadeIn.delay(1000)} style={{ width: '80%' }}>
        <Pressable onPress={onContinue}>
          <LinearGradient
            colors={['#4BB9EC', '#22C55E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1628',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingMascot: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.6,
  },
  loadingText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PLAYER_THEME.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dotActive: {
    backgroundColor: PLAYER_THEME.accent,
    width: 20,
  },
  dotDone: {
    backgroundColor: PLAYER_THEME.success,
  },

  // Hero header
  heroWrap: {
    width: SCREEN_WIDTH,
    height: 200,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Step container
  stepContainer: {
    flex: 1,
  },
  stepScroll: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  bottomAction: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  primaryButton: {
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  // Tip
  tipMascotWrap: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  tipMascot: {
    width: 120,
    height: 120,
  },
  tipTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  tipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 22,
  },

  // Drill
  demoScroll: {
    marginBottom: 16,
  },
  demoScrollContent: {
    gap: 12,
    paddingRight: 12,
  },
  demoFrame: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  drillTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  drillInstructions: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 21,
    marginBottom: 16,
  },
  repsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(75,185,236,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  repsText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PLAYER_THEME.textMuted,
  },

  // Quiz
  quizProgress: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: PLAYER_THEME.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
  },
  quizQuestion: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  optionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PLAYER_THEME.textSecondary,
  },
  explanation: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Quiz results
  quizResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  quizResultMascot: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  quizResultTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  quizResultScore: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: PLAYER_THEME.xpGold,
    marginBottom: 16,
  },

  // Celebration
  celebrationContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  celebrationMascot: {
    width: 100,
    height: 100,
    marginBottom: 8,
  },
  celebrationTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 24,
    color: '#FFFFFF',
  },
  celebrationXp: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 32,
    color: PLAYER_THEME.xpGold,
  },
  celebrationQuiz: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: PLAYER_THEME.textSecondary,
    marginBottom: 8,
  },
});
