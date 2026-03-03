import { useAuth } from '@/lib/auth';
import { promoteBackupVolunteer, sendVolunteerBlast } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { ScheduleEvent } from './EventCard';

/* ────────────────────────── Types ────────────────────────── */

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number?: string;
};

type RSVP = {
  id: string;
  player_id: string;
  status: 'yes' | 'no' | 'maybe';
  notes?: string;
  player?: Player;
};

type Volunteer = {
  id: string;
  profile_id: string;
  role: 'line_judge' | 'scorekeeper';
  position: 'primary' | 'backup_1' | 'backup_2' | 'backup_3';
  profile?: {
    full_name: string;
  };
};

type Props = {
  visible: boolean;
  event: ScheduleEvent | null;
  onClose: () => void;
  onGamePrep?: (event: ScheduleEvent) => void;
  onRefresh?: () => void;
  isCoachOrAdmin?: boolean;
};

/* ────────────────────────── Constants ────────────────────── */

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.9;
const DISMISS_THRESHOLD = 120;

const EVENT_TYPE_CONFIG = {
  game: { label: 'Game', color: BRAND.coral, icon: 'shield' as const },
  practice: { label: 'Practice', color: BRAND.teal, icon: 'fitness' as const },
  event: { label: 'Event', color: BRAND.skyBlue, icon: 'calendar' as const },
};

/* ────────────────────────── Component ───────────────────── */

export default function EventDetailModal({
  visible,
  event,
  onClose,
  onGamePrep,
  onRefresh,
  isCoachOrAdmin = false,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  // RSVP state
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [rsvpNotes, setRsvpNotes] = useState<Record<string, string>>({});

  // Volunteer state
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [signingUp, setSigningUp] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);

  // Animation
  const slideAnim = useRef(new Animated.Value(SHEET_MAX_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical downward drags
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD || gestureState.vy > 0.5) {
          dismissSheet();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible && event) {
      // Animate in
      slideAnim.setValue(SHEET_MAX_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      fetchRSVPs();
      fetchVolunteers();
      fetchMyPlayers();
    }
  }, [visible, event?.id]);

  const dismissSheet = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  /* ─────────────── Data fetching ─────────────── */

  const fetchMyPlayers = async () => {
    if (!user || !event) return;
    if (__DEV__) console.log('[EventDetailModal] fetchMyPlayers start', { userId: user.id, eventTeamId: event.team_id });

    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select(`
        player:players(
          id,
          first_name,
          last_name,
          jersey_number
        )
      `)
      .eq('guardian_id', user.id);
    if (__DEV__) console.log('[EventDetailModal] guardianLinks', guardianLinks);

    const fromGuardians: Player[] = (guardianLinks || [])
      .map((d: any) => d.player)
      .filter((p: any) => p !== null);

    const { data: directPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number')
      .eq('parent_account_id', user.id);
    if (__DEV__) console.log('[EventDetailModal] directPlayers by parent_account_id', directPlayers);

    const allPlayers: Player[] = [
      ...fromGuardians,
      ...(directPlayers || []),
    ];

    const playerMap = new Map<string, Player>();
    allPlayers.forEach(p => {
      if (p && p.id) playerMap.set(String(p.id), p);
    });
    const uniquePlayers = Array.from(playerMap.values());

    if (__DEV__) console.log('[EventDetailModal] PARENT_PLAYER_IDS', uniquePlayers.map(p => p.id));

    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('team_id', event.team_id);
    if (__DEV__) console.log('[EventDetailModal] teamPlayers for team', event.team_id, teamPlayers);

    const teamPlayerIds = (teamPlayers?.map(tp => String(tp.player_id)) || []);
    let filteredPlayers = uniquePlayers.filter(p => teamPlayerIds.includes(String(p.id)));
    if (__DEV__) console.log('[EventDetailModal] filteredPlayers', filteredPlayers);

    if (filteredPlayers.length === 0) {
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('player_id')
        .eq('guardian_id', user.id);

      if (guardianLinks && guardianLinks.length > 0) {
        const gPlayerIds = guardianLinks.map(g => g.player_id);
        const { data: guardianPlayers } = await supabase
          .from('players')
          .select('id, first_name, last_name, jersey_number')
          .in('id', gPlayerIds);

        if (guardianPlayers && guardianPlayers.length > 0) {
          const selfOnTeam = guardianPlayers.filter(p => teamPlayerIds.includes(String(p.id)));
          if (selfOnTeam.length > 0) {
            filteredPlayers = selfOnTeam;
          }
        }
      }
    }

    setMyPlayers(filteredPlayers);
  };

  const fetchRSVPs = async () => {
    if (!event) return;

    const { data } = await supabase
      .from('event_rsvps')
      .select(`
        id,
        player_id,
        status,
        notes,
        player:players(
          id,
          first_name,
          last_name,
          jersey_number
        )
      `)
      .eq('event_id', event.id);

    if (data) {
      setRsvps(data as any);
      const notes: Record<string, string> = {};
      data.forEach((r: any) => {
        if (r.notes) notes[r.player_id] = r.notes;
      });
      setRsvpNotes(notes);
    }
  };

  const fetchVolunteers = async () => {
    if (!event) return;

    const { data } = await supabase
      .from('event_volunteers')
      .select(`
        id,
        profile_id,
        role,
        position,
        profile:profiles(
          full_name
        )
      `)
      .eq('event_id', event.id)
      .order('role')
      .order('position');

    if (data) {
      setVolunteers(data as any);
    }
  };

  /* ─────────────── RSVP logic ─────────────── */

  const handleRSVP = async (playerId: string, status: 'yes' | 'no' | 'maybe') => {
    if (!event || !user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLoading(true);
    try {
      const existingRsvp = rsvps.find(r => r.player_id === playerId);

      if (existingRsvp) {
        await supabase
          .from('event_rsvps')
          .update({
            status,
            notes: rsvpNotes[playerId] || null,
            responded_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRsvp.id);
      } else {
        await supabase
          .from('event_rsvps')
          .insert({
            event_id: event.id,
            player_id: playerId,
            status,
            notes: rsvpNotes[playerId] || null,
            responded_by: user.id,
          });
      }

      await fetchRSVPs();
      onRefresh?.();
    } catch (error) {
      if (__DEV__) console.error('RSVP error:', error);
      Alert.alert('Error', 'Failed to save RSVP');
    }
    setLoading(false);
  };

  /* ─────────────── Volunteer logic ─────────────── */

  const handleVolunteerSignup = async (role: 'line_judge' | 'scorekeeper', position: 'primary' | 'backup_1' | 'backup_2' | 'backup_3') => {
    if (!event || !user) return;

    const existingVolunteer = volunteers.find(v => v.role === role && v.position === position);
    if (existingVolunteer) {
      Alert.alert('Slot Taken', 'This position is already filled.');
      return;
    }

    const myExistingSignup = volunteers.find(v => v.role === role && v.profile_id === user.id);
    if (myExistingSignup) {
      Alert.alert('Already Signed Up', `You're already signed up as ${formatPosition(myExistingSignup.position)} for ${formatRole(role)}.`);
      return;
    }

    setSigningUp(true);
    try {
      await supabase
        .from('event_volunteers')
        .insert({
          event_id: event.id,
          profile_id: user.id,
          role,
          position,
        });

      await fetchVolunteers();
      onRefresh?.();
      Alert.alert('Success', `You're signed up as ${formatPosition(position)} ${formatRole(role)}!`);
    } catch (error) {
      if (__DEV__) console.error('Volunteer signup error:', error);
      Alert.alert('Error', 'Failed to sign up');
    }
    setSigningUp(false);
  };

  const handleVolunteerCancel = async (volunteerId: string) => {
    const volunteerToCancel = volunteers.find(v => v.id === volunteerId);
    const isPrimary = volunteerToCancel?.position === 'primary';
    const role = volunteerToCancel?.role;

    const message = isPrimary
      ? 'You are the primary volunteer. If there are backups, the next one will be automatically promoted. Continue?'
      : 'Are you sure you want to remove yourself from this volunteer slot?';

    Alert.alert(
      'Cancel Signup',
      message,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('event_volunteers')
                .delete()
                .eq('id', volunteerId);

              if (isPrimary && role && event) {
                const result = await promoteBackupVolunteer(event.id, role);
                if (result.promoted) {
                  Alert.alert(
                    'Backup Promoted',
                    'The next backup volunteer has been automatically promoted and notified.',
                  );
                }
              }

              await fetchVolunteers();
              onRefresh?.();
            } catch (error) {
              if (__DEV__) console.error('Cancel volunteer error:', error);
              Alert.alert('Error', 'Failed to cancel signup');
            }
          },
        },
      ],
    );
  };

  const handleSendBlast = async () => {
    if (!event || !user) return;

    const hasLineJudge = volunteers.some(v => v.role === 'line_judge' && v.position === 'primary');
    const hasScorekeeper = volunteers.some(v => v.role === 'scorekeeper' && v.position === 'primary');

    if (hasLineJudge && hasScorekeeper) {
      Alert.alert('All Filled', 'Both volunteer positions are already filled!');
      return;
    }

    const missingRole = !hasLineJudge && !hasScorekeeper
      ? 'both'
      : !hasLineJudge
        ? 'line_judge'
        : 'scorekeeper';

    const roleText = missingRole === 'both'
      ? 'Line Judge and Scorekeeper'
      : missingRole === 'line_judge'
        ? 'Line Judge'
        : 'Scorekeeper';

    Alert.alert(
      'Send Volunteer Request',
      `This will send a notification to all team parents asking for help as ${roleText}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Blast',
          onPress: async () => {
            setSendingBlast(true);
            try {
              const result = await sendVolunteerBlast({
                eventId: event.id,
                teamId: event.team_id,
                role: missingRole as 'line_judge' | 'scorekeeper' | 'both',
                eventTitle: event.title,
                eventDate: event.event_date,
                sentBy: user.id,
              });

              if (result.success) {
                Alert.alert(
                  'Blast Sent!',
                  `Notification sent to ${result.recipientCount} team parents.`,
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to send blast');
              }
            } catch (error) {
              if (__DEV__) console.error('Blast error:', error);
              Alert.alert('Error', 'Failed to send volunteer request');
            }
            setSendingBlast(false);
          },
        },
      ],
    );
  };

  /* ─────────────── Helpers ─────────────── */

  const formatRole = (role: string) => {
    return role === 'line_judge' ? 'Line Judge' : 'Scorekeeper';
  };

  const formatPosition = (position: string) => {
    switch (position) {
      case 'primary': return 'Primary';
      case 'backup_1': return 'Backup #1';
      case 'backup_2': return 'Backup #2';
      case 'backup_3': return 'Backup #3';
      default: return position;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getPlayerRSVP = (playerId: string) => {
    return rsvps.find(r => r.player_id === playerId);
  };

  const getVolunteerForSlot = (role: 'line_judge' | 'scorekeeper', position: string) => {
    return volunteers.find(v => v.role === role && v.position === position);
  };

  const isMyVolunteerSlot = (volunteerId: string) => {
    const volunteer = volunteers.find(v => v.id === volunteerId);
    return volunteer?.profile_id === user?.id;
  };

  const openDirections = () => {
    if (!event) return;
    const address = encodeURIComponent(
      event.venue_address || event.venue_name || event.location || '',
    );
    const url = Platform.OS === 'ios'
      ? `maps:?q=${address}`
      : `geo:0,0?q=${address}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return `${f}${l}`;
  };

  /* ─────────────── Early return ─────────────── */

  if (!visible || !event) return null;

  const eventDate = new Date(event.event_date + 'T00:00:00');
  const isGame = event.event_type === 'game';
  const eventTypeKey = (event.event_type === 'game' || event.event_type === 'practice') ? event.event_type : 'event';
  const typeConfig = EVENT_TYPE_CONFIG[eventTypeKey];
  const opponentName = event.opponent_name || event.opponent;

  const yesCount = rsvps.filter(r => r.status === 'yes').length;
  const noCount = rsvps.filter(r => r.status === 'no').length;
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length;

  const displayDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const displayTime = formatTime(event.start_time)
    + (event.end_time ? ` \u2014 ${formatTime(event.end_time)}` : '');

  /* ─────────────── Volunteer slot renderer ─────────────── */

  const renderVolunteerSlot = (
    role: 'line_judge' | 'scorekeeper',
    position: 'primary' | 'backup_1' | 'backup_2' | 'backup_3',
    idx: number,
  ) => {
    const volunteer = getVolunteerForSlot(role, position);
    const isMe = volunteer && isMyVolunteerSlot(volunteer.id);
    const isPrimary = position === 'primary';

    return (
      <View
        key={position}
        style={[s.volunteerRow, idx > 0 && { borderTopWidth: 1, borderTopColor: BRAND.border }]}
      >
        <View style={s.volunteerPositionCol}>
          <Text style={[s.volunteerPositionText, isPrimary && { color: BRAND.teal, fontFamily: FONTS.bodySemiBold }]}>
            {formatPosition(position)}
          </Text>
        </View>

        {volunteer ? (
          <View style={s.volunteerFilledRow}>
            <View style={s.volunteerNameRow}>
              {isPrimary && <Ionicons name="star" size={14} color={BRAND.goldBrand} style={{ marginRight: 6 }} />}
              <Text style={s.volunteerName}>
                {volunteer.profile?.full_name || 'Unknown'}
              </Text>
              {isMe && (
                <View style={s.youBadge}>
                  <Text style={s.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            {isMe && (
              <TouchableOpacity
                onPress={() => handleVolunteerCancel(volunteer.id)}
                style={s.volunteerCancelBtn}
              >
                <Ionicons name="close-circle-outline" size={16} color={BRAND.coral} />
                <Text style={s.volunteerCancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleVolunteerSignup(role, position)}
            disabled={signingUp}
            style={[
              s.volunteerSignupBtn,
              isPrimary && { backgroundColor: BRAND.goldBrand + '20', borderColor: BRAND.goldBrand },
            ]}
          >
            <Ionicons
              name={isPrimary ? 'alert-circle' : 'add-circle-outline'}
              size={16}
              color={isPrimary ? BRAND.goldBrand : BRAND.teal}
            />
            <Text style={[s.volunteerSignupText, isPrimary && { color: BRAND.goldBrand }]}>
              {isPrimary ? 'Need Volunteer' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ─────────────── Render ─────────────── */

  return (
    <View style={s.overlay}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={dismissSheet}>
        <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          s.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={s.handleWrapper}>
          <View style={s.handle} />
        </View>

        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section 1: Event Hero ── */}
          <View style={s.heroSection}>
            <View style={[s.typeBadge, { backgroundColor: typeConfig.color + '18' }]}>
              <Ionicons name={typeConfig.icon} size={14} color={typeConfig.color} />
              <Text style={[s.typeBadgeText, { color: typeConfig.color }]}>
                {typeConfig.label}
              </Text>
            </View>

            <Text style={s.heroDate}>{displayDate}</Text>
            {displayTime ? <Text style={s.heroTime}>{displayTime}</Text> : null}

            {event.arrival_time && (
              <View style={s.arrivalBanner}>
                <Ionicons name="alarm" size={16} color={BRAND.goldBrand} />
                <Text style={s.arrivalText}>Arrive by {formatTime(event.arrival_time)}</Text>
              </View>
            )}

            {isGame && opponentName && (
              <View style={s.opponentRow}>
                <Text style={s.opponentLabel}>vs {opponentName}</Text>
                {event.location_type && (
                  <View style={[
                    s.homeAwayBadge,
                    { backgroundColor: event.location_type === 'home' ? BRAND.teal + '18' : BRAND.coral + '18' },
                  ]}>
                    <Text style={[
                      s.homeAwayText,
                      { color: event.location_type === 'home' ? BRAND.teal : BRAND.coral },
                    ]}>
                      {event.location_type === 'home' ? 'Home' : event.location_type === 'away' ? 'Away' : 'Neutral'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Section 2: Location ── */}
          {(event.venue_name || event.location) && (
            <View style={s.section}>
              <TouchableOpacity onPress={openDirections} style={s.locationRow} activeOpacity={0.7}>
                <View style={s.locationIconWrap}>
                  <Ionicons name="location" size={20} color={BRAND.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.locationName}>{event.venue_name || event.location}</Text>
                  {event.venue_address && (
                    <Text style={s.locationAddress}>{event.venue_address}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={BRAND.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Notes (if any) ── */}
          {event.notes && (
            <View style={s.section}>
              <View style={s.notesCard}>
                <Ionicons name="document-text" size={18} color={BRAND.teal} />
                <Text style={s.notesBody}>{event.notes}</Text>
              </View>
            </View>
          )}

          {/* ── Section 3: Your RSVP ── */}
          {myPlayers.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>YOUR RSVP</Text>
              {myPlayers.map(player => {
                const playerRsvp = getPlayerRSVP(player.id);
                return (
                  <View key={player.id} style={s.rsvpPlayerCard}>
                    <Text style={s.rsvpPlayerName}>
                      {player.first_name} {player.last_name}
                      {player.jersey_number ? ` #${player.jersey_number}` : ''}
                    </Text>

                    <View style={s.rsvpButtonRow}>
                      {([
                        { status: 'yes' as const, label: 'Going', color: BRAND.teal, icon: 'checkmark-circle' as const },
                        { status: 'no' as const, label: "Can't Make It", color: BRAND.coral, icon: 'close-circle' as const },
                        { status: 'maybe' as const, label: 'Maybe', color: BRAND.goldBrand, icon: 'help-circle' as const },
                      ]).map(opt => {
                        const isSelected = playerRsvp?.status === opt.status;
                        return (
                          <TouchableOpacity
                            key={opt.status}
                            onPress={() => handleRSVP(player.id, opt.status)}
                            disabled={loading}
                            style={[
                              s.rsvpBtn,
                              isSelected
                                ? { backgroundColor: opt.color, borderColor: opt.color }
                                : { backgroundColor: BRAND.white, borderColor: BRAND.border },
                            ]}
                          >
                            <Ionicons
                              name={opt.icon}
                              size={18}
                              color={isSelected ? BRAND.white : opt.color}
                            />
                            <Text style={[
                              s.rsvpBtnText,
                              { color: isSelected ? BRAND.white : opt.color },
                            ]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      value={rsvpNotes[player.id] || ''}
                      onChangeText={(text) => setRsvpNotes(prev => ({ ...prev, [player.id]: text }))}
                      placeholder="Add a note (optional)..."
                      placeholderTextColor={BRAND.textMuted}
                      style={s.rsvpNotesInput}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {myPlayers.length === 0 && (
            <View style={s.section}>
              <View style={s.emptyPlayersCard}>
                <Ionicons name="person-outline" size={40} color={BRAND.textMuted} />
                <Text style={s.emptyPlayersText}>
                  No players linked to your account on this team
                </Text>
                {__DEV__ && (
                  <Text style={s.debugText}>
                    (uid: {user?.id}, team: {event?.team_id})
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── Section 4: Who's Going ── */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>WHO'S GOING</Text>
            <Text style={s.rsvpSummaryLine}>
              {yesCount} Going{' '}<Text style={{ color: BRAND.textMuted }}>&middot;</Text>{' '}
              {noCount} Can't{' '}<Text style={{ color: BRAND.textMuted }}>&middot;</Text>{' '}
              {maybeCount} Maybe
            </Text>

            {rsvps.length > 0 && (
              <View style={s.initialsRow}>
                {rsvps
                  .filter(r => r.status === 'yes')
                  .slice(0, 5)
                  .map(r => {
                    const p = (r as any).player;
                    return (
                      <View key={r.id} style={[s.initialsCircle, { backgroundColor: BRAND.teal + '20' }]}>
                        <Text style={[s.initialsText, { color: BRAND.teal }]}>
                          {getInitials(p?.first_name, p?.last_name)}
                        </Text>
                      </View>
                    );
                  })}
                {yesCount > 5 && (
                  <View style={[s.initialsCircle, { backgroundColor: BRAND.border }]}>
                    <Text style={[s.initialsText, { color: BRAND.textMuted }]}>+{yesCount - 5}</Text>
                  </View>
                )}
              </View>
            )}

            {/* All Responses list (for coaches) */}
            {isCoachOrAdmin && rsvps.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {rsvps.map(rsvp => (
                  <View key={rsvp.id} style={s.rsvpListItem}>
                    <View style={[
                      s.rsvpListIcon,
                      {
                        backgroundColor: rsvp.status === 'yes'
                          ? BRAND.teal + '20'
                          : rsvp.status === 'no'
                            ? BRAND.coral + '20'
                            : BRAND.goldBrand + '20',
                      },
                    ]}>
                      <Ionicons
                        name={rsvp.status === 'yes' ? 'checkmark' : rsvp.status === 'no' ? 'close' : 'help'}
                        size={18}
                        color={rsvp.status === 'yes' ? BRAND.teal : rsvp.status === 'no' ? BRAND.coral : BRAND.goldBrand}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rsvpListName}>
                        {(rsvp as any).player?.first_name} {(rsvp as any).player?.last_name}
                      </Text>
                      {rsvp.notes && (
                        <Text style={s.rsvpListNotes}>{rsvp.notes}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Section 5: Actions ── */}
          {(event.venue_address || event.venue_name || event.location) && (
            <View style={s.section}>
              <View style={s.actionsRow}>
                <TouchableOpacity onPress={openDirections} style={s.actionBtn}>
                  <Ionicons name="navigate" size={20} color={BRAND.teal} />
                  <Text style={s.actionBtnText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    // Add to Calendar (deep-link; best-effort)
                    const title = encodeURIComponent(event.title);
                    const loc = encodeURIComponent(event.venue_name || event.location || '');
                    const start = event.event_date + (event.start_time ? `T${event.start_time}` : '');
                    if (Platform.OS === 'ios') {
                      Linking.openURL(`calshow:${new Date(start).getTime() / 1000}`).catch(() => {});
                    } else {
                      const end = event.event_date + (event.end_time ? `T${event.end_time}` : (event.start_time ? `T${event.start_time}` : ''));
                      Linking.openURL(
                        `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${loc}&dates=${start.replace(/[-:]/g, '')}/${end.replace(/[-:]/g, '')}`,
                      ).catch(() => {});
                    }
                  }}
                  style={s.actionBtn}
                >
                  <Ionicons name="calendar-outline" size={20} color={BRAND.teal} />
                  <Text style={s.actionBtnText}>Add to Calendar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Section 6: Coach/Admin Extras ── */}
          {isCoachOrAdmin && (
            <View style={s.section}>
              <View style={s.coachActionsRow}>
                {isGame && onGamePrep && (
                  <TouchableOpacity onPress={() => onGamePrep(event)} style={s.coachBtn}>
                    <Ionicons name="clipboard" size={18} color={BRAND.textPrimary} />
                    <Text style={s.coachBtnText}>Edit Event</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    dismissSheet();
                    setTimeout(() => {
                      router.push(`/attendance?eventId=${event.id}` as any);
                    }, 300);
                  }}
                  style={[s.coachBtn, s.coachBtnTeal]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={BRAND.teal} />
                  <Text style={[s.coachBtnText, { color: BRAND.teal }]}>Take Attendance</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Section 7: Volunteers (games only) ── */}
          {isGame && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>VOLUNTEERS</Text>

              {/* Line Judge */}
              <View style={s.volunteerCard}>
                <View style={s.volunteerSectionHeader}>
                  <Ionicons name="flag" size={22} color={BRAND.teal} />
                  <Text style={s.volunteerSectionTitle}>Line Judge</Text>
                </View>
                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((pos, idx) =>
                  renderVolunteerSlot('line_judge', pos, idx),
                )}
              </View>

              {/* Scorekeeper */}
              <View style={s.volunteerCard}>
                <View style={s.volunteerSectionHeader}>
                  <Ionicons name="clipboard" size={22} color={BRAND.teal} />
                  <Text style={s.volunteerSectionTitle}>Scorekeeper</Text>
                </View>
                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((pos, idx) =>
                  renderVolunteerSlot('scorekeeper', pos, idx),
                )}
              </View>

              {/* Send Blast (coaches, when volunteers missing) */}
              {isCoachOrAdmin && (
                !volunteers.some(v => v.role === 'line_judge' && v.position === 'primary') ||
                !volunteers.some(v => v.role === 'scorekeeper' && v.position === 'primary')
              ) && (
                <TouchableOpacity
                  onPress={handleSendBlast}
                  disabled={sendingBlast}
                  style={s.blastBtn}
                >
                  <Ionicons name="megaphone" size={22} color={BRAND.white} />
                  <Text style={s.blastBtnText}>
                    {sendingBlast ? 'Sending...' : 'Send Volunteer Request to Parents'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Info Box */}
              <View style={s.infoBox}>
                <View style={s.infoBoxHeader}>
                  <Ionicons name="information-circle" size={18} color={BRAND.teal} />
                  <Text style={s.infoBoxTitle}>How Backups Work</Text>
                </View>
                <Text style={s.infoBoxBody}>
                  If the primary volunteer can't make it, Backup #1 will be notified and promoted.
                  Signing up as a backup helps ensure we always have coverage!
                </Text>
              </View>
            </View>
          )}

          {/* Bottom spacer for safe area */}
          <View style={{ height: 40 }} />
        </ScrollView>

        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={BRAND.teal} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

/* ────────────────────────── Styles ───────────────────────── */

const s = StyleSheet.create({
  /* ── Overlay / Sheet ── */
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SHEET_MAX_HEIGHT,
    backgroundColor: BRAND.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  handleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.border,
  },

  /* ── ScrollView ── */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  /* ── Section wrapper ── */
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    color: BRAND.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },

  /* ── Hero ── */
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    marginBottom: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDate: {
    fontSize: 28,
    fontFamily: FONTS.display,
    color: BRAND.textPrimary,
    letterSpacing: 0.5,
  },
  heroTime: {
    fontSize: 15,
    fontFamily: FONTS.bodyMedium,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  arrivalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.goldBrand + '18',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  arrivalText: {
    color: BRAND.goldBrand,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
  },
  opponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  opponentLabel: {
    fontSize: 20,
    fontFamily: FONTS.bodyBold,
    color: BRAND.coral,
  },
  homeAwayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  homeAwayText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Location ── */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BRAND.teal + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },
  locationAddress: {
    fontSize: 13,
    fontFamily: FONTS.bodyLight,
    color: BRAND.textMuted,
    marginTop: 2,
  },

  /* ── Notes ── */
  notesCard: {
    flexDirection: 'row',
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  notesBody: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.bodyLight,
    color: BRAND.textMuted,
    lineHeight: 20,
  },

  /* ── RSVP ── */
  rsvpPlayerCard: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  rsvpPlayerName: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
    marginBottom: 12,
  },
  rsvpButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 5,
  },
  rsvpBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
  rsvpNotesInput: {
    backgroundColor: BRAND.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.bodyLight,
    color: BRAND.textPrimary,
    borderWidth: 1,
    borderColor: BRAND.border,
    fontSize: 14,
  },
  emptyPlayersCard: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyPlayersText: {
    color: BRAND.textMuted,
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    marginTop: 12,
    textAlign: 'center',
  },
  debugText: {
    color: BRAND.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyLight,
    marginTop: 8,
  },

  /* ── Who's Going ── */
  rsvpSummaryLine: {
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
    marginBottom: 10,
  },
  initialsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  initialsCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
  },
  rsvpListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.offWhite,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  rsvpListIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rsvpListName: {
    color: BRAND.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
  rsvpListNotes: {
    color: BRAND.textMuted,
    fontSize: 12,
    fontFamily: FONTS.bodyLight,
  },

  /* ── Actions ── */
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.teal + '12',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: BRAND.teal + '30',
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.teal,
  },

  /* ── Coach/Admin ── */
  coachActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    gap: 8,
  },
  coachBtnTeal: {
    borderColor: BRAND.teal + '50',
  },
  coachBtnText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: BRAND.textPrimary,
  },

  /* ── Volunteers ── */
  volunteerCard: {
    backgroundColor: BRAND.offWhite,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  volunteerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  volunteerSectionTitle: {
    color: BRAND.textPrimary,
    fontSize: 17,
    fontFamily: FONTS.bodySemiBold,
    marginLeft: 10,
  },
  volunteerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  volunteerPositionCol: {
    width: 80,
  },
  volunteerPositionText: {
    color: BRAND.textMuted,
    fontSize: 13,
    fontFamily: FONTS.bodyLight,
  },
  volunteerFilledRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  volunteerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volunteerName: {
    color: BRAND.textPrimary,
    fontSize: 14,
    fontFamily: FONTS.bodyMedium,
  },
  youBadge: {
    backgroundColor: BRAND.teal + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  youBadgeText: {
    color: BRAND.teal,
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
  },
  volunteerCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BRAND.coral + '40',
    gap: 4,
  },
  volunteerCancelText: {
    color: BRAND.coral,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
  },
  volunteerSignupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: BRAND.teal + '15',
    borderWidth: 1,
    borderColor: BRAND.teal + '40',
    gap: 6,
    alignSelf: 'flex-start',
  },
  volunteerSignupText: {
    color: BRAND.teal,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
  },
  blastBtn: {
    backgroundColor: BRAND.goldBrand,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  blastBtnText: {
    color: BRAND.white,
    fontSize: 15,
    fontFamily: FONTS.bodySemiBold,
  },
  infoBox: {
    backgroundColor: BRAND.teal + '10',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BRAND.teal + '25',
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoBoxTitle: {
    color: BRAND.teal,
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    marginLeft: 8,
  },
  infoBoxBody: {
    color: BRAND.textMuted,
    fontSize: 13,
    fontFamily: FONTS.bodyLight,
    lineHeight: 18,
  },

  /* ── Loading ── */
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
