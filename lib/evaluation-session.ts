/**
 * Evaluation Session — AsyncStorage persistence for in-progress evaluations.
 * Saves progress so coaches can resume if they leave mid-session.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = 'vb_eval_session';

export type SessionData = {
  sessionId: string;
  teamId: string;
  seasonId: string;
  evaluationType: string;
  playerIds: string[];           // ordered list of players to evaluate
  currentIndex: number;          // where the coach left off
  completedIds: string[];        // players already rated
  createdAt: string;
};

/** Save session progress. */
export async function saveSessionProgress(data: SessionData): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

/** Load an existing unfinished session (if any). */
export async function loadSessionProgress(): Promise<SessionData | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/** Clear the session on completion or discard. */
export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** Generate a unique session ID. */
export function generateSessionId(): string {
  return `eval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
