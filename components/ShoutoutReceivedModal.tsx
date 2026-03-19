/**
 * ShoutoutReceivedModal — Bottom-sheet style celebration when a player
 * opens the app and has unseen shoutouts.
 */
import { getShoutoutImage } from '@/constants/mascot-images';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  categoryName: string;
  categoryEmoji: string;
  giverName: string;
  giverAvatarUrl?: string | null;
  message?: string | null;
  xpEarned?: number;
  totalCount?: number;
  currentIndex?: number;
  onDismiss: () => void;
};

export default function ShoutoutReceivedModal({
  visible,
  categoryName,
  categoryEmoji,
  giverName,
  message,
  xpEarned = 15,
  totalCount = 1,
  currentIndex = 0,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const imageScale = useRef(new Animated.Value(0.8)).current;

  const slug = categoryName.toLowerCase().replace(/\s+/g, '_');
  const illustrationSource = getShoutoutImage(slug);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(400);
      imageScale.setValue(0.8);

      // Slide up with spring
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }).start();

      // Image scale with delay
      setTimeout(() => {
        Animated.spring(imageScale, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }).start();
      }, 200);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={s.backdrop}>
        <Animated.View
          style={[
            s.sheet,
            { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Hero illustration */}
          <Animated.Image
            source={illustrationSource}
            accessibilityLabel={`${categoryName} shoutout received`}
            resizeMode="contain"
            style={[s.illustration, { transform: [{ scale: imageScale }] }]}
          />

          {/* Multi-shoutout indicator */}
          {totalCount > 1 && (
            <Text style={[s.countIndicator, { color: colors.textMuted }]}>
              {currentIndex + 1} of {totalCount}
            </Text>
          )}

          {/* Header */}
          <Text style={[s.header, { color: colors.text }]}>SHOUTOUT!</Text>

          {/* Category name */}
          <Text style={s.categoryName}>
            {categoryEmoji} {categoryName}
          </Text>

          {/* From line */}
          <View style={s.fromRow}>
            <View style={[s.fromAvatar, { backgroundColor: colors.primary + '30' }]}>
              <Ionicons name="person" size={14} color={colors.primary} />
            </View>
            <Text style={[s.fromText, { color: colors.textSecondary }]}>
              From: <Text style={{ fontWeight: '700' }}>{giverName}</Text>
            </Text>
          </View>

          {/* Optional message */}
          {message ? (
            <View style={s.messageContainer}>
              <Text style={[s.messageText, { color: colors.textSecondary }]}>
                "{message}"
              </Text>
            </View>
          ) : null}

          {/* XP earned */}
          <View style={s.xpRow}>
            <Ionicons name="sparkles" size={16} color="#FFD700" />
            <Text style={s.xpText}>+{xpEarned} XP</Text>
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            style={[s.dismissBtn, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={s.dismissBtnText}>
              {currentIndex < totalCount - 1 ? 'Next' : 'Awesome!'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  illustration: {
    width: 220,
    height: 220,
    marginBottom: 12,
  },
  countIndicator: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  header: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4BB9EC',
    marginBottom: 12,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fromAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fromText: {
    fontSize: 16,
  },
  messageContainer: {
    borderLeftWidth: 3,
    borderLeftColor: '#4BB9EC',
    paddingLeft: 12,
    paddingVertical: 4,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  messageText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  xpText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFD700',
  },
  dismissBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
