import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { registerForPushNotificationsAsync, savePushToken } from './notifications';

// Keys that MUST be cleared on logout to prevent cross-user context leakage
const LOGOUT_CLEAR_KEYS = [
  'vb_admin_last_season_id',
  'vb_selected_team_id',
  'vb_player_last_child_id',
  'activeSportId',
  'lynx_daily_achievement_check',
];

// ============================================
// TYPES — aligned with web AuthContext.jsx
// ============================================

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  is_platform_admin?: boolean;
  current_organization_id?: string | null;
  onboarding_completed?: boolean;
  pending_approval?: boolean;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  [key: string]: any;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  settings?: any;
  is_active?: boolean;
  [key: string]: any;
};

type OrphanPlayer = {
  id: string;
  first_name: string;
  last_name: string;
  season_id: string;
  family_id: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  needsOnboarding: boolean;
  hasOrphanRecords: boolean;
  orphanPlayers: OrphanPlayer[];
  clearOrphanFlag: () => void;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// AUTH PROVIDER — mirrors web init() flow
// ============================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [hasOrphanRecords, setHasOrphanRecords] = useState(false);
  const [orphanPlayers, setOrphanPlayers] = useState<OrphanPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        init();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setIsAdmin(false);
        setIsPlatformAdmin(false);
        setNeedsOnboarding(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // -----------------------------------------------
  // init() — mirrors web AuthContext.jsx exactly
  // -----------------------------------------------
  async function init() {
    try {
      let { data: { session } } = await supabase.auth.getSession();

      // DEV BYPASS: auto-login when no session exists
      if (
        !session?.user &&
        __DEV__ &&
        process.env.EXPO_PUBLIC_DEV_SKIP_AUTH === 'true' &&
        process.env.EXPO_PUBLIC_DEV_USER_EMAIL &&
        process.env.EXPO_PUBLIC_DEV_USER_PASSWORD
      ) {
        console.log(`[DEV] Auth bypassed — logging in as ${process.env.EXPO_PUBLIC_DEV_USER_EMAIL}`);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: process.env.EXPO_PUBLIC_DEV_USER_EMAIL,
          password: process.env.EXPO_PUBLIC_DEV_USER_PASSWORD,
        });
        if (!error && data.session) {
          session = data.session;
        } else {
          console.warn('[DEV] Auto-login failed:', error?.message);
        }
      }

      if (!session?.user) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setIsAdmin(false);
        setIsPlatformAdmin(false);
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session.user);

      // Load profile — with retry on transient failure
      let prof: any = null;
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profData && profError) {
        // Query failed (network timeout, RLS issue, Supabase hiccup) — retry once
        console.warn('[Auth] Profile query failed, retrying in 1s:', profError.message);
        await new Promise(r => setTimeout(r, 1000));
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (retryData) {
          prof = retryData;
        } else {
          // Both attempts failed — bail gracefully, do NOT create/upsert anything
          console.error('[Auth] Profile query failed after retry:', retryError?.message);
          setLoading(false);
          return;
        }
      } else if (!profData && !profError) {
        // Profile genuinely doesn't exist — create with .insert() (NEVER upsert)
        const meta = session.user.user_metadata;
        const { data: newProf, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name: meta?.full_name || meta?.name || '',
            onboarding_completed: false,
          })
          .select()
          .single();

        if (insertError) {
          // Unique constraint = race condition — another process created it, re-fetch
          const { data: reFetched } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (reFetched) {
            prof = reFetched;
          } else {
            console.error('[Auth] Profile insert failed and re-fetch failed:', insertError.message);
            setLoading(false);
            return;
          }
        } else {
          setProfile(newProf);
          setIsPlatformAdmin(false);
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }
      } else {
        prof = profData;
      }

      setProfile(prof);
      setIsPlatformAdmin(!!prof?.is_platform_admin);

      // Check if user needs onboarding (same as web)
      if (!prof?.onboarding_completed) {
        setNeedsOnboarding(true);
        setLoading(false);
        return;
      }

      setNeedsOnboarding(false);

      // Load user roles (same query as web)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, organization_id')
        .eq('user_id', session.user.id)
        .eq('is_active', true);

      if (roles && roles.length > 0) {
        setIsAdmin(roles.some(r => r.role === 'league_admin' || r.role === 'admin'));

        // Load organization (same as web — uses first role's org)
        const orgId = roles[0].organization_id;
        if (orgId) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .maybeSingle();
          setOrganization(org);
        }
      } else {
        setIsAdmin(false);
        setOrganization(null);
      }

      // Register push token after profile is confirmed loaded
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && session.user.id) {
          await savePushToken(session.user.id, token);
        }
      } catch (pushErr) {
        console.error('Push token registration error:', pushErr);
      }

      // Check for orphan records (web registrations without account link)
      try {
        const { data: orphans } = await supabase
          .from('players')
          .select('id, first_name, last_name, season_id, family_id')
          .eq('parent_email', session.user.email!)
          .is('parent_account_id', null)
          .limit(10);

        if (orphans && orphans.length > 0) {
          setOrphanPlayers(orphans);
          setHasOrphanRecords(true);
        } else {
          setOrphanPlayers([]);
          setHasOrphanRecords(false);
        }
      } catch {
        // Non-critical — skip orphan check
      }
    } catch (err) {
      console.error('Auth init error:', err);
    }
    setLoading(false);
  }

  const refreshProfile = async () => {
    await init();
  };

  const completeOnboarding = async () => {
    setNeedsOnboarding(false);
    await init();
  };

  const clearOrphanFlag = () => {
    setHasOrphanRecords(false);
    setOrphanPlayers([]);
  };

  // -----------------------------------------------
  // Auth methods
  // -----------------------------------------------

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error) await init();
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) await init();
    return { error };
  };

  const performOAuthSignIn = async (provider: 'google' | 'apple') => {
    try {
      const redirectTo = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) return { error };

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = () => performOAuthSignIn('google');
  const signInWithApple = () => performOAuthSignIn('apple');

  const signOut = async () => {
    // Clear persisted context BEFORE signing out to prevent cross-user leakage
    await AsyncStorage.multiRemove(LOGOUT_CLEAR_KEYS).catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setIsAdmin(false);
    setIsPlatformAdmin(false);
    setNeedsOnboarding(false);
    setHasOrphanRecords(false);
    setOrphanPlayers([]);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      organization,
      isAdmin,
      isPlatformAdmin,
      needsOnboarding,
      hasOrphanRecords,
      orphanPlayers,
      clearOrphanFlag,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signInWithApple,
      signOut,
      refreshProfile,
      completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
