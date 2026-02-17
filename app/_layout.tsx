import AppBackground from '@/components/AppBackground';
import { AuthProvider, useAuth } from '@/lib/auth';
import { BackgroundProvider } from '@/lib/background';
import { PermissionsProvider } from '@/lib/permissions-context';
import { SeasonProvider } from '@/lib/season';
import { SportProvider } from '@/lib/sport';
import { ThemeProvider } from '@/lib/theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef } from 'react';
import { useColorScheme, View } from 'react-native';

function RootLayoutNav() {
  const { session, loading, profile, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading) {
      hasNavigated.current = false;
      return;
    }
    if (hasNavigated.current) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!session && !inAuthGroup) {
      hasNavigated.current = true;
      router.replace('/(auth)/welcome');
    } else if (session && inAuthGroup) {
      if (profile?.pending_approval) {
        hasNavigated.current = true;
        router.replace('/(auth)/pending-approval');
      } else if (needsOnboarding) {
        hasNavigated.current = true;
        router.replace('/(auth)/league-setup');
      } else {
        hasNavigated.current = true;
        router.replace('/(tabs)');
      }
    } else if (session && !inAuthGroup && profile?.pending_approval) {
      hasNavigated.current = true;
      router.replace('/(auth)/pending-approval');
    } else if (session && !inAuthGroup && needsOnboarding) {
      hasNavigated.current = true;
      router.replace('/(auth)/league-setup');
    }
  }, [session, loading, profile?.pending_approval, needsOnboarding]);

  useEffect(() => {
    hasNavigated.current = false;
  }, [segments]);

  // Handle notification tap (app opened from notification)
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const type = data?.type as string;

      switch (type) {
        case 'chat':
          router.push(data.channelId ? `/chat/${data.channelId}` : '/(tabs)/chats');
          break;
        case 'schedule':
          router.push('/(tabs)/schedule');
          break;
        case 'payment':
          router.push('/(tabs)/payments');
          break;
        case 'blast':
          router.push('/(tabs)/messages');
          break;
        case 'registration':
          router.push('/registration-hub');
          break;
        case 'game':
          router.push('/game-prep');
          break;
        default:
          router.push('/(tabs)');
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  if (loading) {
    return null;
  }

  // Override Nav themes to use transparent backgrounds so AppBackground shows through
  const navTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: 'transparent', card: 'transparent' },
    };
  }, [colorScheme]);

  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1 }}>
        <AppBackground />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BackgroundProvider>
          <SportProvider>
            <SeasonProvider>
              <PermissionsProvider>
                <RootLayoutNav />
              </PermissionsProvider>
            </SeasonProvider>
          </SportProvider>
        </BackgroundProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}