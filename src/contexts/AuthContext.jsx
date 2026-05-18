import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../db/supabase';
import { initLocalDB, db } from '../db/dexie';
import { AuthContext } from './AuthContextInstance';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(null);

  const loadProfile = useCallback(async (userId) => {
    try {
      if (!supabase) {
        console.warn('Supabase not configured, skipping profile load');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFamilyId(data.family_id);
      }
    } catch (err) {
      console.error('Load profile failed:', err);
    }
  }, []);

  const checkOnboarding = useCallback(async () => {
    try {
      const val = await db.settings.get('onboarding_complete');
      setOnboardingComplete(val?.value === true);
    } catch (err) {
      console.error('Check onboarding failed:', err);
      setOnboardingComplete(false);
    }
  }, []);

  const checkLocalSession = useCallback(async () => {
    try {
      if (!supabase) {
        console.warn('Supabase not configured, running in local mode');
        setIsLocalMode(true);
        setLoading(false);
        return;
      }
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
    } catch (err) {
      console.error('Check local session failed:', err);
      setIsLocalMode(true);
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        await initLocalDB();
        if (mounted) {
          await checkOnboarding();
          await checkLocalSession();
        }
      } catch (err) {
        console.error('Initialization failed:', err);
        if (mounted) {
          setLoading(false);
          setIsLocalMode(true);
        }
      }
    }
    
    init();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
          setIsLocalMode(false);
        } else {
          setUser(null);
          setProfile(null);
          setFamilyId(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkLocalSession, loadProfile, checkOnboarding]);

  const loginWithEmail = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signupWithEmail = useCallback(async (email, password, fullName, role) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      const { data: familyData } = await supabase
        .from('families')
        .insert({})
        .select()
        .single();

      await supabase.from('profiles').insert({
        user_id: data.user.id,
        family_id: familyData.id,
        email,
        full_name: fullName,
        role
      });
      setFamilyId(familyData.id);
    }
    return data;
  }, []);

  const joinFamily = useCallback(async (email, password, familyCode) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: family } = await supabase
      .from('families')
      .select('id')
      .eq('id', familyCode)
      .single();

    if (family && data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        family_id: family.id,
        email,
        role: 'father'
      });
      setFamilyId(family.id);
    }
    return data;
  }, []);

  const startLocalMode = useCallback(async () => {
    setIsLocalMode(true);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setFamilyId(null);
    setIsLocalMode(false);
  }, []);

  const authValue = useMemo(() => ({
    user, profile, familyId, loading, isLocalMode, onboardingComplete,
    loginWithEmail, signupWithEmail, joinFamily, startLocalMode, logout,
    refreshOnboarding: checkOnboarding
  }), [user, profile, familyId, loading, isLocalMode, onboardingComplete, loginWithEmail, signupWithEmail, joinFamily, startLocalMode, logout, checkOnboarding]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
