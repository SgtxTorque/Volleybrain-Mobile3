/**
 * Journey Path Screen — Super Mario World-style themed world map.
 * Each chapter renders as a themed environment zone with winding paths,
 * ambient animations, and redesigned nodes.
 *
 * Data layer (useJourneyPath) is untouched — only visuals changed.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useJourneyPath, type JourneyChapter, type JourneyNode } from '@/hooks/useJourneyPath';
import { useStreakEngine } from '@/hooks/useStreakEngine';
import { getMascotImage } from '@/lib/mascot-images';
import { getChapterTheme, type JourneyTheme } from '@/lib/journey-themes';
import { FONTS } from '@/theme/fonts';
import { PLAYER_THEME } from '@/theme/player-theme';
import { D_RADII } from '@/theme/d-system';

import ChapterEnvironment from '@/components/journey/ChapterEnvironment';
import AmbientAnimations from '@/components/journey/AmbientAnimations';
import WindingPath, { getNodeX, getNodeY } from '@/components/journey/WindingPath';
import JourneyNodeCircle from '@/components/journey/JourneyNodeCircle';
import PlayerPositionIndicator from '@/components/journey/PlayerPositionIndicator';
import ChapterZoneGate from '@/components/journey/ChapterZoneGate';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { MapBackground } from '@/components/journey/MapBackground';
import { MapSprite } from '@/components/journey/MapSprite';
import { MapNode } from '@/components/journey/MapNode';
import { MapChapterHeader } from '@/components/journey/MapChapterHeader';
import { getCh1MapConfig, scaleValue, SCALE } from '@/lib/journey-map-config';
import { JOURNEY_CH1_ASSETS } from '@/assets/images/journey';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NODE_SPACING = 110;
const ZONE_PADDING_TOP = 80;
const COLLAPSED_HEIGHT = 64;

// ─── Zone height based on node count ─────────────────────────────────────────
function getZoneHeight(nodeCount: number): number {
  return ZONE_PADDING_TOP + nodeCount * NODE_SPACING + 60;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Auto-scroll to current chapter after layout
  useEffect(() => {
    if (chapters.length === 0) return;
    const timer = setTimeout(() => {
      // Calculate scroll offset: sum of all preceding zone/gate heights
      let offset = 0;
      for (let i = 0; i < currentChapterIndex; i++) {
        const ch = chapters[i];
        if (ch.isComplete && collapsedChapters[ch.id]) {
          offset += COLLAPSED_HEIGHT + 16; // collapsed + margin
        } else if (ch.isUnlocked) {
          offset += getZoneHeight(ch.nodes.length);
        }
        // Gate between chapters
        offset += 100;
      }
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [chapters, currentChapterIndex]);

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

        {/* World map scroll */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {chapters.map((chapter, chapterIdx) => {
            const theme = getChapterTheme(chapter.chapter_number);
            const isCollapsed = !!collapsedChapters[chapter.id];
            const isCurrent = chapterIdx === currentChapterIndex;

            return (
              <React.Fragment key={chapter.id}>
                {/* Chapter zone */}
                {chapter.isUnlocked ? (
                  isCollapsed ? (
                    <CollapsedChapter
                      chapter={chapter}
                      theme={theme}
                      onToggle={() => toggleChapter(chapter.id)}
                    />
                  ) : chapter.chapter_number === 1 ? (
                    <Ch1ImageMap
                      chapter={chapter}
                      isCurrent={isCurrent}
                      onNodeTap={handleNodeTap}
                      streakCount={streak?.currentStreak ?? 0}
                      onBackPress={() => router.push('/(tabs)')}
                    />
                  ) : (
                    <ChapterZone
                      chapter={chapter}
                      theme={theme}
                      isCurrent={isCurrent}
                      onNodeTap={handleNodeTap}
                      onToggle={chapter.isComplete ? () => toggleChapter(chapter.id) : undefined}
                    />
                  )
                ) : (
                  // Locked: handled by gate below
                  null
                )}

                {/* Gate between chapters */}
                {chapterIdx < chapters.length - 1 && (
                  <ChapterZoneGate
                    fromTheme={theme}
                    toTheme={getChapterTheme(chapters[chapterIdx + 1].chapter_number)}
                    isCompleted={chapter.isComplete}
                    isNextUnlocked={chapters[chapterIdx + 1].isUnlocked}
                    requiredLevel={chapters[chapterIdx + 1].required_level}
                    playerLevel={playerLevel}
                  />
                )}
              </React.Fragment>
            );
          })}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Detail card overlay — unchanged */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// Collapsed Chapter (completed, tappable to expand)
// ═══════════════════════════════════════════════════════════════════════════════

function CollapsedChapter({
  chapter,
  theme,
  onToggle,
}: {
  chapter: JourneyChapter;
  theme: JourneyTheme;
  onToggle: () => void;
}) {
  return (
    <Pressable onPress={onToggle} style={[styles.collapsedChapter, { borderColor: `${theme.pathDoneColor}20` }]}>
      <LinearGradient
        colors={[`${theme.groundColor}40`, `${theme.groundColor}20`]}
        style={styles.collapsedGradient}
      >
        <View style={styles.collapsedLeft}>
          <Text style={[styles.collapsedNumber, { color: theme.pathDoneColor }]}>
            CHAPTER {chapter.chapter_number}
          </Text>
          <Text style={styles.collapsedTitle}>{chapter.title}</Text>
          <Text style={styles.collapsedMeta}>
            {chapter.completedNodes}/{chapter.nodes.length} nodes · {theme.name}
          </Text>
        </View>
        <View style={[styles.collapsedBadge, { backgroundColor: `${theme.pathDoneColor}20` }]}>
          <Ionicons name="checkmark-circle" size={20} color={theme.pathDoneColor} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chapter Zone (full themed environment with nodes)
// ═══════════════════════════════════════════════════════════════════════════════

function ChapterZone({
  chapter,
  theme,
  isCurrent,
  onNodeTap,
  onToggle,
}: {
  chapter: JourneyChapter;
  theme: JourneyTheme;
  isCurrent: boolean;
  onNodeTap: (node: JourneyNode) => void;
  onToggle?: () => void;
}) {
  const zoneHeight = getZoneHeight(chapter.nodes.length);

  // Build node positions for SVG path
  const nodePositions = useMemo(
    () =>
      chapter.nodes.map((node, idx) => ({
        x: getNodeX(node.position_offset as 'left' | 'center' | 'right'),
        y: getNodeY(idx),
        status: node.progress.status,
      })),
    [chapter.nodes],
  );

  // Find current (first available) node
  const currentNodeIdx = chapter.nodes.findIndex(
    n => n.progress.status === 'available' || n.progress.status === 'in_progress',
  );

  return (
    <View style={{ height: zoneHeight, overflow: 'hidden' }}>
      {/* Background environment */}
      <ChapterEnvironment theme={theme} height={zoneHeight} />

      {/* Ambient animations (only for current chapter to save perf) */}
      {isCurrent && (
        <AmbientAnimations elements={theme.ambientElements} height={zoneHeight} />
      )}

      {/* Winding SVG path */}
      <WindingPath
        nodePositions={nodePositions}
        theme={theme}
        zoneHeight={zoneHeight}
      />

      {/* Chapter header */}
      <Pressable
        onPress={onToggle}
        style={styles.zoneHeader}
        disabled={!onToggle}
      >
        <Text style={[styles.zoneChapterNum, { color: theme.currentNodeGlow }]}>
          CHAPTER {chapter.chapter_number}
        </Text>
        <Text style={styles.zoneChapterTitle}>{chapter.title}</Text>
        {chapter.description && (
          <Text style={styles.zoneChapterDesc}>{chapter.description}</Text>
        )}
      </Pressable>

      {/* Nodes */}
      {chapter.nodes.map((node, nodeIdx) => {
        const x = getNodeX(node.position_offset as 'left' | 'center' | 'right');
        const y = getNodeY(nodeIdx);

        return (
          <View
            key={node.id}
            style={[
              styles.nodeAbsolute,
              { left: x - 50, top: y - 28 }, // center the 100px-wide node wrapper
            ]}
          >
            <JourneyNodeCircle
              node={node}
              nodeIdx={nodeIdx}
              theme={theme}
              onTap={() => onNodeTap(node)}
            />
          </View>
        );
      })}

      {/* Player position indicator at current node */}
      {isCurrent && currentNodeIdx >= 0 && (
        <View
          style={[
            styles.nodeAbsolute,
            {
              left: getNodeX(chapter.nodes[currentNodeIdx].position_offset as 'left' | 'center' | 'right') - 50,
              top: getNodeY(currentNodeIdx) - 28,
            },
          ]}
        >
          <PlayerPositionIndicator
            nodeSide={chapter.nodes[currentNodeIdx].position_offset as 'left' | 'center' | 'right'}
            glowColor={theme.currentNodeGlow}
          />
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chapter 1 — Image-Based Map (sprite-based rendering)
// ═══════════════════════════════════════════════════════════════════════════════
//
// STUDY FINDINGS (Step 5A — read before modifying):
// 1. Chapter loop:     lines ~183–225 — chapters.map((chapter, chapterIdx) => { ... })
// 2. ChapterEnvironment: rendered inside ChapterZone — sky gradient + ground + env objects
// 3. JourneyNodeCircle:  rendered per-node inside ChapterZone via chapter.nodes.map()
// 4. WindingPath:         SVG bezier path rendered inside ChapterZone
// 5. PlayerPositionIndicator: bouncing mascot at current node, conditional on isCurrent
// 6. NodeDetailCard:     triggered by `selectedNode` state (setSelectedNode), rendered
//                        OUTSIDE the ScrollView as an overlay (lines ~230–237)
// 7. Node press:         handleNodeTap(node) guards locked → setSelectedNode(node)
//                        NodeDetailCard onStart → handleStartModule → router.push skill-module
//
// This component replaces ChapterZone for chapter_number === 1 ONLY.
// It wires onNodeTap into the SAME handleNodeTap → selectedNode → NodeDetailCard flow.
// Chapters 2-8 continue to render via the unchanged ChapterZone component.
//

function Ch1ImageMap({
  chapter,
  isCurrent,
  onNodeTap,
  streakCount,
  onBackPress,
}: {
  chapter: JourneyChapter;
  isCurrent: boolean;
  onNodeTap: (node: JourneyNode) => void;
  streakCount: number;
  onBackPress: () => void;
}) {
  const config = useMemo(() => getCh1MapConfig(), []);
  const scaledMapHeight = scaleValue(config.mapHeight);

  // Separate boss and non-boss nodes
  const nonBossNodes = useMemo(() => chapter.nodes.filter(n => !n.is_boss), [chapter.nodes]);
  const bossNode = useMemo(() => chapter.nodes.find(n => n.is_boss), [chapter.nodes]);

  // Find current (first available/in_progress) node index in the full nodes array
  const currentNodeIdx = chapter.nodes.findIndex(
    n => n.progress.status === 'available' || n.progress.status === 'in_progress',
  );

  // Determine current node position for the mascot
  const currentNode = currentNodeIdx >= 0 ? chapter.nodes[currentNodeIdx] : null;
  let currentPos: { x: number; y: number } | null = null;
  if (currentNode) {
    if (currentNode.is_boss) {
      currentPos = config.bossPosition;
    } else {
      const nonBossIdx = nonBossNodes.indexOf(currentNode);
      if (nonBossIdx >= 0 && nonBossIdx < config.nodePositions.length) {
        currentPos = config.nodePositions[nonBossIdx];
      }
    }
  }

  // Determine side for mascot offset (opposite side of node)
  const currentNodeSide: 'left' | 'right' = currentPos && currentPos.x > 195 ? 'right' : 'left';

  // Resolve asset key to image source
  const getAsset = (key: string) => JOURNEY_CH1_ASSETS[key as keyof typeof JOURNEY_CH1_ASSETS];

  return (
    <View style={{ height: scaledMapHeight, overflow: 'hidden', backgroundColor: '#5B8C2A' }}>
      {/* 1. Background — grass tiles */}
      <MapBackground
        mapHeight={config.mapHeight}
        grassTileCount={config.grassTileCount}
        skyGradient={config.skyGradient}
      />

      {/* 2. Fences (zIndex 1) */}
      {config.fences.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`fence-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 3. Landmarks (zIndex 2) */}
      {config.landmarks.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`landmark-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 4. Trees with sway (zIndex 3) */}
      {config.trees.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`tree-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 5. Bushes (zIndex 3) */}
      {config.bushes.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`bush-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 6. Props (zIndex 4) */}
      {config.props.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`prop-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 7. SVG winding path (zIndex 5) */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 5 }]} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={scaledMapHeight} viewBox={config.pathViewBox}>
          {/* Wider semi-transparent fill */}
          <SvgPath
            d={config.pathD}
            stroke={config.pathFillColor}
            strokeWidth={config.pathFillWidth}
            fill="none"
            strokeLinecap="round"
          />
          {/* Narrower dashed overlay */}
          <SvgPath
            d={config.pathD}
            stroke={config.pathDashColor}
            strokeWidth={config.pathDashWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={config.pathDashArray}
          />
        </Svg>
      </View>

      {/* 8. Nature / ambient sprites (zIndex 6) */}
      {config.nature.map(({ assetKey, ...rest }, i) => (
        <MapSprite key={`nature-${i}`} source={getAsset(assetKey)} {...rest} />
      ))}

      {/* 9. Non-boss nodes (zIndex 8) */}
      {nonBossNodes.map((node, idx) => {
        if (idx >= config.nodePositions.length) return null;
        const pos = config.nodePositions[idx];
        const isCurrentNode = chapter.nodes.indexOf(node) === currentNodeIdx;
        return (
          <MapNode
            key={node.id}
            node={node}
            position={pos}
            isCurrent={isCurrentNode}
            onPress={() => onNodeTap(node)}
          />
        );
      })}

      {/* Boss node */}
      {bossNode && (
        <MapNode
          node={bossNode}
          position={config.bossPosition}
          isCurrent={chapter.nodes.indexOf(bossNode) === currentNodeIdx}
          onPress={() => onNodeTap(bossNode)}
        />
      )}

      {/* 10. Player position indicator at current node (zIndex 10) */}
      {isCurrent && currentPos && (
        <View
          style={{
            position: 'absolute',
            left: currentPos.x * SCALE - 50,
            top: currentPos.y * SCALE - 28,
            width: 100,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          <PlayerPositionIndicator
            nodeSide={currentNodeSide}
            glowColor="#4BB9EC"
          />
        </View>
      )}

      {/* Chapter header overlay (zIndex 20) */}
      <MapChapterHeader
        chapterNumber={chapter.chapter_number}
        chapterName={chapter.title}
        completedCount={chapter.completedNodes}
        totalCount={chapter.nodes.length}
        streakCount={streakCount}
        onBackPress={onBackPress}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Node Detail Card (Bottom Sheet Overlay) — unchanged from original
// ═══════════════════════════════════════════════════════════════════════════════

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
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </Pressable>

            <View style={styles.detailMascotWrap}>
              <Image source={mascotSource} style={styles.detailMascot} resizeMode="contain" />
            </View>

            <Text style={styles.detailTitle}>{node.title}</Text>
            {node.description && (
              <Text style={styles.detailDescription}>{node.description}</Text>
            )}

            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{node.xp_reward} XP</Text>
            </View>

            <View style={styles.stepsPreview}>
              <StepRow icon="bulb-outline" label="Tip" />
              <StepRow icon="barbell-outline" label="Drill" />
              {node.node_type === 'skill' && (
                <StepRow icon="help-circle-outline" label="Quiz" />
              )}
            </View>

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

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

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
    zIndex: 20,
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
    zIndex: 20,
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
    paddingBottom: 0,
  },

  // Collapsed chapter
  collapsedChapter: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: D_RADII.cardSmall,
    overflow: 'hidden',
    borderWidth: 1,
  },
  collapsedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  collapsedLeft: {
    flex: 1,
  },
  collapsedNumber: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  collapsedTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: PLAYER_THEME.textSecondary,
  },
  collapsedMeta: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    color: PLAYER_THEME.textMuted,
    marginTop: 2,
  },
  collapsedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Zone header
  zoneHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    zIndex: 5,
  },
  zoneChapterNum: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 2,
  },
  zoneChapterTitle: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoneChapterDesc: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Node absolute positioning within zone
  nodeAbsolute: {
    position: 'absolute',
    width: 100,
    alignItems: 'center',
    zIndex: 5,
  },

  // Overlay (detail card)
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(75,185,236,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailMascot: {
    width: 85,
    height: 85,
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
