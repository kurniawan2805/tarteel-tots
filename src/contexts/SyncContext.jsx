import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db/dexie';
import { syncToCloud, pullFromCloud, subscribeToProgress } from '../db/supabase';
import { useAuth } from './AuthContext';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { user, familyId, isLocalMode } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  const performSync = useCallback(async () => {
    if (isLocalMode) return;

    setSyncing(true);
    setSyncError(null);

    try {
      const localData = await db.exportLocalData();
      const result = await syncToCloud(localData);

      if (result.success) {
        await db.progress.where('synced').equals(0).modify({ synced: true });
        await db.sessions.where('synced').equals(0).modify({ synced: true });
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
      performSync();
    }
  }, [online, user, isLocalMode, performSync]);

  const pullCloudData = useCallback(async () => {
    if (!familyId || isLocalMode) return;

    try {
      const result = await pullFromCloud(familyId);
      if (result.success) {
        if (result.children.length) await db.children.bulkPut(result.children);
        if (result.progress.length) await db.progress.bulkPut(result.progress.map(p => ({ ...p, synced: true })));
        if (result.sessions.length) await db.sessions.bulkPut(result.sessions.map(s => ({ ...s, synced: true })));
        setLastSync(new Date().toISOString());
      }
    } catch (error) {
      setSyncError(error.message);
    }
  }, [familyId, isLocalMode]);

  const subscribeToChild = useCallback((childId, callback) => {
    if (isLocalMode) return null;
    return subscribeToProgress(childId, callback);
  }, [isLocalMode]);

  const saveProgress = useCallback(async (progressData) => {
    const record = {
      ...progressData,
      created_at: new Date().toISOString(),
      synced: online && !isLocalMode
    };

    await db.progress.add(record);

    if (online && !isLocalMode) {
      performSync();
    }
  }, [online, isLocalMode, performSync]);

  const saveSession = useCallback(async (sessionData) => {
    const record = {
      ...sessionData,
      created_at: new Date().toISOString(),
      synced: online && !isLocalMode
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
      saveProgress, saveSession
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
}
