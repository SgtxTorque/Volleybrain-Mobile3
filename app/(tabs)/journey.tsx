/**
 * Journey Path Screen — Scrollable skill map showing chapters and nodes.
 * Dark navy theme matching PlayerIdentityHero.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useJourneyPath, type JourneyChapter, type JourneyNode } from '@/hooks/useJourneyPath';
import { useStreakEngine } from '@/hooks/useStreakEngine';
import { getMascotImage } from '@/lib/mascot-images';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NODE_SIZE = 60;
const BOSS_SIZE = 66;
const CONNECTOR_WIDTH = 2;

// Position offsets for visual interest
const OFFSET_MAP: Record<string, number> = {
  left: -40,
  center: 0,
  right: 40,
};

export default function JourneyPathScreen() {
  const router = useRouter();
  const { chapters, loading, playerLevel, currentChapterIndex, refreshJourney } = useJourneyPath();
  const { streak } = useStreakEngine();
  const scrollRef = useRef<ScrollView>(null);
  const [selectedNode, setSelectedNode] = useState<JourneyNode | null>(null);
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

  // Auto-collapse completed chapters on load
  useEffect(() => {
    if (chapters.length > 0) {
      const collapsed: Record<string, boolean> = {};
      chapters.forEach(ch => {
        if (ch.isComplete) collapsed[ch.id] = true;
      });
      setCollapsedChapters(collapsed);
    }
  }, [chapters]);

  // Overall progress
  const totalNodes = chapters.reduce((sum, ch) => sum + ch.nodes.length, 0);
  const totalCompleted = chapters.reduce((sum, ch) => sum + ch.completedNodes, 0);
  const progressRatio = totalNodes > 0 ? totalCompleted / totalNodes : 0;

  const toggleChapter = (id: string) => {
    setCollapsedChapters(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNodeTap = (node: JourneyNode) => {
    if (node.progress.status === 'locked') return;
    setSelectedNode(node);
  };

  const handleStartModule = (node: JourneyNode) => {
    setSelectedNode(null);
    if (node.skill_content_id) {
      router.push(
        `/skill-module?nodeId=${node.id}&skillContentId=${node.skill_content_id}&nodeTitle=${encodeURIComponent(node.title)}` as any
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={getMascotImage('LYNXREADY.png')}
          style={styles.loadingMascot}
          resizeMode="contain"
        />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/(tabs)')} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Journey Path</Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakIcon}>{'\uD83D\uDD25'}</Text>
            <Text style={styles.streakCount}>{streak?.currentStreak ?? 0}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </Text>
            <Text style={styles.progressLabel}>
              {totalCompleted} of {totalNodes} complete
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#4BB9EC', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressRatio * 100}%` as any }]}
            />
          </View>
        </View>

        {/* Chapter scroll */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chapters.map((chapter, chapterIdx) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              chapterIdx={chapterIdx}
              isCollapsed={!!collapsedChapters[chapter.id]}
              onToggle={() => toggleChapter(chapter.id)}
              onNodeTap={handleNodeTap}
              playerLevel={playerLevel}
            />
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Detail card overlay */}
      {selectedNode && (
        <NodeDetailCard
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onStart={() => handleStartModule(selectedNode)}
        />
      )}
    </View>
  );
}

// ─── Chapter Section ──────────────────────────────────────────
function ChapterSection({
  chapter,
  chapterIdx,
  isCollapsed,
  onToggle,
  onNodeTap,
  playerLevel,
}: {
  chapter: JourneyChapter;
  chapterIdx: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onNodeTap: (node: JourneyNode) => void;
  playerLevel: number;
}) {
  // Locked chapter gate
  if (!chapter.isUnlocked) {
    return (
      <Animated.View entering={FadeIn.delay(chapterIdx * 100)} style={styles.lockedGate}>
        <Ionicons name="lock-closed" size={20} color="rgba(255,215,0,0.20)" />
        <Text style={styles.lockedText}>
          Reach Level {chapter.required_level} to unlock
        </Text>
        <Text style={styles.lockedChapterTitle}>{chapter.title}</Text>
      </Animated.View>
    );
  }

  // Completed chapter (collapsible)
  if (chapter.isComplete && isCollapsed) {
    return (
      <Pressable onPress={onToggle} style={styles.completedHeader}>
        <View style={styles.completedHeaderLeft}>
          <Text style={styles.chapterNumberSmall}>CHAPTER {chapter.chapter_number}</Text>
          <Text style={styles.completedTitle}>{chapter.title}</Text>
        </View>
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color={PLAYER_THEME.success} />
        </View>
      </Pressable>
    );
  }

  // Active/expanded chapter
  return (
    <View style={styles.chapterSection}>
      <Pressable onPress={chapter.isComplete ? onToggle : undefined}>
        <Text style={styles.chapterNumber}>CHAPTER {chapter.chapter_number}</Text>
        <Text style={styles.chapterTitle}>{chapter.title}</Text>
        {chapter.description && (
          <Text style={styles.chapterDescription}>{chapter.description}</Text>
        )}
      </Pressable>

      {/* Node path */}
      <View style={styles.nodePath}>
        {chapter.nodes.map((node, nodeIdx) => (
          <React.Fragment key={node.id}>
            {nodeIdx > 0 && (
              <ConnectorLine
                isDone={
                  chapter.nodes[nodeIdx - 1].progress.status === 'completed'
                }
              />
            )}
            <NodeCircle
              node={node}
              nodeIdx={nodeIdx}
              onTap={() => onNodeTap(node)}
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ─── Connector Line ──────────────────────────────────────────
function ConnectorLine({ isDone }: { isDone: boolean }) {
  return (
    <View
      style={[
        styles.connector,
        { backgroundColor: isDone ? 'rgba(75,185,236,0.35)' : 'rgba(255,255,255,0.06)' },
      ]}
    />
  );
}

// ─── Node Circle ──────────────────────────────────────────────
function NodeCircle({
  node,
  nodeIdx,
  onTap,
}: {
  node: JourneyNode;
  nodeIdx: number;
  onTap: () => void;
}) {
  const isAvailable = node.progress.status === 'available' || node.progress.status === 'in_progress';
  const isCompleted = node.progress.status === 'completed';
  const isLocked = node.progress.status === 'locked';
  const isBoss = node.is_boss;
  const size = isBoss ? BOSS_SIZE : NODE_SIZE;
  const offset = OFFSET_MAP[node.position_offset] ?? 0;

  // Pulsing glow for available node
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    if (isAvailable) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [isAvailable]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Resolve mascot image from tip_image_url
  const mascotSource = getMascotImage(node.skillContent?.tip_image_url ?? node.icon_emoji);

  const circleColors = isCompleted
    ? ['#22C55E', '#0ea371'] as const
    : isAvailable
      ? (isBoss ? ['#FFD700', '#e6a800'] as const : ['#4BB9EC', '#2980b9'] as const)
      : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] as const;

  return (
    <Animated.View
      entering={FadeInDown.delay(nodeIdx * 60).springify().damping(14)}
      style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}
    >
      <Pressable onPress={onTap} disabled={isLocked}>
        {isAvailable && (
          <Animated.View
            style={[
              styles.pulseGlow,
              { width: size + 16, height: size + 16, borderRadius: isBoss ? 20 : (size + 16) / 2 },
              glowStyle,
            ]}
          />
        )}
        <LinearGradient
          colors={circleColors as any}
          style={[
            styles.nodeCircle,
            {
              width: size,
              height: size,
              borderRadius: isBoss ? 16 : size / 2,
              opacity: isLocked ? 0.3 : 1,
            },
          ]}
        >
          <Image
            source={mascotSource}
            style={[
              styles.nodeImage,
              { width: size - 16, height: size - 16 },
              isLocked && { opacity: 0.2 },
            ]}
            resizeMode="contain"
          />
          {isCompleted && (
            <View style={styles.completedCheck}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </Pressable>
      <Text
        style={[
          styles.nodeLabel,
          isCompleted && styles.nodeLabelDone,
          isLocked && styles.nodeLabelLocked,
        ]}
        numberOfLines={2}
      >
        {node.title}
      </Text>
      <Text
        style={[
          styles.nodeXp,
          isAvailable && styles.nodeXpActive,
          isCompleted && styles.nodeXpDone,
          isLocked && styles.nodeXpLocked,
        ]}
      >
        +{node.xp_reward} XP
      </Text>
    </Animated.View>
  );
}

// ─── Node Detail Card (Bottom Sheet Overlay) ──────────────────
function NodeDetailCard({
  node,
  onClose,
  onStart,
}: {
  node: JourneyNode;
  onClose: () => void;
  onStart: () => void;
}) {
  const isCompleted = node.progress.status === 'completed';
  const isAvailable = node.progress.status === 'available' || node.progress.status === 'in_progress';
  const isBoss = node.is_boss;
  const isLocked = node.progress.status === 'locked';
  const mascotSource = getMascotImage(node.skillContent?.tip_image_url ?? node.icon_emoji);

  const slideY = useSharedValue(400);
  useEffect(() => {
    slideY.value = withSpring(0, { damping: 18, stiffness: 140 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const buttonLabel = isLocked
    ? 'Complete previous nodes first'
    : isCompleted
      ? 'Replay (+5 XP)'
      : isBoss
        ? 'Take on the boss'
        : 'Start';

  const buttonColors = isLocked
    ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.04)'] as const
    : isCompleted
      ? ['rgba(34,197,94,0.2)', 'rgba(34,197,94,0.1)'] as const
      : isBoss
        ? ['#FFD700', '#e6a800'] as const
        : ['#4BB9EC', '#22C55E'] as const;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable onPress={e => e.stopPropagation()}>
        <Animated.View style={[styles.detailCard, cardStyle]}>
          <LinearGradient
            colors={[PLAYER_THEME.cardBg, PLAYER_THEME.cardBgHover, PLAYER_THEME.cardBg]}
            style={styles.detailGradient}
          >
            {/* Close button */}
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>

            {/* Mascot */}
            <View style={styles.detailMascotWrap}>
              <Image source={mascotSource} style={styles.detailMascot} resizeMode="contain" />
            </View>

            {/* Title */}
            <Text style={styles.detailTitle}>{node.title}</Text>
            {node.description && (
              <Text style={styles.detailDescription}>{node.description}</Text>
            )}

            {/* XP badge */}
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{node.xp_reward} XP</Text>
            </View>

            {/* Steps preview */}
            <View style={styles.stepsPreview}>
              <StepRow icon="bulb-outline" label="Tip" />
              <StepRow icon="barbell-outline" label="Drill" />
              {node.node_type === 'skill' && (
                <StepRow icon="help-circle-outline" label="Quiz" />
              )}
            </View>

            {/* Action button */}
            <Pressable
              onPress={isLocked ? undefined : onStart}
              disabled={isLocked}
            >
              <LinearGradient
                colors={buttonColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.actionButton, isLocked && { opacity: 0.4 }]}
              >
                <Text style={[styles.actionButtonText, isBoss && { color: '#0B1628' }]}>
                  {buttonLabel}
                </Text>
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

function StepRow({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.stepRow}>
      <Ionicons name={icon as any} size={16} color={PLAYER_THEME.accent} />
      <Text style={styles.stepLabel}>{label}</Text>
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
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 14,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  streakIcon: {
    fontSize: 14,
  },
  streakCount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.streakFire,
  },

  // Progress
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Locked chapter gate
  lockedGate: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,215,0,0.15)',
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: D_RADII.card,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  lockedText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,215,0,0.20)',
  },
  lockedChapterTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: 'rgba(255,215,0,0.15)',
  },

  // Completed chapter (collapsed)
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: D_RADII.cardSmall,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  completedHeaderLeft: {
    flex: 1,
  },
  chapterNumberSmall: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    color: PLAYER_THEME.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  completedTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    color: PLAYER_THEME.textSecondary,
  },
  completedBadge: {
    marginLeft: 12,
  },

  // Chapter section (expanded)
  chapterSection: {
    marginBottom: 32,
  },
  chapterNumber: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: PLAYER_THEME.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  chapterTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  chapterDescription: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: PLAYER_THEME.textMuted,
    marginBottom: 20,
  },

  // Node path
  nodePath: {
    alignItems: 'center',
    paddingTop: 8,
  },
  nodeRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(75,185,236,0.15)',
    top: -8,
    left: -8,
    zIndex: -1,
  },
  nodeCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  nodeImage: {
    borderRadius: 4,
  },
  completedCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PLAYER_THEME.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0B1628',
  },
  nodeLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 120,
  },
  nodeLabelDone: {
    color: PLAYER_THEME.textMuted,
  },
  nodeLabelLocked: {
    color: PLAYER_THEME.textFaint,
  },
  nodeXp: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },
  nodeXpActive: {
    color: PLAYER_THEME.xpGold,
  },
  nodeXpDone: {
    color: PLAYER_THEME.textFaint,
  },
  nodeXpLocked: {
    color: PLAYER_THEME.textFaint,
    opacity: 0.5,
  },

  // Connector
  connector: {
    width: CONNECTOR_WIDTH,
    height: 28,
    borderRadius: 1,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  detailCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  detailGradient: {
    padding: 24,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  detailMascotWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(75,185,236,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailMascot: {
    width: 60,
    height: 60,
  },
  detailTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  detailDescription: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.40)',
    textAlign: 'center',
    marginBottom: 12,
  },
  xpBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  xpBadgeText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: PLAYER_THEME.xpGold,
  },
  stepsPreview: {
    gap: 8,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  stepLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PLAYER_THEME.textSecondary,
  },
  actionButton: {
    borderRadius: D_RADII.cardSmall,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
