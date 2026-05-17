import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
});

export async function syncToCloud(localData) {
  if (!supabaseUrl) return { success: false, reason: 'no_config' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, reason: 'no_session' };

    const unsyncedProgress = localData.progress.filter(p => !p.synced);
    const unsyncedSessions = localData.sessions.filter(s => !s.synced);

    if (unsyncedProgress.length > 0) {
      const { error } = await supabase
        .from('progress')
        .upsert(unsyncedProgress.map(p => ({
          child_id: p.child_id,
          surah: p.surah,
          surah_name: p.surah_name,
          ayah_number: p.ayah_number,
          ayah_text: p.ayah_text,
          grade: p.grade,
          next_review: p.next_review,
          last_review: p.last_review,
          repetition_count: p.repetition_count,
          created_at: p.created_at
        })));
      if (error) throw error;
    }

    if (unsyncedSessions.length > 0) {
      const { error } = await supabase
        .from('sessions')
        .upsert(unsyncedSessions.map(s => ({
          child_id: s.child_id,
          family_id: s.family_id,
          date: s.date,
          duration: s.duration,
          mode: s.mode,
          screen_time: s.screen_time,
          audio_only_time: s.audio_only_time,
          ayahs_reviewed: s.ayahs_reviewed,
          ayahs_new: s.ayahs_new,
          created_at: s.created_at
        })));
      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, reason: error.message };
  }
}

export async function pullFromCloud(familyId) {
  if (!supabaseUrl) return { success: false, reason: 'no_config' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, reason: 'no_session' };

    // Fetch children and sessions in parallel
    const [childrenRes, sessionsRes] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', familyId),
      supabase.from('sessions').select('*').eq('family_id', familyId)
    ]);

    if (childrenRes.error) throw childrenRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    const children = childrenRes.data || [];
    const sessions = sessionsRes.data || [];

    // Fetch progress for all child IDs found
    let progress = [];
    if (children.length > 0) {
      const childIds = children.map(c => c.id);
      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('*')
        .in('child_id', childIds);

      if (progressError) throw progressError;
      progress = progressData || [];
    }

    return {
      success: true,
      children,
      progress,
      sessions
    };
  } catch (error) {
    console.error('Pull error:', error);
    return { success: false, reason: error.message };
  }
}

export function subscribeToProgress(childId, callback) {
  if (!supabaseUrl) return null;

  return supabase
    .channel(`progress:${childId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'progress', filter: `child_id=eq.${childId}` },
      callback
    )
    .subscribe();
}
