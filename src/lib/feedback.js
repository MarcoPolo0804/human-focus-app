import { supabase, isSupabaseConfigured } from './supabase';
import { getPlayerId } from './playerId';

const LOCAL_QUEUE_KEY = 'human-focus-app-feedback-queue';

function queueLocally(message) {
  try {
    const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push({ message, createdAt: new Date().toISOString() });
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // best-effort only
  }
}

export async function submitFeedback(message) {
  const trimmed = message.trim();
  if (!trimmed) return { error: 'empty' };

  if (!isSupabaseConfigured) {
    queueLocally(trimmed);
    return { error: null, storedLocally: true };
  }

  const { error } = await supabase.from('feedback').insert({
    player_id: getPlayerId(),
    message: trimmed,
  });

  if (error) {
    queueLocally(trimmed);
    return { error, storedLocally: true };
  }

  return { error: null, storedLocally: false };
}
