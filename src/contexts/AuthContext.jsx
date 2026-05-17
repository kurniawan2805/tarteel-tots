import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../db/supabase';
import { initLocalDB } from '../db/dexie';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setProfile(data);
      setFamilyId(data.family_id);
    }
  }, []);

  const checkLocalSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      // Background load profile - don't await it to avoid blocking UI
      loadProfile(session.user.id);
    }
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    initLocalDB();
    checkLocalSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Background load profile
        loadProfile(session.user.id);
        setIsLocalMode(false);
      } else {
        setUser(null);
        setProfile(null);
        setFamilyId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkLocalSession, loadProfile]);

  async function loginWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signupWithEmail(email, password, fullName, role) {
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
  }

  async function joinFamily(email, password, familyCode) {
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
  }

  async function startLocalMode() {
    setIsLocalMode(true);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setFamilyId(null);
    setIsLocalMode(false);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, familyId, loading, isLocalMode,
      loginWithEmail, signupWithEmail, joinFamily, startLocalMode, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
