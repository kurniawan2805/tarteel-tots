import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/dexie';
import { syncToCloud, pullFromCloud, subscribeToProgress, subscribeToFamilyEvents } from '../db/supabase';
import { useAuth } from '../hooks/useAuth';
import { SyncContext } from './SyncContextInstance';

export function SyncProvider({ children }) {
  const { user, familyId, isLocalMode } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  const processEventLocally = useCallback(async (event) => {
    const { type, payload, child_id } = event;

    switch (type) {
      case 'GRADED_CHUNK': {
        // Update local progress Read Model
        const { surah, chunkId, level, nextSuggested, lastGrade } = payload;
        const existing = await db.progress.where({ child_id, surah, chunkId }).first();
        if (existing) {
          await db.progress.update(existing.id, {
            level,
            lastGrade,
            lastReviewed: event.client_timestamp,
            nextSuggested,
            synced: 1
          });
        } else {
          await db.progress.add({
            child_id,
            surah,
            chunkId,
            level,
            lastGrade,
            lastReviewed: event.client_timestamp,
            nextSuggested,
            favorite: false,
            created_at: event.client_timestamp,
            synced: 1
          });
        }
        break;
      }

      case 'SETTING_CHANGED': {
        // Update local settings
        await db.settings.put({ key: payload.key, value: payload.value });
        break;
      }
      
      // Add more event types here as needed
    }
  }, []);

  const performSync = useCallback(async () => {
    if (isLocalMode) return;

    setSyncing(true);
    setSyncError(null);

    try {
      const localData = await db.exportLocalData();
      const result = await syncToCloud(localData);

      if (result.success) {
        await db.progress.where('synced').equals(0).modify({ synced: 1 });
        await db.sessions.where('synced').equals(0).modify({ synced: 1 });
        await db.events.where('synced').equals(0).modify({ synced: 1 });
        setLastSync(new Date().toISOString());
      } else {
        setSyncError(result.reason);
      }
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setSyncing(false);
    }
  }, [isLocalMode]);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (online && user && !isLocalMode) {
      const timer = setTimeout(() => {
        performSync();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [online, user, isLocalMode, performSync]);

  // Subscribe to family events for realtime updates
  useEffect(() => {
    if (online && familyId && !isLocalMode) {
      const subscription = subscribeToFamilyEvents(familyId, async (payload) => {
        const newEvent = payload.new;
        // Check if we already have this event locally to avoid duplicate processing
        const exists = await db.events.get(newEvent.id);
        if (!exists) {
          await db.events.add({ ...newEvent, synced: 1 });
          await processEventLocally(newEvent);
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [online, familyId, isLocalMode, processEventLocally]);

  const pullCloudData = useCallback(async () => {
    if (!familyId || isLocalMode) return;

    try {
      const result = await pullFromCloud(familyId);
      if (result.success) {
        if (result.children.length) await db.children.bulkPut(result.children);
        if (result.progress.length) await db.progress.bulkPut(result.progress.map(p => ({ ...p, synced: 1 })));
        if (result.sessions.length) await db.sessions.bulkPut(result.sessions.map(s => ({ ...s, synced: 1 })));
        if (result.events.length) {
          const events = result.events.map(e => ({ ...e, synced: 1 }));
          await db.events.bulkPut(events);
          // Re-process all events to ensure local state is correct
          for (const event of events.sort((a,b) => new Date(a.client_timestamp) - new Date(b.client_timestamp))) {
            await processEventLocally(event);
          }
        }
        setLastSync(new Date().toISOString());
      }
    } catch (error) {
      setSyncError(error.message);
    }
  }, [familyId, isLocalMode, processEventLocally]);

  const saveEvent = useCallback(async (eventData) => {
    const eventId = crypto.randomUUID();
    const event = {
      id: eventId,
      family_id: familyId,
      parent_id: user?.id,
      client_timestamp: new Date().toISOString(),
      synced: (online && !isLocalMode) ? 1 : 0,
      ...eventData
    };

    await db.events.add(event);
    await processEventLocally(event);

    if (online && !isLocalMode) {
      performSync();
    }
  }, [familyId, user, online, isLocalMode, performSync, processEventLocally]);

  const subscribeToChild = useCallback((childId, callback) => {
    if (isLocalMode) return null;
    return subscribeToProgress(childId, callback);
  }, [isLocalMode]);

  const saveProgress = useCallback(async (progressData) => {
    await saveEvent({
      type: 'GRADED_CHUNK',
      child_id: progressData.child_id,
      payload: {
        surah: progressData.surah,
        chunkId: progressData.chunkId,
        level: progressData.level,
        nextSuggested: progressData.nextSuggested,
        lastGrade: progressData.lastGrade
      }
    });
  }, [saveEvent]);

  const saveSession = useCallback(async (sessionData) => {
    const record = {
      ...sessionData,
      created_at: new Date().toISOString(),
      synced: (online && !isLocalMode) ? 1 : 0
    };

    await db.sessions.add(record);

    if (online && !isLocalMode) {
      performSync();
    }
  }, [online, isLocalMode, performSync]);

  return (
    <SyncContext.Provider value={{
      online, syncing, lastSync, syncError,
      performSync, pullCloudData, subscribeToChild,
      saveProgress, saveSession, saveEvent
    }}>
      {children}
    </SyncContext.Provider>
  );
}
