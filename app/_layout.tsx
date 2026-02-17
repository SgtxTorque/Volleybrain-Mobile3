import { AuthProvider, useAuth } from '@/lib/auth';
import { PermissionsProvider } from '@/lib/permissions-context';
import { SeasonProvider } from '@/lib/season';
import { SportProvider } from '@/lib/sport';
import { ThemeProvider } from '@/lib/theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

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

  if (loading) {
    return null;
  }

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SportProvider>
          <SeasonProvider>
            <PermissionsProvider>
              <RootLayoutNav />
            </PermissionsProvider>
          </SeasonProvider>
        </SportProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}