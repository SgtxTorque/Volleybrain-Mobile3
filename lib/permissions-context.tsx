import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { can, getPermissionContext, getPrimaryRole, PermissionContext, UserRole } from './permissions';
import { supabase } from './supabase';

type PermissionsContextType = {
  context: PermissionContext | null;
  loading: boolean;
  primaryRole: UserRole | null;
  isAdmin: boolean;
  isCoach: boolean;
  isParent: boolean;
  isPlayer: boolean;
  can: typeof can;
  refresh: () => Promise<void>;
  // Dev mode / Role switching
  devMode: boolean;
  devViewAs: UserRole | null;
  setDevViewAs: (role: UserRole | null) => void;
  actualRoles: UserRole[];
};

const PermissionsContext = createContext<PermissionsContextType>({
  context: null,
  loading: true,
  primaryRole: null,
  isAdmin: false,
  isCoach: false,
  isParent: false,
  isPlayer: false,
  can,
  refresh: async () => {},
  devMode: __DEV__, // Only enable in development
  devViewAs: null,
  setDevViewAs: () => {},
  actualRoles: [],
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [context, setContext] = useState<PermissionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [devViewAs, setDevViewAs] = useState<UserRole | null>(null);
  const [hasPlayerConnections, setHasPlayerConnections] = useState(false);

  // Check if user has any player connections (making them a parent)
  const checkPlayerConnections = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Check player_guardians table
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('id')
        .eq('guardian_id', user.id)
        .limit(1);

      if (guardianLinks && guardianLinks.length > 0) {
        return true;
      }

      // Check players.parent_account_id
      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1);

      if (directPlayers && directPlayers.length > 0) {
        return true;
      }

      // Check players.parent_email
      const parentEmail = profile?.email || user?.email;
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail)
          .limit(1);

        if (emailPlayers && emailPlayers.length > 0) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking player connections:', error);
      return false;
    }
  };

  const loadPermissions = async () => {
    if (!user?.id) {
      setContext(null);
      setHasPlayerConnections(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Load roles from user_roles table
    const ctx = await getPermissionContext(user.id);
    
    // Check for player connections (auto-detect parent)
    const hasConnections = await checkPlayerConnections();
    setHasPlayerConnections(hasConnections);
    
    setContext(ctx);
    setLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, [user?.id, profile?.current_organization_id, profile?.email]);

  // Build actual roles: from user_roles table + auto-detected parent
  const rolesFromTable = context?.roles || [];
  const actualRoles: UserRole[] = [...rolesFromTable];
  
  // Auto-add 'parent' if user has player connections and doesn't already have parent role
  if (hasPlayerConnections && !actualRoles.includes('parent')) {
    actualRoles.push('parent');
  }

  // Apply dev override if set
  const effectiveRoles: UserRole[] = devViewAs ? [devViewAs] : actualRoles;

  // Create an effective context with overridden roles for dev mode
  const effectiveContext: PermissionContext | null = context ? {
    ...context,
    roles: effectiveRoles,
  } : null;

  const primaryRole = effectiveContext ? getPrimaryRole(effectiveContext.roles) : null;
  const isAdmin = effectiveRoles.includes('league_admin');
  const isCoach = effectiveRoles.includes('head_coach') || effectiveRoles.includes('assistant_coach');
  const isParent = effectiveRoles.includes('parent');
  const isPlayer = effectiveRoles.includes('player');

  return (
    <PermissionsContext.Provider
      value={{
        context: effectiveContext,
        loading,
        primaryRole,
        isAdmin,
        isCoach,
        isParent,
        isPlayer,
        can,
        refresh: loadPermissions,
        devMode: __DEV__,
        devViewAs,
        setDevViewAs,
        actualRoles,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
