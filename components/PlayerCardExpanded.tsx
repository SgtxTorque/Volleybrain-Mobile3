import { getPlayerPlaceholder } from '@/lib/default-images';
import { calculateOVR } from '@/lib/evaluations';
import { getSportDisplay, getPositionInfo } from '@/constants/sport-display';
import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { BRAND } from '@/theme/colors';
import { D_COLORS } from '@/theme/d-system';
import { FONTS } from '@/theme/fonts';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
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
} | null;

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
  'mvp': { icon: 'trophy', color: BRAND.goldBrand, name: 'MVP' },
  'best_server': { icon: 'flash', color: BRAND.coral, name: 'Best Server' },
  'best_passer': { icon: 'shield-checkmark', color: BRAND.teal, name: 'Best Passer' },
  'most_improved': { icon: 'trending-up', color: BRAND.skyBlue, name: 'Most Improved' },
  'team_spirit': { icon: 'heart', color: BRAND.coral, name: 'Team Spirit' },
  'most_energy': { icon: 'flame', color: BRAND.goldBrand, name: 'Most Energy' },
  'hustle': { icon: 'footsteps', color: BRAND.skyBlue, name: 'Hustle Award' },
  'leadership': { icon: 'star', color: BRAND.teal, name: 'Leadership' },
  'clutch_player': { icon: 'diamond', color: BRAND.coral, name: 'Clutch Player' },
  'defensive_wall': { icon: 'hand-left', color: BRAND.teal, name: 'Defensive Wall' },
};

export default function PlayerCardExpanded({ player, visible, onClose, onUpdate }: PlayerCardExpandedProps) {
  const { isAdmin, isCoach } = usePermissions();
  const { user } = useAuth();
  const router = useRouter();

  const sportDisplay = useMemo(() => getSportDisplay(player?.sport_name), [player?.sport_name]);
  const posInfo = useMemo(() => getPositionInfo(player?.position, player?.sport_name), [player?.position, player?.sport_name]);
  const isVolleyball = (player?.sport_name?.toLowerCase() || 'volleyball') === 'volleyball';

  const [stats, setStats] = useState<PlayerStats>({});
  const [skills, setSkills] = useState<PlayerSkills>(null);
  const [evalRatings, setEvalRatings] = useState<Record<string, number> | null>(null);
  const [badges, setBadges] = useState<PlayerBadge[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'skills' | 'info'>('stats');
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (player && visible) {
      fetchPlayerData();
    }
  }, [player?.id, visible]);

  if (!player) return null;

  const fetchPlayerData = async () => {
    if (!player) return;

    // Fetch stats
    const { data: statsData } = await supabase
      .from('player_stats')
      .select('*')
      .eq('player_id', player.id)
      .maybeSingle();

    if (statsData) {
      setStats(statsData);
    }

    // Fetch skills (simple 0-100)
    const { data: skillsData } = await supabase
      .from('player_skills')
      .select('*')
      .eq('player_id', player.id)
      .maybeSingle();

    if (skillsData) {
      setSkills(skillsData);
    } else {
      setSkills(null);
    }

    // Fetch evaluation-based skill ratings (1-10) for OVR
    const { data: evalData } = await supabase
      .from('player_skill_ratings')
      .select('serving_rating, passing_rating, setting_rating, attacking_rating, blocking_rating, defense_rating, hustle_rating, coachability_rating, teamwork_rating, overall_rating')
      .eq('player_id', player.id)
      .order('rated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (evalData) {
      setEvalRatings(evalData as Record<string, number>);
    } else {
      setEvalRatings(null);
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

  const positionColor = posInfo?.color || D_COLORS.skyBlue;
  const teamColor = player.team_color || D_COLORS.navyDeep;
  const hasPhoto = player.photo_url && player.photo_url.length > 0;
  const hasEvalData = evalRatings != null || skills != null;
  const overallRating = isVolleyball && hasEvalData
    ? evalRatings
      ? calculateOVR(evalRatings)
      : skills
        ? Math.round((skills.passing + skills.serving + skills.hitting + skills.blocking + skills.setting + skills.defense) / 6)
        : null
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Close Button */}
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={BRAND.white} />
          </TouchableOpacity>

          {/* Emergency Contact Button (coaches/admins only) */}
          {(isAdmin || isCoach) && (
            <TouchableOpacity
              style={s.emergencyBtn}
              onPress={() => setShowEmergencyModal(true)}
            >
              <Ionicons name="medkit" size={20} color={BRAND.white} />
            </TouchableOpacity>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <LinearGradient
              colors={[teamColor, D_COLORS.navyDeep, D_COLORS.pageBg]}
              style={s.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              {/* Overall Rating (volleyball only - requires evaluation data) */}
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
                  <View style={s.cameraOverlay}>
                    <Ionicons name="camera" size={20} color={BRAND.white} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Jersey Number */}
              {player.jersey_number != null && (
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
                    <Ionicons name="people" size={14} color={BRAND.textSecondary} />
                    <Text style={s.quickInfoText}>{player.age_group_name}</Text>
                  </View>
                )}
                {player.grade != null && (
                  <View style={s.quickInfoItem}>
                    <Ionicons name="school" size={14} color={BRAND.textSecondary} />
                    <Text style={s.quickInfoText}>Grade {player.grade}</Text>
                  </View>
                )}
                <View style={s.quickInfoItem}>
                  <Ionicons name="game-controller" size={14} color={BRAND.textSecondary} />
                  <Text style={s.quickInfoText}>{stats.games_played ?? 0} Games</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Badges Section */}
            <View style={s.badgesSection}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Badges</Text>
                {(isAdmin || isCoach) && (
                  <TouchableOpacity style={s.addBadgeBtn} onPress={() => setShowBadgeModal(true)}>
                    <Ionicons name="add-circle" size={24} color={D_COLORS.skyBlue} />
                  </TouchableOpacity>
                )}
              </View>
              {badges.length === 0 ? (
                <Text style={s.noBadges}>No badges earned yet</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.badgesList}>
                  {badges.map(badge => {
                    const badgeInfo = badgeIcons[badge.badge_type] || { icon: 'ribbon', color: D_COLORS.skyBlue, name: badge.badge_name };
                    return (
                      <View key={badge.id} style={s.badge}>
                        <View style={[s.badgeIcon, { backgroundColor: badgeInfo.color + '20' }]}>
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
                style={[s.tab, activeTab === 'stats' && s.tabActive]}
                onPress={() => setActiveTab('stats')}
              >
                <Ionicons name="stats-chart" size={18} color={activeTab === 'stats' ? D_COLORS.skyBlue : D_COLORS.textMuted} />
                <Text style={[s.tabText, activeTab === 'stats' && s.tabTextActive]}>Stats</Text>
              </TouchableOpacity>
              {isVolleyball && (
                <TouchableOpacity
                  style={[s.tab, activeTab === 'skills' && s.tabActive]}
                  onPress={() => setActiveTab('skills')}
                >
                  <Ionicons name="fitness" size={18} color={activeTab === 'skills' ? D_COLORS.skyBlue : D_COLORS.textMuted} />
                  <Text style={[s.tabText, activeTab === 'skills' && s.tabTextActive]}>Skills</Text>
                </TouchableOpacity>
              )}
              {(isAdmin || isCoach) && (
                <TouchableOpacity
                  style={[s.tab, activeTab === 'info' && s.tabActive]}
                  onPress={() => setActiveTab('info')}
                >
                  <Ionicons name="information-circle" size={18} color={activeTab === 'info' ? D_COLORS.skyBlue : D_COLORS.textMuted} />
                  <Text style={[s.tabText, activeTab === 'info' && s.tabTextActive]}>Info</Text>
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
                  <StatBox label="GAMES" value={stats.games_played ?? 0} color={BRAND.skyBlue} />
                </View>
              )}

              {activeTab === 'skills' && isVolleyball && (
                <View style={s.skillsList}>
                  <SkillBar label="Passing" value={skills?.passing ?? null} color={BRAND.teal} delayMs={0} />
                  <SkillBar label="Serving" value={skills?.serving ?? null} color={BRAND.teal} delayMs={80} />
                  <SkillBar label="Hitting" value={skills?.hitting ?? null} color={BRAND.teal} delayMs={160} />
                  <SkillBar label="Blocking" value={skills?.blocking ?? null} color={BRAND.skyBlue} delayMs={240} />
                  <SkillBar label="Setting" value={skills?.setting ?? null} color={BRAND.skyBlue} delayMs={320} />
                  <SkillBar label="Defense" value={skills?.defense ?? null} color={BRAND.skyBlue} delayMs={400} />
                </View>
              )}

              {activeTab === 'info' && (isAdmin || isCoach) && (
                <View style={s.infoList}>
                  <InfoRow icon="person" label="Parent" value={player.parent_name || 'Not provided'} />
                  <InfoRow icon="call" label="Phone" value={player.parent_phone || 'Not provided'} tappable={!!player.parent_phone} onTap={() => player.parent_phone && Linking.openURL(`tel:${player.parent_phone}`)} />
                  <InfoRow icon="mail" label="Email" value={player.parent_email || 'Not provided'} tappable={!!player.parent_email} onTap={() => player.parent_email && Linking.openURL(`mailto:${player.parent_email}`)} />
                  <InfoRow icon="school" label="School" value={player.school || 'Not provided'} />
                  <InfoRow icon="medical" label="Medical" value={player.medical_conditions || 'None'} />
                  <InfoRow icon="alert-circle" label="Allergies" value={player.allergies || 'None'} />
                </View>
              )}
            </View>

            {/* View Full Profile Button */}
            <TouchableOpacity
              style={s.profileBtn}
              onPress={() => {
                onClose();
                if (isAdmin || isCoach) {
                  router.push(`/child-detail?playerId=${player.id}` as any);
                } else {
                  router.push(`/player-card?playerId=${player.id}` as any);
                }
              }}
            >
              <Text style={s.profileBtnText}>
                {isAdmin || isCoach ? 'View Player Detail' : 'View Player Card'}
              </Text>
            </TouchableOpacity>
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
            <View style={s.badgeModal}>
              <View style={s.badgeModalHeader}>
                <Text style={s.badgeModalTitle}>Award Badge</Text>
                <TouchableOpacity onPress={() => setShowBadgeModal(false)}>
                  <Ionicons name="close" size={24} color={D_COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={s.badgeOptions}>
                {Object.entries(badgeIcons).map(([key, badge]) => (
                  <TouchableOpacity
                    key={key}
                    style={s.badgeOption}
                    onPress={() => awardBadge(key)}
                  >
                    <View style={[s.badgeOptionIcon, { backgroundColor: badge.color + '20' }]}>
                      <Ionicons name={badge.icon as any} size={28} color={badge.color} />
                    </View>
                    <Text style={s.badgeOptionName}>{badge.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color={D_COLORS.textMuted} />
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
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function SkillBar({ label, value, color, delayMs = 0 }: { label: string; value: number | null; color: string; delayMs?: number }) {
  const hasData = value !== null && value !== undefined;
  const displayValue = hasData ? value : 0;
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    if (hasData) {
      fillWidth.value = withDelay(delayMs, withTiming(displayValue, { duration: 500 }));
    } else {
      fillWidth.value = 0;
    }
  }, [hasData, displayValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%` as any,
    backgroundColor: color,
  }));

  const getGrade = (v: number) => {
    if (v >= 90) return 'A+';
    if (v >= 80) return 'A';
    if (v >= 70) return 'B';
    if (v >= 60) return 'C';
    if (v >= 50) return 'D';
    return 'F';
  };

  return (
    <View style={s.skillRow}>
      <Text style={s.skillLabel}>{label}</Text>
      <View style={s.skillBarContainer}>
        {hasData && (
          <Animated.View style={[s.skillBarFill, fillStyle]} />
        )}
      </View>
      <View style={[s.skillGrade, hasData ? { backgroundColor: color + '20' } : { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
        <Text style={[s.skillGradeText, { color: hasData ? color : D_COLORS.textMuted }]}>
          {hasData ? getGrade(displayValue) : '\u2014'}
        </Text>
      </View>
      <Text style={s.skillValue}>{hasData ? displayValue : '\u2014'}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, tappable, onTap }: { icon: string; label: string; value: string; tappable?: boolean; onTap?: () => void }) {
  const isPlaceholder = value === 'Not provided' || value === 'None';
  const content = (
    <View style={s.infoRowContainer}>
      <Ionicons name={icon as any} size={20} color={D_COLORS.textMuted} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, isPlaceholder && s.infoValueMuted, tappable && s.infoValueTappable]}>{value}</Text>
    </View>
  );

  if (tappable && onTap) {
    return <TouchableOpacity onPress={onTap}>{content}</TouchableOpacity>;
  }
  return content;
}

const s = StyleSheet.create({
  // Modal container
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  card: { width: SCREEN_WIDTH - 32, maxHeight: SCREEN_HEIGHT - 100, backgroundColor: D_COLORS.pageBg, borderRadius: 16, overflow: 'hidden' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 4 },
  emergencyBtn: { position: 'absolute', top: 16, left: 16, zIndex: 100, backgroundColor: BRAND.error, borderRadius: 20, padding: 6, opacity: 0.85 },

  // Header
  header: { paddingTop: 50, paddingBottom: 24, alignItems: 'center' },
  overallBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: D_COLORS.gold, borderRadius: 10, padding: 8, alignItems: 'center' },
  overallLabel: { fontSize: 10, fontFamily: FONTS.bodyBold, color: D_COLORS.navyDeep },
  overallNumber: { fontSize: 28, fontFamily: FONTS.bodyExtraBold, color: D_COLORS.navyDeep },

  photoWrapper: { position: 'relative' },
  photo: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  silhouette: { width: 140, height: 140, borderRadius: 70, backgroundColor: BRAND.surfaceCard, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' as const },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: D_COLORS.skyBlue, borderRadius: 16, padding: 6 },

  jerseyNumber: { fontSize: 20, fontFamily: FONTS.bodyBold, color: BRAND.textSecondary, marginTop: 12 },
  playerName: { fontSize: 28, fontFamily: FONTS.bodyExtraBold, color: BRAND.white, marginTop: 4, textTransform: 'uppercase' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 12 },
  positionPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  positionPillText: { fontSize: 12, fontFamily: FONTS.bodyBold, color: BRAND.white },
  teamName: { fontSize: 14, fontFamily: FONTS.bodyMedium, color: BRAND.textSecondary },

  quickInfo: { flexDirection: 'row', gap: 20, marginTop: 16 },
  quickInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickInfoText: { fontSize: 12, fontFamily: FONTS.bodyMedium, color: BRAND.textSecondary },

  // Badges
  badgesSection: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bodyBold, color: D_COLORS.textPrimary },
  addBadgeBtn: { padding: 4 },
  noBadges: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, fontStyle: 'italic' },
  badgesList: { flexDirection: 'row' },
  badge: { alignItems: 'center', marginRight: 16 },
  badgeIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  badgeName: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, textAlign: 'center', maxWidth: 60 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: D_COLORS.skyBlue },
  tabText: { fontSize: 13, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted },
  tabTextActive: { color: D_COLORS.skyBlue, fontFamily: FONTS.bodySemiBold },

  // Tab content
  tabContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  skillsList: {},
  infoList: {},

  // StatBox
  statBox: { width: '23%', backgroundColor: BRAND.white, borderRadius: 16, padding: 12, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  statValue: { fontSize: 24, fontFamily: FONTS.bodyBold },
  statLabel: { fontSize: 10, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, marginTop: 4, letterSpacing: 1 },

  // SkillBar
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  skillLabel: { width: 70, fontSize: 13, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted },
  skillBarContainer: { flex: 1, height: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  skillBarFill: { height: '100%', borderRadius: 4 },
  skillGrade: { width: 32, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  skillGradeText: { fontSize: 12, fontFamily: FONTS.bodyBold },
  skillValue: { width: 30, fontSize: 14, fontFamily: FONTS.bodyBold, color: D_COLORS.textPrimary, textAlign: 'right' },

  // InfoRow
  infoRowContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.bodyMedium, color: D_COLORS.textMuted, marginLeft: 12 },
  infoValue: { fontSize: 14, fontFamily: FONTS.bodySemiBold, color: D_COLORS.textPrimary, textAlign: 'right' },
  infoValueMuted: { color: D_COLORS.textMuted, fontFamily: FONTS.bodyMedium },
  infoValueTappable: { color: D_COLORS.skyBlue },

  // Profile button
  profileBtn: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: D_COLORS.skyBlue, borderRadius: 12, alignItems: 'center' },
  profileBtnText: { color: BRAND.white, fontSize: 14, fontFamily: FONTS.bodySemiBold },

  // Badge Award Modal
  badgeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  badgeModal: { width: SCREEN_WIDTH - 48, maxHeight: 400, borderRadius: 16, overflow: 'hidden', backgroundColor: BRAND.white },
  badgeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  badgeModalTitle: { fontSize: 18, fontFamily: FONTS.bodyBold, color: D_COLORS.textPrimary },
  badgeOptions: { padding: 8 },
  badgeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12 },
  badgeOptionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  badgeOptionName: { flex: 1, fontSize: 15, fontFamily: FONTS.bodyMedium, color: D_COLORS.textPrimary },
});
