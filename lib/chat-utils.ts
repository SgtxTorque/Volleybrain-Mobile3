import { supabase } from './supabase';

type CreateChatOptions = {
  seasonId: string;
  teamId: string;
  teamName: string;
  createdBy: string;
};

type AddParentOptions = {
  parentId: string;
  parentName: string;
  playerFirstName: string;
  teamChatId: string;
  playerChatId: string;
};

type AddCoachOptions = {
  coachId: string;
  coachName: string;
  teamChatId: string;
  playerChatId: string;
  isHead: boolean;
};

// Format parent display name: "Carlos F. (Ava)" or "Carlos F. (Ava, Marcus)"
export const formatParentDisplayName = (parentName: string, childNames: string[]): string => {
  const nameParts = parentName.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0] + '.' : '';
  const shortName = `${firstName} ${lastInitial}`.trim();
  
  if (childNames.length === 0) return shortName;
  return `${shortName} (${childNames.join(', ')})`;
};

// Get existing profile by email (returns null if not signed up yet)
export const getProfileByEmail = async (email: string): Promise<{ id: string; full_name: string } | null> => {
  if (!email) return null;
  
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email.toLowerCase())
    .single();

  return existing || null;
};

// Create team_chat and player_chat for a team
export const createTeamChats = async (options: CreateChatOptions): Promise<{ teamChatId: string; playerChatId: string } | null> => {
  const { seasonId, teamId, teamName, createdBy } = options;

  const { data: existingChats } = await supabase
    .from('chat_channels')
    .select('id, channel_type')
    .eq('team_id', teamId)
    .in('channel_type', ['team_chat', 'player_chat']);

  let teamChatId = existingChats?.find(c => c.channel_type === 'team_chat')?.id;
  let playerChatId = existingChats?.find(c => c.channel_type === 'player_chat')?.id;

  if (!teamChatId) {
    const { data: teamChat, error: teamError } = await supabase
      .from('chat_channels')
      .insert({
        season_id: seasonId,
        team_id: teamId,
        name: `${teamName} - Team Chat`,
        description: 'Team communication for parents and coaches',
        channel_type: 'team_chat',
        created_by: createdBy,
      })
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team chat:', teamError);
      return null;
    }
    teamChatId = teamChat.id;
  }

  if (!playerChatId) {
    const { data: playerChat, error: playerError } = await supabase
      .from('chat_channels')
      .insert({
        season_id: seasonId,
        team_id: teamId,
        name: `${teamName} - Player Chat`,
        description: 'Player communication with coaches (parents can view)',
        channel_type: 'player_chat',
        created_by: createdBy,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Error creating player chat:', playerError);
      return null;
    }
    playerChatId = playerChat.id;
  }

  return { teamChatId, playerChatId };
};

// Add parent to team chats
export const addParentToTeamChats = async (options: AddParentOptions): Promise<boolean> => {
  const { parentId, parentName, playerFirstName, teamChatId, playerChatId } = options;

  const { data: existingMemberships } = await supabase
    .from('channel_members')
    .select('channel_id, display_name')
    .eq('user_id', parentId)
    .in('channel_id', [teamChatId, playerChatId]);

  const existingTeamMember = existingMemberships?.find(m => m.channel_id === teamChatId);
  let childNames: string[] = [];
  
  if (existingTeamMember) {
    const match = existingTeamMember.display_name.match(/\(([^)]+)\)/);
    if (match) {
      childNames = match[1].split(', ');
    }
  }
  
  if (!childNames.includes(playerFirstName)) {
    childNames.push(playerFirstName);
  }

  const displayName = formatParentDisplayName(parentName, childNames);

  if (existingTeamMember) {
    await supabase
      .from('channel_members')
      .update({ display_name: displayName })
      .eq('user_id', parentId)
      .eq('channel_id', teamChatId);
  } else {
    await supabase.from('channel_members').insert({
      channel_id: teamChatId,
      user_id: parentId,
      display_name: displayName,
      member_role: 'parent',
      can_post: true,
      can_moderate: false,
    });
  }

  const existingPlayerMember = existingMemberships?.find(m => m.channel_id === playerChatId);
  
  if (existingPlayerMember) {
    await supabase
      .from('channel_members')
      .update({ display_name: displayName })
      .eq('user_id', parentId)
      .eq('channel_id', playerChatId);
  } else {
    await supabase.from('channel_members').insert({
      channel_id: playerChatId,
      user_id: parentId,
      display_name: displayName,
      member_role: 'parent',
      can_post: false,
      can_moderate: false,
    });
  }

  return true;
};

// Add coach to team chats
export const addCoachToTeamChats = async (options: AddCoachOptions): Promise<boolean> => {
  const { coachId, coachName, teamChatId, playerChatId, isHead } = options;

  const nameParts = coachName.trim().split(' ');
  const displayName = isHead 
    ? `Coach ${nameParts[nameParts.length - 1]}` 
    : `Asst. Coach ${nameParts[nameParts.length - 1]}`;

  const { data: existing } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', coachId)
    .in('channel_id', [teamChatId, playerChatId]);

  const inTeamChat = existing?.some(e => e.channel_id === teamChatId);
  const inPlayerChat = existing?.some(e => e.channel_id === playerChatId);

  if (!inTeamChat) {
    await supabase.from('channel_members').insert({
      channel_id: teamChatId,
      user_id: coachId,
      display_name: displayName,
      member_role: 'coach',
      can_post: true,
      can_moderate: true,
    });
  }

  if (!inPlayerChat) {
    await supabase.from('channel_members').insert({
      channel_id: playerChatId,
      user_id: coachId,
      display_name: displayName,
      member_role: 'coach',
      can_post: true,
      can_moderate: true,
    });
  }

  return true;
};

// Add admin to team chats
export const addAdminToTeamChats = async (adminId: string, adminName: string, teamChatId: string, playerChatId: string): Promise<boolean> => {
  const displayName = `${adminName} (Admin)`;

  const { data: existing } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', adminId)
    .in('channel_id', [teamChatId, playerChatId]);

  const inTeamChat = existing?.some(e => e.channel_id === teamChatId);
  const inPlayerChat = existing?.some(e => e.channel_id === playerChatId);

  if (!inTeamChat) {
    await supabase.from('channel_members').insert({
      channel_id: teamChatId,
      user_id: adminId,
      display_name: displayName,
      member_role: 'admin',
      can_post: true,
      can_moderate: true,
    });
  }

  if (!inPlayerChat) {
    await supabase.from('channel_members').insert({
      channel_id: playerChatId,
      user_id: adminId,
      display_name: displayName,
      member_role: 'admin',
      can_post: true,
      can_moderate: true,
    });
  }

  return true;
};

// Sync all chats for a team - only adds users who have accounts
export const syncTeamChats = async (seasonId: string, teamId: string, teamName: string, adminId: string, adminName: string): Promise<{ success: boolean; added: string[]; pending: string[] }> => {
  const added: string[] = [];
  const pending: string[] = []; // People who need to sign up

  const chats = await createTeamChats({
    seasonId,
    teamId,
    teamName,
    createdBy: adminId,
  });

  if (!chats) return { success: false, added, pending };

  await addAdminToTeamChats(adminId, adminName, chats.teamChatId, chats.playerChatId);
  added.push(`Admin: ${adminName}`);

  // Get all team players
  const { data: teamPlayers } = await supabase
    .from('team_players')
    .select(`
      player_id,
      players (
        id, first_name, last_name, parent_name, parent_email
      )
    `)
    .eq('team_id', teamId);

  // Get all team coaches
  const { data: teamCoaches } = await supabase
    .from('team_coaches')
    .select(`
      coach_id, role,
      coaches (
        id, first_name, last_name, email
      )
    `)
    .eq('team_id', teamId);

  // Add coaches who have signed up
  if (teamCoaches) {
    for (const tc of teamCoaches) {
      const coach = tc.coaches as any;
      if (!coach) continue;

      const coachName = `${coach.first_name} ${coach.last_name}`;
      
      if (!coach.email) {
        pending.push(`Coach ${coachName} (no email)`);
        continue;
      }

      // Check if coach has a profile (signed up)
      const profile = await getProfileByEmail(coach.email);
      
      if (profile) {
        await addCoachToTeamChats({
          coachId: profile.id,
          coachName: profile.full_name || coachName,
          teamChatId: chats.teamChatId,
          playerChatId: chats.playerChatId,
          isHead: tc.role === 'head',
        });
        added.push(`Coach: ${coachName}`);
      } else {
        pending.push(`Coach ${coachName} (needs to sign up)`);
      }
    }
  }

  // Add parents who have signed up
  if (teamPlayers) {
    for (const tp of teamPlayers) {
      const player = tp.players as any;
      if (!player) continue;

      const parentName = player.parent_name || 'Parent';
      const playerName = player.first_name;
      
      if (!player.parent_email) {
        pending.push(`Parent of ${playerName} (no email)`);
        continue;
      }

      // Check if parent has a profile (signed up)
      const profile = await getProfileByEmail(player.parent_email);
      
      if (profile) {
        await addParentToTeamChats({
          parentId: profile.id,
          parentName: profile.full_name || parentName,
          playerFirstName: playerName,
          teamChatId: chats.teamChatId,
          playerChatId: chats.playerChatId,
        });
        added.push(`Parent: ${profile.full_name || parentName} (${playerName})`);
      } else {
        pending.push(`Parent of ${playerName} (needs to sign up: ${player.parent_email})`);
      }
    }
  }

  return { success: true, added, pending };
};

// Create league announcement channel
export const createLeagueAnnouncementChannel = async (seasonId: string, seasonName: string, createdBy: string): Promise<string | null> => {
  const { data: existing } = await supabase
    .from('chat_channels')
    .select('id')
    .eq('season_id', seasonId)
    .eq('channel_type', 'league_announcement')
    .single();

  if (existing) return existing.id;

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert({
      season_id: seasonId,
      name: `${seasonName} - Announcements`,
      description: 'League-wide announcements from administrators',
      channel_type: 'league_announcement',
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement channel:', error);
    return null;
  }

  return channel.id;
};