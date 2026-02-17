import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { registerForPushNotificationsAsync, savePushToken } from './notifications';

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

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  isAdmin: boolean;
  isPlatformAdmin: boolean;
  needsOnboarding: boolean;
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
      const { data: { session } } = await supabase.auth.getSession();
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

      // Load profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      // OAuth users may not have a profile row yet — create one
      if (!prof) {
        const meta = session.user.user_metadata;
        const { data: newProf } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: meta?.full_name || meta?.name || '',
            onboarding_completed: false,
          }, { onConflict: 'id' })
          .select()
          .single();

        setProfile(newProf);
        setIsPlatformAdmin(false);
        setNeedsOnboarding(true);
        setLoading(false);
        return;
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setOrganization(null);
    setIsAdmin(false);
    setIsPlatformAdmin(false);
    setNeedsOnboarding(false);
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
