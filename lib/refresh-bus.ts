// =============================================================================
// Refresh Bus — lightweight event emitter for cross-component refresh
// =============================================================================

type RefreshCallback = () => void;
type RefreshEvent = 'quests' | 'xp' | 'streak' | 'journey' | 'leaderboard' | 'notifications' | 'all';

const listeners: Map<RefreshEvent, Set<RefreshCallback>> = new Map();

export function onRefresh(event: RefreshEvent, callback: RefreshCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(callback);
  };
}

export function emitRefresh(event: RefreshEvent): void {
  // Fire specific event listeners
  listeners.get(event)?.forEach(cb => cb());

  // 'all' event also fires on specific events
  if (event !== 'all') {
    listeners.get('all')?.forEach(cb => cb());
  }
}
