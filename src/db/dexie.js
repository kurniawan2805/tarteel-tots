import Dexie from 'dexie';

export const db = new Dexie('TarteelTotsDB');

db.version(4).stores({
  profiles: '++id, family_id, email, role, created_at',
  children: '++id, family_id, name, age, created_at',
  progress: '++id, child_id, surah, chunkId, level, lastReviewed, nextSuggested, lastGrade, favorite, created_at, synced',
  sessions: '++id, child_id, family_id, date, duration, mode, type, screen_time, audio_only_time, ayahs_reviewed, ayahs_new, created_at, synced',
  events: 'id, type, family_id, child_id, client_timestamp, synced',
  audio_cache: 'key, last_used',
  settings: 'key, value'
});

export async function initLocalDB() {
  return db.open();
}

db.on('populate', () => {
  db.settings.bulkAdd([
    { key: 'default_qari', value: 'ar.alafasy' },
    { key: 'screen_time_limit', value: 15 },
    { key: 'memorize_tap_target', value: 10 },
    { key: 'default_loops', value: 5 }
  ]);
});

export async function clearLocalData() {
  await db.profiles.clear();
  await db.children.clear();
  await db.progress.clear();
  await db.sessions.clear();
  await db.settings.clear();
}

db.exportLocalData = async () => {
  const progress = await db.progress.where('synced').equals(0).toArray();
  const sessions = await db.sessions.where('synced').equals(0).toArray();
  const events = await db.events.where('synced').equals(0).toArray();
  return { progress, sessions, events };
};
