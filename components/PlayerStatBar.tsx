import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type PlayerStatBarProps = {
  player: {
    id: string;
    first_name: string;
    last_name: string;
    photo_url?: string | null;
    jersey_number?: number | null;
    position?: string | null;
    grade?: number | null;
    team_name?: string | null;
    team_color?: string | null;
    // Future stat placeholders
    stat1?: number | string | null;
    stat2?: number | string | null;
    stat3?: number | string | null;
  };
  teamLogoUrl?: string | null;
  statLabels?: [string, string, string];
  onPress?: () => void;
  compact?: boolean;
};

const positionColors: Record<string, string> = {
  'OH': '#FF6B6B',
  'S': '#4ECDC4',
  'MB': '#45B7D1',
  'OPP': '#96CEB4',
  'L': '#FFEAA7',
  'DS': '#DDA0DD',
  'RS': '#FF9F43',
};

export default function PlayerStatBar({
  player,
  teamLogoUrl,
  statLabels = ['ST1', 'ST2', 'ST3'],
  onPress,
  compact = false,
}: PlayerStatBarProps) {
  const { colors } = useTheme();
  // Derive dark mode from background color
  const isDark = colors.background === '#000' || colors.background === '#000000' || colors.background?.startsWith('#0') || colors.background?.startsWith('#1');

  const teamColor = player.team_color || colors.primary;
  const positionColor = player.position ? positionColors[player.position] || teamColor : teamColor;
  const jerseyNumber = player.jersey_number;
  const hasPhoto = !!player.photo_url;

  const s = createStyles(colors, isDark, teamColor, compact);

  return (
    <TouchableOpacity
      style={s.container}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={isDark 
          ? [teamColor + '40', '#1C1C1E', '#0D0D0D'] 
          : [teamColor + '30', '#2C2C2E', '#1A1A1A']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.gradientBg}
      />

      {/* Team logo watermark */}
      {teamLogoUrl && (
        <View style={s.logoBgContainer}>
          <Image
            source={{ uri: teamLogoUrl }}
            style={s.logoBg}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Left accent bar */}
      <View style={[s.accentBar, { backgroundColor: teamColor }]} />

      {/* Photo section */}
      <View style={s.photoSection}>
        <View style={[s.photoBorder, { borderColor: positionColor }]}>
          {hasPhoto ? (
            <Image
              source={{ uri: player.photo_url! }}
              style={s.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={s.photoPlaceholder}>
              <Ionicons name="person" size={compact ? 24 : 28} color="#555" />
            </View>
          )}
        </View>
      </View>

      {/* Name section */}
      <View style={s.nameSection}>
        <Text style={s.firstName} numberOfLines={1}>{player.first_name}</Text>
        <Text style={s.lastName} numberOfLines={1}>{player.last_name}</Text>
      </View>

      {/* Arrow */}
      <Ionicons 
        name="chevron-forward" 
        size={14} 
        color={teamColor} 
        style={s.arrow} 
      />

      {/* Stats row */}
      <View style={s.statsRow}>
        {/* Jersey Number */}
        <StatBox 
          label="JRS" 
          value={jerseyNumber} 
          highlight={!!jerseyNumber}
          accentColor={teamColor}
          compact={compact}
        />

        {/* Position */}
        <StatBox 
          label="POS" 
          value={player.position} 
          highlight={!!player.position}
          accentColor={positionColor}
          compact={compact}
        />

        {/* Grade */}
        <StatBox 
          label="GRD" 
          value={player.grade} 
          highlight={!!player.grade}
          accentColor={teamColor}
          compact={compact}
        />

        {/* Divider */}
        <View style={s.statDivider} />

        {/* Future Stats - dimmed placeholders */}
        <StatBox 
          label={statLabels[0]} 
          value={player.stat1} 
          dimmed 
          compact={compact}
        />
        <StatBox 
          label={statLabels[1]} 
          value={player.stat2} 
          dimmed 
          compact={compact}
        />
        <StatBox 
          label={statLabels[2]} 
          value={player.stat3} 
          dimmed 
          compact={compact}
        />
      </View>

      {/* Bottom accent line */}
      <View style={[s.bottomAccent, { backgroundColor: teamColor }]} />
    </TouchableOpacity>
  );
}

// Stat box sub-component
function StatBox({ 
  label, 
  value, 
  highlight = false,
  dimmed = false,
  accentColor = '#F3C623',
  compact = false,
}: { 
  label: string; 
  value?: string | number | null;
  highlight?: boolean;
  dimmed?: boolean;
  accentColor?: string;
  compact?: boolean;
}) {
  const displayValue = value ?? '--';
  const hasValue = value !== null && value !== undefined;
  
  return (
    <View style={[statStyles.box, compact && statStyles.boxCompact]}>
      <View style={[
        statStyles.valueContainer,
        compact && statStyles.valueContainerCompact,
        highlight && hasValue && { borderColor: accentColor + '50', borderWidth: 1 },
      ]}>
        <Text style={[
          statStyles.value,
          compact && statStyles.valueCompact,
          dimmed && statStyles.dimmedValue,
        ]}>
          {displayValue}
        </Text>
      </View>
      <Text style={[statStyles.label, compact && statStyles.labelCompact]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  boxCompact: {
    marginHorizontal: 2,
  },
  valueContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 38,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  valueContainerCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 32,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  valueCompact: {
    fontSize: 13,
  },
  dimmedValue: {
    color: '#4A4A4A',
  },
  label: {
    fontSize: 8,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 7,
    marginTop: 2,
  },
});

const createStyles = (colors: any, isDark: boolean, teamColor: string, compact: boolean) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 12,
      marginVertical: 5,
      borderRadius: 12,
      overflow: 'hidden',
      position: 'relative',
      minHeight: compact ? 70 : 80,
      flexDirection: 'row',
      alignItems: 'center',
    },
    gradientBg: {
      ...StyleSheet.absoluteFillObject,
    },
    logoBgContainer: {
      position: 'absolute',
      left: 16,
      top: '50%',
      transform: [{ translateY: -25 }],
      width: 50,
      height: 50,
      opacity: 0.1,
    },
    logoBg: {
      width: '100%',
      height: '100%',
    },
    accentBar: {
      width: 4,
      alignSelf: 'stretch',
    },
    photoSection: {
      marginLeft: 10,
      marginRight: 8,
    },
    photoBorder: {
      width: compact ? 48 : 54,
      height: compact ? 48 : 54,
      borderRadius: 8,
      borderWidth: 2,
      overflow: 'hidden',
      backgroundColor: '#2C2C2E',
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    photoPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1E' : '#2A2A2A',
    },
    nameSection: {
      flex: 1,
      paddingRight: 4,
      minWidth: 70,
      maxWidth: 100,
    },
    firstName: {
      fontSize: compact ? 11 : 12,
      color: '#EBEBF5',
      fontWeight: '400',
    },
    lastName: {
      fontSize: compact ? 14 : 15,
      color: '#FFFFFF',
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    arrow: {
      marginRight: 6,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: 'rgba(255,255,255,0.15)',
      marginHorizontal: 4,
    },
    bottomAccent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2,
    },
  });
