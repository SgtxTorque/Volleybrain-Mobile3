import RoleSelector from '@/components/RoleSelector';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AppHeaderBarProps = {
  /** Show VOLLEYBRAIN logo (default true). Set false when using `title`. */
  showLogo?: boolean;
  /** Screen title shown instead of logo (e.g. "SCHEDULE", "TEAM WALL"). */
  title?: string;
  /** Custom left icon (e.g. back arrow). Replaces logo circle. */
  leftIcon?: React.ReactNode;
  /** Custom right side content. Replaces bell + avatar. */
  rightIcon?: React.ReactNode;
  /** Show notification bell (default true). */
  showNotificationBell?: boolean;
  /** Show avatar circle (default true). */
  showAvatar?: boolean;
  /** User initials for avatar circle. */
  initials?: string;
  /** Whether to show the red notification dot on the bell. */
  hasNotifications?: boolean;
  /** Called when bell is pressed. */
  onBellPress?: () => void;
  /** Called when avatar is pressed. */
  onAvatarPress?: () => void;
  /** Called when left icon / back arrow is pressed. */
  onLeftPress?: () => void;
};

export default function AppHeaderBar({
  showLogo = true,
  title,
  leftIcon,
  rightIcon,
  showNotificationBell = true,
  showAvatar = true,
  initials = '',
  hasNotifications = false,
  onBellPress,
  onAvatarPress,
  onLeftPress,
}: AppHeaderBarProps) {
  return (
    <View style={styles.bar}>
      {/* LEFT */}
      <View style={styles.left}>
        {leftIcon ? (
          <TouchableOpacity onPress={onLeftPress} activeOpacity={0.7}>
            {leftIcon}
          </TouchableOpacity>
        ) : showLogo ? (
          <>
            <View style={styles.logoCircle}>
              <Ionicons name="globe-outline" size={14} color="#FFF" />
            </View>
            <Text style={styles.logoText}>VOLLEYBRAIN</Text>
          </>
        ) : null}
        {title ? <Text style={styles.titleText}>{title}</Text> : null}
      </View>

      {/* RIGHT */}
      {rightIcon ? (
        <View style={styles.right}>{rightIcon}</View>
      ) : (
        <View style={styles.right}>
          {showNotificationBell && (
            <TouchableOpacity style={styles.bellWrap} onPress={onBellPress} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={18} color="#FFF" />
              {hasNotifications && <View style={styles.bellDot} />}
            </TouchableOpacity>
          )}
          <RoleSelector />
          {showAvatar && (
            <TouchableOpacity style={styles.avatar} onPress={onAvatarPress} activeOpacity={0.7}>
              <Text style={styles.avatarText}>{initials}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C5F7C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrap: {
    position: 'relative' as const,
  },
  bellDot: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D94F4F',
    borderWidth: 1.5,
    borderColor: '#2C5F7C',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
