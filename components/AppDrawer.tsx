import { useAuth } from '@/lib/auth';
import { usePermissions } from '@/lib/permissions-context';
import { useTheme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function AppDrawer({ visible, onClose }: AppDrawerProps) {
  const { colors } = useTheme();
  const { actualRoles, primaryRole, isAdmin, isCoach, isParent, isPlayer } = usePermissions();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const s = createStyles(colors);

  // Define menu sections based on role
  const getMenuSections = (): MenuSection[] => {
    const sections: MenuSection[] = [];

    // ADMIN section
    if (isAdmin) {
      sections.push({
        title: 'Manage',
        items: [
          { id: 'players', label: 'Players', icon: 'people', route: '/(tabs)/players' },
          { id: 'teams', label: 'Teams', icon: 'shirt', route: '/(tabs)/teams' },
          { id: 'jerseys', label: 'Jerseys', icon: 'shirt-outline', route: '/(tabs)/jersey-management' },
          { id: 'coaches', label: 'Coaches', icon: 'clipboard', route: '/(tabs)/coaches' },
          { id: 'payments', label: 'Payments', icon: 'card', route: '/(tabs)/payments' },
          { id: 'reports', label: 'Reports', icon: 'bar-chart', route: '/(tabs)/reports-tab' },
          { id: 'registration', label: 'Registration', icon: 'person-add', route: '/registration-hub' },
          { id: 'users', label: 'Users', icon: 'people-circle', route: '/users' },
          { id: 'coach-availability', label: 'Coach Availability', icon: 'calendar-outline', route: '/coach-availability' },
          { id: 'game-prep', label: 'Game Prep', icon: 'analytics', route: '/game-prep' },
          { id: 'lineup-builder', label: 'Lineup Builder', icon: 'grid', route: '/lineup-builder' },
          { id: 'attendance', label: 'Attendance', icon: 'checkmark-circle', route: '/attendance' },
          { id: 'blast-composer', label: 'Send Announcement', icon: 'megaphone', route: '/blast-composer' },
        ],
      });
    }

    // COACH section (non-admin coaches)
    if (isCoach && !isAdmin) {
      sections.push({
        title: 'My Teams',
        items: [
          { id: 'coach-profile', label: 'My Profile', icon: 'person-circle', route: '/coach-profile' },
          { id: 'roster', label: 'Roster', icon: 'people', route: '/(tabs)/players' },
          { id: 'my-teams', label: 'My Teams', icon: 'shirt', route: '/(tabs)/my-teams' },
          { id: 'schedule', label: 'Schedule', icon: 'calendar', route: '/(tabs)/schedule' },
          { id: 'availability', label: 'My Availability', icon: 'calendar-outline', route: '/coach-availability' },
          { id: 'game-prep', label: 'Game Prep', icon: 'analytics', route: '/game-prep' },
          { id: 'lineup-builder', label: 'Lineup Builder', icon: 'grid', route: '/lineup-builder' },
          { id: 'attendance', label: 'Attendance', icon: 'checkmark-circle', route: '/attendance' },
          { id: 'blast-composer', label: 'Send Announcement', icon: 'megaphone', route: '/blast-composer' },
        ],
      });
    }

    // PARENT section
    if (isParent) {
      sections.push({
        title: 'My Family',
        items: [
          { id: 'my-kids', label: 'My Kids', icon: 'people', route: '/my-kids' },
          { id: 'registration-hub', label: 'Registration Hub', icon: 'clipboard', route: '/parent-registration-hub' },
          { id: 'my-teams', label: 'My Teams', icon: 'shirt', route: '/(tabs)/my-teams' },
          { id: 'parent-schedule', label: 'Schedule', icon: 'calendar', route: '/(tabs)/schedule' },
          { id: 'family-payments', label: 'Payments', icon: 'wallet', route: '/family-payments' },
          { id: 'my-waivers', label: 'My Waivers', icon: 'document-text', route: '/my-waivers' },
          { id: 'invite-friends', label: 'Invite Friends', icon: 'share-social', route: '/invite-friends' },
          { id: 'data-rights', label: 'Data Rights', icon: 'lock-closed', route: '/data-rights' },
        ],
      });
    }

    // PLAYER section (player-only users)
    if (isPlayer && !isAdmin && !isCoach && !isParent) {
      sections.push({
        title: 'My Stuff',
        items: [
          { id: 'player-schedule', label: 'Schedule', icon: 'calendar', route: '/(tabs)/schedule' },
          { id: 'player-teams', label: 'My Teams', icon: 'shirt', route: '/(tabs)/my-teams' },
        ],
      });
    }

    // LEAGUE section (always visible — shared features)
    sections.push({
      title: 'League',
      items: [
        { id: 'team-wall', label: 'Team Wall', icon: 'people', route: '/(tabs)/connect' },
        { id: 'standings', label: 'Standings', icon: 'trophy', route: '/standings' },
        { id: 'achievements', label: 'Achievements', icon: 'ribbon', route: '/achievements' },
      ],
    });

    // PERSONALIZE section (always visible)
    sections.push({
      title: 'Personalize',
      items: [
        { id: 'notification-prefs', label: 'Notifications', icon: 'notifications-outline', route: '/notification-preferences' },
      ],
    });

    // SETTINGS section (always visible)
    sections.push({
      title: 'Settings',
      items: [
        { id: 'profile', label: 'My Profile', icon: 'person-circle', route: '/profile' },
        { id: 'settings', label: 'Settings', icon: 'settings', route: '/(tabs)/settings' },
        { id: 'season', label: 'Season Settings', icon: 'calendar', route: '/season-settings' },
        { id: 'archives', label: 'Season History', icon: 'archive', route: '/season-archives' },
        { id: 'org-directory', label: 'Find Organizations', icon: 'business', route: '/org-directory' },
        { id: 'help', label: 'Help & Support', icon: 'help-circle', route: '/help' },
        { id: 'data-rights-settings', label: 'Data Rights', icon: 'lock-closed', route: '/data-rights' },
        { id: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark', route: '/privacy-policy' },
        { id: 'terms', label: 'Terms of Service', icon: 'document', route: '/terms-of-service' },
      ],
    });

    return sections;
  };

  const handleMenuPress = (route: string) => {
    onClose();
    // Small delay to let drawer close animation start
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
  };

  const menuSections = getMenuSections();

  // Get user display info
  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  
  // Format role label
  const getRoleLabel = () => {
    const roleNames: Record<string, string> = {
      league_admin: 'Admin',
      head_coach: 'Head Coach',
      assistant_coach: 'Assistant Coach',
      parent: 'Parent',
      player: 'Player',
    };
    
    if (actualRoles.length > 1) {
      return actualRoles.map(r => roleNames[r] || r).join(' • ');
    }
    return roleNames[primaryRole || ''] || primaryRole || '';
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        {/* Backdrop */}
        <Pressable style={s.backdrop} onPress={onClose} />

        {/* Drawer */}
        <View style={s.drawer}>
          {/* Header with user info */}
          <View style={s.header}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{userInitial}</Text>
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{userName}</Text>
              <Text style={s.userRole}>{getRoleLabel()}</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Menu Sections */}
          <ScrollView style={s.menuContent} showsVerticalScrollIndicator={false}>
            {menuSections.map((section, sectionIndex) => (
              <View key={section.title} style={s.section}>
                <Text style={s.sectionTitle}>{section.title}</Text>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.menuItem}
                    onPress={() => handleMenuPress(item.route)}
                    activeOpacity={0.7}
                  >
                    <View style={s.menuItemIcon}>
                      <Ionicons name={item.icon as any} size={22} color={colors.text} />
                    </View>
                    <Text style={s.menuItemLabel}>{item.label}</Text>
                    {item.badge && item.badge > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Sign Out */}
            <View style={s.section}>
              <TouchableOpacity
                style={[s.menuItem, s.signOutItem]}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <View style={[s.menuItemIcon, { backgroundColor: colors.danger + '15' }]}>
                  <Ionicons name="log-out" size={22} color={colors.danger} />
                </View>
                <Text style={[s.menuItemLabel, { color: colors.danger }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* App Version */}
          <View style={s.footer}>
            <Text style={s.version}>VolleyBrain v1.0.0</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: colors.bgSecondary,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.glassCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  userRole: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  menuContent: {
    flex: 1,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.glassCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  signOutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  version: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
