import { supabase } from './supabase';

export type UserRole = 'league_admin' | 'head_coach' | 'assistant_coach' | 'parent' | 'player';

export type PermissionContext = {
  userId: string;
  organizationId: string;
  roles: UserRole[];
  teamAssignments: { teamId: string; role: string }[];
  childrenIds: string[];
};

// Fetch user's full permission context
export const getPermissionContext = async (userId: string): Promise<PermissionContext | null> => {
  // Get profile with organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, current_organization_id')
    .eq('id', userId)
    .single();

  if (!profile || !profile.current_organization_id) return null;

  // Get user roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', profile.current_organization_id)
    .eq('is_active', true);

  // Get team assignments
  const { data: teamStaff } = await supabase
    .from('team_staff')
    .select('team_id, staff_role')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Get children (for parents)
  const { data: guardianLinks } = await supabase
    .from('player_guardians')
    .select('player_id')
    .eq('guardian_id', userId);

  return {
    userId,
    organizationId: profile.current_organization_id,
    roles: userRoles?.map(r => r.role as UserRole) || [],
    teamAssignments: teamStaff?.map(t => ({ teamId: t.team_id, role: t.staff_role })) || [],
    childrenIds: guardianLinks?.map(g => g.player_id) || [],
  };
};

// Check specific permissions
export const can = {
  // Organization level
  manageOrganization: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  manageSeasons: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  createTeams: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  viewAllTeams: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  grantRoles: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  sendLeagueBlasts: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  viewAllPayments: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  exportData: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin'),

  // Team level
  manageTeam: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  addAssistantCoach: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  assignPlayers: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  viewTeamRoster: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') ||
    ctx.teamAssignments.some(t => t.teamId === teamId) ||
    ctx.roles.includes('parent'), // Parents can view their child's team

  viewTeamPayments: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  sendTeamBlasts: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  createTeamInviteCodes: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  // Chat
  postInTeamChat: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin') ||
    ctx.roles.includes('head_coach') ||
    ctx.roles.includes('assistant_coach') ||
    ctx.roles.includes('parent'),

  postInPlayerChat: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin') ||
    ctx.roles.includes('head_coach') ||
    ctx.roles.includes('assistant_coach') ||
    ctx.roles.includes('player'),

  viewPlayerChat: (ctx: PermissionContext) => 
    ctx.roles.includes('league_admin') ||
    ctx.roles.includes('head_coach') ||
    ctx.roles.includes('assistant_coach') ||
    ctx.roles.includes('parent') ||
    ctx.roles.includes('player'),

  moderateChat: (ctx: PermissionContext, teamId: string) => 
    ctx.roles.includes('league_admin') || 
    ctx.teamAssignments.some(t => t.teamId === teamId && t.role === 'head_coach'),

  createDMs: (ctx: PermissionContext) => 
    !ctx.roles.includes('player'), // Everyone except players

  // Personal
  viewOwnPayments: (ctx: PermissionContext) => 
    !ctx.roles.includes('player'),

  viewChildActivity: (ctx: PermissionContext) => 
    ctx.roles.includes('parent') && ctx.childrenIds.length > 0,
};

// Get highest role for display purposes
export const getPrimaryRole = (roles: UserRole[]): UserRole => {
  const priority: UserRole[] = ['league_admin', 'head_coach', 'assistant_coach', 'parent', 'player'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'parent'; // Default
};

// Role display names
export const roleDisplayName: Record<UserRole, string> = {
  league_admin: 'League Admin',
  head_coach: 'Head Coach',
  assistant_coach: 'Assistant Coach',
  parent: 'Parent',
  player: 'Player',
};