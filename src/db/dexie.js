import Dexie from 'dexie';

export const db = new Dexie('TarteelTotsDB');

db.version(1).stores({
  profiles: '++id, family_id, email, role, created_at',
  children: '++id, family_id, name, age, created_at',
  progress: '++id, child_id, surah, surah_name, ayah_number, ayah_text, grade, next_review, last_review, repetition_count, created_at, synced',
  sessions: '++id, child_id, family_id, date, duration, mode, screen_time, audio_only_time, ayahs_reviewed, ayahs_new, created_at, synced',
  audio_cache: '++id, surah, ayah_number, qari, url, blob, cached_at',
  settings: 'key, value'
});

export async function initLocalDB() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.bulkAdd([
      { key: 'screen_time_limit', value: 15 },
      { key: 'default_qari', value: 'ar.alafasy' },
      { key: 'child_mode_pin', value: null },
      { key: 'onboarding_complete', value: false }
    ]);
  }
}

export async function exportLocalData() {
  return {
    profiles: await db.profiles.toArray(),
    children: await db.children.toArray(),
    progress: await db.progress.toArray(),
    sessions: await db.sessions.toArray(),
    settings: await db.settings.toArray()
  };
}

export async function importLocalData(data) {
  if (data.profiles?.length) await db.profiles.bulkPut(data.profiles);
  if (data.children?.length) await db.children.bulkPut(data.children);
  if (data.progress?.length) await db.progress.bulkPut(data.progress);
  if (data.sessions?.length) await db.sessions.bulkPut(data.sessions);
  if (data.settings?.length) await db.settings.bulkPut(data.settings);
}
