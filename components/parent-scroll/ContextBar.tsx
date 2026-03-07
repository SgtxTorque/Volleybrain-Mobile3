/**
 * ContextBar — thin bar showing the currently selected child + sport context.
 * Only renders when a context is selected AND the family is multi-child or multi-sport.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';
import { SPACING } from '@/theme/spacing';
import type { FamilyChild, SelectedContext } from '@/hooks/useParentHomeData';

type Props = {
  context: SelectedContext;
  allChildren: FamilyChild[];
  isMulti: boolean;
  onSwitch: () => void;
  onClear: () => void;
};

export default function ContextBar({ context, allChildren, isMulti, onSwitch, onClear }: Props) {
  if (!context || !isMulti) return null;

  const child = allChildren.find(c => c.playerId === context.childId);
  if (!child) return null;

  const team = child.teams.find(t => t.teamId === context.teamId);
  if (!team) return null;

  return (
    <View style={styles.bar}>
      {/* Child avatar */}
      {child.photoUrl ? (
        <Image source={{ uri: child.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarFallback, { backgroundColor: team.sportColor }]}>
          <Text style={styles.avatarFallbackText}>{child.firstName[0]}</Text>
        </View>
      )}

      {/* Context label */}
      <Text style={styles.label} numberOfLines={1}>
        {child.firstName} {'\u00B7'} {team.sportIcon} {team.teamName}
      </Text>

      {/* Clear context */}
      <TouchableOpacity style={styles.clearBtn} activeOpacity={0.7} onPress={onClear}>
        <Ionicons name="close-circle" size={18} color={BRAND.textFaint} />
      </TouchableOpacity>

      {/* Switch button */}
      <TouchableOpacity style={styles.switchBtn} activeOpacity={0.7} onPress={onSwitch}>
        <Text style={styles.switchText}>Switch</Text>
        <Ionicons name="chevron-forward" size={12} color={BRAND.skyBlue} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.pagePadding,
    marginBottom: SPACING.cardGap,
    backgroundColor: BRAND.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
    gap: 8,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: BRAND.white,
  },
  label: {
    flex: 1,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textPrimary,
  },
  clearBtn: {
    padding: 2,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: BRAND.border,
  },
  switchText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: BRAND.skyBlue,
  },
});
