import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BRAND } from '@/theme/colors';
import { FONTS } from '@/theme/fonts';

type Role = 'admin' | 'coach' | 'parent';

type Props = {
  currentRole: Role;
  availableRoles: Role[];
  onRoleChange: (role: Role) => void;
};

const ROLE_COLORS: Record<Role, string> = {
  admin: BRAND.coral,
  coach: BRAND.teal,
  parent: BRAND.skyBlue,
};

const roleConfig = {
  admin: { icon: 'settings', label: 'Admin' },
  coach: { icon: 'clipboard', label: 'Coach' },
  parent: { icon: 'people', label: 'Parent' },
};

export default function RoleSelector({ currentRole, availableRoles, onRoleChange }: Props) {
  if (availableRoles.length <= 1) return null;

  return (
    <View style={styles.container}>
      {availableRoles.map(role => {
        const config = roleConfig[role];
        const isActive = role === currentRole;
        const roleColor = ROLE_COLORS[role];

        return (
          <TouchableOpacity
            key={role}
            style={[
              styles.roleTab,
              isActive
                ? { backgroundColor: roleColor, borderColor: roleColor }
                : { backgroundColor: 'transparent', borderColor: roleColor },
            ]}
            onPress={() => onRoleChange(role)}
          >
            <Ionicons
              name={config.icon as any}
              size={16}
              color={isActive ? '#FFFFFF' : roleColor}
            />
            <Text style={[
              styles.roleLabel,
              { color: isActive ? '#FFFFFF' : roleColor }
            ]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  roleLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
  },
});