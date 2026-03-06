import CoppaConsentModal from '@/components/CoppaConsentModal';
import GestureDrawer from '@/components/GestureDrawer';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DrawerProvider } from '@/lib/drawer-context';
import { ParentScrollProvider } from '@/lib/parent-scroll-context';
import { PermissionsProvider } from '@/lib/permissions-context';
import { SeasonProvider } from '@/lib/season';
import { SportProvider } from '@/lib/sport';
import { ThemeProvider, useTheme } from '@/lib/theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { lockPortrait, unlockOrientation } from '@/lib/orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading, profile, needsOnboarding, hasOrphanRecords } = useAuth();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
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
        router.replace('/(tabs)');
      } else if (hasOrphanRecords) {
        hasNavigated.current = true;
        router.replace('/claim-account' as any);
      } else {
        hasNavigated.current = true;
        router.replace('/(tabs)');
      }
    } else if (session && !inAuthGroup && profile?.pending_approval) {
      hasNavigated.current = true;
      router.replace('/(auth)/pending-approval');
    } else if (session && !inAuthGroup && needsOnboarding) {
      hasNavigated.current = true;
      router.replace('/(tabs)');
    }
  }, [session, loading, profile?.pending_approval, needsOnboarding, hasOrphanRecords]);

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
        case 'challenge_new':
        case 'challenge_joined':
        case 'challenge_progress':
        case 'challenge_completed':
        case 'challenge_winner':
        case 'challenge_verify':
          router.push(
            data.challengeId
              ? (`/challenge-cta?challengeId=${data.challengeId}` as any)
              : ('/challenges' as any),
          );
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

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
      },
    };
  }, [isDark, colors.background, colors.card]);

  return (
    <NavThemeProvider value={navTheme}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <GestureDrawer />
      </KeyboardAvoidingView>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <CoppaConsentModal />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Oswald-Bold': require('../assets/fonts/Oswald-Bold.ttf'),
    BebasNeue_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Orientation: unlock on tablets, lock portrait on phones
  useEffect(() => {
    const w = Dimensions.get('window').width;
    if (w >= 744) {
      unlockOrientation();
    } else {
      lockPortrait();
    }
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <SportProvider>
            <SeasonProvider>
              <PermissionsProvider>
                <ParentScrollProvider>
                  <DrawerProvider>
                    <RootLayoutNav />
                  </DrawerProvider>
                </ParentScrollProvider>
              </PermissionsProvider>
            </SeasonProvider>
          </SportProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
