import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { checkAndCompleteQuests } from '@/lib/quest-engine';
import { recordQualifyingAction } from '@/lib/streak-engine';
import { emitRefresh } from '@/lib/refresh-bus';
import { awardXP } from '@/lib/xp-award-service';

export interface SkillModuleData {
  id: string;
  title: string;
  tip_text: string | null;
  tip_image_url: string | null;
  drill_title: string | null;
  drill_instructions: string | null;
  drill_reps: string | null;
  drill_location: string | null;
  mascot_demo_frames: string[] | null;
  has_quiz: boolean;
  xp_tip: number;
  xp_drill: number;
  xp_quiz: number;
  quizzes: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  sort_order: number;
}

export type ModuleStep = 'tip' | 'drill' | 'quiz' | 'complete';

export function useSkillModule(nodeId: string, skillContentId: string) {
  const [moduleData, setModuleData] = useState<SkillModuleData | null>(null);
  const [currentStep, setCurrentStep] = useState<ModuleStep>('tip');
  const [loading, setLoading] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  const loadModule = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch skill content
      const { data: content } = await supabase
        .from('skill_content')
        .select('*')
        .eq('id', skillContentId)
        .maybeSingle();

      if (!content) return;

      // Fetch quiz questions if module has quiz
      let quizzes: QuizQuestion[] = [];
      if (content.has_quiz) {
        const { data: quizData } = await supabase
          .from('skill_quizzes')
          .select('*')
          .eq('skill_content_id', skillContentId)
          .order('sort_order', { ascending: true });

        quizzes = (quizData || []).map((q: any) => ({
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        }));
      }

      setModuleData({ ...content, quizzes });
      setQuizTotal(quizzes.length);
    } catch (err) {
      if (__DEV__) console.error('[useSkillModule] Error loading module:', err);
    } finally {
      setLoading(false);
    }
  }, [skillContentId]);

  // Complete the tip step
  const completeTip = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !moduleData) return;

    // Upsert skill_progress
    await supabase.from('skill_progress').upsert(
      {
        player_id: user.id,
        skill_content_id: skillContentId,
        tip_viewed: true,
        tip_viewed_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,skill_content_id' }
    );

    // Award XP
    await awardModuleXp(user.id, moduleData.xp_tip, 'skill_tip');
    setXpEarned(prev => prev + moduleData.xp_tip);
    setCurrentStep('drill');
  }, [moduleData, skillContentId]);

  // Complete the drill step
  const completeDrill = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !moduleData) return;

    await supabase.from('skill_progress').upsert(
      {
        player_id: user.id,
        skill_content_id: skillContentId,
        drill_completed: true,
        drill_completed_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,skill_content_id' }
    );

    await awardModuleXp(user.id, moduleData.xp_drill, 'skill_drill');
    setXpEarned(prev => prev + moduleData.xp_drill);

    if (moduleData.has_quiz && moduleData.quizzes.length > 0) {
      setCurrentStep('quiz');
    } else {
      await completeModule(user.id);
      setCurrentStep('complete');
    }
  }, [moduleData, skillContentId]);

  // Submit quiz answers
  const completeQuiz = useCallback(async (correctCount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !moduleData) return;

    setQuizScore(correctCount);

    await supabase.from('skill_progress').upsert(
      {
        player_id: user.id,
        skill_content_id: skillContentId,
        quiz_completed: true,
        quiz_score: correctCount,
        quiz_completed_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,skill_content_id' }
    );

    // Award quiz XP only if they got at least 1 right
    if (correctCount > 0) {
      await awardModuleXp(user.id, moduleData.xp_quiz, 'skill_quiz');
      setXpEarned(prev => prev + moduleData.xp_quiz);
    }

    await completeModule(user.id);
    setCurrentStep('complete');
  }, [moduleData, skillContentId]);

  // Mark the entire module and journey node as complete
  const completeModule = async (userId: string) => {
    // Mark skill_progress as fully complete
    await supabase.from('skill_progress').upsert(
      {
        player_id: userId,
        skill_content_id: skillContentId,
        is_fully_complete: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'player_id,skill_content_id' }
    );

    // Mark journey_progress as completed
    await supabase.from('journey_progress').upsert(
      {
        player_id: userId,
        node_id: nodeId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        attempts: 1,
        xp_earned: xpEarned,
      },
      { onConflict: 'player_id,node_id' }
    );

    // Record qualifying action for streak
    await recordQualifyingAction(userId);

    // Auto-complete skill module quest (fire-and-forget)
    checkAndCompleteQuests(userId, 'skill_module_completed').catch(() => {});

    // Emit refresh events
    emitRefresh('journey');
    emitRefresh('quests');
    emitRefresh('xp');
  };

  return {
    moduleData,
    currentStep,
    loading,
    xpEarned,
    quizScore,
    quizTotal,
    loadModule,
    completeTip,
    completeDrill,
    completeQuiz,
  };
}

// Private helper: award XP for skill module steps
async function awardModuleXp(profileId: string, amount: number, sourceType: string) {
  await awardXP({
    profileId,
    baseAmount: amount,
    sourceType,
    description: `Skill module: +${amount} XP`,
    skipBoostLookup: false, // skill modules should benefit from boosts
  });
}
