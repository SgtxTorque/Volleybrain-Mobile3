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
  // Role switching (production feature — matches web's getAvailableViews)
  viewAs: UserRole | null;
  setViewAs: (role: UserRole | null) => void;
  // Keep legacy aliases for compatibility
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
  viewAs: null,
  setViewAs: () => {},
  devMode: false,
  devViewAs: null,
  setDevViewAs: () => {},
  actualRoles: [],
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [context, setContext] = useState<PermissionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState<UserRole | null>(null);
  const [hasPlayerConnections, setHasPlayerConnections] = useState(false);
  const [hasCoachRecord, setHasCoachRecord] = useState(false);
  const [hasPlayerSelf, setHasPlayerSelf] = useState(false);

  // Check if user has any player connections (making them a parent)
  const checkPlayerConnections = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { data: guardianLinks } = await supabase
        .from('player_guardians')
        .select('id')
        .eq('guardian_id', user.id)
        .limit(1);
      if (guardianLinks && guardianLinks.length > 0) return true;

      const { data: directPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1);
      if (directPlayers && directPlayers.length > 0) return true;

      const parentEmail = profile?.email || user?.email;
      if (parentEmail) {
        const { data: emailPlayers } = await supabase
          .from('players')
          .select('id')
          .ilike('parent_email', parentEmail)
          .limit(1);
        if (emailPlayers && emailPlayers.length > 0) return true;
      }
      return false;
    } catch { return false; }
  };

  // Check if user is a coach via coaches table (matches web's coachLink detection)
  const checkCoachSelf = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { data } = await supabase
        .from('coaches')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);
      return Boolean(data && data.length > 0);
    } catch { return false; }
  };

  // Check if user is a player via players table (matches web's playerSelf detection)
  const checkPlayerSelf = async (): Promise<boolean> => {
    if (!user?.id) return false;
    try {
      const { data } = await supabase
        .from('players')
        .select('id')
        .eq('parent_account_id', user.id)
        .limit(1);
      return Boolean(data && data.length > 0);
    } catch { return false; }
  };

  const loadPermissions = async () => {
    if (!user?.id) {
      setContext(null);
      setHasPlayerConnections(false);
      setHasCoachRecord(false);
      setHasPlayerSelf(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Load roles from user_roles table
    const ctx = await getPermissionContext(user.id);

    // Auto-detect roles (same as web's roleContext loading)
    const [isParent, isCoach, isPlayer] = await Promise.all([
      checkPlayerConnections(),
      checkCoachSelf(),
      checkPlayerSelf(),
    ]);

    setHasPlayerConnections(isParent);
    setHasCoachRecord(isCoach);
    setHasPlayerSelf(isPlayer);
    setContext(ctx);
    setLoading(false);
  };

  useEffect(() => {
    loadPermissions();
  }, [user?.id, profile?.current_organization_id, profile?.email]);

  // Build actual roles: from user_roles table + auto-detected roles
  const rolesFromTable = context?.roles || [];
  const actualRoles: UserRole[] = [...rolesFromTable];

  // Auto-add 'parent' if user has player connections
  if (hasPlayerConnections && !actualRoles.includes('parent')) {
    actualRoles.push('parent');
  }

  // Auto-add coach role if user has a coaches record but no coach role in user_roles
  if (hasCoachRecord && !actualRoles.includes('head_coach') && !actualRoles.includes('assistant_coach')) {
    actualRoles.push('head_coach');
  }

  // Auto-add 'player' if user has a player self record
  if (hasPlayerSelf && !actualRoles.includes('player')) {
    actualRoles.push('player');
  }

  // Web parity: admins and coaches can always preview the player view
  // (web's getAvailableViews adds player preview for admins/coaches)
  const hasAdminRole = actualRoles.includes('league_admin');
  const hasCoachRole = actualRoles.includes('head_coach') || actualRoles.includes('assistant_coach');
  if ((hasAdminRole || hasCoachRole) && !actualRoles.includes('player')) {
    actualRoles.push('player');
  }

  // Apply role override if set (production feature — not dev-only)
  const effectiveRoles: UserRole[] = viewAs ? [viewAs] : actualRoles;

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
        viewAs,
        setViewAs,
        // Legacy aliases
        devMode: __DEV__,
        devViewAs: viewAs,
        setDevViewAs: setViewAs,
        actualRoles,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
