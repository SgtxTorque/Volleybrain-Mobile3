import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface JourneyChapter {
  id: string;
  sport: string;
  chapter_number: number;
  title: string;
  theme: string | null;
  description: string | null;
  required_level: number;
  badge_id: string | null;
  node_count: number;
  sort_order: number;
  is_published: boolean;
  nodes: JourneyNode[];
  // Computed
  isUnlocked: boolean;
  isComplete: boolean;
  completedNodes: number;
}

export interface JourneyNode {
  id: string;
  chapter_id: string;
  node_type: 'skill' | 'challenge' | 'boss' | 'bonus';
  title: string;
  description: string | null;
  skill_content_id: string | null;
  challenge_config: any;
  xp_reward: number;
  sort_order: number;
  is_boss: boolean;
  is_bonus: boolean;
  position_offset: 'left' | 'center' | 'right';
  icon_emoji: string | null;
  // From skill_content join
  skillContent?: {
    tip_image_url: string | null;
    mascot_demo_frames: string[] | null;
  };
  // From journey_progress join
  progress: {
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    attempts: number;
    xp_earned: number;
    completed_at: string | null;
  };
}

export function useJourneyPath() {
  const [chapters, setChapters] = useState<JourneyChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  const loadJourney = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get player level
      const { data: profile } = await supabase
        .from('profiles')
        .select('player_level')
        .eq('id', user.id)
        .maybeSingle();

      const level = profile?.player_level ?? 1;
      setPlayerLevel(level);

      // Get all published chapters with their nodes
      const { data: chapterData } = await supabase
        .from('journey_chapters')
        .select('*')
        .eq('sport', 'volleyball')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (!chapterData || chapterData.length === 0) {
        setChapters([]);
        return;
      }

      // Get all nodes for these chapters
      const chapterIds = chapterData.map((c: any) => c.id);
      const { data: nodeData } = await supabase
        .from('journey_nodes')
        .select('*, skill_content:skill_content_id(tip_image_url, mascot_demo_frames)')
        .in('chapter_id', chapterIds)
        .order('sort_order', { ascending: true });

      // Get player's progress for all nodes
      const nodeIds = (nodeData || []).map((n: any) => n.id);
      let progressMap: Record<string, any> = {};

      if (nodeIds.length > 0) {
        const { data: progressData } = await supabase
          .from('journey_progress')
          .select('*')
          .eq('player_id', user.id)
          .in('node_id', nodeIds);

        if (progressData) {
          progressMap = Object.fromEntries(
            progressData.map((p: any) => [p.node_id, p])
          );
        }
      }

      // Assemble chapters with nodes and computed state
      let foundCurrentChapter = false;
      const assembled: JourneyChapter[] = chapterData.map((chapter: any, chapterIdx: number) => {
        const isUnlocked = level >= chapter.required_level;
        const chapterNodes = (nodeData || [])
          .filter((n: any) => n.chapter_id === chapter.id)
          .map((node: any, nodeIdx: number) => {
            const prog = progressMap[node.id];
            let status: 'locked' | 'available' | 'in_progress' | 'completed' = 'locked';

            if (prog) {
              status = prog.status;
            } else if (isUnlocked) {
              // First node of unlocked chapter is available if no progress exists
              // Subsequent nodes are available only if previous node is completed
              if (nodeIdx === 0) {
                // Check if this is the first chapter or previous chapter's boss is done
                if (chapterIdx === 0) {
                  status = 'available';
                } else {
                  const prevChapter = chapterData[chapterIdx - 1];
                  const prevBossNode = (nodeData || []).find(
                    (n: any) => n.chapter_id === prevChapter.id && n.is_boss
                  );
                  if (prevBossNode && progressMap[prevBossNode.id]?.status === 'completed') {
                    status = 'available';
                  }
                }
              }
              // Nodes after the first: available if previous node in same chapter is completed
              if (nodeIdx > 0 && status === 'locked') {
                const prevNodeInChapter = (nodeData || [])
                  .filter((n: any) => n.chapter_id === chapter.id)
                  [nodeIdx - 1];
                if (prevNodeInChapter && progressMap[prevNodeInChapter.id]?.status === 'completed') {
                  status = 'available';
                }
              }
            }

            return {
              ...node,
              skillContent: node.skill_content || undefined,
              progress: {
                status,
                attempts: prog?.attempts ?? 0,
                xp_earned: prog?.xp_earned ?? 0,
                completed_at: prog?.completed_at ?? null,
              },
            };
          });

        const completedNodes = chapterNodes.filter(
          (n: any) => n.progress.status === 'completed'
        ).length;
        const isComplete = completedNodes === chapterNodes.length && chapterNodes.length > 0;

        if (!isComplete && isUnlocked && !foundCurrentChapter) {
          setCurrentChapterIndex(chapterIdx);
          foundCurrentChapter = true;
        }

        return {
          ...chapter,
          nodes: chapterNodes,
          isUnlocked,
          isComplete,
          completedNodes,
        };
      });

      setChapters(assembled);
    } catch (err) {
      console.error('[useJourneyPath] Error loading journey:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJourney();
  }, [loadJourney]);

  return {
    chapters,
    loading,
    playerLevel,
    currentChapterIndex,
    refreshJourney: loadJourney,
  };
}
