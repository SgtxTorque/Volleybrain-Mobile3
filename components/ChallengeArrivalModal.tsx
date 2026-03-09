/**
 * ChallengeArrivalModal — Full-screen modal that appears when a player
 * opens the app and has a NEW challenge they haven't seen yet.
 *
 * Shows Lynx mascot, challenge details, Accept / Maybe Later buttons.
 */
import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '@/theme/fonts';

const PT = {
  bg: 'rgba(0,0,0,0.85)',
  cardBg: '#10284C',
  teal: '#4BB9EC',
  gold: '#FFD700',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.30)',
  borderAccent: 'rgba(75,185,236,0.25)',
};

type Props = {
  visible: boolean;
  challengeTitle: string;
  challengeDescription?: string | null;
  targetValue?: number | null;
  xpReward?: number;
  daysLeft?: number;
  onAccept: () => void;
  onDismiss: () => void;
};

export default function ChallengeArrivalModal({
  visible,
  challengeTitle,
  challengeDescription,
  targetValue,
  xpReward,
  daysLeft,
  onAccept,
  onDismiss,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Mascot */}
          <Image
            source={require('../assets/images/mascot/celebrate.png')}
            style={s.mascot}
            resizeMode="contain"
          />

          {/* Subtitle */}
          <Text style={s.subtitle}>Your coach just dropped a challenge!</Text>

          {/* Challenge title */}
          <Text style={s.title}>{challengeTitle}</Text>

          {/* Description */}
          {challengeDescription ? (
            <Text style={s.description} numberOfLines={3}>
              {challengeDescription}
            </Text>
          ) : null}

          {/* Details row */}
          <View style={s.detailsRow}>
            {targetValue != null && (
              <View style={s.detailItem}>
                <Ionicons name="flag" size={14} color={PT.gold} />
                <Text style={s.detailText}>Target: {targetValue}</Text>
              </View>
            )}
            {xpReward != null && xpReward > 0 && (
              <View style={s.detailItem}>
                <Ionicons name="star" size={14} color={PT.gold} />
                <Text style={s.detailText}>+{xpReward} XP</Text>
              </View>
            )}
            {daysLeft != null && daysLeft > 0 && (
              <View style={s.detailItem}>
                <Ionicons name="time" size={14} color={PT.teal} />
                <Text style={s.detailText}>{daysLeft}d left</Text>
              </View>
            )}
          </View>

          {/* Accept button */}
          <TouchableOpacity style={s.acceptBtn} onPress={onAccept} activeOpacity={0.8}>
            <Text style={s.acceptText}>Accept Challenge</Text>
          </TouchableOpacity>

          {/* Dismiss button */}
          <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={s.dismissText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: PT.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: PT.cardBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PT.borderAccent,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  mascot: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PT.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: PT.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: PT.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: PT.textSecondary,
  },
  acceptBtn: {
    width: '100%',
    backgroundColor: PT.teal,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 15,
    color: '#0A1528',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PT.borderAccent,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: PT.textMuted,
  },
});
