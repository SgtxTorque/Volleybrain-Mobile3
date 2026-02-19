import { useTheme } from '@/lib/theme';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type CourtSlot = {
  position: number; // 1-6
  label: string; // OH, S, MB, OPP, L, etc.
  color: string;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    jersey_number: string | null;
    photo_url: string | null;
  } | null;
  isLibero: boolean;
};

type Props = {
  lineup: CourtSlot[];
  selectedPosition: number | null;
  onPositionTap: (position: number) => void;
  rotation: number; // 0-5
  compact?: boolean;
  onRotate?: () => void;
};

// ============================================================================
// LAYOUT CONSTANTS (from lineup-builder.tsx)
// ============================================================================

const FRONT_ROW_POSITIONS = [4, 3, 2]; // left to right
const BACK_ROW_POSITIONS = [5, 6, 1]; // left to right

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COURT_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);
const COURT_HEIGHT = COURT_WIDTH * 0.55;
const SLOT_SIZE = 52;

// ============================================================================
// COMPONENT
// ============================================================================

export default function VolleyballCourt({
  lineup,
  selectedPosition,
  onPositionTap,
  rotation,
  compact,
  onRotate,
}: Props) {
  const { colors } = useTheme();

  const getSlot = (pos: number): CourtSlot | undefined =>
    lineup.find(s => s.position === pos);

  const renderSlot = (pos: number, rowIdx: number, colIdx: number) => {
    const slot = getSlot(pos);
    const isSelected = selectedPosition === pos;
    const hasPlayer = !!slot?.player;
    const isLibero = slot?.isLibero ?? false;
    const hasPhoto = hasPlayer && !!slot!.player!.photo_url;

    return (
      <TouchableOpacity
        key={pos}
        style={[
          styles.slot,
          isSelected && styles.slotSelected,
          isLibero && styles.slotLibero,
          !hasPlayer && styles.slotEmpty,
        ]}
        onPress={() => onPositionTap(pos)}
        activeOpacity={0.7}
      >
        {hasPhoto ? (
          <>
            <Image source={{ uri: slot!.player!.photo_url! }} style={styles.slotPhoto} />
            {/* Jersey number overlay on photo */}
            <View style={styles.jerseyOverlay}>
              <Text style={styles.jerseyOverlayText}>
                {slot!.player!.jersey_number || '—'}
              </Text>
            </View>
          </>
        ) : (
          <Text style={[styles.slotJersey, isSelected && styles.slotJerseySelected]}>
            {hasPlayer ? (slot!.player!.jersey_number || '—') : pos}
          </Text>
        )}
        {hasPlayer && (
          <Text style={styles.slotName} numberOfLines={1}>
            {slot!.player!.last_name?.slice(0, 6)}
          </Text>
        )}
        <View style={[styles.posBadge, { backgroundColor: slot?.color ? slot.color + '30' : '#47556930' }]}>
          <Text style={[styles.posBadgeText, { color: slot?.color || '#64748B' }]}>
            {slot?.label || `P${pos}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Rotation Badge + Manual Rotate Button */}
      <View style={styles.rotationRow}>
        <View style={styles.rotationWrap}>
          <Text style={styles.rotationText}>R{rotation + 1}</Text>
        </View>
        {onRotate && (
          <TouchableOpacity onPress={onRotate} style={styles.rotateBtn} activeOpacity={0.7}>
            <Text style={styles.rotateBtnText}>ROTATE</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Court */}
      <View style={[styles.court, compact && styles.courtCompact]}>
        {/* Net line */}
        <View style={styles.netLine} />
        <Text style={styles.netLabel}>NET</Text>

        {/* Front row (attack) */}
        <View style={styles.row}>
          {FRONT_ROW_POSITIONS.map((pos, i) => renderSlot(pos, 0, i))}
        </View>

        {/* Back row (defense) */}
        <View style={styles.row}>
          {BACK_ROW_POSITIONS.map((pos, i) => renderSlot(pos, 1, i))}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  rotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  rotationWrap: {
    backgroundColor: '#F9731630',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F9731650',
  },
  rotationText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F97316',
    letterSpacing: 1,
  },
  rotateBtn: {
    backgroundColor: '#6366F120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F150',
  },
  rotateBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1,
  },
  court: {
    width: COURT_WIDTH,
    height: COURT_HEIGHT,
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
  },
  courtCompact: {
    height: COURT_WIDTH * 0.5,
  },
  netLine: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  netLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -8,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.25)',
    letterSpacing: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  slotSelected: {
    borderColor: '#F97316',
    backgroundColor: '#F9731615',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  slotLibero: {
    backgroundColor: '#EC489920',
    borderColor: '#EC489960',
  },
  slotEmpty: {
    borderStyle: 'dashed',
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  slotPhoto: {
    width: SLOT_SIZE - 4,
    height: SLOT_SIZE - 4,
    borderRadius: (SLOT_SIZE - 4) / 2,
  },
  jerseyOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0D1117E0',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  jerseyOverlayText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#F97316',
  },
  slotJersey: {
    fontSize: 18,
    fontWeight: '900',
    color: '#CBD5E1',
    textAlign: 'center',
  },
  slotJerseySelected: {
    color: '#F97316',
  },
  slotName: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
    position: 'absolute',
    bottom: -12,
    width: 60,
    textAlign: 'center',
  },
  posBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  posBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
