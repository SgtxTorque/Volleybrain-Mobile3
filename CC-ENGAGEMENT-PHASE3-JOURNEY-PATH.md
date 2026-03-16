# CC-ENGAGEMENT-PHASE3-JOURNEY-PATH
# Lynx Player Engagement System — Phase 3: Journey Path Screen
# Status: READY FOR CC EXECUTION
# Depends on: Phase 1 (all), Phase 2 (content seeded)

---

## STANDING RULES

1. **Read these files first, in order:**
   - `CC-LYNX-RULES.md` in repo root
   - `AGENTS.md` in repo root
   - `SCHEMA_REFERENCE.csv` in repo root
   - `LYNX-REFERENCE-GUIDE.md` in repo root
   - `MASCOT-ASSET-MAP.md` in repo root
2. **Do NOT modify any existing screens, hooks, or services EXCEPT the files explicitly listed in this spec.**
3. **Do NOT modify any database tables, RLS policies, or migration files.**
4. **Read the existing Player Home scroll components** to match design tokens (colors, fonts, spacing, radii). Specifically read:
   - `components/player-scroll/PlayerIdentityHero.tsx` (for dark navy hero card patterns)
   - `components/player-scroll/PlayerContinueTraining.tsx` (for the entry point card)
   - `components/player-scroll/PlayerDailyQuests.tsx` (for card patterns and animation style)
   - Any theme/constants file that defines `D_COLORS`, `PLAYER_THEME`, `D_RADII`, font families, etc.
5. **Commit after each phase.** Commit message format: `[journey-path] Phase X: description`
6. **If something is unclear, STOP and report back.**
7. **Branch:** `navigation-cleanup-complete`

---

## WHAT THIS SPEC DOES

Builds the complete Journey Path experience:
1. **JourneyPathScreen** — The scrollable map showing all chapters and nodes
2. **SkillModuleScreen** — The Tip > Drill > Quiz sequential flow when a player starts a node
3. **NodeCompletionCelebration** — XP celebration overlay after completing a node
4. **Navigation wiring** — Continue Training card + Journey tab both navigate to JourneyPathScreen

---

## PHASE 1: Investigation — Read before writing

Before writing any code, read these files and note:

1. **How does navigation work?** Find the navigation setup (React Navigation). Where are screens registered? What's the navigator structure (Stack? Tab? Both?)? How do existing screens navigate to each other? Show the pattern for `navigation.navigate('ScreenName', { params })`.

2. **What's the tab bar setup for the Player role?** Find where the player tab bar is defined (Home | Journey | Chat | More or whatever it currently is). Is the Journey tab already registered with a placeholder? Or does it need to be added?

3. **What are the exact design tokens?** Find and note:
   - Dark navy gradient colors (the hero card background)
   - Font families (Outfit for display, Plus Jakarta Sans for body, Bebas Neue for accent)
   - Brand colors (lynx-navy, lynx-sky, lynx-gold)
   - Border radii values
   - The D_COLORS / PLAYER_THEME object if it exists

4. **What does PlayerContinueTraining currently do on tap?** Does it navigate somewhere? Does it have an `onPress`? What's the current behavior?

5. **How do existing screens handle data loading?** Find one example screen that fetches Supabase data on mount and displays it with a loading state. Note the pattern.

**Report what you found, then proceed to Phase 2.** Do not wait for confirmation.

---

## PHASE 2: Create useJourneyPath hook

Create a new file:
```
hooks/useJourneyPath.ts
```

This hook fetches all journey data for the current player: chapters, nodes, and progress.

```typescript
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
        .single();

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
```

**Commit:** `[journey-path] Phase 2: useJourneyPath hook`

---

## PHASE 3: Create useSkillModule hook

Create a new file:
```
hooks/useSkillModule.ts
```

This hook manages the Tip > Drill > Quiz flow for a single skill module.

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateLevel } from '@/lib/quest-engine';
import { recordQualifyingAction } from '@/lib/streak-engine';

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
        .single();

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
      console.error('[useSkillModule] Error loading module:', err);
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
  // Write to xp_ledger
  await supabase.from('xp_ledger').insert({
    player_id: profileId,
    xp_amount: amount,
    source_type: sourceType,
    description: `Skill module: +${amount} XP`,
  });

  // Update profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('id', profileId)
    .single();

  const newTotal = (profile?.total_xp ?? 0) + amount;
  const { level, tier, xpToNext } = calculateLevel(newTotal);

  await supabase
    .from('profiles')
    .update({
      total_xp: newTotal,
      player_level: level,
      tier: tier,
      xp_to_next_level: xpToNext,
    })
    .eq('id', profileId);
}
```

**Commit:** `[journey-path] Phase 3: useSkillModule hook`

---

## PHASE 4: Create JourneyPathScreen

Create a new file:
```
screens/JourneyPathScreen.tsx
```

This is the main map screen. Use the design tokens and patterns from the existing player home scroll components.

### Design requirements:

**Background:** Dark navy gradient matching PlayerIdentityHero (`#0B1628` to `#162d50` to `#1a3355`).

**Header (sticky):**
- Back arrow (navigates to Home)
- "Journey path" title (Outfit font, white, 15-16px, weight 800)
- Streak counter (fire icon + day count, coral/red color) — read from useStreakEngine or pass as param

**Progress bar (below header):**
- "Chapter X of Y" left, "N of M complete" right (10px, white 30% opacity)
- Thin progress bar with sky-to-green gradient fill

**Chapter sections:** For each chapter in the data:
- If chapter is locked: show a gate card with "Reach Level X to unlock" (dashed border, gold 6% opacity bg, gold 20% text)
- If chapter is complete: show collapsed header (chapter number, title, checkmark, tappable to expand)
- If chapter is current/in-progress: show expanded with all nodes

**Node path (within expanded chapter):**
- Chapter header: chapter number (tiny, uppercase), title (Outfit, 18-20px, white, weight 900), description (11-12px, white 30%)
- Nodes rendered vertically with connector lines between them
- Each node: circle (60px) with mascot image inside, label below, XP below that
- Node states:
  - **Completed:** Green gradient circle, checkmark badge, muted label, muted XP
  - **Available/Current:** Sky blue gradient circle, pulsing glow animation, white label, gold XP
  - **Locked:** Very dim circle (white 4% bg), dim image (grayscale + 20% opacity), dim label, dim XP
  - **Boss:** Rounded square (not circle), larger (66px), gold tint when available
- Nodes offset left/center/right based on `position_offset` for visual interest
- Connector lines: thin (2px), done = sky blue 35%, upcoming = white 6%

**Node tap behavior:**
- Tapping a completed or available node opens a bottom sheet detail card
- Tapping a locked node does nothing (or shows a subtle "complete previous nodes" toast)

**Detail card (bottom sheet overlay):**
- Dark semi-transparent overlay (black 75%)
- Card slides up from bottom with dark navy gradient
- Close X in top right
- Mascot image (80px circle, from `skillContent.tip_image_url` or fallback)
- Node title (16px, white, weight 800)
- Node description (12px, white 40%)
- XP reward badge (gold text on gold 10% bg, pill shape)
- Steps preview: Tip, Drill, Quiz (if has_quiz) — each as a row with icon, label, XP
- Action button:
  - Available: "Start" — sky-to-green gradient, navigates to SkillModuleScreen
  - Completed: "Replay (+5 XP)" — muted green bg
  - Boss available: "Take on the boss" — gold gradient
  - Locked: "Complete previous nodes first" — dimmed, disabled

**Auto-scroll:** On mount, scroll to the current chapter / first available node so the player sees where they left off.

### Implementation notes:

- Use `ScrollView` for the main scroll (not FlatList — the node path needs free-form layout)
- Use `Animated` API for the pulsing glow on the current node and spring entrance on detail card
- The detail card can be implemented as an overlay `View` with `position: absolute` covering the screen, or use a bottom sheet library if one is already in the project (check for `@gorhom/bottom-sheet` or similar)
- Mascot images: use `require()` with a mapping function, or use `Image` with `source={{ uri: ... }}` if images are referenced by path string. Check how existing components load images from `assets/`.

**IMPORTANT:** Match the exact visual style from the existing player scroll components. Same font families, same color values, same border radii, same animation easing curves. Read the theme/constants files before coding.

**Commit:** `[journey-path] Phase 4: JourneyPathScreen`

---

## PHASE 5: Create SkillModuleScreen

Create a new file:
```
screens/SkillModuleScreen.tsx
```

This is the Tip > Drill > Quiz sequential flow. Three steps, each on its own "page" within the screen.

### Design requirements:

**Background:** Dark navy (same as Journey Path)

**Header:**
- Back arrow (with confirmation if in progress: "Leave? Progress on this step will be lost")
- Module title
- Step indicator: three dots or segments showing Tip / Drill / Quiz progress

**Step 1: Tip**
- Mascot image (large, 120px, centered, from tip_image_url)
- Tip title (Outfit, 20px, white, weight 800)
- Tip text (Plus Jakarta Sans, 14px, white 70%, line-height 1.6)
- Scroll if text is long
- Bottom: "Got it — next" button (sky blue gradient, full width)
- Awards xp_tip on advance

**Step 2: Drill**
- Mascot demo frames (if available, show as a horizontal scroll of images showing the technique)
- Drill title (16px, white, weight 700)
- Drill instructions (14px, white 60%, line-height 1.5)
- Drill reps (bold, white, highlight treatment — pill or card)
- Drill location indicator (home/gym/court icon + label)
- Bottom: "I completed this drill" button (green gradient, full width)
- This is self-report verification — tapping confirms completion
- Awards xp_drill on advance

**Step 3: Quiz (if has_quiz)**
- One question at a time
- Question text (16px, white, weight 700)
- 4 answer options as tappable cards:
  - Default: dark navy bg with subtle border
  - Selected: sky blue border
  - Correct (after submit): green bg
  - Incorrect (after submit): red bg with correct answer highlighted green
- After answering, show explanation text (12px, white 50%)
- "Next question" button advances to next question
- After all questions: shows score (2/3 correct) with mascot reaction
  - All correct: EXCITEDACHIEVEMENT.png + "Perfect!"
  - Some correct: AREYOUREADY.png + "Nice effort!"
  - None correct: confused.png + "You'll get it next time!"
- Awards xp_quiz if at least 1 correct

**Step transitions:** Animate between steps with a horizontal slide (like swiping between pages).

**Commit:** `[journey-path] Phase 5: SkillModuleScreen`

---

## PHASE 6: Create NodeCompletionCelebration

Create a new file:
```
components/journey/NodeCompletionCelebration.tsx
```

This is a full-screen celebration overlay shown after completing a skill module.

### Design requirements:

**Background:** Dark overlay (black 85%) with a subtle radial gradient glow at center

**Content (centered, vertically stacked):**
1. Mascot image (EXCITEDACHIEVEMENT.png, 100px, bouncing entrance animation)
2. "Node complete!" text (Outfit, 24px, white, weight 900)
3. XP earned counter: animates from 0 to total XP earned (counting up effect, gold color, 32px, weight 800)
4. XP bar: shows current level progress, bar animates forward to reflect new XP
5. Level/tier display: "Level X — [Tier]" (if level changed, show "LEVEL UP!" with extra flair)
6. Streak update: if streak advanced, show fire icon + new streak count with a pulse
7. "Continue" button (sky-to-green gradient, navigates back to JourneyPathScreen)

**Animation sequence:**
1. Mascot bounces in (spring animation, 0.3s)
2. Brief pause (0.2s)
3. XP counter animates up (0.8s, ease-out)
4. XP bar fills (0.5s, ease-in-out)
5. Level/streak info fades in (0.3s)
6. Continue button fades in (0.3s)

Total: about 2 seconds before the player can tap Continue. Not too slow, not too fast.

**On "Continue":** Navigate back to JourneyPathScreen. The journey hook should refresh, showing the node as completed and the next node as available.

**Commit:** `[journey-path] Phase 6: NodeCompletionCelebration`

---

## PHASE 7: Navigation Wiring

### Step 7A: Register new screens

Find the navigation configuration (likely in `app/` directory or a navigation file). Register:
- `JourneyPathScreen` — as the screen for the Journey tab AND as a stack screen accessible from Home
- `SkillModuleScreen` — as a stack screen with params: `{ nodeId: string, skillContentId: string, nodeTitle: string }`

### Step 7B: Wire the Journey tab

Find the player tab bar configuration. The Journey tab should render `JourneyPathScreen`.

If a Journey tab placeholder already exists, replace it with `JourneyPathScreen`.
If no Journey tab exists, add it as the second tab (Home | **Journey** | Chat | More) with an appropriate icon.

### Step 7C: Wire Continue Training card

**File to modify:** `components/player-scroll/PlayerContinueTraining.tsx`

Add navigation to JourneyPathScreen on tap. Find the existing `onPress` or `TouchableOpacity`. Wire it:

```typescript
onPress={() => navigation.navigate('JourneyPath')}
```

If the component doesn't have access to `navigation`, add it via `useNavigation()` hook:

```typescript
import { useNavigation } from '@react-navigation/native';
const navigation = useNavigation();
```

### Step 7D: Wire SkillModuleScreen from JourneyPathScreen

When a player taps "Start" on an available node's detail card in JourneyPathScreen, navigate to:

```typescript
navigation.navigate('SkillModule', {
  nodeId: node.id,
  skillContentId: node.skill_content_id,
  nodeTitle: node.title,
});
```

### Step 7E: Wire celebration from SkillModuleScreen

When the skill module is complete (currentStep === 'complete'), show the NodeCompletionCelebration overlay. When the player taps "Continue" on the celebration, navigate back to JourneyPathScreen:

```typescript
navigation.goBack(); // or navigation.navigate('JourneyPath')
```

**Commit:** `[journey-path] Phase 7: navigation wiring`

---

## PHASE 8: Verification

### Verify:

1. **JourneyPathScreen renders** and shows Chapter 1 and 2 with their nodes
2. **Nodes show correct states** (available/locked/completed based on journey_progress)
3. **Tapping an available node** opens the detail card
4. **Tapping "Start"** navigates to SkillModuleScreen
5. **Skill module flow works:** Tip > "Got it" > Drill > "I completed" > Quiz > answers > celebration
6. **XP is awarded** at each step (check xp_ledger for new rows)
7. **skill_progress tracks** tip_viewed, drill_completed, quiz_completed, is_fully_complete
8. **journey_progress updates** to status 'completed' after module completion
9. **Celebration shows** with XP animation and returns to JourneyPathScreen
10. **Next node unlocks** after returning to JourneyPathScreen
11. **Continue Training card** on Player Home navigates to JourneyPathScreen
12. **Journey tab** in tab bar goes to JourneyPathScreen
13. **No TypeScript errors**
14. **Mascot images load** (even with green backgrounds for now)

### Files created:
- `hooks/useJourneyPath.ts`
- `hooks/useSkillModule.ts`
- `screens/JourneyPathScreen.tsx`
- `screens/SkillModuleScreen.tsx`
- `components/journey/NodeCompletionCelebration.tsx`

### Files modified:
- `components/player-scroll/PlayerContinueTraining.tsx` (added navigation)
- Navigation configuration file(s) (added screen registrations)
- Tab bar configuration (Journey tab wired)

### Report back with:

```
## VERIFICATION REPORT: Phase 3

### Files Created: [count]
[list each with line count]

### Files Modified: [count]
[list each with description of changes]

### Screen Flow:
- Home > Continue Training > JourneyPathScreen: WORKS / BROKEN
- Tab bar > Journey > JourneyPathScreen: WORKS / BROKEN
- JourneyPathScreen > node tap > detail card: WORKS / BROKEN
- Detail card > Start > SkillModuleScreen: WORKS / BROKEN
- SkillModuleScreen > Tip > Drill > Quiz > Celebration: WORKS / BROKEN
- Celebration > Continue > JourneyPathScreen (refreshed): WORKS / BROKEN

### Data Integration:
- Chapters load from journey_chapters: YES / NO
- Nodes load with skill_content join: YES / NO
- Progress loads from journey_progress: YES / NO
- XP awards write to xp_ledger: YES / NO
- skill_progress tracks steps: YES / NO
- journey_progress updates on completion: YES / NO
- Streak records qualifying action: YES / NO

### Type Check: PASS / FAIL

### Errors: NONE / [list]
```

---

## WHAT COMES NEXT (NOT IN THIS SPEC)

- **Asset Processing:** Chroma key removal on all 48 mascot images (separate spec)
- **Phase 4:** Social + Lock-In (leaderboard leagues, team quests, push notifications, XP boosts)
- **Polish:** Wire mascot images throughout the app (streak states, quest cards, celebration moments, ambient closer)
