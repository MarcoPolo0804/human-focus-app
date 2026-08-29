import { supabase, isSupabaseConfigured } from './supabase';
import { getPlayerId } from './playerId';

export async function upsertMyStats(nickname, lifetime) {
  if (!isSupabaseConfigured || !nickname) return { error: null };

  const { error } = await supabase.from('leaderboard').upsert({
    player_id: getPlayerId(),
    nickname,
    lifetime_focus_minutes: lifetime.totalFocusMinutes,
    lifetime_sessions_completed: lifetime.sessionsCompleted,
    lifetime_sessions_failed: lifetime.sessionsFailed,
    lives_completed: lifetime.livesCompleted,
    updated_at: new Date().toISOString(),
  });

  return { error };
}

export async function fetchTopPlayers(orderBy, limit = 10) {
  if (!isSupabaseConfigured) return { data: [], error: null };

  const { data, error } = await supabase
    .from('leaderboard')
    .select('nickname, lifetime_focus_minutes, lifetime_sessions_completed, lives_completed')
    .order(orderBy, { ascending: false })
    .limit(limit);

  return { data: data ?? [], error };
}
