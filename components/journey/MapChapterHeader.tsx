/**
 * MapChapterHeader — Sticky overlay header for the Chapter 1 image-based map.
 * Shows chapter label, name, progress bar, streak badge, and back button.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';

interface MapChapterHeaderProps {
  chapterNumber: number;
  chapterName: string;
  completedCount: number;
  totalCount: number;
  streakCount: number;
  onBackPress: () => void;
}

export function MapChapterHeader({
  chapterNumber,
  chapterName,
  completedCount,
  totalCount,
  streakCount,
  onBackPress,
}: MapChapterHeaderProps) {
  const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(11,22,40,0.93)', 'rgba(11,22,40,0.6)', 'transparent']}
        style={styles.gradient}
      >
        {/* Top row: back button + chapter label */}
        <View style={styles.topRow}>
          <Pressable onPress={onBackPress} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.chapterLabel}>CHAPTER {chapterNumber}</Text>
            <Text style={styles.chapterName}>{chapterName}</Text>
          </View>
          {/* Streak badge */}
          <View style={styles.streakBadge}>
            <Text style={styles.streakEmoji}>{'\uD83D\uDD25'}</Text>
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        </View>

        {/* Progress row */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={['#4BB9EC', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressRatio * 100}%` as any }]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  gradient: {
    paddingTop: 8,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: {
    flex: 1,
    marginLeft: 8,
  },
  chapterLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  chapterName: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    color: '#FF6B6B',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 40,
    gap: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 5,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    minWidth: 30,
    textAlign: 'right',
  },
});
