import Dexie from 'dexie';

export const db = new Dexie('TarteelTotsDB');

db.version(8).stores({
  profiles: 'id, family_id, email, role, created_at',
  children: 'id, family_id, name, age, created_at, synced',
  progress: 'id, child_id, surah, chunkId, level, lastReviewed, nextSuggested, lastGrade, graded_by, favorite, created_at, synced',
  grade_history: 'id, progress_id, child_id, family_id, graded_by, graded_at, created_at, synced, is_active, conflict_count',
  sessions: 'id, child_id, family_id, date, duration, mode, type, screen_time, audio_only_time, ayahs_reviewed, ayahs_new, created_at, synced',
  events: 'id, type, family_id, child_id, client_timestamp, synced',
  audio_cache: 'key, last_used',
  settings: 'key, value'
});

export async function initLocalDB() {
  return db.open();
}

db.on('populate', () => {
  return db.settings.bulkAdd([
    { key: 'default_qari', value: 'ar.alafasy' },
    { key: 'screen_time_limit', value: 15 },
    { key: 'memorize_tap_target', value: 10 },
    { key: 'default_loops', value: 5 }
  ]);
});

export async function clearLocalData() {
  await Promise.all([
    db.profiles.clear(),
    db.children.clear(),
    db.progress.clear(),
    db.sessions.clear(),
    db.events.clear(),
    db.grade_history.clear()
  ]);
}

db.exportLocalData = async () => {
  const children = await db.children.where('synced').equals(0).toArray();
  const progress = await db.progress.where('synced').equals(0).toArray();
  const sessions = await db.sessions.where('synced').equals(0).toArray();
  const events = await db.events.where('synced').equals(0).toArray();
  const grade_history = await db.grade_history.where('synced').equals(0).toArray();
  return { children, progress, sessions, events, grade_history };
};
