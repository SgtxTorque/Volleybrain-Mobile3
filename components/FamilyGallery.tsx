/**
 * FamilyGallery — full-screen horizontal swipe gallery for parent's children.
 * One "page" per child, swipeable like a photo gallery.
 * Tab indicators at top show photos/initials for each child.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useParentHomeData, type FamilyChild, type FamilyEvent } from '@/hooks/useParentHomeData';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────

function formatEventDate(dateStr: string): string {
  const today = new Date();
  const evtDate = new Date(dateStr + 'T00:00:00');
  if (evtDate.toDateString() === today.toDateString()) return 'Today';
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  if (evtDate.toDateString() === tmrw.toDateString()) return 'Tomorrow';
  try {
    return evtDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getRsvpLabel(status: 'yes' | 'no' | 'maybe' | null): { text: string; color: string } {
  switch (status) {
    case 'yes': return { text: 'Going', color: BRAND.success };
    case 'maybe': return { text: 'Maybe', color: '#F59E0B' };
    case 'no': return { text: 'Not Going', color: BRAND.error };
    default: return { text: 'No RSVP', color: BRAND.coral };
  }
}

function getSportColor(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes('volleyball')) return '#0891B2';
  if (s.includes('basketball')) return BRAND.coral;
  if (s.includes('soccer') || s.includes('football')) return '#16A34A';
  return BRAND.skyBlue;
}

// ─── Child Page ─────────────────────────────────────────────────

function ChildPage({ child, events, paymentBalance }: {
  child: FamilyChild;
  events: FamilyEvent[];
  paymentBalance: number;
}) {
  const router = useRouter();
  const avatarColor = child.teams[0]?.sportColor || BRAND.skyBlue;
  const childEvents = events.filter(e => e.childId === child.playerId);
  const nextEvent = childEvents[0] || null;

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      contentContainerStyle={s.pageContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Large Avatar */}
      <View style={s.avatarWrap}>
        {child.photoUrl ? (
          <Image source={{ uri: child.photoUrl }} style={s.largeAvatar} />
        ) : (
          <View style={[s.largeAvatarFallback, { backgroundColor: avatarColor }]}>
            <Text style={s.largeAvatarText}>{child.firstName[0]}</Text>
          </View>
        )}
        {child.level > 0 && (
          <View style={s.levelBadge}>
            <Text style={s.levelText}>LVL {child.level}</Text>
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={s.childName}>{child.firstName} {child.lastName}</Text>
      {child.teams[0]?.jerseyNumber && (
        <Text style={s.jerseyNumber}>#{child.teams[0].jerseyNumber}{child.teams[0]?.position ? ` \u00B7 ${child.teams[0].position}` : ''}</Text>
      )}

      {/* XP Bar */}
      {child.xp > 0 && (
        <View style={s.xpSection}>
          <View style={s.xpBarBg}>
            <View style={[s.xpBarFill, { width: `${Math.min(child.xpProgress * 100, 100)}%` }]} />
          </View>
          <Text style={s.xpLabel}>{child.xp} XP</Text>
        </View>
      )}

      {/* Teams */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>TEAMS</Text>
        {child.teams.length === 0 ? (
          <Text style={s.emptyText}>No teams assigned</Text>
        ) : (
          child.teams.map((team) => (
            <View key={team.teamId} style={s.teamRow}>
              <View style={[s.sportDot, { backgroundColor: getSportColor(team.sport) }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.teamName}>{team.sportIcon} {team.teamName}</Text>
                {team.orgName ? <Text style={s.orgName}>{team.orgName}</Text> : null}
              </View>
              {team.jerseyNumber && <Text style={s.jerseyTag}>#{team.jerseyNumber}</Text>}
            </View>
          ))
        )}
      </View>

      {/* Next Event */}
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>NEXT EVENT</Text>
        {nextEvent ? (
          <View>
            <View style={s.eventHeader}>
              <Text style={s.eventType}>
                {(nextEvent.eventType || 'Event').charAt(0).toUpperCase() + (nextEvent.eventType || 'Event').slice(1)}
              </Text>
              <Text style={s.eventDate}>{formatEventDate(nextEvent.date)}</Text>
            </View>
            <Text style={s.eventTitle}>{nextEvent.title}</Text>
            {nextEvent.opponentName && (
              <Text style={s.eventOpponent}>vs {nextEvent.opponentName}</Text>
            )}
            {(nextEvent.venueName || nextEvent.location) && (
              <Text style={s.eventLocation}>{nextEvent.venueName || nextEvent.location}</Text>
            )}
            <View style={s.rsvpRow}>
              <Text style={s.rsvpLabel}>RSVP:</Text>
              <Text style={[s.rsvpValue, { color: getRsvpLabel(nextEvent.rsvpStatus).color }]}>
                {getRsvpLabel(nextEvent.rsvpStatus).text}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={s.emptyText}>No upcoming events</Text>
        )}
      </View>

      {/* Payments */}
      {paymentBalance > 0 && (
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>PAYMENTS</Text>
          <View style={s.paymentRow}>
            <Text style={s.paymentLabel}>Balance due</Text>
            <Text style={s.paymentAmount}>${paymentBalance.toFixed(0)}</Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={s.actionsSection}>
        <TouchableOpacity
          style={s.actionBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/parent-schedule' as any)}
        >
          <Ionicons name="calendar-outline" size={18} color={BRAND.skyBlue} />
          <Text style={s.actionText}>View Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/family-payments' as any)}
        >
          <Ionicons name="card-outline" size={18} color={BRAND.skyBlue} />
          <Text style={s.actionText}>View Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.actionBtn}
          activeOpacity={0.7}
          onPress={() => router.push(`/child-detail?playerId=${child.playerId}` as any)}
        >
          <Ionicons name="person-outline" size={18} color={BRAND.skyBlue} />
          <Text style={s.actionText}>Player Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function FamilyGallery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useParentHomeData();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < data.allChildren.length) {
      setActiveIndex(idx);
    }
  }, [activeIndex, data.allChildren.length]);

  const scrollToIndex = useCallback((idx: number) => {
    flatListRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: true });
    setActiveIndex(idx);
  }, []);

  const renderPage = useCallback(({ item }: { item: FamilyChild }) => (
    <ChildPage
      child={item}
      events={data.allUpcomingEvents}
      paymentBalance={data.paymentStatus.balance}
    />
  ), [data.allUpcomingEvents, data.paymentStatus.balance]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={BRAND.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Family</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Indicators */}
      {data.allChildren.length > 1 && (
        <View style={s.tabRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
            {data.allChildren.map((child, idx) => {
              const isActive = idx === activeIndex;
              const color = child.teams[0]?.sportColor || BRAND.skyBlue;
              return (
                <TouchableOpacity
                  key={child.playerId}
                  style={[s.tabItem, isActive && s.tabItemActive]}
                  activeOpacity={0.7}
                  onPress={() => scrollToIndex(idx)}
                >
                  {child.photoUrl ? (
                    <Image
                      source={{ uri: child.photoUrl }}
                      style={[s.tabAvatar, isActive && s.tabAvatarActive, isActive && { borderColor: color }]}
                    />
                  ) : (
                    <View style={[s.tabAvatarFallback, { backgroundColor: color }, isActive && s.tabAvatarActive, isActive && { borderColor: color }]}>
                      <Text style={[s.tabAvatarText, isActive && { fontSize: 16 }]}>{child.firstName[0]}</Text>
                    </View>
                  )}
                  <Text style={[s.tabName, isActive && s.tabNameActive]} numberOfLines={1}>
                    {child.firstName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Swipeable Pages */}
      <FlatList
        ref={flatListRef}
        data={data.allChildren}
        renderItem={renderPage}
        keyExtractor={(item) => item.playerId}
        horizontal
        pagingEnabled
        snapToAlignment="center"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.offWhite,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },

  // Tab indicators
  tabRow: {
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    paddingBottom: 10,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  tabItem: {
    alignItems: 'center',
    opacity: 0.5,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabAvatarActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
  },
  tabAvatarText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: BRAND.white,
  },
  tabName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 4,
    maxWidth: 60,
    textAlign: 'center',
  },
  tabNameActive: {
    fontFamily: FONTS.bodyBold,
    color: BRAND.textPrimary,
  },

  // Page content
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Avatar
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  largeAvatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeAvatarText: {
    fontFamily: FONTS.display,
    fontSize: 40,
    color: BRAND.white,
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: BRAND.gold,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.navyDeep,
    letterSpacing: 0.5,
  },

  // Name
  childName: {
    fontFamily: FONTS.display,
    fontSize: 26,
    color: BRAND.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  jerseyNumber: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },

  // XP
  xpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 40,
  },
  xpBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.border,
  },
  xpBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.gold,
  },
  xpLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: BRAND.textMuted,
  },

  // Section cards
  sectionCard: {
    backgroundColor: BRAND.cardBg || BRAND.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  sectionTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: BRAND.textMuted,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textFaint,
  },

  // Teams
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  sportDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  teamName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  orgName: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 1,
  },
  jerseyTag: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // Event
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventType: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  eventDate: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.skyBlue,
  },
  eventTitle: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: BRAND.textPrimary,
    marginBottom: 4,
  },
  eventOpponent: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.navy,
    marginBottom: 4,
  },
  eventLocation: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 12,
    color: BRAND.textMuted,
    marginBottom: 6,
  },
  rsvpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  rsvpLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.textMuted,
  },
  rsvpValue: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },

  // Payments
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 14,
    color: BRAND.textPrimary,
  },
  paymentAmount: {
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    color: BRAND.error,
  },

  // Quick actions
  actionsSection: {
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: BRAND.cardBg || BRAND.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  actionText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: BRAND.skyBlue,
  },
});
