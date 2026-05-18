import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  });
} else {
  console.warn(
    'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in your .env.local file.'
  );
}

export { supabase };

export async function syncToCloud(localData) {
  if (!supabase) return { success: false, reason: 'no_config' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, reason: 'no_session' };

    const unsyncedProgress = localData.progress.filter(p => !p.synced);
    const unsyncedSessions = localData.sessions.filter(s => !s.synced);
    const unsyncedEvents = localData.events.filter(e => !e.synced);

    if (unsyncedEvents.length > 0) {
      const { error } = await supabase
        .from('events')
        .upsert(unsyncedEvents.map(e => ({
          id: e.id,
          family_id: e.family_id,
          parent_id: e.parent_id,
          child_id: e.child_id,
          type: e.type,
          payload: e.payload,
          client_timestamp: e.client_timestamp,
          created_at: e.created_at
        })));
      if (error) throw error;
    }

    if (unsyncedProgress.length > 0) {
      const { error } = await supabase
        .from('progress')
        .upsert(unsyncedProgress.map(p => ({
          child_id: p.child_id,
          surah: p.surah,
          chunkId: p.chunkId,
          level: p.level,
          lastReviewed: p.lastReviewed,
          nextSuggested: p.nextSuggested,
          lastGrade: p.lastGrade,
          favorite: p.favorite,
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
          type: s.type,
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
  if (!supabase) return { success: false, reason: 'no_config' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, reason: 'no_session' };

    const [childrenRes, sessionsRes, eventsRes] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', familyId),
      supabase.from('sessions').select('*').eq('family_id', familyId),
      supabase.from('events').select('*').eq('family_id', familyId)
    ]);

    if (childrenRes.error) throw childrenRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    if (eventsRes.error) throw eventsRes.error;

    const children = childrenRes.data || [];
    const sessions = sessionsRes.data || [];
    const events = eventsRes.data || [];

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
      sessions,
      events
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

export function subscribeToFamilyEvents(familyId, callback) {
  if (!supabaseUrl) return null;

  return supabase
    .channel(`family_events:${familyId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events', filter: `family_id=eq.${familyId}` },
      callback
    )
    .subscribe();
}

export async function findFamilyByCode(code) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('families')
    .select('id, display_name, family_code')
    .eq('family_code', code.toUpperCase())
    .single();
  
  if (error) return null;
  return data;
}

export async function createFamily(displayName) {
  if (!supabase) return null;
  
  // The family_code will be generated by a trigger or we can do it here for now
  // For the sake of this implementation, let's assume the DB function works or we generate a placeholder
  const { data, error } = await supabase
    .from('families')
    .insert({ 
      display_name: displayName,
      family_code: `TT-${Math.random().toString(36).substring(2, 6).toUpperCase()}` 
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createMembership(familyId, profileId, role = 'guardian', label = null) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('memberships')
    .insert({
      family_id: familyId,
      profile_id: profileId,
      role,
      label
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyMemberships() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('memberships')
    .select('*, families(*)');
  
  if (error) throw error;
  return data;
}
