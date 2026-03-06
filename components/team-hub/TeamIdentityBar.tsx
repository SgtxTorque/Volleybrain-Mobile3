/**
 * TeamIdentityBar — logo + team name + record, overlapping the bottom of the hero banner.
 */
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

export type TeamIdentityBarProps = {
  teamName: string;
  logoUrl: string | null;
  teamColor: string | null;
  record: string | null; // "8-2 · W3 · #2 Seed"
  canEdit: boolean;
  onEditLogo?: () => void;
};

export default function TeamIdentityBar({
  teamName,
  logoUrl,
  teamColor,
  record,
  canEdit,
  onEditLogo,
}: TeamIdentityBarProps) {
  const color = teamColor || BRAND.teal;

  return (
    <View style={s.container}>
      {/* Logo circle — overlaps the banner above */}
      <View style={s.logoWrap}>
        <View style={[s.logoBorder, { borderColor: color }]}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={s.logoImage} />
          ) : (
            <View style={[s.logoFallback, { backgroundColor: color }]}>
              <Text style={s.logoInitial}>{teamName?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>
        {canEdit && (
          <TouchableOpacity style={s.editLogoBtn} onPress={onEditLogo} activeOpacity={0.7}>
            <Ionicons name="camera" size={12} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Team name + record */}
      <View style={s.infoWrap}>
        <Text style={s.teamName} numberOfLines={1}>{teamName}</Text>
        {record ? <Text style={s.record}>{record}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -28,
    marginBottom: 8,
    gap: 14,
  },
  logoWrap: {
    position: 'relative',
  },
  logoBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: BRAND.offWhite,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInitial: {
    fontFamily: FONTS.display,
    fontSize: 24,
    color: '#FFF',
  },
  editLogoBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  infoWrap: {
    flex: 1,
  },
  teamName: {
    fontFamily: FONTS.display,
    fontSize: 22,
    color: BRAND.textPrimary,
    letterSpacing: 0.3,
  },
  record: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 13,
    color: BRAND.textMuted,
    marginTop: 1,
  },
});
