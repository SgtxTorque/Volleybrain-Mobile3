/**
 * FamilyPanel — slide-from-right panel showing all children, sports, RSVP statuses,
 * payments, and quick actions. Button-only opening (no right-swipe gesture) to
 * avoid conflicts with GestureDrawer's left swipe.
 */
import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import type {
  FamilyChild,
  FamilyEvent,
  PaymentStatus,
  SelectedContext,
} from '@/hooks/useParentHomeData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = SCREEN_WIDTH * 0.85;

type Props = {
  visible: boolean;
  onClose: () => void;
  allChildren: FamilyChild[];
  allEvents: FamilyEvent[];
  payment: PaymentStatus;
  onSelectContext: (context: { childId: string; teamId: string }) => void;
};

function getSportDotColor(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes('volleyball')) return '#0891B2';
  if (s.includes('basketball')) return BRAND.coral;
  if (s.includes('soccer') || s.includes('football')) return '#16A34A';
  return BRAND.skyBlue;
}

function getNextEvent(events: FamilyEvent[], childId: string, teamId: string): FamilyEvent | null {
  return events.find(e => e.childId === childId && e.teamId === teamId) || null;
}

function formatEventBrief(event: FamilyEvent): string {
  const today = new Date();
  const evtDate = new Date(event.date + 'T00:00:00');
  const type = (event.eventType || 'Event').charAt(0).toUpperCase() + (event.eventType || 'Event').slice(1);

  if (evtDate.toDateString() === today.toDateString()) return `${type} today`;
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  if (evtDate.toDateString() === tmrw.toDateString()) return `${type} tomorrow`;
  try {
    const day = evtDate.toLocaleDateString('en-US', { weekday: 'short' });
    return `${type} ${day}`;
  } catch {
    return type;
  }
}

function getRsvpLabel(status: 'yes' | 'no' | 'maybe' | null): { text: string; color: string } {
  switch (status) {
    case 'yes': return { text: '\u2713 Going', color: BRAND.success };
    case 'maybe': return { text: '\u25CB Not Sure', color: '#F59E0B' };
    case 'no': return { text: '\u2715 Not Going', color: BRAND.error };
    default: return { text: '\u25CB No RSVP', color: BRAND.coral };
  }
}

export default function FamilyPanel({ visible, onClose, allChildren, allEvents, payment, onSelectContext }: Props) {
  const router = useRouter();
  const translateX = useSharedValue(PANEL_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateX.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateX.value = withTiming(PANEL_WIDTH, { duration: 250 });
      overlayOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  const handleSelectTeam = (childId: string, teamId: string) => {
    onSelectContext({ childId, teamId });
    onClose();
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {/* Dark overlay */}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose}>
        <Animated.View style={[styles.overlay, overlayStyle]} />
      </Pressable>

      {/* Panel */}
      <Animated.View style={[styles.panel, panelStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>FAMILY OVERVIEW</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={BRAND.white} />
            </TouchableOpacity>
          </View>

          {/* Children sections */}
          {allChildren.map((child) => (
            <View key={child.playerId} style={styles.childSection}>
              {/* Child header */}
              <View style={styles.childHeader}>
                {child.photoUrl ? (
                  <Image source={{ uri: child.photoUrl }} style={styles.childAvatar} />
                ) : (
                  <View style={[styles.childAvatarFallback, { backgroundColor: child.teams[0]?.sportColor || BRAND.skyBlue }]}>
                    <Text style={styles.childAvatarText}>{child.firstName[0]}</Text>
                  </View>
                )}
                <Text style={styles.childName}>{child.firstName} {child.lastName}</Text>
                {child.level > 0 && <Text style={styles.levelTag}>LVL {child.level}</Text>}
              </View>

              {/* Team rows */}
              {child.teams.map((team) => {
                const nextEvent = getNextEvent(allEvents, child.playerId, team.teamId);
                const rsvpLabel = nextEvent ? getRsvpLabel(nextEvent.rsvpStatus) : null;

                return (
                  <TouchableOpacity
                    key={team.teamId}
                    style={styles.teamRow}
                    activeOpacity={0.7}
                    onPress={() => handleSelectTeam(child.playerId, team.teamId)}
                  >
                    <View style={[styles.sportDot, { backgroundColor: getSportDotColor(team.sport) }]} />
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {team.sportIcon} {team.teamName}{team.orgName ? ` \u00B7 ${team.orgName}` : ''}
                      </Text>
                      {nextEvent && (
                        <View style={styles.eventRow}>
                          <Text style={styles.eventText}>{formatEventBrief(nextEvent)}</Text>
                          <Text style={[styles.rsvpText, { color: rsvpLabel!.color }]}>{rsvpLabel!.text}</Text>
                        </View>
                      )}
                      {!nextEvent && <Text style={styles.noEventText}>No upcoming events</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={BRAND.textFaint} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Payments section */}
          {payment.balance > 0 && (
            <View style={styles.paymentsSection}>
              <Text style={styles.paymentHeader}>PAYMENTS DUE</Text>
              <TouchableOpacity
                style={styles.paymentRow}
                activeOpacity={0.7}
                onPress={() => { router.push('/family-payments' as any); onClose(); }}
              >
                <Text style={styles.paymentLabel}>Total outstanding</Text>
                <Text style={styles.paymentAmount}>${payment.balance.toFixed(0)}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => { router.push('/registration-hub' as any); onClose(); }}
            >
              <Ionicons name="document-text-outline" size={18} color={BRAND.skyBlue} />
              <Text style={styles.actionText}>View All Registrations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => { router.push('/family-payments' as any); onClose(); }}
            >
              <Ionicons name="card-outline" size={18} color={BRAND.skyBlue} />
              <Text style={styles.actionText}>View All Payments</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: BRAND.white,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: BRAND.navyDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderTopLeftRadius: 20,
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: BRAND.white,
    letterSpacing: 1.5,
  },
  childSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingBottom: 12,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  childAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  childAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.white,
  },
  childName: {
    flex: 1,
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.textPrimary,
  },
  levelTag: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    color: BRAND.navyDeep,
    backgroundColor: BRAND.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 8,
    gap: 10,
  },
  sportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  eventText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  rsvpText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  noEventText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textFaint,
    marginTop: 3,
  },
  paymentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingBottom: 12,
  },
  paymentHeader: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: BRAND.textFaint,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  paymentAmount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.error,
  },
  quickActions: {
    padding: 16,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: BRAND.offWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  actionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
});
