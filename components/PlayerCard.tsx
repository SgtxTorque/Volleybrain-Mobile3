import { getPlayerPlaceholder } from '@/lib/default-images';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { getSportDisplay, getPositionInfo } from '@/constants/sport-display';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import EmergencyContactModal from './EmergencyContactModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PlayerCardProps = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    jersey_number?: number | null;
    position?: string | null;
    sport_name?: string | null;
    photo_url?: string | null;
    grade?: number | null;
    team_name?: string | null;
    team_color?: string | null;
    medical_conditions?: string | null;
    allergies?: string | null;
    medications?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relation?: string | null;
    kills?: number | null;
    digs?: number | null;
    aces?: number | null;
    blocks?: number | null;
    assists?: number | null;
    points?: number | null;
    rebounds?: number | null;
    [key: string]: any;
  };
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  teamLogoUrl?: string | null;
};

export default function PlayerCard({ player, onPress, size = 'medium', teamLogoUrl }: PlayerCardProps) {
  const { colors } = useTheme();
  const { isCoach, isAdmin } = usePermissions();
  // Derive dark mode from background color
  const isDark = colors.background === '#000' || colors.background === '#000000' || colors.background?.startsWith('#0') || colors.background?.startsWith('#1');
  const s = createStyles(colors, isDark, size);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  const posInfo = getPositionInfo(player.position, player.sport_name);
  const positionColor = posInfo?.color || colors.primary;
  const teamColor = player.team_color || (isDark ? '#1a1a2e' : '#2a2a4a');
  const jerseyNumber = player.jersey_number;
  const hasPhoto = player.photo_url && player.photo_url.length > 0;
  const hasMedicalAlert = !!(player.medical_conditions || player.allergies);

  // Format name as "First L."
  const displayName = `${player.first_name} ${player.last_name.charAt(0)}.`;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[teamColor, isDark ? '#0a0a12' : '#1a1a2e']}
        style={s.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Team Logo Watermark (if provided) */}
      {teamLogoUrl && (
        <View style={s.logoWatermark}>
          <Image 
            source={{ uri: teamLogoUrl }} 
            style={s.logoImage}
            resizeMode="contain"
          />
        </View>
      )}
      
      {/* Position Badge - Top Left */}
      {player.position && (
        <View style={[s.positionBadge, { backgroundColor: positionColor }]}>
          <Text style={s.positionText}>{player.position}</Text>
        </View>
      )}
      
      {/* Jersey Number - Top Right */}
      {jerseyNumber && (
        <View style={s.numberContainer}>
          <Text style={[s.numberText, { color: teamColor === '#1a1a2e' ? colors.primary : teamColor }]}>
            {jerseyNumber}
          </Text>
        </View>
      )}
      
      {/* Player Photo or Silhouette */}
      <View style={s.photoContainer}>
        {hasPhoto ? (
          <View style={s.photoWrapper}>
            <Image source={{ uri: player.photo_url! }} style={s.photo} />
            {/* Photo border glow */}
            <View style={[s.photoBorderGlow, { borderColor: positionColor + '60' }]} />
          </View>
        ) : (
          <View style={s.silhouette}>
            <Image source={getPlayerPlaceholder()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} resizeMode="cover" />
            {/* Jersey number badge on silhouette if no position shown */}
            {!player.position && jerseyNumber && (
              <View style={[s.silhouetteNumber, { backgroundColor: colors.primary }]}>
                <Text style={s.silhouetteNumberText}>{jerseyNumber}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      
      {/* Name Bar - Bottom */}
      <View style={s.nameBar}>
        <Text style={s.playerName} numberOfLines={1}>
          {displayName}
        </Text>
        {player.grade && (
          <Text style={s.gradeText}>Gr {player.grade}</Text>
        )}
      </View>
      
      {/* Medical Alert Indicator */}
      {hasMedicalAlert && (
        <View style={s.medicalAlert}>
          <Ionicons name="alert-circle" size={size === 'small' ? 14 : 16} color="#FF6B6B" />
        </View>
      )}

      {/* Emergency Contact Button (coaches/admins only) */}
      {(isCoach || isAdmin) && (
        <TouchableOpacity
          style={s.emergencyBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            setShowEmergencyModal(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="call" size={size === 'small' ? 12 : 14} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Team color accent line at bottom */}
      <View style={[s.accentLine, { backgroundColor: positionColor }]} />

      {/* Emergency Contact Modal */}
      <EmergencyContactModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        player={player}
      />
    </TouchableOpacity>
  );
}

const createStyles = (colors: any, isDark: boolean, size: 'small' | 'medium' | 'large') => {
  const dimensions = {
    small: { width: 105, height: 145, photoSize: 60 },
    medium: { width: (SCREEN_WIDTH - 48) / 3, height: 170, photoSize: 72 },
    large: { width: 180, height: 230, photoSize: 100 },
  }[size];

  return StyleSheet.create({
    card: {
      width: dimensions.width,
      height: dimensions.height,
      borderRadius: 14,
      overflow: 'hidden',
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    logoWatermark: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      opacity: 0.2,
      zIndex: 1,
    },
    logoImage: {
      width: '100%',
      height: '100%',
    },
    positionBadge: {
      position: 'absolute',
      top: size === 'small' ? 6 : 8,
      left: size === 'small' ? 6 : 8,
      paddingHorizontal: size === 'small' ? 5 : 7,
      paddingVertical: size === 'small' ? 2 : 3,
      borderRadius: 4,
      zIndex: 10,
    },
    positionText: {
      fontSize: size === 'small' ? 9 : 10,
      fontWeight: '800',
      color: '#000',
      letterSpacing: 0.5,
    },
    numberContainer: {
      position: 'absolute',
      top: size === 'small' ? 4 : 6,
      right: size === 'small' ? 6 : 8,
      zIndex: 10,
    },
    numberText: {
      fontSize: size === 'small' ? 22 : size === 'medium' ? 28 : 34,
      fontWeight: '900',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 4,
    },
    photoContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: size === 'small' ? 28 : 32,
    },
    photoWrapper: {
      position: 'relative',
    },
    photo: {
      width: dimensions.photoSize,
      height: dimensions.photoSize,
      borderRadius: dimensions.photoSize / 2,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    photoBorderGlow: {
      position: 'absolute',
      top: -3,
      left: -3,
      right: -3,
      bottom: -3,
      borderRadius: (dimensions.photoSize + 6) / 2,
      borderWidth: 2,
    },
    silhouette: {
      width: dimensions.photoSize,
      height: dimensions.photoSize,
      borderRadius: dimensions.photoSize / 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
      overflow: 'hidden' as const,
    },
    silhouetteNumber: {
      position: 'absolute',
      bottom: -4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    silhouetteNumberText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#000',
    },
    nameBar: {
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingVertical: size === 'small' ? 6 : 8,
      paddingHorizontal: size === 'small' ? 6 : 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    playerName: {
      fontSize: size === 'small' ? 11 : 13,
      fontWeight: '700',
      color: '#fff',
      flex: 1,
    },
    gradeText: {
      fontSize: size === 'small' ? 9 : 10,
      color: 'rgba(255,255,255,0.6)',
      marginLeft: 4,
    },
    accentLine: {
      height: 3,
      width: '100%',
    },
    medicalAlert: {
      position: 'absolute',
      bottom: size === 'small' ? 36 : 42,
      left: size === 'small' ? 6 : 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 10,
      padding: 2,
      zIndex: 10,
    },
    emergencyBtn: {
      position: 'absolute',
      bottom: size === 'small' ? 36 : 42,
      right: size === 'small' ? 6 : 8,
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 10,
      padding: size === 'small' ? 3 : 4,
      zIndex: 10,
    },
  });
};
