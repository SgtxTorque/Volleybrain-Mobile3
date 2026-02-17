import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RoleOption = {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
};

const roleOptions: RoleOption[] = [
  { key: 'league_admin', label: 'League Admin', shortLabel: 'Admin', icon: 'shield', color: '#FF9500' },
  { key: 'head_coach', label: 'Head Coach', shortLabel: 'Coach', icon: 'clipboard', color: '#007AFF' },
  { key: 'assistant_coach', label: 'Assistant Coach', shortLabel: 'Asst', icon: 'people', color: '#5AC8FA' },
  { key: 'parent', label: 'Parent', shortLabel: 'Parent', icon: 'heart', color: '#34C759' },
  { key: 'player', label: 'Player', shortLabel: 'Player', icon: 'basketball', color: '#AF52DE' },
];

export default function RoleSelector() {
  const { colors } = useTheme();
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
    // Default: highest privilege role (first in actualRoles based on priority)
    const priorityOrder = ['league_admin', 'head_coach', 'assistant_coach', 'parent', 'player'];
    for (const role of priorityOrder) {
      if (actualRoles.includes(role as any)) {
        return roleOptions.find(r => r.key === role) || availableRoles[0];
      }
    }
    return availableRoles[0];
  };

  const currentRole = getCurrentRole();

  const handleSelectRole = (roleKey: string | null) => {
    setDevViewAs(roleKey as any);
    setShowPicker(false);
    // Reset to dashboard on role switch (matches web behavior)
    setTimeout(() => router.replace('/(tabs)' as any), 100);
  };

  const s = createStyles(colors, currentRole.color);

  return (
    <>
      <TouchableOpacity style={s.selector} onPress={() => setShowPicker(true)}>
        <Ionicons name={currentRole.icon as any} size={14} color={currentRole.color} />
        <Text style={s.selectorText}>{currentRole.shortLabel}</Text>
        <Ionicons name="chevron-down" size={12} color={currentRole.color} />
      </TouchableOpacity>

      <Modal visible={showPicker} animationType="fade" transparent>
        <TouchableOpacity 
          style={s.overlay} 
          activeOpacity={1} 
          onPress={() => setShowPicker(false)}
        >
          <View style={s.modal}>
            <Text style={s.modalTitle}>Switch View</Text>
            <Text style={s.modalSubtitle}>You have multiple roles</Text>

            {availableRoles.map(role => {
              const isActive = currentRole.key === role.key;
              return (
                <TouchableOpacity
                  key={role.key}
                  style={[s.roleOption, isActive && s.roleOptionActive]}
                  onPress={() => handleSelectRole(role.key)}
                >
                  <View style={[s.roleIcon, { backgroundColor: role.color + '20' }]}>
                    <Ionicons name={role.icon as any} size={20} color={role.color} />
                  </View>
                  <View style={s.roleInfo}>
                    <Text style={[s.roleLabel, isActive && { color: role.color }]}>
                      {role.label}
                    </Text>
                    <Text style={s.roleDesc}>
                      {role.key === 'league_admin' && 'Manage league, teams, players'}
                      {role.key === 'head_coach' && 'Manage your teams & rosters'}
                      {role.key === 'assistant_coach' && 'View team info & help coach'}
                      {role.key === 'parent' && 'View your children & schedule'}
                      {role.key === 'player' && 'View your team & schedule'}
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={22} color={role.color} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowPicker(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const createStyles = (colors: any, activeColor: string) => StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: activeColor + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: activeColor + '40',
  },
  selectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: activeColor,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },

  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  roleOptionActive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  roleDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },

  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
