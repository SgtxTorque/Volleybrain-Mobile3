import { useAuth } from '@/lib/auth';
import { promoteBackupVolunteer, sendVolunteerBlast } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
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
    first_name: string;
    last_name: string;
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
    
    // Get players that this user (parent) is linked to on this team
    const { data } = await supabase
      .from('player_parents')
      .select(`
        player:players(
          id,
          first_name,
          last_name,
          jersey_number
        )
      `)
      .eq('parent_id', user.id);
    
    if (data) {
      const players = data
        .map((d: any) => d.player)
        .filter((p: any) => p !== null);
      
      // Filter to only players on this team
      const { data: teamPlayers } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', event.team_id);
      
      const teamPlayerIds = teamPlayers?.map(tp => tp.player_id) || [];
      const filteredPlayers = players.filter((p: Player) => teamPlayerIds.includes(p.id));
      
      setMyPlayers(filteredPlayers);
    }
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
          first_name,
          last_name
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
      console.error('RSVP error:', error);
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
      console.error('Volunteer signup error:', error);
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
              console.error('Cancel volunteer error:', error);
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
                  'Blast Sent! 🎉',
                  `Notification sent to ${result.recipientCount} team parents.`
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to send blast');
              }
            } catch (error) {
              console.error('Blast error:', error);
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
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'details', label: 'Details', icon: 'information-circle' },
    { key: 'rsvp', label: 'RSVP', icon: 'people' },
    ...(isGame ? [{ key: 'volunteers' as TabType, label: 'Volunteers', icon: 'hand-left' }] : []),
  ];

  // Count RSVPs
  const yesCount = rsvps.filter(r => r.status === 'yes').length;
  const noCount = rsvps.filter(r => r.status === 'no').length;
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
            {event.title}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Tabs */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
                gap: 6,
              }}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? colors.primary : colors.textMuted} 
              />
              <Text style={{ 
                color: activeTab === tab.key ? colors.primary : colors.textMuted,
                fontWeight: activeTab === tab.key ? '600' : '400',
                fontSize: 14,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* DETAILS TAB */}
          {activeTab === 'details' && (
            <View>
              {/* Date & Time */}
              <View style={{ 
                backgroundColor: colors.card, 
                borderRadius: 12, 
                padding: 16,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ 
                    width: 50, 
                    height: 50, 
                    backgroundColor: colors.primary + '20',
                    borderRadius: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>
                      {eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                      {eventDate.getDate()}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                      {eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>
                      {formatTime(event.start_time)}
                      {event.end_time && ` - ${formatTime(event.end_time)}`}
                    </Text>
                  </View>
                </View>

                {event.arrival_time && (
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#FFB34720',
                    padding: 10,
                    borderRadius: 8,
                  }}>
                    <Ionicons name="alarm" size={18} color="#FFB347" />
                    <Text style={{ color: '#FFB347', marginLeft: 8, fontWeight: '600' }}>
                      Arrive by {formatTime(event.arrival_time)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Location */}
              {(event.venue_name || event.location) && (
                <View style={{ 
                  backgroundColor: colors.card, 
                  borderRadius: 12, 
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                      {event.venue_name || event.location}
                    </Text>
                  </View>
                  {event.venue_address && (
                    <Text style={{ color: colors.textMuted, fontSize: 14, marginLeft: 28 }}>
                      {event.venue_address}
                    </Text>
                  )}
                </View>
              )}

              {/* Opponent (games) */}
              {isGame && (event.opponent_name || event.opponent) && (
                <View style={{ 
                  backgroundColor: colors.card, 
                  borderRadius: 12, 
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="shield" size={20} color="#FF6B6B" />
                    <Text style={{ color: colors.textMuted, fontSize: 14, marginLeft: 8 }}>
                      Opponent
                    </Text>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 4, marginLeft: 28 }}>
                    {event.opponent_name || event.opponent}
                  </Text>
                </View>
              )}

              {/* Notes */}
              {event.notes && (
                <View style={{ 
                  backgroundColor: colors.card, 
                  borderRadius: 12, 
                  padding: 16,
                  marginBottom: 16,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                      Notes
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 14, marginLeft: 28 }}>
                    {event.notes}
                  </Text>
                </View>
              )}

              {/* Game Prep Button */}
              {isGame && isCoachOrAdmin && onGamePrep && (
                <TouchableOpacity
                  onPress={() => onGamePrep(event)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Ionicons name="clipboard" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    Game Prep & Lineup
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* RSVP TAB */}
          {activeTab === 'rsvp' && (
            <View>
              {/* RSVP Summary */}
              <View style={{ 
                backgroundColor: colors.card, 
                borderRadius: 12, 
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                  Responses
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ 
                      width: 50, height: 50, borderRadius: 25, 
                      backgroundColor: '#4ECDC420', 
                      justifyContent: 'center', alignItems: 'center' 
                    }}>
                      <Text style={{ color: '#4ECDC4', fontSize: 20, fontWeight: 'bold' }}>{yesCount}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Going</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ 
                      width: 50, height: 50, borderRadius: 25, 
                      backgroundColor: '#FF6B6B20', 
                      justifyContent: 'center', alignItems: 'center' 
                    }}>
                      <Text style={{ color: '#FF6B6B', fontSize: 20, fontWeight: 'bold' }}>{noCount}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Can't Go</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ 
                      width: 50, height: 50, borderRadius: 25, 
                      backgroundColor: '#FFB34720', 
                      justifyContent: 'center', alignItems: 'center' 
                    }}>
                      <Text style={{ color: '#FFB347', fontSize: 20, fontWeight: 'bold' }}>{maybeCount}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>Maybe</Text>
                  </View>
                </View>
              </View>

              {/* My Players RSVP */}
              {myPlayers.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                    Your Players
                  </Text>
                  {myPlayers.map(player => {
                    const playerRsvp = getPlayerRSVP(player.id);
                    return (
                      <View 
                        key={player.id}
                        style={{ 
                          backgroundColor: colors.card, 
                          borderRadius: 12, 
                          padding: 16,
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 12 }}>
                          {player.first_name} {player.last_name}
                          {player.jersey_number && ` #${player.jersey_number}`}
                        </Text>
                        
                        {/* RSVP Buttons */}
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                          {(['yes', 'no', 'maybe'] as const).map(status => {
                            const isSelected = playerRsvp?.status === status;
                            const config = {
                              yes: { label: 'Going', color: '#4ECDC4', icon: 'checkmark-circle' },
                              no: { label: "Can't Go", color: '#FF6B6B', icon: 'close-circle' },
                              maybe: { label: 'Maybe', color: '#FFB347', icon: 'help-circle' },
                            }[status];
                            
                            return (
                              <TouchableOpacity
                                key={status}
                                onPress={() => handleRSVP(player.id, status)}
                                disabled={loading}
                                style={{
                                  flex: 1,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 10,
                                  borderRadius: 8,
                                  backgroundColor: isSelected ? config.color + '20' : colors.background,
                                  borderWidth: 2,
                                  borderColor: isSelected ? config.color : colors.border,
                                  gap: 6,
                                }}
                              >
                                <Ionicons name={config.icon as any} size={18} color={config.color} />
                                <Text style={{ color: config.color, fontWeight: '600', fontSize: 13 }}>
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
                          style={{
                            backgroundColor: colors.background,
                            borderRadius: 8,
                            padding: 12,
                            color: colors.text,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              )}

              {myPlayers.length === 0 && (
                <View style={{ 
                  backgroundColor: colors.card, 
                  borderRadius: 12, 
                  padding: 24,
                  alignItems: 'center',
                }}>
                  <Ionicons name="person-outline" size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
                    No players linked to your account on this team
                  </Text>
                </View>
              )}

              {/* All RSVPs List (for coaches) */}
              {isCoachOrAdmin && rsvps.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
                    All Responses
                  </Text>
                  {rsvps.map(rsvp => (
                    <View 
                      key={rsvp.id}
                      style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.card, 
                        borderRadius: 8, 
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: rsvp.status === 'yes' ? '#4ECDC420' : rsvp.status === 'no' ? '#FF6B6B20' : '#FFB34720',
                        justifyContent: 'center', alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <Ionicons 
                          name={rsvp.status === 'yes' ? 'checkmark' : rsvp.status === 'no' ? 'close' : 'help'} 
                          size={18} 
                          color={rsvp.status === 'yes' ? '#4ECDC4' : rsvp.status === 'no' ? '#FF6B6B' : '#FFB347'} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                          {(rsvp as any).player?.first_name} {(rsvp as any).player?.last_name}
                        </Text>
                        {rsvp.notes && (
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{rsvp.notes}</Text>
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
              <View style={{ 
                backgroundColor: colors.card, 
                borderRadius: 12, 
                padding: 16,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="flag" size={24} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: 10 }}>
                    Line Judge
                  </Text>
                </View>

                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((position, idx) => {
                  const volunteer = getVolunteerForSlot('line_judge', position);
                  const isMe = volunteer && isMyVolunteerSlot(volunteer.id);
                  const isPrimary = position === 'primary';
                  
                  return (
                    <View 
                      key={position}
                      style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: colors.border,
                      }}
                    >
                      <View style={{ width: 80 }}>
                        <Text style={{ 
                          color: isPrimary ? colors.primary : colors.textMuted, 
                          fontSize: 12, 
                          fontWeight: isPrimary ? '600' : '400' 
                        }}>
                          {formatPosition(position)}
                        </Text>
                      </View>
                      
                      {volunteer ? (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {isPrimary && <Ionicons name="star" size={14} color="#FFB347" style={{ marginRight: 6 }} />}
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                              {volunteer.profile?.first_name} {volunteer.profile?.last_name?.charAt(0)}.
                            </Text>
                            {isMe && (
                              <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>YOU</Text>
                              </View>
                            )}
                          </View>
                          {isMe && (
                            <TouchableOpacity onPress={() => handleVolunteerCancel(volunteer.id)}>
                              <Text style={{ color: '#FF6B6B', fontSize: 12 }}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleVolunteerSignup('line_judge', position)}
                          disabled={signingUp}
                          style={{ flex: 1 }}
                        >
                          <Text style={{ color: isPrimary ? '#FFB347' : colors.primary, fontSize: 14, fontWeight: '500' }}>
                            {isPrimary ? 'Need Volunteer' : 'Sign Up'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Scorekeeper Section */}
              <View style={{ 
                backgroundColor: colors.card, 
                borderRadius: 12, 
                padding: 16,
                marginBottom: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Ionicons name="clipboard" size={24} color={colors.primary} />
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600', marginLeft: 10 }}>
                    Scorekeeper
                  </Text>
                </View>

                {(['primary', 'backup_1', 'backup_2', 'backup_3'] as const).map((position, idx) => {
                  const volunteer = getVolunteerForSlot('scorekeeper', position);
                  const isMe = volunteer && isMyVolunteerSlot(volunteer.id);
                  const isPrimary = position === 'primary';
                  
                  return (
                    <View 
                      key={position}
                      style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderTopColor: colors.border,
                      }}
                    >
                      <View style={{ width: 80 }}>
                        <Text style={{ 
                          color: isPrimary ? colors.primary : colors.textMuted, 
                          fontSize: 12, 
                          fontWeight: isPrimary ? '600' : '400' 
                        }}>
                          {formatPosition(position)}
                        </Text>
                      </View>
                      
                      {volunteer ? (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {isPrimary && <Ionicons name="star" size={14} color="#FFB347" style={{ marginRight: 6 }} />}
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                              {volunteer.profile?.first_name} {volunteer.profile?.last_name?.charAt(0)}.
                            </Text>
                            {isMe && (
                              <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '600' }}>YOU</Text>
                              </View>
                            )}
                          </View>
                          {isMe && (
                            <TouchableOpacity onPress={() => handleVolunteerCancel(volunteer.id)}>
                              <Text style={{ color: '#FF6B6B', fontSize: 12 }}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleVolunteerSignup('scorekeeper', position)}
                          disabled={signingUp}
                          style={{ flex: 1 }}
                        >
                          <Text style={{ color: isPrimary ? '#FFB347' : colors.primary, fontSize: 14, fontWeight: '500' }}>
                            {isPrimary ? 'Need Volunteer' : 'Sign Up'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Send Blast Button (for coaches when volunteers missing) */}
              {isCoachOrAdmin && (
                !volunteers.some(v => v.role === 'line_judge' && v.position === 'primary') ||
                !volunteers.some(v => v.role === 'scorekeeper' && v.position === 'primary')
              ) && (
                <TouchableOpacity
                  onPress={handleSendBlast}
                  disabled={sendingBlast}
                  style={{
                    backgroundColor: '#FFB347',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <Ionicons name="megaphone" size={22} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                    {sendingBlast ? 'Sending...' : 'Send Volunteer Request to Parents'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Info Box */}
              <View style={{ 
                backgroundColor: colors.primary + '10', 
                borderRadius: 12, 
                padding: 16,
                borderWidth: 1,
                borderColor: colors.primary + '30',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
                    How Backups Work
                  </Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
                  If the primary volunteer can't make it, Backup #1 will be notified and promoted. 
                  Signing up as a backup helps ensure we always have coverage!
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {loading && (
          <View style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
