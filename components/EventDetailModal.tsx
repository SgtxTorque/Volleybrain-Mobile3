import { useAuth } from '@/lib/auth';
import { promoteBackupVolunteer, sendVolunteerBlast } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScheduleEvent } from './EventCard';

type TabType = 'details' | 'rsvp' | 'volunteers';

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

const EVENT_TYPE_CONFIG = {
  game: { label: 'Game', color: '#FF6B6B', icon: 'shield' as const },
  practice: { label: 'Practice', color: '#4A90D9', icon: 'fitness' as const },
  event: { label: 'Event', color: '#4ECDC4', icon: 'calendar' as const },
};

export default function EventDetailModal({
  visible,
  event,
  onClose,
  onGamePrep,
  onRefresh,
  isCoachOrAdmin = false,
}: Props) {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();
  const s = createStyles(colors);

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [loading, setLoading] = useState(false);

  // RSVP state
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [rsvpNotes, setRsvpNotes] = useState<Record<string, string>>({});

  // Volunteer state
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [signingUp, setSigningUp] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);

  useEffect(() => {
    if (visible && event) {
      setActiveTab('details');
      fetchRSVPs();
      fetchVolunteers();
      fetchMyPlayers();
    }
  }, [visible, event?.id]);

  const fetchMyPlayers = async () => {
    if (!user || !event) return;
    if (__DEV__) console.log('[EventDetailModal] fetchMyPlayers start', { userId: user.id, eventTeamId: event.team_id });

    // first gather player IDs associated with this parent account the same way the web does
    // 1. via player_guardians table
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

    // 2. via parent_account_id on players table (web logic)
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, jersey_number')
      .eq('parent_account_id', user.id);
    if (__DEV__) console.log('[EventDetailModal] directPlayers by parent_account_id', directPlayers);

    const allPlayers: Player[] = [
      ...fromGuardians,
      ...(directPlayers || []),
    ];

    // dedupe by id
    const playerMap = new Map<string, Player>();
    allPlayers.forEach(p => {
      if (p && p.id) playerMap.set(String(p.id), p);
    });
    const uniquePlayers = Array.from(playerMap.values());

    if (__DEV__) console.log('[EventDetailModal] PARENT_PLAYER_IDS', uniquePlayers.map(p => p.id));

    // now filter those by team membership
    const { data: teamPlayers } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('team_id', event.team_id);
    if (__DEV__) console.log('[EventDetailModal] teamPlayers for team', event.team_id, teamPlayers);

    const teamPlayerIds = (teamPlayers?.map(tp => String(tp.player_id)) || []);
    let filteredPlayers = uniquePlayers.filter(p => teamPlayerIds.includes(String(p.id)));
    if (__DEV__) console.log('[EventDetailModal] filteredPlayers', filteredPlayers);

    // Player self-RSVP: if no children found, check player_guardians
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

      // Set notes for my players
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

  const handleRSVP = async (playerId: string, status: 'yes' | 'no' | 'maybe') => {
    if (!event || !user) return;

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

  const handleVolunteerSignup = async (role: 'line_judge' | 'scorekeeper', position: 'primary' | 'backup_1' | 'backup_2' | 'backup_3') => {
    if (!event || !user) return;

    // Check if slot is already taken
    const existingVolunteer = volunteers.find(v => v.role === role && v.position === position);
    if (existingVolunteer) {
      Alert.alert('Slot Taken', 'This position is already filled.');
      return;
    }

    // Check if user already signed up for this role
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
    // Find the volunteer to check if they're primary
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
              // Delete the volunteer entry
              await supabase
                .from('event_volunteers')
                .delete()
                .eq('id', volunteerId);

              // If primary cancelled, promote backup
              if (isPrimary && role && event) {
                const result = await promoteBackupVolunteer(event.id, role);
                if (result.promoted) {
                  Alert.alert(
                    'Backup Promoted',
                    'The next backup volunteer has been automatically promoted and notified.'
                  );
                }
              }

              await fetchVolunteers();
              onRefresh?.();
            } catch (error) {
              if (__DEV__) console.error('Cancel volunteer error:', error);
              Alert.alert('Error', 'Failed to cancel signup');
            }
          }
        },
      ]
    );
  };

  const handleSendBlast = async () => {
    if (!event || !user) return;

    // Determine what roles are missing
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
                  `Notification sent to ${result.recipientCount} team parents.`
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
      ]
    );
  };

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

  if (!event) return null;

  const eventDate = new Date(event.event_date + 'T00:00:00');
  const isGame = event.event_type === 'game';
  const eventTypeKey = (event.event_type === 'game' || event.event_type === 'practice') ? event.event_type : 'event';
  const typeConfig = EVENT_TYPE_CONFIG[eventTypeKey];
  const opponentName = event.opponent_name || event.opponent;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'details', label: 'Details', icon: 'information-circle' },
    { key: 'rsvp', label: 'RSVP', icon: 'people' },
    ...(isGame ? [{ key: 'volunteers' as TabType, label: 'Volunteers', icon: 'hand-left' }] : []),
  ];

  // Count RSVPs
  const yesCount = rsvps.filter(r => r.status === 'yes').length;
  const noCount = rsvps.filter(r => r.status === 'no').length;
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length;

  // Volunteer slot renderer (reused for both roles)
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
        style={[s.volunteerRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
      >
        <View style={s.volunteerPositionCol}>
          <Text style={[s.volunteerPositionText, isPrimary && { color: colors.primary, fontWeight: '600' }]}>
            {formatPosition(position)}
          </Text>
        </View>

        {volunteer ? (
          <View style={s.volunteerFilledRow}>
            <View style={s.volunteerNameRow}>
              {isPrimary && <Ionicons name="star" size={14} color="#FFB347" style={{ marginRight: 6 }} />}
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
                <Ionicons name="close-circle-outline" size={16} color="#FF6B6B" />
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
              isPrimary && { backgroundColor: '#FFB347' + '20', borderColor: '#FFB347' },
            ]}
          >
            <Ionicons
              name={isPrimary ? 'alert-circle' : 'add-circle-outline'}
              size={16}
              color={isPrimary ? '#FFB347' : colors.primary}
            />
            <Text style={[s.volunteerSignupText, isPrimary && { color: '#FFB347' }]}>
              {isPrimary ? 'Need Volunteer' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={s.safeArea}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            {/* Event type badge */}
            <View style={[s.typeBadge, { backgroundColor: typeConfig.color + '20' }]}>
              <Ionicons name={typeConfig.icon} size={14} color={typeConfig.color} />
              <Text style={[s.typeBadgeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            <Text style={s.headerTitle} numberOfLines={1}>{event.title}</Text>
            {/* Opponent in header for games */}
            {isGame && opponentName && (
              <Text style={s.headerOpponent}>vs {opponentName}</Text>
            )}
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[s.tab, isActive && s.tabActive]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={isActive ? colors.primary : colors.textMuted}
                />
                <Text style={[s.tabText, isActive && s.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <View>
              {/* Date & Time */}
              <View style={s.glassCard}>
                <View style={s.dateRow}>
                  <View style={s.dateIcon}>
                    <Text style={s.dateWeekday}>
                      {eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={s.dateDay}>{eventDate.getDate()}</Text>
                  </View>
                  <View>
                    <Text style={s.dateFull}>
                      {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={s.dateTime}>
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </Text>
                  </View>
                </View>

                {event.arrival_time && (
                  <View style={s.arrivalBanner}>
                    <Ionicons name="alarm" size={18} color="#FFB347" />
                    <Text style={s.arrivalText}>
                      Arrive by {formatTime(event.arrival_time)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Location */}
              {(event.venue_name || event.location) && (
                <View style={s.glassCard}>
                  <View style={s.cardHeaderRow}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={s.cardHeaderText}>
                      {event.venue_name || event.location}
                    </Text>
                  </View>
                  {event.venue_address && (
                    <Text style={s.venueAddress}>{event.venue_address}</Text>
                  )}
                  {(event.venue_address || event.venue_name || event.location) && (
                    <TouchableOpacity
                      onPress={() => {
                        const address = encodeURIComponent(
                          event.venue_address || event.venue_name || event.location || ''
                        );
                        const url = Platform.OS === 'ios'
                          ? `maps:?q=${address}`
                          : `geo:0,0?q=${address}`;
                        Linking.openURL(url).catch(() => {
                          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
                        });
                      }}
                      style={s.directionsBtn}
                    >
                      <Ionicons name="navigate" size={20} color={colors.primary} />
                      <Text style={s.directionsBtnText}>Get Directions</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Notes */}
              {event.notes && (
                <View style={s.glassCard}>
                  <View style={s.cardHeaderRow}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={s.cardHeaderText}>Notes</Text>
                  </View>
                  <Text style={s.notesBody}>{event.notes}</Text>
                </View>
              )}

              {/* Game Prep Button */}
              {isGame && isCoachOrAdmin && onGamePrep && (
                <TouchableOpacity onPress={() => onGamePrep(event)} style={s.gamePrepBtn}>
                  <Ionicons name="clipboard" size={20} color="#fff" />
                  <Text style={s.gamePrepBtnText}>Game Prep & Lineup</Text>
                </TouchableOpacity>
              )}

              {/* Take Attendance Button */}
              {isCoachOrAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    setTimeout(() => {
                      router.push(`/attendance?eventId=${event.id}` as any);
                    }, 150);
                  }}
                  style={s.attendanceBtn}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[s.attendanceBtnText, { color: colors.success }]}>Take Attendance</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* RSVP TAB */}
          {activeTab === 'rsvp' && (
            <View>
              {/* RSVP Summary */}
              <View style={s.glassCard}>
                <Text style={s.sectionTitle}>Responses</Text>
                <View style={s.rsvpSummaryRow}>
                  {[
                    { count: yesCount, label: 'Going', color: '#4ECDC4' },
                    { count: noCount, label: "Can't Go", color: '#FF6B6B' },
                    { count: maybeCount, label: 'Maybe', color: '#FFB347' },
                  ].map(item => (
                    <View key={item.label} style={s.rsvpSummaryItem}>
                      <View style={[s.rsvpSummaryCircle, { backgroundColor: item.color + '20' }]}>
                        <Text style={[s.rsvpSummaryCount, { color: item.color }]}>{item.count}</Text>
                      </View>
                      <Text style={s.rsvpSummaryLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* My Players RSVP */}
              {myPlayers.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={s.sectionTitle}>Your Players</Text>
                  {myPlayers.map(player => {
                    const playerRsvp = getPlayerRSVP(player.id);
                    return (
                      <View key={player.id} style={s.playerRsvpCard}>
                        <Text style={s.playerName}>
                          {player.first_name} {player.last_name}
                          {player.jersey_number && ` #${player.jersey_number}`}
                        </Text>

                        {/* RSVP Buttons */}
                        <View style={s.rsvpButtonRow}>
                          {(['yes', 'no', 'maybe'] as const).map(status => {
                            const isSelected = playerRsvp?.status === status;
                            const config = {
                              yes: { label: 'Going', color: '#4ECDC4', icon: 'checkmark-circle' as const },
                              no: { label: "Can't Go", color: '#FF6B6B', icon: 'close-circle' as const },
                              maybe: { label: 'Maybe', color: '#FFB347', icon: 'help-circle' as const },
                            }[status];

                            return (
                              <TouchableOpacity
                                key={status}
                                onPress={() => handleRSVP(player.id, status)}
                                disabled={loading}
                                style={[
                                  s.rsvpBtn,
                                  {
                                    backgroundColor: isSelected ? config.color + '20' : colors.background,
                                    borderColor: isSelected ? config.color : colors.border,
                                  },
                                ]}
                              >
                                <Ionicons name={config.icon} size={20} color={config.color} />
                                <Text style={[s.rsvpBtnText, { color: config.color }]}>
                                  {config.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Notes */}
                        <TextInput
                          value={rsvpNotes[player.id] || ''}
                          onChangeText={(text) => setRsvpNotes(prev => ({ ...prev, [player.id]: text }))}
                          placeholder="Add a note (optional)..."
                          placeholderTextColor={colors.textMuted}
                          style={s.rsvpNotesInput}
                        />
                      </View>
                    );
                  })}
                </View>
              )}

              {myPlayers.length === 0 && (
                <View style={s.emptyPlayersCard}>
                  <Ionicons name="person-outline" size={48} color={colors.textMuted} />
                  <Text style={s.emptyPlayersText}>
                    No players linked to your account on this team
                  </Text>
                  {__DEV__ && (
                    <Text style={s.debugText}>
                      (uid: {user?.id}, team: {event?.team_id})
                    </Text>
                  )}
                </View>
              )}

              {/* All RSVPs List (for coaches) */}
              {isCoachOrAdmin && rsvps.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={s.sectionTitle}>All Responses</Text>
                  {rsvps.map(rsvp => (
                    <View key={rsvp.id} style={s.rsvpListItem}>
                      <View style={[
                        s.rsvpListIcon,
                        { backgroundColor: rsvp.status === 'yes' ? '#4ECDC420' : rsvp.status === 'no' ? '#FF6B6B20' : '#FFB34720' },
                      ]}>
                        <Ionicons
                          name={rsvp.status === 'yes' ? 'checkmark' : rsvp.status === 'no' ? 'close' : 'help'}
                          size={18}
                          color={rsvp.status === 'yes' ? '#4ECDC4' : rsvp.status === 'no' ? '#FF6B6B' : '#FFB347'}
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
          )}

          {/* VOLUNTEERS TAB */}
          {activeTab === 'volunteers' && isGame && (
            <View>
              {/* Line Judge Section */}
              <View style={s.glassCard}>
                <View style={s.volunteerSectionHeader}>
                  <Ionicons name="flag" size={24} color={colors.primary} />
                  <Text style={s.volunteerSectionTitle}>Line Judge</Text>
                </View>
                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((pos, idx) =>
                  renderVolunteerSlot('line_judge', pos, idx)
                )}
              </View>

              {/* Scorekeeper Section */}
              <View style={s.glassCard}>
                <View style={s.volunteerSectionHeader}>
                  <Ionicons name="clipboard" size={24} color={colors.primary} />
                  <Text style={s.volunteerSectionTitle}>Scorekeeper</Text>
                </View>
                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((pos, idx) =>
                  renderVolunteerSlot('scorekeeper', pos, idx)
                )}
              </View>

              {/* Send Blast Button (for coaches when volunteers missing) */}
              {isCoachOrAdmin && (
                !volunteers.some(v => v.role === 'line_judge' && v.position === 'primary') ||
                !volunteers.some(v => v.role === 'scorekeeper' && v.position === 'primary')
              ) && (
                <TouchableOpacity
                  onPress={handleSendBlast}
                  disabled={sendingBlast}
                  style={s.blastBtn}
                >
                  <Ionicons name="megaphone" size={22} color="#fff" />
                  <Text style={s.blastBtnText}>
                    {sendingBlast ? 'Sending...' : 'Send Volunteer Request to Parents'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Info Box */}
              <View style={s.infoBox}>
                <View style={s.infoBoxHeader}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <Text style={s.infoBoxTitle}>How Backups Work</Text>
                </View>
                <Text style={s.infoBoxBody}>
                  If the primary volunteer can't make it, Backup #1 will be notified and promoted.
                  Signing up as a backup helps ensure we always have coverage!
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    // ── Header ──────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    closeBtn: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 5,
      marginBottom: 6,
    },
    typeBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    headerOpponent: {
      color: '#FF6B6B',
      fontSize: 16,
      fontWeight: '700',
      marginTop: 4,
    },

    // ── Tabs ────────────────────────────
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      gap: 6,
    },
    tabActive: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      color: colors.textMuted,
      fontWeight: '400',
      fontSize: 14,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },

    // ── Scroll ──────────────────────────
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },

    // ── Glass Card (base) ───────────────
    glassCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    },

    // ── Details Tab ─────────────────────
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    dateIcon: {
      width: 50,
      height: 50,
      backgroundColor: colors.primary + '20',
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    dateWeekday: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '600',
    },
    dateDay: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
    dateFull: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    dateTime: {
      color: colors.textMuted,
      fontSize: 14,
      marginTop: 2,
    },
    arrivalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFB34720',
      padding: 10,
      borderRadius: 8,
    },
    arrivalText: {
      color: '#FFB347',
      marginLeft: 8,
      fontWeight: '600',
    },

    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardHeaderText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    venueAddress: {
      color: colors.textMuted,
      fontSize: 14,
      marginLeft: 28,
      marginBottom: 12,
    },
    directionsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '20',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginTop: 4,
      gap: 8,
    },
    directionsBtnText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    notesBody: {
      color: colors.textMuted,
      fontSize: 14,
      marginLeft: 28,
    },
    gamePrepBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 10,
    },
    gamePrepBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    attendanceBtn: {
      backgroundColor: colors.success + '20',
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.success + '40',
    },
    attendanceBtnText: {
      fontSize: 16,
      fontWeight: '600',
    },

    // ── RSVP Tab ────────────────────────
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    rsvpSummaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    rsvpSummaryItem: {
      alignItems: 'center',
    },
    rsvpSummaryCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rsvpSummaryCount: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    rsvpSummaryLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
    },
    playerRsvpCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    playerName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 12,
    },
    rsvpButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    rsvpBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: 12,
      borderWidth: 2,
      gap: 6,
    },
    rsvpBtnText: {
      fontWeight: '600',
      fontSize: 14,
    },
    rsvpNotesInput: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyPlayersCard: {
      backgroundColor: colors.glassCard,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    emptyPlayersText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
      textAlign: 'center',
    },
    debugText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 8,
    },
    rsvpListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
    },
    rsvpListIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rsvpListName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    rsvpListNotes: {
      color: colors.textMuted,
      fontSize: 12,
    },

    // ── Volunteers Tab ──────────────────
    volunteerSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    volunteerSectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 10,
    },
    volunteerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      minHeight: 48,
    },
    volunteerPositionCol: {
      width: 80,
    },
    volunteerPositionText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '400',
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
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    youBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    youBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: '600',
    },
    volunteerCancelBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#FF6B6B40',
      gap: 4,
    },
    volunteerCancelText: {
      color: '#FF6B6B',
      fontSize: 14,
      fontWeight: '600',
    },
    volunteerSignupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: colors.primary + '15',
      borderWidth: 1,
      borderColor: colors.primary + '40',
      gap: 6,
      alignSelf: 'flex-start',
    },
    volunteerSignupText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    blastBtn: {
      backgroundColor: '#FFB347',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    blastBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    infoBox: {
      backgroundColor: colors.primary + '10',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    infoBoxHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoBoxTitle: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    infoBoxBody: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },

    // ── Loading Overlay ─────────────────
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
