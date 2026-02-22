import { getPlayerPlaceholder } from '@/lib/default-images';
import { getSportDisplay, getPositionInfo } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import EmergencyContactModal from './EmergencyContactModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type PlayerStats = Record<string, number>;

type PlayerSkills = {
  passing: number;
  serving: number;
  hitting: number;
  blocking: number;
  setting: number;
  defense: number;
};

type PlayerBadge = {
  id: string;
  badge_type: string;
  badge_name: string;
  awarded_by_name: string;
  awarded_at: string;
};

export type PlayerCardPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  position: string | null;
  photo_url: string | null;
  grade: number | null;
  school: string | null;
  sport_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  team_color?: string | null;
  age_group_name?: string | null;
  experience_level?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  medical_conditions?: string | null;
  allergies?: string | null;
};

type PlayerCardExpandedProps = {
  player: PlayerCardPlayer | null;
  visible: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

const badgeIcons: Record<string, { icon: string; color: string; name: string }> = {
  'mvp': { icon: 'trophy', color: '#FFD700', name: 'MVP' },
  'best_server': { icon: 'flash', color: '#FF6B6B', name: 'Best Server' },
  'best_passer': { icon: 'shield-checkmark', color: '#4ECDC4', name: 'Best Passer' },
  'most_improved': { icon: 'trending-up', color: '#96CEB4', name: 'Most Improved' },
  'team_spirit': { icon: 'heart', color: '#FF69B4', name: 'Team Spirit' },
  'most_energy': { icon: 'flame', color: '#FF9F43', name: 'Most Energy' },
  'hustle': { icon: 'footsteps', color: '#45B7D1', name: 'Hustle Award' },
  'leadership': { icon: 'star', color: '#9B59B6', name: 'Leadership' },
  'clutch_player': { icon: 'diamond', color: '#E74C3C', name: 'Clutch Player' },
  'defensive_wall': { icon: 'hand-left', color: '#2ECC71', name: 'Defensive Wall' },
};

export default function PlayerCardExpanded({ player, visible, onClose, onUpdate }: PlayerCardExpandedProps) {
  const { colors } = useTheme();
  const { isAdmin, isCoach } = usePermissions();
  const { user } = useAuth();
  
  const sportDisplay = useMemo(() => getSportDisplay(player?.sport_name), [player?.sport_name]);
  const posInfo = useMemo(() => getPositionInfo(player?.position, player?.sport_name), [player?.position, player?.sport_name]);
  const isVolleyball = (player?.sport_name?.toLowerCase() || 'volleyball') === 'volleyball';

  const [stats, setStats] = useState<PlayerStats>({});
  const [skills, setSkills] = useState<PlayerSkills>({
    passing: 50, serving: 50, hitting: 50, blocking: 50, setting: 50, defense: 50,
  });
  const [badges, setBadges] = useState<PlayerBadge[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'info'>('stats');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const s = createStyles(colors);

  useEffect(() => {
    if (player && visible) {
      fetchPlayerData();
    }
  }, [player?.id, visible]);

  const fetchPlayerData = async () => {
    if (!player) return;

    // Fetch stats
    const { data: statsData } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', player.id)
      .single();
    
    if (statsData) {
      setStats(statsData);
    }

    // Fetch skills
    const { data: skillsData } = await supabase
      .from('player_skills')
      .select('*')
      .eq('player_id', player.id)
      .single();
    
    if (skillsData) {
      setSkills(skillsData);
    }

    // Fetch badges
    const { data: badgesData } = await supabase
      .from('player_badges')
      .select('id, badge_type, badge_name, awarded_at, awarded_by')
      .eq('player_id', player.id)
      .order('awarded_at', { ascending: false });
    
    if (badgesData) {
      setBadges(badgesData.map(b => ({
        id: b.id,
        badge_type: b.badge_type,
        badge_name: b.badge_name || badgeIcons[b.badge_type]?.name || b.badge_type,
        awarded_by_name: 'Coach',
        awarded_at: b.awarded_at,
      })));
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!player) return;
    setUploading(true);

    try {
      const ext = uri.split('.').pop();
      const fileName = `player_${player.id}_${Date.now()}.${ext}`;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('players')
        .update({ photo_url: publicUrl })
        .eq('id', player.id);

      Alert.alert('Success', 'Photo uploaded!');
      onUpdate?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const awardBadge = async (badgeType: string) => {
    if (!player || !user) return;

    try {
      const { error } = await supabase.from('player_badges').insert({
        player_id: player.id,
        badge_type: badgeType,
        badge_name: badgeIcons[badgeType]?.name || badgeType,
        awarded_by: user.id,
      });

      if (error) throw error;

      setShowBadgeModal(false);
      fetchPlayerData();
      Alert.alert('Badge Awarded!', `${badgeIcons[badgeType]?.name} badge given to ${player.first_name}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (!player) return null;

  const positionColor = posInfo?.color || colors.primary;
  const teamColor = player.team_color || '#1a1a2e';
  const hasPhoto = player.photo_url && player.photo_url.length > 0;
  const overallRating = isVolleyball
    ? Math.round((skills.passing + skills.serving + skills.hitting + skills.blocking + skills.setting + skills.defense) / 6)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Close Button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Emergency Contact Button (coaches/admins only) */}
          {(isAdmin || isCoach) && (
            <TouchableOpacity
              style={s.emergencyBtn}
              onPress={() => setShowEmergencyModal(true)}
            >
              <Ionicons name="medkit" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <LinearGradient
              colors={[teamColor, '#0f0f1a', colors.card]}
              style={s.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              {/* Overall Rating (volleyball only - requires skills data) */}
              {overallRating !== null && (
                <View style={s.overallBadge}>
                  <Text style={s.overallLabel}>OVR</Text>
                  <Text style={s.overallNumber}>{overallRating}</Text>
                </View>
              )}

              {/* Player Photo */}
              <TouchableOpacity 
                style={s.photoWrapper} 
                onPress={(isAdmin || isCoach) ? pickImage : undefined}
                disabled={uploading}
              >
                {hasPhoto ? (
                  <Image source={{ uri: player.photo_url! }} style={s.photo} />
                ) : (
                  <View style={s.silhouette}>
                    <Image source={getPlayerPlaceholder()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                )}
                {(isAdmin || isCoach) && (
                  <View style={[s.cameraOverlay, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Jersey Number */}
              {player.jersey_number && (
                <Text style={s.jerseyNumber}>#{player.jersey_number}</Text>
              )}

              {/* Name */}
              <Text style={s.playerName}>{player.first_name} {player.last_name}</Text>

              {/* Position & Team */}
              <View style={s.infoRow}>
                {player.position && (
                  <View style={[s.positionPill, { backgroundColor: positionColor }]}>
                    <Text style={s.positionPillText}>{posInfo?.full || player.position}</Text>
                  </View>
                )}
                {player.team_name && (
                  <Text style={s.teamName}>{player.team_name}</Text>
                )}
              </View>

              {/* Quick Info */}
              <View style={s.quickInfo}>
                {player.age_group_name && (
                  <View style={s.quickInfoItem}>
                    <Ionicons name="people" size={14} color="#aaa" />
                    <Text style={s.quickInfoText}>{player.age_group_name}</Text>
                  </View>
                )}
                {player.grade && (
                  <View style={s.quickInfoItem}>
                    <Ionicons name="school" size={14} color="#aaa" />
                    <Text style={s.quickInfoText}>Grade {player.grade}</Text>
                  </View>
                )}
                <View style={s.quickInfoItem}>
                  <Ionicons name="game-controller" size={14} color="#aaa" />
                  <Text style={s.quickInfoText}>{stats.games_played} Games</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Badges Section */}
            <View style={s.badgesSection}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Badges</Text>
                {(isAdmin || isCoach) && (
                  <TouchableOpacity style={s.addBadgeBtn} onPress={() => setShowBadgeModal(true)}>
                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              {badges.length === 0 ? (
                <Text style={s.noBadges}>No badges earned yet</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.badgesList}>
                  {badges.map(badge => {
                    const badgeInfo = badgeIcons[badge.badge_type] || { icon: 'ribbon', color: colors.primary, name: badge.badge_name };
                    return (
                      <View key={badge.id} style={s.badge}>
                        <View style={[s.badgeIcon, { backgroundColor: badgeInfo.color + '30' }]}>
                          <Ionicons name={badgeInfo.icon as any} size={24} color={badgeInfo.color} />
                        </View>
                        <Text style={s.badgeName}>{badgeInfo.name}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Tab Selector */}
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, activeTab === 'stats' && [s.tabActive, { borderBottomColor: colors.primary }]]}
                onPress={() => setActiveTab('stats')}
              >
                <Ionicons name="stats-chart" size={18} color={activeTab === 'stats' ? colors.primary : colors.textMuted} />
                <Text style={[s.tabText, activeTab === 'stats' && { color: colors.primary, fontWeight: '600' }]}>Stats</Text>
              </TouchableOpacity>
              {isVolleyball && (
                <TouchableOpacity
                  style={[s.tab, activeTab === 'skills' && [s.tabActive, { borderBottomColor: colors.primary }]]}
                  onPress={() => setActiveTab('skills')}
                >
                  <Ionicons name="fitness" size={18} color={activeTab === 'skills' ? colors.primary : colors.textMuted} />
                  <Text style={[s.tabText, activeTab === 'skills' && { color: colors.primary, fontWeight: '600' }]}>Skills</Text>
                </TouchableOpacity>
              )}
              {(isAdmin || isCoach) && (
                <TouchableOpacity
                  style={[s.tab, activeTab === 'info' && [s.tabActive, { borderBottomColor: colors.primary }]]}
                  onPress={() => setActiveTab('info')}
                >
                  <Ionicons name="information-circle" size={18} color={activeTab === 'info' ? colors.primary : colors.textMuted} />
                  <Text style={[s.tabText, activeTab === 'info' && { color: colors.primary, fontWeight: '600' }]}>Info</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Content */}
            <View style={s.tabContent}>
              {activeTab === 'stats' && (
                <View style={s.statsGrid}>
                  {sportDisplay.primaryStats.map((st) => (
                    <StatBox
                      key={st.key}
                      label={st.short}
                      value={stats[st.key] ?? 0}
                      color={st.color}
                    />
                  ))}
                  <StatBox label="GAMES" value={stats.games_played ?? 0} color="#A29BFE" />
                </View>
              )}

              {activeTab === 'skills' && isVolleyball && (
                <View style={s.skillsList}>
                  <SkillBar label="Passing" value={skills.passing} color="#4ECDC4" />
                  <SkillBar label="Serving" value={skills.serving} color="#FF6B6B" />
                  <SkillBar label="Hitting" value={skills.hitting} color="#FF9F43" />
                  <SkillBar label="Blocking" value={skills.blocking} color="#45B7D1" />
                  <SkillBar label="Setting" value={skills.setting} color="#96CEB4" />
                  <SkillBar label="Defense" value={skills.defense} color="#DDA0DD" />
                </View>
              )}

              {activeTab === 'info' && (isAdmin || isCoach) && (
                <View style={s.infoList}>
                  <InfoRow icon="person" label="Parent" value={player.parent_name || '—'} />
                  <InfoRow icon="call" label="Phone" value={player.parent_phone || '—'} />
                  <InfoRow icon="mail" label="Email" value={player.parent_email || '—'} />
                  <InfoRow icon="school" label="School" value={player.school || '—'} />
                  <InfoRow icon="medical" label="Medical" value={player.medical_conditions || 'None'} />
                  <InfoRow icon="alert-circle" label="Allergies" value={player.allergies || 'None'} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Emergency Contact Modal */}
        <EmergencyContactModal
          visible={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          player={player}
        />

        {/* Badge Award Modal */}
        <Modal visible={showBadgeModal} animationType="fade" transparent>
          <View style={s.badgeModalOverlay}>
            <View style={[s.badgeModal, { backgroundColor: colors.card }]}>
              <View style={[s.badgeModalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.badgeModalTitle, { color: colors.text }]}>Award Badge</Text>
                <TouchableOpacity onPress={() => setShowBadgeModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.badgeOptions}>
                {Object.entries(badgeIcons).map(([key, badge]) => (
                  <TouchableOpacity
                    key={key}
                    style={s.badgeOption}
                    onPress={() => awardBadge(key)}
                  >
                    <View style={[s.badgeOptionIcon, { backgroundColor: badge.color + '30' }]}>
                      <Ionicons name={badge.icon as any} size={28} color={badge.color} />
                    </View>
                    <Text style={[s.badgeOptionName, { color: colors.text }]}>{badge.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// Sub-components
function StatBox({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  const getGrade = (v: number) => {
    if (v >= 90) return 'A+';
    if (v >= 80) return 'A';
    if (v >= 70) return 'B';
    if (v >= 60) return 'C';
    if (v >= 50) return 'D';
    return 'F';
  };

  return (
    <View style={skillStyles.row}>
      <Text style={skillStyles.label}>{label}</Text>
      <View style={skillStyles.barContainer}>
        <View style={[skillStyles.barFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View style={[skillStyles.grade, { backgroundColor: color + '30' }]}>
        <Text style={[skillStyles.gradeText, { color }]}>{getGrade(value)}</Text>
      </View>
      <Text style={skillStyles.value}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Ionicons name={icon as any} size={20} color="#666" />
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { width: '23%', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 10 },
  value: { fontSize: 24, fontWeight: 'bold' },
  label: { fontSize: 10, color: '#888', marginTop: 4, letterSpacing: 1 },
});

const skillStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  label: { width: 70, fontSize: 13, color: '#aaa' },
  barContainer: { flex: 1, height: 8, backgroundColor: '#2a2a4a', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  grade: { width: 32, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  gradeText: { fontSize: 12, fontWeight: 'bold' },
  value: { width: 30, fontSize: 14, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  label: { flex: 1, fontSize: 14, color: '#888', marginLeft: 12 },
  value: { fontSize: 14, color: '#fff', textAlign: 'right' },
});

const createStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  card: { width: SCREEN_WIDTH - 32, maxHeight: SCREEN_HEIGHT - 100, backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 4 },
  emergencyBtn: { position: 'absolute', top: 16, left: 16, zIndex: 100, backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 20, padding: 6 },
  
  header: { paddingTop: 50, paddingBottom: 24, alignItems: 'center' },
  overallBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#FFD700', borderRadius: 8, padding: 8, alignItems: 'center' },
  overallLabel: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  overallNumber: { fontSize: 28, fontWeight: '900', color: '#000' },
  
  photoWrapper: { position: 'relative' },
  photo: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  silhouette: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#2a2a4a', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' as const },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, borderRadius: 16, padding: 6 },
  
  jerseyNumber: { fontSize: 20, fontWeight: 'bold', color: '#888', marginTop: 12 },
  playerName: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 4, textTransform: 'uppercase' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  positionPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  positionPillText: { fontSize: 12, fontWeight: 'bold', color: '#000' },
  teamName: { fontSize: 14, color: '#aaa' },
  
  quickInfo: { flexDirection: 'row', gap: 20, marginTop: 16 },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickInfoText: { fontSize: 12, color: '#aaa' },
  
  badgesSection: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  addBadgeBtn: { padding: 4 },
  noBadges: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  badgesList: { flexDirection: 'row' },
  badge: { alignItems: 'center', marginRight: 16 },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  badgeName: { fontSize: 10, color: '#aaa', textAlign: 'center', maxWidth: 60 },
  
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontSize: 13, color: '#666' },
  
  tabContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skillsList: {},
  infoList: {},
  
  badgeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  badgeModal: { width: SCREEN_WIDTH - 48, maxHeight: 400, borderRadius: 16, overflow: 'hidden' },
  badgeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  badgeModalTitle: { fontSize: 18, fontWeight: 'bold' },
  badgeOptions: { padding: 8 },
  badgeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  badgeOptionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeOptionName: { flex: 1, fontSize: 15 },
});
