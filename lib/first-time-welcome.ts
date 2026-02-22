import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

const WELCOME_KEY_PREFIX = 'first_time_welcome_shown_';

/**
 * Shows a one-time welcome Alert for first-time parents and coaches.
 * Tracks dismissal in AsyncStorage so it only fires once per role.
 */
export function useFirstTimeWelcome(role: string | null | undefined) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!role || shownRef.current) return;

    const check = async () => {
      const key = WELCOME_KEY_PREFIX + role;
      const shown = await AsyncStorage.getItem(key);
      if (shown) return;

      shownRef.current = true;
      await AsyncStorage.setItem(key, 'true');

      const messages: Record<string, { title: string; body: string }> = {
        parent: {
          title: 'Welcome to VolleyBrain!',
          body: "You're all set! Check the Home tab for your child's schedule, stats, and team updates.",
        },
        coach: {
          title: 'Welcome, Coach!',
          body: 'Your dashboard is ready. Head to Game Day for live stats, or Manage to set up your roster.',
        },
      };

      const msg = messages[role];
      if (msg) {
        // Small delay so the tab screen finishes rendering
        setTimeout(() => {
          Alert.alert(msg.title, msg.body, [{ text: 'Got it!' }]);
        }, 800);
      }
    };

    check();
  }, [role]);
}
