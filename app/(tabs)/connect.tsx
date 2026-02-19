import TeamWall from '@/components/TeamWall';
import { useTeamContext } from '@/lib/team-context';
import React from 'react';

export default function TeamScreen() {
  const { selectedTeamId } = useTeamContext();
  return <TeamWall teamId={selectedTeamId} embedded={true} />;
}
