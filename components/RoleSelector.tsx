import { displayTextStyle, radii, shadows } from '@/lib/design-tokens';
import { usePermissions } from '@/lib/permissions-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RoleOption = {
  key: string;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const roleOptions: RoleOption[] = [
  { key: 'league_admin', label: 'Admin', shortLabel: 'Admin', icon: 'shield', color: '#2C5F7C' },
  { key: 'head_coach', label: 'Head Coach', shortLabel: 'Coach', icon: 'clipboard', color: '#14B8A6' },
  { key: 'assistant_coach', label: 'Asst Coach', shortLabel: 'Asst', icon: 'people', color: '#0EA5E9' },
  { key: 'parent', label: 'Parent', shortLabel: 'Parent', icon: 'heart', color: '#E8913A' },
  { key: 'player', label: 'Player', shortLabel: 'Player', icon: 'basketball', color: '#AF52DE' },
];

export default function RoleSelector() {
  const { actualRoles, devViewAs, setDevViewAs } = usePermissions();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);

  // Only show if user has multiple roles
  if (actualRoles.length <= 1) {
    return null;
  }

  // Get available roles for this user
  const availableRoles = roleOptions.filter(r => actualRoles.includes(r.key as any));

  // Determine current effective role
  const getCurrentRole = (): RoleOption => {
    if (devViewAs) {
      return roleOptions.find(r => r.key === devViewAs) || availableRoles[0];
    }
    const priorityOrder = ['league_admin', 'head_coach', 'assistant_coach', 'parent', 'player'];
    for (const role of priorityOrder) {
      if (actualRoles.includes(role as any)) {
        return roleOptions.find(r => r.key === role) || availableRoles[0];
      }
    }
    return availableRoles[0];
  };

  const currentRole = getCurrentRole();

  const handleSelectRole = (roleKey: string) => {
    setDevViewAs(roleKey as any);
    setShowPicker(false);
    router.replace('/(tabs)/' as any);
  };

  return (
    <>
      <TouchableOpacity style={s.pill} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
        <Ionicons name={currentRole.icon} size={12} color="#FFF" />
        <Text style={s.pillText}>{currentRole.shortLabel}</Text>
        <Ionicons name="chevron-down" size={10} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="slide" transparent>
        <TouchableOpacity
          style={s.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Switch View</Text>

            <View style={s.roleList}>
              {availableRoles.map(role => {
                const isActive = currentRole.key === role.key;
                return (
                  <TouchableOpacity
                    key={role.key}
                    style={[s.roleCard, isActive && s.roleCardActive]}
                    onPress={() => handleSelectRole(role.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.roleIcon, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : role.color + '15' }]}>
                      <Ionicons name={role.icon} size={20} color={isActive ? '#FFF' : role.color} />
                    </View>
                    <Text style={[s.roleLabel, isActive && s.roleLabelActive]}>
                      {role.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // Pill (closed state) — designed for steel blue header
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },

  // Bottom sheet overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    ...displayTextStyle,
    fontSize: 18,
    color: '#1B2838',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Role cards
  roleList: {
    gap: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: radii.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.card,
  },
  roleCardActive: {
    backgroundColor: '#2C5F7C',
    borderColor: '#2C5F7C',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1B2838',
  },
  roleLabelActive: {
    color: '#FFF',
  },
});
