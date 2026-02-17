import { useSport } from '@/lib/sport';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Role = 'admin' | 'coach' | 'parent';

type Props = {
  currentRole: Role;
  availableRoles: Role[];
  onRoleChange: (role: Role) => void;
};

const roleConfig = {
  admin: { icon: 'settings', label: 'Admin' },
  coach: { icon: 'clipboard', label: 'Coach' },
  parent: { icon: 'people', label: 'Parent' },
};

export default function RoleSelector({ currentRole, availableRoles, onRoleChange }: Props) {
  const { colors } = useTheme();
  const { sportColors } = useSport();

  if (availableRoles.length <= 1) return null;

  return (
    <View style={styles.container}>
      {availableRoles.map(role => {
        const config = roleConfig[role];
        const isActive = role === currentRole;
        
        return (
          <TouchableOpacity
            key={role}
            style={[
              styles.roleTab,
              { 
                backgroundColor: isActive ? sportColors.primary : colors.card,
                borderColor: isActive ? sportColors.primary : colors.border,
              }
            ]}
            onPress={() => onRoleChange(role)}
          >
            <Ionicons 
              name={config.icon as any} 
              size={16} 
              color={isActive ? colors.background : colors.textMuted} 
            />
            <Text style={[
              styles.roleLabel,
              { color: isActive ? colors.background : colors.textMuted }
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
    borderWidth: 1,
    gap: 4,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});