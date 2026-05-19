import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, findFamilyByCode, createFamily, createMembership, regenerateFamilyCode } from '../db/supabase';
import { initLocalDB, db, clearLocalData } from '../db/dexie';
import { AuthContext } from './AuthContextInstance';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [activeFamily, setActiveFamily] = useState(null);
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
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        
        // Fetch membership to get active family
        const { data: membership } = await supabase
          .from('memberships')
          .select('*, families(*)')
          .eq('profile_id', userId)
          .single();
        
        if (membership) {
          setFamilyId(membership.family_id);
          setActiveFamily(membership.families);
        } else if (data.family_id) {
          // Legacy fallback
          setFamilyId(data.family_id);
          const { data: family } = await supabase.from('families').select('*').eq('id', data.family_id).single();
          setActiveFamily(family);
        }
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
          setActiveFamily(null);
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
      // Create profile ONLY. Family linking is now a second step.
      const { error: pError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role
      });
      
      if (pError) {
        console.error('Profile insert error:', pError);
        throw pError;
      }
      
      // Set profile from signup data directly (avoid RLS issues with .select())
      setProfile({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        family_id: null,
        created_at: new Date().toISOString()
      });
    }
    return data;
  }, []);

  const initFamilySpace = useCallback(async (displayName) => {
    if (!user || !profile) throw new Error('User must be logged in');
    
    // 1. Create the Family
    const family = await createFamily(displayName);
    
    // 2. Create Admin Membership
    await createMembership(family.id, user.id, 'admin', profile.role === 'mother' ? 'Mother' : 'Father');
    
    // 3. Update local state
    setFamilyId(family.id);
    setActiveFamily(family);
    
    return family;
  }, [user, profile]);

  const joinFamilySpace = useCallback(async (code) => {
    if (!user || !profile) throw new Error('User must be logged in');
    
    // 1. Find the Family
    const family = await findFamilyByCode(code);
    if (!family) throw new Error('Family code not found');
    
    // 2. Create Guardian Membership
    await createMembership(family.id, user.id, 'guardian', profile.role === 'mother' ? 'Mother' : 'Father');
    
    // 3. Update local state
    setFamilyId(family.id);
    setActiveFamily(family);
    
    return family;
  }, [user, profile]);

  const regenerateCode = useCallback(async () => {
    if (!familyId) throw new Error('No active family');
    const updatedFamily = await regenerateFamilyCode(familyId);
    setActiveFamily(updatedFamily);
    return updatedFamily;
  }, [familyId]);

  const startLocalMode = useCallback(async () => {
    setIsLocalMode(true);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await clearLocalData();
    setUser(null);
    setProfile(null);
    setFamilyId(null);
    setActiveFamily(null);
    setIsLocalMode(false);
  }, []);

  const authValue = useMemo(() => ({
    user, profile, familyId, activeFamily, loading, isLocalMode, onboardingComplete,
    loginWithEmail, signupWithEmail, initFamilySpace, joinFamilySpace, regenerateCode, startLocalMode, logout,
    refreshOnboarding: checkOnboarding
  }), [user, profile, familyId, activeFamily, loading, isLocalMode, onboardingComplete, loginWithEmail, signupWithEmail, initFamilySpace, joinFamilySpace, regenerateCode, startLocalMode, logout, checkOnboarding]);

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}
